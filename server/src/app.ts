// Builds the Express app and mounts everything in order: auth, API routes, the built client.
import path from "node:path";
import express from "express";
import type { ErrorRequestHandler, RequestHandler } from "express";
import { createAuth } from "./auth/oidc.js";
import { requireAuth } from "./auth/require-auth.js";
import { env } from "./config/env.js";
import { healthRouter } from "./routes/health.js";
import { meRouter } from "./routes/me.js";
import { signupRouter } from "./routes/signup.js";
import { sitesRouter } from "./routes/sites.js";

const clientDist = path.resolve(import.meta.dirname, "../../client/dist");

type AppOptions = {
  // Tests pass a fake that sets req.oidc, so they can act signed in without Auth0.
  authMiddleware?: RequestHandler;
};

export function createApp({ authMiddleware = createAuth(env) }: AppOptions = {}) {
  const app = express();
  app.use(express.json());
  app.use(authMiddleware);

  // Public. Anything mounted before requireAuth needs no session.
  app.use("/api", healthRouter);
  app.use(signupRouter);

  app.use("/api", requireAuth);
  app.use("/api", meRouter);
  app.use("/api", sitesRouter);
  app.use("/api", (_req, res) => {
    res.status(404).json({ error: { code: "not_found", message: "Route not found" } });
  });

  app.use(express.static(clientDist));
  app.get("/{*splat}", (_req, res) => {
    res.sendFile(path.join(clientDist, "index.html"));
  });

  app.use(errorHandler);
  return app;
}

// Last resort: keep the error shape and never send a stack trace to the browser.
const errorHandler: ErrorRequestHandler = (err: unknown, _req, res, _next) => {
  const status = clientErrorStatus(err);
  if (status === 500) console.error(err);
  res.status(status).json({
    error: status === 500
      ? { code: "internal_error", message: "Something went wrong" }
      : { code: "bad_request", message: "Request could not be processed" },
  });
};

// Middleware errors (bad JSON body, failed login callback) carry a 4xx status; keep it.
function clientErrorStatus(err: unknown): number {
  if (typeof err === "object" && err !== null && "status" in err && typeof err.status === "number"
    && err.status >= 400 && err.status < 500) {
    return err.status;
  }
  return 500;
}
