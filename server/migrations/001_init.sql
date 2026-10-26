-- gen_random_uuid() is built into Postgres 13+.

CREATE TABLE users (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auth0_sub   text NOT NULL UNIQUE,
  email       text,
  name        text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE sites (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                  uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  name                     text NOT NULL,
  base_url                 text NOT NULL,
  wp_username              text NOT NULL,
  app_password_ciphertext  bytea NOT NULL,
  app_password_iv          bytea NOT NULL CHECK (octet_length(app_password_iv) = 12),
  app_password_tag         bytea NOT NULL CHECK (octet_length(app_password_tag) = 16),
  status                   text NOT NULL DEFAULT 'ok' CHECK (status IN ('ok', 'failing')),
  last_verified_at         timestamptz,
  created_at               timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, base_url)
);

CREATE TABLE posts (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  title       text NOT NULL,
  content     text NOT NULL DEFAULT '',
  excerpt     text NOT NULL DEFAULT '',
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX posts_user_id_updated_at_idx ON posts (user_id, updated_at DESC);

CREATE TABLE publications (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id         uuid NOT NULL REFERENCES posts (id) ON DELETE CASCADE,
  site_id         uuid NOT NULL REFERENCES sites (id) ON DELETE CASCADE,
  status          text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'success', 'failed')),
  remote_post_id  bigint,
  remote_url      text,
  error_message   text,
  attempted_at    timestamptz,
  UNIQUE (post_id, site_id)
);
CREATE INDEX publications_site_id_idx ON publications (site_id);
