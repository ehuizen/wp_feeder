# 0004: Managed Postgres on Render now, portable to a VPS later

Date: 2026-10-28 · Status: Accepted

## Context
V1 needs a hosted database by 30 Oct. The long-term plan is to move to a self-managed VPS. The app must not grow anything that only works on one host, and moving must not lose the encrypted Application Passwords.

## Decision
- Host V1 on Render: one web service and Render Postgres, described in `render.yaml`.
- The code only knows environment variables. `DATABASE_URL` is a plain connection string; `DATABASE_SSL` makes TLS explicit (unset means on in production), so a database on the same machine or a private network works without TLS.
- `npm start` applies pending migrations, then starts the server, so any host only needs `npm run build` and `npm start`.
- Express trusts one proxy hop (`trust proxy`) because both Render and nginx terminate HTTPS in front of Node.

## Alternatives considered
- **Supabase or Neon:** free tiers that don't expire, but a second provider to manage, and Supabase's direct host can be IPv6-only from Render (its pooler would be required).
- **Docker image:** the cleanest portability, but new infrastructure to learn and maintain before V1. A plain Node process is already portable.
- **Separate migrate step (Render pre-deploy command):** not available on the free plan, and different on every host.

## Consequences
- Moving hosts is `pg_dump` / `pg_restore` plus the same `ENCRYPTION_KEY`. Losing that key makes every stored password unreadable, so it is backed up separately from the database.
- Render's free Postgres expires after 30 days; it must be upgraded or moved before then.
- Running migrations on start means two instances starting together could race. That is fine for one instance; a migration lock is needed before scaling out.
