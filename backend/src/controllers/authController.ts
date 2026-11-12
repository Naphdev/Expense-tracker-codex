import type { Request, Response } from "express";
import { loginUser, publicUser, registerUser, requestPasswordReset, resetPassword } from "../services/authService.js";
import { clearAuthCookie, cookieOptions, setAuthCookie, signToken } from "../middleware/auth.js";
import { ensureCsrfCookie } from "../middleware/csrf.js";
import { User } from "../models/User.js";
import { created, ok } from "../utils/apiResponse.js";
import { loadEnv } from "../config/env.js";

export async function register(req: Request, res: Response) {
  const user = await registerUser(req.body);
  const token = signToken(user.id, user.email);
  setAuthCookie(res, token);
  const csrf = ensureCsrfCookie(req, res);
  return created(res, { user, csrfToken: csrf }, "Registered");
}

export async function login(req: Request, res: Response) {
  const user = await loginUser(req.body.email, req.body.password);
  const token = signToken(user.id, user.email);
  setAuthCookie(res, token);
  const csrf = ensureCsrfCookie(req, res);
  return ok(res, { user, csrfToken: csrf }, "Logged in");
}

export async function logout(_req: Request, res: Response) {
  clearAuthCookie(res);
  const env = loadEnv();
  res.clearCookie(env.CSRF_COOKIE_NAME, { ...cookieOptions(), httpOnly: false, maxAge: 0 });
  return ok(res, { ok: true }, "Logged out");
}

export async function me(req: Request, res: Response) {
  const csrfToken = ensureCsrfCookie(req, res);
  return ok(res, { user: req.user, csrfToken });
}

export async function forgot(req: Request, res: Response) {
  const result = await requestPasswordReset(req.body.email);
  return ok(res, result);
}

export async function reset(req: Request, res: Response) {
  const user = await resetPassword(req.body.token, req.body.password);
  return ok(res, { user }, "Password updated");
}

export async function updateMe(req: Request, res: Response) {
  const user = await User.findByIdAndUpdate(req.user!.id, req.body, { new: true });
  if (!user) return ok(res, { user: req.user });
  return ok(res, { user: publicUser(user) });
}
