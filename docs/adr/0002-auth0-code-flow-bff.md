# 0002: Auth0 login as a Backend-for-Frontend with the authorization-code flow

Date: 2026-10-27 · Status: Accepted

## Context
WPFeeder stores credentials for other people's WordPress sites, so nothing secret should be
reachable from scripts in the browser. Auth0 handles sign-in only; authorization is ours.
In dev the React app runs on Vite (:5173) and the API on Express (:3000); in production one
Express service on Render serves both from a single origin.

## Decision
- Use `express-openid-connect` on the server. The browser only ever holds the encrypted,
  httpOnly `appSession` cookie (`sameSite: 'Lax'`, `secure` in production). No tokens reach the client.
- Use the authorization-code flow (`response_type: 'code'` plus `clientSecret`). Auth0 redirects
  back to `/callback` with a code, and the server exchanges it for tokens over a back channel.
  The SDK default (`id_token` via `form_post`) needs a cross-site POST and `SameSite=None` cookies,
  which don't work well on plain-http localhost behind the Vite proxy.
- `authRequired: false`. Our own `requireAuth` guards every `/api` route except `/api/health`
  and returns 401 JSON, because `fetch()` can't follow the SDK's redirect to the login page.
- `requireAuth` upserts the `users` row by Auth0 `sub` on every authenticated request and puts it
  on `res.locals.user`; repositories filter by that id.
- In dev, Vite proxies `/api`, `/login`, `/logout` and `/callback` to Express so the cookie lives on
  the Vite origin; `BASE_URL` is the address in the browser bar.

## Alternatives considered
- **Auth0 SPA SDK with tokens in the browser:** simpler hosting, but tokens are reachable by any
  script on the page.
- **SDK default `id_token` flow:** no client secret needed, but the cross-site POST callback fights
  the dev setup.
- **SDK `requiresAuth()` / `errorOnRequiredAuth`:** redirects, or needs a separate error handler to
  reshape the 401.
- **Cache our user id in the session at login (`afterCallback`):** saves one query per request,
  but adds SDK hooks that are harder to follow. Revisit if the upsert shows up in latency.

## Consequences
- Every request does one small upsert; email and name stay in sync with Auth0.
- No `audience`: we don't call any API with Auth0 access tokens. WordPress uses Application Passwords.
- The Auth0 application must list `{BASE_URL}/callback` as an Allowed Callback URL and `BASE_URL`
  as an Allowed Logout URL, for dev and for production.
- Tests replace `auth()` with a fake that sets `req.oidc`, so they never call Auth0.
