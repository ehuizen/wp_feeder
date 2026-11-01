// SQL for the publications table: one row per (post, site), scoped through the post's owner.
import { pool } from '../db/pool.js';

export type PublicationStatus = 'pending' | 'success' | 'failed';

export type Publication = {
  siteId: string;
  siteName: string;
  siteBaseUrl: string;
  status: PublicationStatus;
  remotePostId: number | null;
  url: string | null;
  error: string | null;
  attemptedAt: Date | null;
};

type PublicationRow = {
  site_id: string;
  site_name: string;
  site_base_url: string;
  status: PublicationStatus;
  remote_post_id: string | null; // bigint comes back from pg as a string
  remote_url: string | null;
  error_message: string | null;
  attempted_at: Date | null;
};

function toPublication(row: PublicationRow): Publication {
  return {
    siteId: row.site_id,
    siteName: row.site_name,
    siteBaseUrl: row.site_base_url,
    status: row.status,
    remotePostId: row.remote_post_id === null ? null : Number(row.remote_post_id),
    url: row.remote_url,
    error: row.error_message,
    attemptedAt: row.attempted_at,
  };
}

export async function listPublications(userId: string, postId: string): Promise<Publication[]> {
  const { rows } = await pool.query<PublicationRow>(
    `SELECT pub.site_id, s.name AS site_name, s.base_url AS site_base_url, pub.status,
            pub.remote_post_id, pub.remote_url, pub.error_message, pub.attempted_at
     FROM publications pub
     JOIN posts p ON p.id = pub.post_id
     JOIN sites s ON s.id = pub.site_id
     WHERE pub.post_id = $1 AND p.user_id = $2
     ORDER BY s.name`,
    [postId, userId],
  );
  return rows.map(toPublication);
}

export type PublicationUpdate = {
  status: PublicationStatus;
  remotePostId?: number;
  url?: string;
  error?: string;
  attemptedAt?: Date;
};

// One row per (post, site). The SELECT only yields a row when both the post and the site belong to this user.
// A failed attempt keeps the old remote id and url, so the next send updates that WordPress post.
export async function upsertPublication(
  userId: string,
  postId: string,
  siteId: string,
  update: PublicationUpdate,
): Promise<void> {
  await pool.query(
    `INSERT INTO publications (post_id, site_id, status, remote_post_id, remote_url, error_message, attempted_at)
     SELECT p.id, s.id, $4::text, $5::bigint, $6::text, $7::text, $8::timestamptz
     FROM posts p
     JOIN sites s ON s.id = $2 AND s.user_id = $3
     WHERE p.id = $1 AND p.user_id = $3
     ON CONFLICT (post_id, site_id) DO UPDATE SET
       status = EXCLUDED.status,
       remote_post_id = COALESCE(EXCLUDED.remote_post_id, publications.remote_post_id),
       remote_url = COALESCE(EXCLUDED.remote_url, publications.remote_url),
       error_message = EXCLUDED.error_message,
       attempted_at = COALESCE(EXCLUDED.attempted_at, publications.attempted_at)`,
    [
      postId,
      siteId,
      userId,
      update.status,
      update.remotePostId ?? null,
      update.url ?? null,
      update.error ?? null,
      update.attemptedAt ?? null,
    ],
  );
}

export async function remotePostIds(userId: string, postId: string): Promise<Map<string, number>> {
  const { rows } = await pool.query<{ site_id: string; remote_post_id: string }>(
    `SELECT pub.site_id, pub.remote_post_id
     FROM publications pub JOIN posts p ON p.id = pub.post_id
     WHERE pub.post_id = $1 AND p.user_id = $2 AND pub.remote_post_id IS NOT NULL`,
    [postId, userId],
  );
  return new Map(rows.map((row) => [row.site_id, Number(row.remote_post_id)]));
}

export async function failedSiteIds(userId: string, postId: string): Promise<string[]> {
  const { rows } = await pool.query<{ site_id: string }>(
    `SELECT pub.site_id
     FROM publications pub JOIN posts p ON p.id = pub.post_id
     WHERE pub.post_id = $1 AND p.user_id = $2 AND pub.status = 'failed'`,
    [postId, userId],
  );
  return rows.map((row) => row.site_id);
}
