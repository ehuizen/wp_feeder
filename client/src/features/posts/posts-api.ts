// Browser side of the posts API: one function per /api/posts call, including publish and retry.
import { api } from '@/lib/api'

// Dates arrive as ISO strings because JSON has no Date type.
export type Post = {
  id: string
  title: string
  content: string
  excerpt: string
  createdAt: string
  updatedAt: string
}

export type PublicationCounts = { total: number; success: number; failed: number; pending: number }

export type PostSummary = Omit<Post, 'content'> & {
  publications: PublicationCounts
  lastPublishedAt: string | null
  lastAttemptedAt: string | null
}

export type PublicationStatus = 'pending' | 'success' | 'failed'

export type Publication = {
  siteId: string
  siteName: string
  siteBaseUrl: string
  status: PublicationStatus
  remotePostId: number | null
  url: string | null
  error: string | null
  attemptedAt: string | null
}

export type PostDetail = Post & { publications: Publication[] }

export type PostFields = { title: string; content: string; excerpt: string }

export type PublishResult = { siteId: string; status: 'success' | 'failed'; url?: string; error?: string }

const json = (body: unknown): RequestInit => ({ body: JSON.stringify(body) })

export const listPosts = () => api<PostSummary[]>('/posts')

export const getPost = (id: string) => api<PostDetail>(`/posts/${id}`)

export const createPost = (post: PostFields) => api<Post>('/posts', { method: 'POST', ...json(post) })

export const updatePost = (id: string, changes: Partial<PostFields>) =>
  api<Post>(`/posts/${id}`, { method: 'PATCH', ...json(changes) })

export const deletePost = (id: string) => api<void>(`/posts/${id}`, { method: 'DELETE' })

export const publishPost = (id: string, siteIds: string[]) =>
  api<{ results: PublishResult[] }>(`/posts/${id}/publish`, { method: 'POST', ...json({ siteIds }) })

export const retryFailed = (id: string) =>
  api<{ results: PublishResult[] }>(`/posts/${id}/retry`, { method: 'POST' })
