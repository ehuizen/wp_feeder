// Test helper: pretends a user is signed in, without Auth0.
import type { Request, RequestHandler } from 'express';

export function signedInAs(claims: { sub: string; email?: string; name?: string }): RequestHandler {
  return (req, _res, next) => {
    const oidc: Pick<Request['oidc'], 'isAuthenticated' | 'user'> = {
      isAuthenticated: () => true,
      user: claims,
    };
    req.oidc = oidc as Request['oidc'];
    next();
  };
}
