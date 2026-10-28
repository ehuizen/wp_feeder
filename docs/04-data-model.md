# Data model

Defined in `server/migrations/001_init.sql`. All ids are uuids from `gen_random_uuid()`. Deleting a user cascades to everything they own.

```
users 1 ──< sites 1 ──< publications >── 1 posts >── 1 users
```

## users
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| auth0_sub | text UNIQUE | Auth0's id for the person; the upsert matches on it |
| email, name | text | Refreshed from Auth0 on each sign-in |
| created_at | timestamptz | |

## sites
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| user_id | uuid FK → users (cascade) | |
| name | text | |
| base_url | text | https, normalised; UNIQUE (user_id, base_url) |
| wp_username | text | |
| app_password_ciphertext, app_password_iv, app_password_tag | bytea | AES-256-GCM parts; IV 12 bytes, tag 16 bytes (CHECK) |
| status | text | `ok` or `failing` |
| last_verified_at | timestamptz | |
| created_at | timestamptz | |

## posts
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| user_id | uuid FK → users (cascade) | Index (user_id, updated_at DESC) |
| title | text | |
| content | text | HTML or plain text |
| excerpt | text | |
| created_at, updated_at | timestamptz | |

## publications
One row per (post, site): the latest attempt to send that post to that site.

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| post_id | uuid FK → posts (cascade) | UNIQUE (post_id, site_id) |
| site_id | uuid FK → sites (cascade) | |
| status | text | `pending`, `success` or `failed` |
| remote_post_id | bigint | The WordPress post id; kept after a failure so the next send updates instead of duplicating |
| remote_url | text | Link to the live post |
| error_message | text | Shown to the user on failure |
| attempted_at | timestamptz | |
