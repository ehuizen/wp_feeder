// GET /api/me: returns the signed-in user.
import { Router } from 'express';
import { deleteAccount } from '../services/users.js';

export const meRouter = Router();

// requireAuth has already upserted the user; return it. Never tokens.
meRouter.get('/me', (_req, res) => {
  res.json(res.locals.user);
});

meRouter.delete('/me', async (_req, res) => {
  await deleteAccount(res.locals.user.id);
  res.status(204).end();
});
