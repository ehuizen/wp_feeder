# 0001: Plain SQL migrations with a small in-house runner

Date: 2026-10-26 · Status: Accepted

## Context
WPFeeder uses PostgreSQL through `pg` with hand-written, parameterized SQL and no ORM.
The schema needs versioned changes that run the same way in dev, in tests (a fresh
`wpfeeder_test` per run) and in production, where the only input is `DATABASE_URL`.

## Decision
- Migrations are plain `.sql` files in `server/migrations/`, named `NNN_name.sql` and applied in order.
- `server/src/db/migrate.ts` (`npm run db:migrate`) records each applied file in a
  `schema_migrations` table and runs each file inside its own transaction.
- Migrations are forward-only: an applied file is never edited; changes go in a new file.
- The test suite drops the `public` schema and re-runs every migration before each run,
  and refuses to do so unless the database name ends in `_test`.

## Alternatives considered
- **ORM migrations (Prisma, Drizzle):** generated from a model, but they bring an ORM we chose not to use.
- **Migration library (node-pg-migrate, Knex):** adds down migrations and locking, at the cost of
  a dependency and a JS migration DSL instead of SQL.
- **Hand-applied SQL:** no record of what ran where.

## Consequences
- The schema is readable SQL, and the runner is about 40 lines with no extra dependency.
- No down migrations: a mistake is fixed with a new migration.
- No lock against two runners at once; acceptable with a single Render service.
  Add `pg_advisory_lock` if that changes.
- Production runs need the built file (`node dist/db/migrate.js`) because `tsx` is a dev
  dependency; that script is added with the deploy work.
