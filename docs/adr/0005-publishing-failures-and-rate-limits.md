# 0005: Publishing failures and rate limits

Date: 2026-10-28 · Status: Accepted

## Context
Publishing sends one post to many independent WordPress sites in one request. Any site can be down, slow, rate limiting, or reject the login. Security plugins (Wordfence and others) lock out accounts after repeated failed logins. The user needs a clear result for every site, and re-sending must never create duplicate posts.

## Decision
- Send to all selected sites at once with `Promise.allSettled`, so one failure (or an unexpected exception) never stops the others. The endpoint answers 200 with a result per site, even on partial failure.
- Upsert one `publications` row per (post, site). Store the WordPress post id on success and keep it after later failures, so the next send updates that post (`POST /wp/v2/posts/{id}`). If WordPress says that post no longer exists (404), create it again.
- Never retry automatically:
  - **401/403:** mark the site `failing`; the user reconnects it. Retrying a wrong password risks a lockout.
  - **429:** report the `Retry-After` wait in the message when WordPress sends one.
  - **Timeouts and network errors** (15 s per call) and **5xx:** report them; the user retries.
- Retry is an explicit action that resends only rows with status `failed`.

## Alternatives considered
- **Automatic retries with backoff inside the request:** a slow site would hold the whole request open, and retrying 401s risks lockouts.
- **Background job queue with scheduled retries:** the right shape for bulk sends (V2), but new infrastructure (Redis or a jobs table plus a worker) that V1 doesn't need for one post at a time.
- **`Promise.all`:** the first failure would reject everything and hide the other sites' results.

## Consequences
- The request takes as long as the slowest site (at most about 15 s).
- Many sites on one slow host could exceed the platform's request timeout; that is the trigger for the V2 queue.
- Results are always honest per site, and retrying is always safe from duplicates.
