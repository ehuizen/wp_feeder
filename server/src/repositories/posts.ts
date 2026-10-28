// SQL for the posts table; every query is filtered by user.
import { pool } from '../db/pool.js';

export type Post = {
  id: string;
  title: string;
  content: string;
  excerpt: string;
  createdAt: Date;
  updatedAt: Date;
};

export type PublicationCounts = { total: number; success: number; failed: number; pending: number };

// List view: no content (it can be long), plus where the post has been sent.
export type PostSummary = Omit<Post, 'content'> & {
  publications: PublicationCounts;
  lastPublishedAt: Date | null;
  lastAttemptedAt: Date | null;
};

type PostRow = {
  id: string;
  title: string;
  content: string;
  excerpt: string;
  created_at: Date;
  updated_at: Date;
};

type PostSummaryRow = Omit<PostRow, 'content'> & {
  total: number;
  success: number;
  failed: number;
  pending: number;
  last_published_at: Date | null;
  last_attempted_at: Date | null;
};

const POST_COLUMNS = 'id, title, content, excerpt, created_at, updated_at';

function toPost(row: PostRow): Post {
  return {
    id: row.id,
    title: row.title,
    content: row.content,
    excerpt: row.excerpt,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listPosts(userId: string): Promise<PostSummary[]> {
  const { rows } = await pool.query<PostSummaryRow>(
    `SELECT p.id, p.title, p.excerpt, p.created_at, p.updated_at,
            COUNT(pub.id)::int AS total,
            COUNT(pub.id) FILTER (WHERE pub.status = 'success')::int AS success,
            COUNT(pub.id) FILTER (WHERE pub.status = 'failed')::int AS failed,
            COUNT(pub.id) FILTER (WHERE pub.status = 'pending')::int AS pending,
            MAX(pub.attempted_at) FILTER (WHERE pub.status = 'success') AS last_published_at,
            MAX(pub.attempted_at) AS last_attempted_at
     FROM posts p
     LEFT JOIN publications pub ON pub.post_id = p.id
     WHERE p.user_id = $1
     GROUP BY p.id
     ORDER BY p.updated_at DESC`,
    [userId],
  );
  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    excerpt: row.excerpt,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    publications: { total: row.total, success: row.success, failed: row.failed, pending: row.pending },
    lastPublishedAt: row.last_published_at,
    lastAttemptedAt: row.last_attempted_at,
  }));
}

export async function findPost(userId: string, postId: string): Promise<Post | null> {
  const { rows } = await pool.query<PostRow>(
    `SELECT ${POST_COLUMNS} FROM posts WHERE id = $1 AND user_id = $2`,
    [postId, userId],
  );
  return rows[0] ? toPost(rows[0]) : null;
}

export async function insertPost(
  userId: string,
  post: { title: string; content: string; excerpt: string },
): Promise<Post> {
  const { rows } = await pool.query<PostRow>(
    `INSERT INTO posts (user_id, title, content, excerpt)
     VALUES ($1, $2, $3, $4)
     RETURNING ${POST_COLUMNS}`,
    [userId, post.title, post.content, post.excerpt],
  );
  return toPost(rows[0]!);
}

// Missing fields keep their current value (COALESCE picks the first non-null).
export async function updatePost(
  userId: string,
  postId: string,
  changes: { title?: string; content?: string; excerpt?: string },
): Promise<Post | null> {
  const { rows } = await pool.query<PostRow>(
    `UPDATE posts SET
       title = COALESCE($3, title),
       content = COALESCE($4, content),
       excerpt = COALESCE($5, excerpt),
       updated_at = now()
     WHERE id = $1 AND user_id = $2
     RETURNING ${POST_COLUMNS}`,
    [postId, userId, changes.title ?? null, changes.content ?? null, changes.excerpt ?? null],
  );
  return rows[0] ? toPost(rows[0]) : null;
}

export async function deletePost(userId: string, postId: string): Promise<boolean> {
  const { rowCount } = await pool.query('DELETE FROM posts WHERE id = $1 AND user_id = $2', [
    postId,
    userId,
  ]);
  return rowCount === 1;
}
