# WPFeeder

Write a blog post once, publish it to many client WordPress sites, and see a result for every site.

WPFeeder is for agencies and freelancers who look after several WordPress sites. Connect each site once with a WordPress Application Password, write the post in WPFeeder, pick the sites and publish. Every site gets its own result (Published or Failed, with the reason), and failed sites can be retried without duplicating the post on the sites that worked.


## Features (V1)

- Sign in with Auth0. The browser only ever holds an httpOnly session cookie.
- Connect sites. Credentials are checked with WordPress before saving and stored encrypted (AES-256-GCM).
- List, re-verify, reconnect and remove sites. A rejected login marks the site "Auth failed".
- Write and edit posts (title, excerpt, content).
- Publish one post to several sites in one request. One failing site never stops the others.
- Per-site results with Retry for failed sites only. Re-sending updates the WordPress post instead of creating a duplicate.
- Delete the account and everything stored for it.

## Stack

| Part | Choice |
|---|---|
| Client | React 19, Vite, React Router, Tailwind v4, shadcn/ui (Base UI), lucide-react |
| Server | Node 24, Express 5, express-openid-connect (Auth0), Zod |
| Database | PostgreSQL via `pg` with plain parameterized SQL and numbered migrations |
| Tests | Vitest, Supertest, msw (WordPress is mocked) |
| Deploy | One Docker image that serves the API and the built client, with Postgres via Docker Compose, behind Caddy on a VPS |

## Run it locally

Requirements: Node 24+, PostgreSQL 16 with two databases, `wpfeeder` and `wpfeeder_test`, and an Auth0 "Regular Web Application" with `http://localhost:5173/callback` as an allowed callback URL.

```sh
npm install
cp server/.env.example server/.env        # fill in the values
cp server/.env.example server/.env.test   # point DATABASE_URL at wpfeeder_test, NODE_ENV=test
npm run db:migrate
npm run dev                               # API on :3000, app on http://localhost:5173
```

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Server (tsx watch) and Vite together |
| `npm run typecheck` · `npm run lint` · `npm test` | Checks; tests run against `wpfeeder_test`, rebuilt fresh each run |
| `npm test -w server -- publish` | Run one test file |
| `npm run db:migrate` | Apply new files from `server/migrations/` |
| `npm run build` then `npm start` | Production build; `start` applies migrations, then serves |
