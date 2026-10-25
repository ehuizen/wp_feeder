import request from 'supertest';
import { describe, it, expect } from 'vitest';
import { createApp } from '../app.js';

describe('GET /api/health', () => {
  it('returns 200 with { ok: true }', async () => {
    const res = await request(createApp()).get('/api/health');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
  });
});

describe('unknown /api route', () => {
  it('returns 404 with the standard error shape', async () => {
    const res = await request(createApp()).get('/api/nope');

    expect(res.status).toBe(404);
    expect(res.body).toEqual({
      error: { code: 'not_found', message: 'Route not found' },
    });
  });
});
