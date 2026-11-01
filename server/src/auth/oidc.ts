// Auth0 login: creates /login, /callback, /logout and reads the session cookie.
import type { RequestHandler } from "express";
import { auth } from "express-openid-connect";
import type { Env } from "../config/env.js";

export function createAuth(env: Env): RequestHandler {
  return auth({
    authRequired: false, // /api is guarded by requireAuth (401 JSON), not by a login redirect
    auth0Logout: true, // /logout also ends the Auth0 session
    secret: env.SESSION_SECRET,
    baseURL: env.BASE_URL,
    clientID: env.AUTH0_CLIENT_ID,
    clientSecret: env.AUTH0_CLIENT_SECRET,
    issuerBaseURL: env.AUTH0_ISSUER_BASE_URL,
    authorizationParams: {
      response_type: "code", // the server swaps the code for tokens using the client secret
      scope: "openid profile email",
    },
    session: {
      cookie: { secure: env.NODE_ENV === "production", sameSite: "Lax" }, // httpOnly is the default
    },
  });
}
