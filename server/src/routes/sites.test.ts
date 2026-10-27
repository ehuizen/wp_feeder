import { http, HttpResponse } from 'msw';
import request from 'supertest';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../app.js';
import { pool } from '../db/pool.js';
import { signedInAs } from '../test/fake-auth.js';
import {
  startWordPressMock,
  wordpress,
  wordpressAccepts,
  wordpressIsDown,
  wordpressRateLimits,
  wordpressRejects,
} from '../test/wordpress-mock.js';

const appPassword = 'abcd EFGH 1234 ijkl MNOP 5678';

beforeAll(startWordPressMock);
afterEach(() => wordpress.resetHandlers());
afterAll(async () => {
  wordpress.close();
  await pool.end();
});

function appFor(sub: string) {
  return createApp({ authMiddleware: signedInAs({ sub }) });
}

function siteInput(baseUrl: string) {
  return { name: 'Client blog', baseUrl, wpUsername: 'editor', appPassword };
}

type App = ReturnType<typeof appFor>;

async function addSite(app: App, baseUrl: string): Promise<{ id: string }> {
  wordpressAccepts(baseUrl);
  const res = await request(app).post('/api/sites').send(siteInput(baseUrl));
  expect(res.status).toBe(201);
  return res.body;
}

describe('sites API', () => {
  it('returns 401 without a session', async () => {
    const res = await request(createApp()).get('/api/sites');

    expect(res.status).toBe(401);
  });

  describe('POST /api/sites', () => {
    it('verifies with WordPress, saves the site and never returns the password', async () => {
      const app = appFor('auth0|sites-create');
      let authorization: string | null = null;
      let userAgent: string | null = null;
      wordpress.use(
        http.get('https://create.example/wp-json/wp/v2/users/me', ({ request }) => {
          authorization = request.headers.get('authorization');
          userAgent = request.headers.get('user-agent');
          return HttpResponse.json({ id: 1 });
        }),
      );

      const res = await request(app).post('/api/sites').send(siteInput('https://Create.example/'));

      expect(res.status).toBe(201);
      expect(res.body).toEqual({
        id: expect.any(String),
        name: 'Client blog',
        baseUrl: 'https://create.example',
        wpUsername: 'editor',
        status: 'ok',
        lastVerifiedAt: expect.any(String),
        createdAt: expect.any(String),
      });
      expect(JSON.stringify(res.body)).not.toContain('abcd');
      expect(authorization).toBe(
        `Basic ${Buffer.from(`editor:${appPassword}`).toString('base64')}`,
      );
      expect(userAgent).toBe('WPFeeder/1.0');
    });

    it('returns 400 with field details for an http URL and a missing password', async () => {
      const res = await request(appFor('auth0|sites-invalid'))
        .post('/api/sites')
        .send({ name: 'Client blog', baseUrl: 'http://plain.example', wpUsername: 'editor' });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('validation_error');
      expect(Object.keys(res.body.error.fields)).toEqual(
        expect.arrayContaining(['baseUrl', 'appPassword']),
      );
    });

    it('returns 422 and saves nothing when WordPress rejects the login', async () => {
      const app = appFor('auth0|sites-rejected');
      wordpressRejects('https://rejected.example');

      const res = await request(app).post('/api/sites').send(siteInput('https://rejected.example'));

      expect(res.status).toBe(422);
      expect(res.body.error.code).toBe('wordpress_rejected');
      expect((await request(app).get('/api/sites')).body).toEqual([]);
    });

    it('returns 409 when the site is already connected', async () => {
      const app = appFor('auth0|sites-duplicate');
      await addSite(app, 'https://duplicate.example');

      const res = await request(app).post('/api/sites').send(siteInput('https://duplicate.example'));

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('site_exists');
    });

    it('returns 502 when the site is unreachable', async () => {
      wordpressIsDown('https://down.example');

      const res = await request(appFor('auth0|sites-down'))
        .post('/api/sites')
        .send(siteInput('https://down.example'));

      expect(res.status).toBe(502);
      expect(res.body.error.code).toBe('wordpress_unavailable');
    });

    it('returns 502 with the wait time when WordPress rate limits', async () => {
      wordpressRateLimits('https://busy.example', 30);

      const res = await request(appFor('auth0|sites-busy'))
        .post('/api/sites')
        .send(siteInput('https://busy.example'));

      expect(res.status).toBe(502);
      expect(res.body.error.message).toContain('Try again in 30 s');
    });
  });

  describe('GET /api/sites', () => {
    it('lists only the signed-in user’s sites', async () => {
      await addSite(appFor('auth0|sites-owner-a'), 'https://owner-a.example');

      const res = await request(appFor('auth0|sites-owner-b')).get('/api/sites');

      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });
  });

  describe('another user’s site', () => {
    it('returns 404 for every action and leaves the site untouched', async () => {
      const owner = appFor('auth0|sites-victim');
      const intruder = appFor('auth0|sites-intruder');
      const site = await addSite(owner, 'https://victim.example');

      const responses = await Promise.all([
        request(intruder).patch(`/api/sites/${site.id}`).send({ name: 'Taken over' }),
        request(intruder).post(`/api/sites/${site.id}/verify`),
        request(intruder).delete(`/api/sites/${site.id}`),
      ]);

      for (const res of responses) {
        expect(res.status).toBe(404);
        expect(res.body.error.code).toBe('not_found');
      }
      const ownerSites = (await request(owner).get('/api/sites')).body;
      expect(ownerSites).toEqual([expect.objectContaining({ id: site.id, name: 'Client blog' })]);
    });
  });

  describe('PATCH /api/sites/:id', () => {
    it('renames without calling WordPress', async () => {
      const app = appFor('auth0|sites-rename');
      const site = await addSite(app, 'https://rename.example');
      wordpress.resetHandlers(); // any WordPress call now fails the test

      const res = await request(app).patch(`/api/sites/${site.id}`).send({ name: 'Renamed' });

      expect(res.status).toBe(200);
      expect(res.body.name).toBe('Renamed');
    });

    it('returns 400 when trying to change the URL', async () => {
      const app = appFor('auth0|sites-move');
      const site = await addSite(app, 'https://move.example');

      const res = await request(app)
        .patch(`/api/sites/${site.id}`)
        .send({ baseUrl: 'https://elsewhere.example' });

      expect(res.status).toBe(400);
    });
  });

  describe('POST /api/sites/:id/verify', () => {
    it('marks the site failing when WordPress now rejects the login', async () => {
      const app = appFor('auth0|sites-verify');
      const site = await addSite(app, 'https://verify.example');
      wordpressRejects('https://verify.example');

      const res = await request(app).post(`/api/sites/${site.id}/verify`);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('failing');
    });
  });

  describe('DELETE /api/sites/:id', () => {
    it('returns 204, then 404 once the site is gone', async () => {
      const app = appFor('auth0|sites-delete');
      const site = await addSite(app, 'https://delete.example');

      const first = await request(app).delete(`/api/sites/${site.id}`);
      const second = await request(app).delete(`/api/sites/${site.id}`);

      expect(first.status).toBe(204);
      expect(second.status).toBe(404);
    });

    it('returns 404 for an id that is not a uuid', async () => {
      const res = await request(appFor('auth0|sites-bad-id')).delete('/api/sites/not-a-uuid');

      expect(res.status).toBe(404);
    });
  });
});
