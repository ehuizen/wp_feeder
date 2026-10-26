import { readdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { pool } from './pool.js';

// server/migrations, from both src/db (tsx) and dist/db (built).
const migrationsDir = fileURLToPath(new URL('../../migrations/', import.meta.url));
const migrationFile = /^\d{3}_[a-z0-9_]+\.sql$/;

export async function runMigrations(): Promise<string[]> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      name text PRIMARY KEY,
      applied_at timestamptz NOT NULL DEFAULT now()
    )
  `);

  const files = (await readdir(migrationsDir)).filter((f) => migrationFile.test(f)).sort();
  const { rows } = await pool.query<{ name: string }>('SELECT name FROM schema_migrations');
  const applied = new Set(rows.map((r) => r.name));
  const ran: string[] = [];

  for (const file of files) {
    if (applied.has(file)) continue;
    const sql = await readFile(`${migrationsDir}${file}`, 'utf8');

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(sql);
      await client.query('INSERT INTO schema_migrations (name) VALUES ($1)', [file]);
      await client.query('COMMIT');
      ran.push(file);
    } catch (err) {
      await client.query('ROLLBACK');
      throw new Error(`Migration ${file} failed`, { cause: err });
    } finally {
      client.release();
    }
  }
  return ran;
}

// Only runs when called as a script (npm run db:migrate), not when imported by tests.
if (import.meta.main) {
  try {
    const ran = await runMigrations();
    console.log(ran.length ? `Applied: ${ran.join(', ')}` : 'Database is up to date.');
  } catch (err) {
    console.error(err);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}
