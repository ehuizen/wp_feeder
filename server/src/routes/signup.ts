import { Router } from 'express';

export const signupRouter = Router();

// Like /login, but Auth0 opens on the sign-up screen.
// returnTo '/' because the default (this URL) would send new users straight back to /signup.
signupRouter.get('/signup', (_req, res) =>
  res.oidc.login({ returnTo: '/', authorizationParams: { screen_hint: 'signup' } }),
);
