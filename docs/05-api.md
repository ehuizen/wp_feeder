# API

JSON under `/api`. Every route needs a session cookie except `GET /api/health`. Auth routes `/login`, `/logout`, `/callback` and `/signup` come from the server, not the API.

## Errors
Every error has one shape:

```json
{ "error": { "code": "validation_error", "message": "Invalid input", "fields": { "title": ["Too small"] } } }
```

| Status | code | When |
|---|---|---|
| 400 | `validation_error` | Body failed validation; `fields` lists the bad fields |
| 401 | `unauthorized` | No session |
| 404 | `not_found` | Doesn't exist, or belongs to another user, or the id isn't a uuid |
| 409 | `site_exists` | This user already has that `baseUrl` |
| 422 | `wordpress_rejected` | WordPress rejected the username or Application Password |
| 502 | `wordpress_unavailable` | WordPress unreachable, timed out or rate limited (message includes the wait when known) |

Dates are ISO 8601 strings. Password fields never appear in any response.

## Health and user
| Method | Path | Response |
|---|---|---|
| GET | `/api/health` | `{ "ok": true }` (public) |
| GET | `/api/me` | `{ id, email, name }`; creates the user on first call |
| DELETE | `/api/me` | 204; deletes the user and all their sites, posts and publications |

## Sites
`Site = { id, name, baseUrl, wpUsername, status: "ok" | "failing", lastVerifiedAt, createdAt }`

| Method | Path | Body | Response |
|---|---|---|---|
| GET | `/api/sites` | | `Site[]` |
| POST | `/api/sites` | `{ name, baseUrl, wpUsername, appPassword }` | 201 `Site`; verified with WordPress first (422, 502, 409) |
| PATCH | `/api/sites/:id` | `{ name?, wpUsername?, appPassword? }` | 200 `Site`; re-verifies when the login changes. `baseUrl` can't change |
| POST | `/api/sites/:id/verify` | | 200 `Site` with `status: "failing"` if WordPress now rejects it |
| DELETE | `/api/sites/:id` | | 204 |

## Posts
`Post = { id, title, content, excerpt, createdAt, updatedAt }`

| Method | Path | Body | Response |
|---|---|---|---|
| GET | `/api/posts` | | `PostSummary[]`, newest first: a post without `content`, plus `publications: { total, success, failed, pending }`, `lastPublishedAt`, `lastAttemptedAt` |
| POST | `/api/posts` | `{ title, content?, excerpt? }` | 201 `Post` |
| GET | `/api/posts/:id` | | `Post` + `publications: [{ siteId, siteName, siteBaseUrl, status, remotePostId, url, error, attemptedAt }]` |
| PATCH | `/api/posts/:id` | `{ title?, content?, excerpt? }` | 200 `Post` |
| DELETE | `/api/posts/:id` | | 204 |

Limits: title 1–200 characters, excerpt up to 1,000, content up to 1,000,000.

## Publishing
| Method | Path | Body | Response |
|---|---|---|---|
| POST | `/api/posts/:id/publish` | `{ siteIds: uuid[] }` (1–100) | 200 `{ results }`, even when some sites fail. 404 if the post or any site isn't yours |
| POST | `/api/posts/:id/retry` | | 200 `{ results }` for the previously failed sites only (empty when none failed) |

`results: [{ siteId, status: "success" | "failed", url?, error? }]`

Example error messages: `401 · WordPress rejected the Application Password. Reconnect the site.` · `429 · The site is rate limiting requests. Try again in 30 s.` · `500 · WordPress server error`.
