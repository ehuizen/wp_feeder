# Deploying WPFeeder

WPFeeder is one Node process that serves the API, the Auth0 routes and the built React app, plus one Postgres database. It only reads environment variables, so the same build runs on Render or on any server with Node 24 and Postgres.

## What any host needs

| Variable | Value |
|---|---|
| `NODE_ENV` | `production` |
| `PORT` | Port to listen on (Render sets it for you) |
| `DATABASE_URL` | `postgres://user:pass@host:5432/wpfeeder` |
| `DATABASE_SSL` | `true` for a database across the internet, `false` on a private network or the same machine. Unset means `true` in production. |
| `BASE_URL` | The public address, e.g. `https://wpfeeder.onrender.com` |
| `AUTH0_ISSUER_BASE_URL`, `AUTH0_CLIENT_ID`, `AUTH0_CLIENT_SECRET` | From the Auth0 application |
| `SESSION_SECRET` | 32+ random characters |
| `ENCRYPTION_KEY` | 32 random bytes, base64. **Keep a copy somewhere safe.** If it is lost or changed, every stored Application Password becomes unreadable and each site must be reconnected. |

Generate secrets with:

```sh
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

Build and run:

```sh
npm ci --include=dev
npm run build
npm start          # applies pending migrations, then starts the server
```

## Render (current host)

1. Push the repo to GitHub.
2. In Render: **New → Blueprint**, pick the repo. `render.yaml` creates the `wpfeeder` web service and the `wpfeeder-db` database.
3. Fill in the variables marked `sync: false`: `BASE_URL`, the three `AUTH0_*` values and `ENCRYPTION_KEY`. `SESSION_SECRET` is generated, and `DATABASE_URL` is wired to the database.
4. Deploy. The health check is `GET /api/health`.

The free Postgres plan expires after 30 days; upgrade it or move the data before then (see "Moving hosts").

## Auth0 settings for production

In the Auth0 application (Regular Web Application), add the production address next to the local one:

- **Allowed Callback URLs:** `https://YOUR-HOST/callback`
- **Allowed Logout URLs:** `https://YOUR-HOST`
- **Allowed Web Origins:** `https://YOUR-HOST`

`BASE_URL` must be exactly `https://YOUR-HOST` (no trailing slash).

## Moving hosts

Two things carry state: the database and `ENCRYPTION_KEY`. Move both together.

```sh
pg_dump --no-owner --format=custom "$OLD_DATABASE_URL" > wpfeeder.dump
pg_restore --no-owner --dbname "$NEW_DATABASE_URL" wpfeeder.dump
```

Then start the app on the new host with the same `ENCRYPTION_KEY`, update `BASE_URL` and the Auth0 URLs, and switch DNS.
