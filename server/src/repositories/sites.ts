import { pool } from '../db/pool.js';
import type { Encrypted } from '../lib/crypto.js';

export type SiteStatus = 'ok' | 'failing';

// What the rest of the app sees. No password fields, so they can't reach a response.
export type Site = {
  id: string;
  name: string;
  baseUrl: string;
  wpUsername: string;
  status: SiteStatus;
  lastVerifiedAt: Date | null;
  createdAt: Date;
};

export type SiteCredentials = { baseUrl: string; wpUsername: string; appPassword: Encrypted };

type SiteRow = {
  id: string;
  name: string;
  base_url: string;
  wp_username: string;
  status: SiteStatus;
  last_verified_at: Date | null;
  created_at: Date;
};

// A fixed column list (not a value), so it's safe to put in the SQL text.
const SITE_COLUMNS = 'id, name, base_url, wp_username, status, last_verified_at, created_at';

function toSite(row: SiteRow): Site {
  return {
    id: row.id,
    name: row.name,
    baseUrl: row.base_url,
    wpUsername: row.wp_username,
    status: row.status,
    lastVerifiedAt: row.last_verified_at,
    createdAt: row.created_at,
  };
}

export async function listSites(userId: string): Promise<Site[]> {
  const { rows } = await pool.query<SiteRow>(
    `SELECT ${SITE_COLUMNS} FROM sites WHERE user_id = $1 ORDER BY created_at`,
    [userId],
  );
  return rows.map(toSite);
}

export async function findSite(userId: string, siteId: string): Promise<Site | null> {
  const { rows } = await pool.query<SiteRow>(
    `SELECT ${SITE_COLUMNS} FROM sites WHERE id = $1 AND user_id = $2`,
    [siteId, userId],
  );
  return rows[0] ? toSite(rows[0]) : null;
}

// Returns null when this user already has a site with that base_url.
// ON CONFLICT instead of "check, then insert", so two requests arriving together can't both succeed.
export async function insertSite(
  userId: string,
  site: { name: string; baseUrl: string; wpUsername: string; appPassword: Encrypted },
): Promise<Site | null> {
  const { ciphertext, iv, tag } = site.appPassword;
  const { rows } = await pool.query<SiteRow>(
    `INSERT INTO sites (user_id, name, base_url, wp_username,
                        app_password_ciphertext, app_password_iv, app_password_tag, last_verified_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, now())
     ON CONFLICT (user_id, base_url) DO NOTHING
     RETURNING ${SITE_COLUMNS}`,
    [userId, site.name, site.baseUrl, site.wpUsername, ciphertext, iv, tag],
  );
  return rows[0] ? toSite(rows[0]) : null;
}

// Missing fields keep their current value (COALESCE picks the first non-null).
export async function updateSite(
  userId: string,
  siteId: string,
  changes: { name?: string; wpUsername?: string; appPassword?: Encrypted },
): Promise<Site | null> {
  const { rows } = await pool.query<SiteRow>(
    `UPDATE sites SET
       name = COALESCE($3, name),
       wp_username = COALESCE($4, wp_username),
       app_password_ciphertext = COALESCE($5, app_password_ciphertext),
       app_password_iv = COALESCE($6, app_password_iv),
       app_password_tag = COALESCE($7, app_password_tag)
     WHERE id = $1 AND user_id = $2
     RETURNING ${SITE_COLUMNS}`,
    [
      siteId,
      userId,
      changes.name ?? null,
      changes.wpUsername ?? null,
      changes.appPassword?.ciphertext ?? null,
      changes.appPassword?.iv ?? null,
      changes.appPassword?.tag ?? null,
    ],
  );
  return rows[0] ? toSite(rows[0]) : null;
}

export async function recordVerification(
  userId: string,
  siteId: string,
  status: SiteStatus,
): Promise<Site | null> {
  const { rows } = await pool.query<SiteRow>(
    `UPDATE sites SET status = $3, last_verified_at = now()
     WHERE id = $1 AND user_id = $2
     RETURNING ${SITE_COLUMNS}`,
    [siteId, userId, status],
  );
  return rows[0] ? toSite(rows[0]) : null;
}

export async function deleteSite(userId: string, siteId: string): Promise<boolean> {
  const { rowCount } = await pool.query('DELETE FROM sites WHERE id = $1 AND user_id = $2', [
    siteId,
    userId,
  ]);
  return rowCount === 1;
}

type CredentialsRow = {
  base_url: string;
  wp_username: string;
  app_password_ciphertext: Buffer;
  app_password_iv: Buffer;
  app_password_tag: Buffer;
};

// The ONLY query that reads the password columns. Used right before a WordPress call.
export async function getSiteCredentials(
  userId: string,
  siteId: string,
): Promise<SiteCredentials | null> {
  const { rows } = await pool.query<CredentialsRow>(
    `SELECT base_url, wp_username, app_password_ciphertext, app_password_iv, app_password_tag
     FROM sites WHERE id = $1 AND user_id = $2`,
    [siteId, userId],
  );
  const row = rows[0];
  if (!row) return null;
  return {
    baseUrl: row.base_url,
    wpUsername: row.wp_username,
    appPassword: {
      ciphertext: row.app_password_ciphertext,
      iv: row.app_password_iv,
      tag: row.app_password_tag,
    },
  };
}
