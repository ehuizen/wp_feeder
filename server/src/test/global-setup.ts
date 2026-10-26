import { env } from '../config/env.js';
import { pool } from '../db/pool.js';
import { runMigrations } from '../db/migrate.js';

export async function setup(): Promise<void> {
  const dbName = new URL(env.DATABASE_URL).pathname.slice(1);
  if (!dbName.endsWith('_test')) {
    throw new Error(`Refusing to reset "${dbName}": tests only run against a *_test database.`);
  }
  // Fresh schema every run, so tests never depend on leftovers.
  await pool.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public;');
  await runMigrations();
}

export async function teardown(): Promise<void> {
  await pool.end();
}
