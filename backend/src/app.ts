import compression from "compression";
import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import morgan from "morgan";
import mongoose from "mongoose";
import { loadEnv } from "./config/env.js";
import { errorHandler, notFound } from "./middleware/errorHandler.js";
import { sanitizeMongo } from "./middleware/sanitize.js";
import { router } from "./routes/index.js";

export function createApp() {
  const env = loadEnv();
  const app = express();
  if (env.TRUST_PROXY) app.set("trust proxy", 1);

  app.use(helmet());
  app.use(compression());
  app.use(
    cors({
      origin: env.FRONTEND_ORIGIN.split(",").map((item) => item.trim()),
      credentials: true,
    }),
  );
  app.use(express.json({ limit: "1mb" }));
  app.use(cookieParser());
  app.use(sanitizeMongo);
  if (env.NODE_ENV !== "test") app.use(morgan("tiny"));

  app.use(
    "/api",
    rateLimit({
      windowMs: 15 * 60 * 1000,
      limit: 400,
      standardHeaders: true,
      legacyHeaders: false,
    }),
  );
  app.use(
    "/api/auth/login",
    rateLimit({ windowMs: 15 * 60 * 1000, limit: 20, standardHeaders: true, legacyHeaders: false }),
  );
  app.use(
    "/api/auth/register",
    rateLimit({ windowMs: 15 * 60 * 1000, limit: 10, standardHeaders: true, legacyHeaders: false }),
  );
  app.use(
    "/api/ai",
    rateLimit({ windowMs: 60 * 60 * 1000, limit: 30, standardHeaders: true, legacyHeaders: false }),
  );

  app.get("/health", (_req, res) => res.json({ success: true, data: { status: "ok" } }));
  app.get("/ready", (_req, res) => {
    const ready = mongoose.connection.readyState === 1;
    return res.status(ready ? 200 : 503).json({
      success: ready,
      data: { status: ready ? "ready" : "not_ready" },
    });
  });
  app.use("/api", router);
  app.use(notFound);
  app.use(errorHandler);
  return app;
}
