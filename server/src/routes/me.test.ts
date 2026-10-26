import request from 'supertest';
import { afterAll, describe, expect, it } from 'vitest';
import { createApp } from '../app.js';
import { pool } from '../db/pool.js';
import { signedInAs } from '../test/fake-auth.js';

afterAll(() => pool.end());

async function countUsers(sub: string): Promise<number> {
  const { rows } = await pool.query<{ n: string }>(
    'SELECT count(*) AS n FROM users WHERE auth0_sub = $1', [sub]);
  return Number(rows[0]!.n);
}

describe('GET /api/me', () => {
  it('returns 401 with the standard error shape without a session', async () => {
    const res = await request(createApp()).get('/api/me');

    expect(res.status).toBe(401);
    expect(res.body).toEqual({ error: { code: 'unauthorized', message: 'Sign in required' } });
  });

  it('creates the user on the first call and returns it', async () => {
    const app = createApp({
      authMiddleware: signedInAs({ sub: 'auth0|me-first', email: 'ada@agency.example', name: 'Ada' }),
    });

    const res = await request(app).get('/api/me');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ id: expect.any(String), email: 'ada@agency.example', name: 'Ada' });
    expect(await countUsers('auth0|me-first')).toBe(1);
  });

  it('reuses the same row on later calls and refreshes the name', async () => {
    const sub = 'auth0|me-repeat';
    const first = await request(createApp({ authMiddleware: signedInAs({ sub, name: 'Old' }) })).get('/api/me');
    const second = await request(createApp({ authMiddleware: signedInAs({ sub, name: 'New' }) })).get('/api/me');

    expect(second.body.id).toBe(first.body.id);
    expect(second.body.name).toBe('New');
    expect(await countUsers(sub)).toBe(1);
  });
});
