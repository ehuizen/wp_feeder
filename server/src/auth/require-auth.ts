import type { RequestHandler } from 'express';
import type { User } from '../repositories/users.js';
import { getOrCreateUser } from '../services/users.js';

declare global {
  namespace Express {
    interface Locals {
      // Set by requireAuth. Only read it in routes mounted after requireAuth.
      user: User;
    }
  }
}

// Gate for every /api route except /api/health. Returns 401 JSON instead of the SDK's
// requiresAuth() redirect, because fetch() can't follow a redirect to the login page.
// When signed in, upserts our users row and exposes it to routes as res.locals.user.
export const requireAuth: RequestHandler = async (req, res, next) => {
  if (!req.oidc.isAuthenticated()) {
    res.status(401).json({ error: { code: 'unauthorized', message: 'Sign in required' } });
    return;
  }
  res.locals.user = await getOrCreateUser(req.oidc.user);
  next();
};
