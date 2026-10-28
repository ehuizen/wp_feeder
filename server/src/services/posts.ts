// The rules for posts: plain CRUD, always for the signed-in user; one post comes with its publications.
import * as postsRepo from '../repositories/posts.js';
import type { Post, PostSummary } from '../repositories/posts.js';
import { listPublications, type Publication } from '../repositories/publications.js';

export type PostDetail = Post & { publications: Publication[] };

type PostFields = { title: string; content: string; excerpt: string };

export function listPosts(userId: string): Promise<PostSummary[]> {
  return postsRepo.listPosts(userId);
}

export async function getPost(userId: string, postId: string): Promise<PostDetail | null> {
  const post = await postsRepo.findPost(userId, postId);
  if (!post) return null;
  return { ...post, publications: await listPublications(userId, postId) };
}

export function createPost(userId: string, post: PostFields): Promise<Post> {
  return postsRepo.insertPost(userId, post);
}

export function updatePost(userId: string, postId: string, changes: Partial<PostFields>): Promise<Post | null> {
  return postsRepo.updatePost(userId, postId, changes);
}

export function deletePost(userId: string, postId: string): Promise<boolean> {
  return postsRepo.deletePost(userId, postId);
}
