import pg from 'pg';
import { env } from '../config/env.js';

// One shared pool for the whole app; connections are opened on demand and reused.
export const pool = new pg.Pool({
  connectionString: env.DATABASE_URL,
  ssl: env.NODE_ENV === 'production',
});

// An idle connection can drop (e.g. the DB restarts). Without this listener Node crashes the process.
pool.on('error', (err) => {
  console.error('Unexpected Postgres pool error:', err.message);
});
