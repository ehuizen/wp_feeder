// /api/posts endpoints: check input, call the service, turn results into HTTP codes.
import { Router } from 'express';
import { z } from 'zod';
import * as posts from '../services/posts.js';
import { isUuid, sendNotFound, sendValidationError } from './http-errors.js';

export const postsRouter = Router();

const fields = {
  title: z.string().trim().min(1).max(200),
  content: z.string().max(1_000_000),
  excerpt: z.string().trim().max(1_000),
};

const createPostSchema = z.object({
  title: fields.title,
  content: fields.content.default(''),
  excerpt: fields.excerpt.default(''),
});

const updatePostSchema = z
  .strictObject(fields)
  .partial()
  .refine((changes) => Object.keys(changes).length > 0, 'Nothing to update');

postsRouter.param('id', (_req, res, next, id: string) => {
  if (!isUuid(id)) return sendNotFound(res, 'Post');
  next();
});

postsRouter.get('/posts', async (_req, res) => {
  res.json(await posts.listPosts(res.locals.user.id));
});

postsRouter.post('/posts', async (req, res) => {
  const body = createPostSchema.safeParse(req.body);
  if (!body.success) return sendValidationError(res, body.error);
  res.status(201).json(await posts.createPost(res.locals.user.id, body.data));
});

postsRouter.get('/posts/:id', async (req, res) => {
  const post = await posts.getPost(res.locals.user.id, req.params.id);
  if (!post) return sendNotFound(res, 'Post');
  res.json(post);
});

postsRouter.patch('/posts/:id', async (req, res) => {
  const body = updatePostSchema.safeParse(req.body);
  if (!body.success) return sendValidationError(res, body.error);

  const post = await posts.updatePost(res.locals.user.id, req.params.id, body.data);
  if (!post) return sendNotFound(res, 'Post');
  res.json(post);
});

postsRouter.delete('/posts/:id', async (req, res) => {
  const deleted = await posts.deletePost(res.locals.user.id, req.params.id);
  if (!deleted) return sendNotFound(res, 'Post');
  res.status(204).end();
});
