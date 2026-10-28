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
  wordpressPublishes,
  wordpressPublishFails,
} from '../test/wordpress-mock.js';

beforeAll(startWordPressMock);
afterEach(() => wordpress.resetHandlers());
afterAll(async () => {
  wordpress.close();
  await pool.end();
});

type App = ReturnType<typeof createApp>;

function appFor(sub: string): App {
  return createApp({ authMiddleware: signedInAs({ sub }) });
}

async function addSite(app: App, baseUrl: string): Promise<string> {
  wordpressAccepts(baseUrl);
  const res = await request(app)
    .post('/api/sites')
    .send({ name: baseUrl, baseUrl, wpUsername: 'editor', appPassword: 'abcd EFGH 1234 ijkl MNOP 5678' });
  expect(res.status).toBe(201);
  return res.body.id;
}

async function addPost(app: App): Promise<string> {
  const res = await request(app).post('/api/posts').send({ title: 'Hello', content: '<p>Hi</p>', excerpt: 'Hi' });
  return res.body.id;
}

describe('publishing', () => {
  it('returns 200 with a result per site when one site fails, and records each one', async () => {
    const app = appFor('auth0|publish-partial');
    const good = await addSite(app, 'https://good.example');
    const bad = await addSite(app, 'https://bad.example');
    const post = await addPost(app);
    wordpressPublishes('https://good.example', 55);
    wordpressPublishFails('https://bad.example', 500);

    const res = await request(app).post(`/api/posts/${post}/publish`).send({ siteIds: [good, bad] });

    expect(res.status).toBe(200);
    expect(res.body.results).toEqual(
      expect.arrayContaining([
        { siteId: good, status: 'success', url: 'https://good.example/?p=55' },
        { siteId: bad, status: 'failed', error: '500 · Nope' },
      ]),
    );

    const detail = await request(app).get(`/api/posts/${post}`);
    const byId = Object.fromEntries(detail.body.publications.map((p: { siteId: string }) => [p.siteId, p]));
    expect(byId[good]).toMatchObject({ status: 'success', remotePostId: 55, url: 'https://good.example/?p=55' });
    expect(byId[bad]).toMatchObject({ status: 'failed', error: '500 · Nope', remotePostId: null });

    const list = await request(app).get('/api/posts');
    expect(list.body[0].publications).toEqual({ total: 2, success: 1, failed: 1, pending: 0 });
  });

  it('retry resends only the failed sites', async () => {
    const app = appFor('auth0|publish-retry');
    const good = await addSite(app, 'https://retry-good.example');
    const bad = await addSite(app, 'https://retry-bad.example');
    const post = await addPost(app);
    wordpressPublishes('https://retry-good.example', 7);
    wordpressPublishFails('https://retry-bad.example', 503);
    await request(app).post(`/api/posts/${post}/publish`).send({ siteIds: [good, bad] });

    wordpress.resetHandlers();
    const goodCalls = wordpressPublishes('https://retry-good.example', 7);
    const badCalls = wordpressPublishes('https://retry-bad.example', 9);
    const res = await request(app).post(`/api/posts/${post}/retry`);

    expect(res.status).toBe(200);
    expect(res.body.results).toEqual([{ siteId: bad, status: 'success', url: 'https://retry-bad.example/?p=9' }]);
    expect(goodCalls).toEqual({ creates: 0, updates: [] });
    expect(badCalls).toEqual({ creates: 1, updates: [] });

    const again = await request(app).post(`/api/posts/${post}/retry`);
    expect(again.body.results).toEqual([]);
  });

  it('updates the existing WordPress post instead of creating a duplicate', async () => {
    const app = appFor('auth0|publish-update');
    const site = await addSite(app, 'https://update.example');
    const post = await addPost(app);
    wordpressPublishes('https://update.example', 42);
    await request(app).post(`/api/posts/${post}/publish`).send({ siteIds: [site] });

    wordpress.resetHandlers();
    const calls = wordpressPublishes('https://update.example', 99);
    const res = await request(app).post(`/api/posts/${post}/publish`).send({ siteIds: [site] });

    expect(res.body.results[0]).toMatchObject({ status: 'success', url: 'https://update.example/?p=42' });
    expect(calls).toEqual({ creates: 0, updates: [42] });
  });

  it('creates the post again when it was deleted in WordPress', async () => {
    const app = appFor('auth0|publish-recreate');
    const site = await addSite(app, 'https://recreate.example');
    const post = await addPost(app);
    wordpressPublishes('https://recreate.example', 10);
    await request(app).post(`/api/posts/${post}/publish`).send({ siteIds: [site] });

    wordpress.resetHandlers();
    wordpress.use(
      http.post('https://recreate.example/wp-json/wp/v2/posts/:id', () =>
        HttpResponse.json({ code: 'rest_post_invalid_id', message: 'Invalid post ID.' }, { status: 404 }),
      ),
      http.post('https://recreate.example/wp-json/wp/v2/posts', () =>
        HttpResponse.json({ id: 11, link: 'https://recreate.example/?p=11' }, { status: 201 }),
      ),
    );
    const res = await request(app).post(`/api/posts/${post}/publish`).send({ siteIds: [site] });

    expect(res.body.results[0]).toMatchObject({ status: 'success', url: 'https://recreate.example/?p=11' });
  });

  it('marks the site failing when WordPress rejects the login', async () => {
    const app = appFor('auth0|publish-401');
    const site = await addSite(app, 'https://locked.example');
    const post = await addPost(app);
    wordpressPublishFails('https://locked.example', 401);

    const res = await request(app).post(`/api/posts/${post}/publish`).send({ siteIds: [site] });

    expect(res.body.results[0].status).toBe('failed');
    expect(res.body.results[0].error).toMatch(/^401/);
    const sites = await request(app).get('/api/sites');
    expect(sites.body[0].status).toBe('failing');
  });

  it('includes the Retry-After wait in a 429 message', async () => {
    const app = appFor('auth0|publish-429');
    const site = await addSite(app, 'https://busy.example');
    const post = await addPost(app);
    wordpressPublishFails('https://busy.example', 429, { 'Retry-After': '30' });

    const res = await request(app).post(`/api/posts/${post}/publish`).send({ siteIds: [site] });

    expect(res.body.results[0].error).toContain('Try again in 30 s');
  });

  it('returns 404 for another user’s post or site', async () => {
    const owner = appFor('auth0|publish-owner');
    const stranger = appFor('auth0|publish-stranger');
    const ownerSite = await addSite(owner, 'https://owner.example');
    const ownerPost = await addPost(owner);
    const strangerPost = await addPost(stranger);

    const otherPost = await request(stranger).post(`/api/posts/${ownerPost}/publish`).send({ siteIds: [ownerSite] });
    expect(otherPost.status).toBe(404);

    const otherSite = await request(stranger).post(`/api/posts/${strangerPost}/publish`).send({ siteIds: [ownerSite] });
    expect(otherSite.status).toBe(404);

    expect((await request(stranger).post(`/api/posts/${ownerPost}/retry`)).status).toBe(404);
  });

  it('rejects an empty or invalid site list with 400', async () => {
    const app = appFor('auth0|publish-invalid');
    const post = await addPost(app);

    expect((await request(app).post(`/api/posts/${post}/publish`).send({ siteIds: [] })).status).toBe(400);
    expect((await request(app).post(`/api/posts/${post}/publish`).send({ siteIds: ['nope'] })).status).toBe(400);
  });
});
