import path from "node:path";
import express from "express";
import { healthRouter } from "./routes/health.js";

const clientDist = path.resolve(import.meta.dirname, "../../client/dist");

export function createApp() {
  const app = express();
  app.use(express.json());

  app.use("/api", healthRouter);
  app.use("/api", (_req, res) => {
    res.status(404).json({ error: { code: "not_found", message: "Route not found" } });
  });

  app.use(express.static(clientDist));
  app.get("/{*splat}", (_req, res) => {
    res.sendFile(path.join(clientDist, "index.html"));
  });

  return app;
}
