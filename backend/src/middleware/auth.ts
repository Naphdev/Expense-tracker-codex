import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { loadEnv } from "../config/env.js";
import { User } from "../models/User.js";
import { AppError } from "../utils/AppError.js";

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  preferredLanguage: "th" | "en";
  preferredTheme: "system" | "light" | "dark";
  currency: "THB";
  timezone: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export function signToken(userId: string, email: string) {
  const env = loadEnv();
  return jwt.sign({ sub: userId, email }, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions["expiresIn"],
  });
}

export function cookieOptions() {
  const env = loadEnv();
  const production = env.NODE_ENV === "production";
  return {
    httpOnly: true,
    secure: production,
    sameSite: (production ? "none" : "lax") as "none" | "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: "/",
  };
}

export function setAuthCookie(res: Response, token: string) {
  const env = loadEnv();
  res.cookie(env.COOKIE_NAME, token, cookieOptions());
}

export function clearAuthCookie(res: Response) {
  const env = loadEnv();
  res.clearCookie(env.COOKIE_NAME, { ...cookieOptions(), maxAge: 0 });
}

export async function requireAuth(req: Request, _res: Response, next: NextFunction) {
  try {
    const env = loadEnv();
    const token = req.cookies?.[env.COOKIE_NAME];
    if (!token) throw new AppError("Authentication required", 401);
    const payload = jwt.verify(token, env.JWT_SECRET) as { sub: string; email: string };
    const user = await User.findById(payload.sub);
    if (!user) throw new AppError("Authentication required", 401);
    req.user = {
      id: user.id,
      email: user.email,
      name: user.name,
      preferredLanguage: user.preferredLanguage,
      preferredTheme: user.preferredTheme,
      currency: user.currency,
      timezone: user.timezone,
    };
    next();
  } catch (error) {
    if (error instanceof AppError) return next(error);
    if (error instanceof jwt.JsonWebTokenError) {
      return next(new AppError("Session expired", 401));
    }
    next(error);
  }
}
