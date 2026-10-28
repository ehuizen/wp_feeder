// Loads posts (the list, or one post with its publications) and lets pages reload after a change.
import { useCallback } from 'react'
import { getPost, listPosts, type PostDetail, type PostSummary } from '@/features/posts/posts-api'
import { useResource } from '@/lib/use-resource'

export function usePosts() {
  return useResource<PostSummary[]>(listPosts, [])
}

export function usePost(id: string) {
  const load = useCallback(() => getPost(id), [id])
  return useResource<PostDetail | null>(load, null)
}
