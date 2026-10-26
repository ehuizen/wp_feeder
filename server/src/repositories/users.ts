import { pool } from '../db/pool.js';

export type User = { id: string; email: string | null; name: string | null };

type UserRow = { id: string; email: string | null; name: string | null };

// Creates the user on first sign-in, afterwards refreshes email and name from Auth0.
// One statement, so two requests arriving together can't create a duplicate.
export async function upsertUser(
  auth0Sub: string,
  email: string | null,
  name: string | null,
): Promise<User> {
  const { rows } = await pool.query<UserRow>(
    `INSERT INTO users (auth0_sub, email, name)
     VALUES ($1, $2, $3)
     ON CONFLICT (auth0_sub) DO UPDATE SET email = EXCLUDED.email, name = EXCLUDED.name
     RETURNING id, email, name`,
    [auth0Sub, email, name],
  );
  const row = rows[0]!;
  return { id: row.id, email: row.email, name: row.name };
}
