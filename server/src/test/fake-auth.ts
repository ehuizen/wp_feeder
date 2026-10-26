import type { Request, RequestHandler } from 'express';

// Stands in for Auth0's auth() middleware: makes every request signed in as these claims.
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
