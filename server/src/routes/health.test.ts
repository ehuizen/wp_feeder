import request from 'supertest';
import { afterAll, describe, it, expect } from 'vitest';
import { createApp } from '../app.js';
import { pool } from '../db/pool.js';
import { signedInAs } from '../test/fake-auth.js';

afterAll(() => pool.end());

describe('GET /api/health', () => {
  it('returns 200 with { ok: true }', async () => {
    const res = await request(createApp()).get('/api/health');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
  });
});

describe('unknown /api route', () => {
  it('returns 401 when signed out, so routes cannot be probed', async () => {
    const res = await request(createApp()).get('/api/nope');

    expect(res.status).toBe(401);
  });

  it('returns 404 with the standard error shape when signed in', async () => {
    const app = createApp({ authMiddleware: signedInAs({ sub: 'auth0|health-404' }) });
    const res = await request(app).get('/api/nope');

    expect(res.status).toBe(404);
    expect(res.body).toEqual({
      error: { code: 'not_found', message: 'Route not found' },
    });
  });
});
