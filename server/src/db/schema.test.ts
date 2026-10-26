import type { PoolClient } from 'pg';
import { afterAll, describe, expect, it } from 'vitest';
import { pool } from './pool.js';

afterAll(() => pool.end());

// Runs fn inside a transaction that is always rolled back.
async function inRollback(fn: (db: PoolClient) => Promise<void>): Promise<void> {
  const db = await pool.connect();
  try {
    await db.query('BEGIN');
    await fn(db);
  } finally {
    await db.query('ROLLBACK');
    db.release();
  }
}

async function insertUser(db: PoolClient, sub: string): Promise<string> {
  const { rows } = await db.query<{ id: string }>(
    'INSERT INTO users (auth0_sub) VALUES ($1) RETURNING id', [sub]);
  return rows[0]!.id;
}

async function insertSite(db: PoolClient, userId: string, baseUrl: string, status = 'ok'): Promise<string> {
  const { rows } = await db.query<{ id: string }>(
    `INSERT INTO sites (user_id, name, base_url, wp_username,
       app_password_ciphertext, app_password_iv, app_password_tag, status)
     VALUES ($1, 'Test', $2, 'editor', $3, $4, $5, $6) RETURNING id`,
    [userId, baseUrl, Buffer.from('x'), Buffer.alloc(12), Buffer.alloc(16), status]);
  return rows[0]!.id;
}

describe('001_init schema', () => {
  it('records the migration', async () => {
    const { rows } = await pool.query<{ name: string }>('SELECT name FROM schema_migrations');
    expect(rows.map((r) => r.name)).toContain('001_init.sql');
  });

  it('rejects an unknown site status', () =>
    inRollback(async (db) => {
      const userId = await insertUser(db, 'auth0|a');
      await expect(insertSite(db, userId, 'https://a.example', 'faild')).rejects.toThrow(/check constraint/);
    }));

  it('rejects the same base_url twice for one user, but allows it for another user', () =>
    inRollback(async (db) => {
      const a = await insertUser(db, 'auth0|a');
      const b = await insertUser(db, 'auth0|b');
      await insertSite(db, a, 'https://shared.example');
      await insertSite(db, b, 'https://shared.example');
      await expect(insertSite(db, a, 'https://shared.example')).rejects.toThrow(/duplicate key/);
    }));

  it('allows only one publication per post and site', () =>
    inRollback(async (db) => {
      const userId = await insertUser(db, 'auth0|a');
      const siteId = await insertSite(db, userId, 'https://a.example');
      const { rows } = await db.query<{ id: string }>(
        "INSERT INTO posts (user_id, title) VALUES ($1, 'Hello') RETURNING id", [userId]);
      const insertPublication = 'INSERT INTO publications (post_id, site_id) VALUES ($1, $2)';
      await db.query(insertPublication, [rows[0]!.id, siteId]);
      await expect(db.query(insertPublication, [rows[0]!.id, siteId])).rejects.toThrow(/duplicate key/);
    }));

  it('deleting a user removes their sites, posts and publications', () =>
    inRollback(async (db) => {
      const userId = await insertUser(db, 'auth0|a');
      const siteId = await insertSite(db, userId, 'https://a.example');
      const { rows } = await db.query<{ id: string }>(
        "INSERT INTO posts (user_id, title) VALUES ($1, 'Hello') RETURNING id", [userId]);
      await db.query('INSERT INTO publications (post_id, site_id) VALUES ($1, $2)', [rows[0]!.id, siteId]);

      await db.query('DELETE FROM users WHERE id = $1', [userId]);

      const { rows: left } = await db.query<{ n: string }>(
        `SELECT (SELECT count(*) FROM sites) + (SELECT count(*) FROM posts)
              + (SELECT count(*) FROM publications) AS n`);
      expect(Number(left[0]!.n)).toBe(0);
    }));
});
