import crypto from "node:crypto";
import type { NextFunction, Request, Response } from "express";
import { loadEnv } from "../config/env.js";
import { AppError } from "../utils/AppError.js";

export function csrfCookieOptions() {
  const env = loadEnv();
  const production = env.NODE_ENV === "production";
  return {
    httpOnly: false,
    secure: production,
    sameSite: (production ? "none" : "lax") as "none" | "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: "/",
  };
}

export function ensureCsrfCookie(req: Request, res: Response) {
  const env = loadEnv();
  let token = req.cookies?.[env.CSRF_COOKIE_NAME];
  if (!token) {
    token = crypto.randomBytes(24).toString("hex");
    res.cookie(env.CSRF_COOKIE_NAME, token, csrfCookieOptions());
  }
  return token as string;
}

export function verifyCsrf(req: Request, _res: Response, next: NextFunction) {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) return next();
  const env = loadEnv();
  const cookieToken = req.cookies?.[env.CSRF_COOKIE_NAME];
  const headerToken = req.get("x-csrf-token");
  if (!cookieToken || !headerToken || cookieToken !== headerToken) {
    return next(new AppError("Invalid CSRF token", 403));
  }
  next();
}
