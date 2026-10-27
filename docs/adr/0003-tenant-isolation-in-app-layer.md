# 0003: Tenant isolation in the repository layer, Postgres RLS deferred

Date: 2026-10-27 · Status: Accepted

## Context
Every site, post and publication belongs to one user (the tenant in V1). One user must never see
or change another user's rows, and must not be able to tell whether an id exists. All tenants
share one database and one schema, with a `user_id` column on owned tables.
Postgres row-level security (RLS) could enforce this inside the database. Our database, however,
is only reachable through the Express BFF: the browser never talks to Postgres.

## Decision
- Every repository function takes `userId` as a required argument and every statement filters on
  it (`WHERE id = $1 AND user_id = $2`). TypeScript makes the argument impossible to forget.
- A resource that doesn't exist and one that belongs to someone else both return 404, never 403.
- Route params that can't be ids (not a uuid) return 404 before reaching the database.
- Tests prove cross-user access returns 404 for every action and leaves the owner's data unchanged.

## Alternatives considered
- **Postgres RLS:** policies would filter rows even if a query forgot `user_id`. It needs a
  per-request `SET LOCAL app.user_id` inside a transaction on a dedicated pooled client, a
  database role that isn't the table owner (owners bypass RLS unless `FORCE` is set), and care that
  a reused connection never keeps the previous user's id. That changes how every query runs, too
  close to the V1 deadline.
- **Schema or database per tenant:** strong isolation, but migrations and connections multiply
  with every user. Overkill for single-user tenants.

## Consequences
- A query that forgets its `user_id` filter would leak data; the 404 tests and code review are the guard.
- RLS remains the planned second layer, especially once organisations (teams) arrive in V2.
- Related V2 hardening: users enter site URLs that the server then fetches (SSRF risk). V1
  requires https, which rules out plain-http internal endpoints such as cloud metadata; blocking
  private and loopback addresses is the full fix.
