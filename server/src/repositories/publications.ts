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
