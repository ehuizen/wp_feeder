# Architecture

WPFeeder is a Backend-for-Frontend: one Express server owns every secret and is the only thing that talks to Auth0, Postgres and WordPress. The React app only ever calls `/api/*` on the same origin with an httpOnly session cookie.

```
Browser (React SPA)
  │  /api/*  + session cookie
  ▼
Express (server/)
  ├─ auth/oidc.ts          Auth0 login: /login, /callback, /logout; reads the cookie into req.oidc
  ├─ auth/require-auth.ts  401 when signed out; otherwise loads our user into res.locals.user
  ├─ routes/               validate input with Zod, call one service, map results to HTTP
  ├─ services/             business rules (verify before save, publish, retry)
  ├─ repositories/         SQL via pg, every query filtered by user_id
  ├─ lib/crypto.ts         AES-256-GCM for Application Passwords (only file with the key)
  └─ lib/wordpress.ts      the only file that calls WordPress
        │                         │
        ▼                         ▼
   PostgreSQL               Client WordPress sites (REST API, Basic auth, 15 s timeout)
```

## Request flow
`route → service → repository → (wordpress)`. Routes never contain SQL; services never see `req`/`res`; repositories never call WordPress.

## Authentication and authorization
- Auth0 (authorization code flow with a client secret) proves who the user is. Tokens stay on the server; the browser gets an encrypted session cookie (httpOnly, `secure` in production, `sameSite: lax`). See ADR 0002.
- On every API request `requireAuth` upserts our `users` row by Auth0 `sub` and passes it on as `res.locals.user`.
- Authorization is ours: every repository function takes `userId` and filters by it. Another user's resource is a 404. See ADR 0003.

## Credentials
Application Passwords are encrypted with AES-256-GCM (new random 12-byte IV each time; ciphertext, IV and tag stored separately). They are decrypted into a local variable right before a WordPress call and never cached, logged or returned.

## Publishing
`POST /api/posts/:id/publish` loads the post and the chosen sites (scoped to the user), then sends to all sites with `Promise.allSettled`. Each site's outcome is upserted into `publications`. A known remote post id updates that WordPress post instead of creating a duplicate. See ADR 0005 for failures and rate limits.

## Client
React Router screens under `client/src/features/<area>/`. Each area has a `*-api.ts` (typed calls through `lib/api.ts`), a data hook built on `lib/use-resource.ts`, and components built from shadcn/ui. Every data view has loading, empty and error states, and every status is written in words.

## Deploy
`npm run build` compiles the server and the client; `npm start` applies pending migrations and starts Express, which serves `/api`, the auth routes and `client/dist`. See [deploy.md](deploy.md) and ADR 0004.
