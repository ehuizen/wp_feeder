// GET /api/me: returns the signed-in user.
import { Router } from 'express';

export const meRouter = Router();

// requireAuth has already upserted the user; return it. Never tokens.
meRouter.get('/me', (_req, res) => {
  res.json(res.locals.user);
});
