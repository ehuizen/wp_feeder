import request from 'supertest';
import { afterAll, describe, expect, it } from 'vitest';
import { createApp } from '../app.js';
import { pool } from '../db/pool.js';
import { signedInAs } from '../test/fake-auth.js';

afterAll(() => pool.end());

function appFor(sub: string) {
  return createApp({ authMiddleware: signedInAs({ sub }) });
}

const draft = { title: 'Five clauses every contract needs', content: '<p>Hello</p>', excerpt: 'Short' };

describe('posts API', () => {
  it('returns 401 without a session', async () => {
    const res = await request(createApp()).get('/api/posts');

    expect(res.status).toBe(401);
  });

  it('creates, reads, updates and deletes a post', async () => {
    const app = appFor('auth0|posts-crud');

    const created = await request(app).post('/api/posts').send(draft);
    expect(created.status).toBe(201);
    expect(created.body).toMatchObject({ ...draft, id: expect.any(String) });

    const read = await request(app).get(`/api/posts/${created.body.id}`);
    expect(read.status).toBe(200);
    expect(read.body).toMatchObject({ ...draft, publications: [] });

    const updated = await request(app).patch(`/api/posts/${created.body.id}`).send({ title: 'New title' });
    expect(updated.status).toBe(200);
    expect(updated.body).toMatchObject({ title: 'New title', content: draft.content });
    expect(new Date(updated.body.updatedAt).getTime()).toBeGreaterThanOrEqual(
      new Date(created.body.updatedAt).getTime(),
    );

    const deleted = await request(app).delete(`/api/posts/${created.body.id}`);
    expect(deleted.status).toBe(204);
    expect((await request(app).get(`/api/posts/${created.body.id}`)).status).toBe(404);
  });

  it('lists only my posts, newest first, with a publication summary and no content', async () => {
    const app = appFor('auth0|posts-list');
    await request(app).post('/api/posts').send({ ...draft, title: 'Older' });
    await request(app).post('/api/posts').send({ ...draft, title: 'Newer' });
    await request(appFor('auth0|posts-list-other')).post('/api/posts').send({ ...draft, title: 'Not mine' });

    const res = await request(app).get('/api/posts');

    expect(res.status).toBe(200);
    expect(res.body.map((p: { title: string }) => p.title)).toEqual(['Newer', 'Older']);
    expect(res.body[0]).not.toHaveProperty('content');
    expect(res.body[0].publications).toEqual({ total: 0, success: 0, failed: 0, pending: 0 });
    expect(res.body[0].lastPublishedAt).toBeNull();
  });

  it('defaults content and excerpt to empty strings', async () => {
    const res = await request(appFor('auth0|posts-defaults')).post('/api/posts').send({ title: 'Only a title' });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ content: '', excerpt: '' });
  });

  it('rejects invalid input with 400 and the field names', async () => {
    const app = appFor('auth0|posts-invalid');

    const missing = await request(app).post('/api/posts').send({ content: 'No title' });
    expect(missing.status).toBe(400);
    expect(missing.body.error.code).toBe('validation_error');
    expect(missing.body.error.fields).toHaveProperty('title');

    const created = await request(app).post('/api/posts').send(draft);
    const empty = await request(app).patch(`/api/posts/${created.body.id}`).send({});
    expect(empty.status).toBe(400);

    const unknown = await request(app).patch(`/api/posts/${created.body.id}`).send({ userId: 'x' });
    expect(unknown.status).toBe(400);
  });

  it('returns 404 for another user’s post and leaves it untouched', async () => {
    const owner = appFor('auth0|posts-owner');
    const stranger = appFor('auth0|posts-stranger');
    const { body: post } = await request(owner).post('/api/posts').send(draft);

    expect((await request(stranger).get(`/api/posts/${post.id}`)).status).toBe(404);
    expect((await request(stranger).patch(`/api/posts/${post.id}`).send({ title: 'Hacked' })).status).toBe(404);
    expect((await request(stranger).delete(`/api/posts/${post.id}`)).status).toBe(404);

    const still = await request(owner).get(`/api/posts/${post.id}`);
    expect(still.body.title).toBe(draft.title);
  });

  it('returns 404 for an id that is not a uuid', async () => {
    const res = await request(appFor('auth0|posts-bad-id')).get('/api/posts/not-a-uuid');

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('not_found');
  });
});
