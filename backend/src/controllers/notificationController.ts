import type { Request, Response } from "express";
import { ok } from "../utils/apiResponse.js";
import { AppError } from "../utils/AppError.js";
import { listUserNotifications, markAllNotificationsRead, markNotificationRead } from "../services/notificationService.js";

export async function list(req: Request, res: Response) {
  const requestedLimit = Number(req.query.limit ?? 50);
  const limit = Number.isFinite(requestedLimit) ? Math.min(Math.max(Math.floor(requestedLimit), 1), 100) : 50;
  return ok(res, await listUserNotifications(req.user!.id, limit));
}

export async function markRead(req: Request, res: Response) {
  const item = await markNotificationRead(req.user!.id, req.params.id);
  if (!item) throw new AppError("Notification not found", 404);
  return ok(res, { id: item.id, readAt: item.readAt });
}

export async function markAllRead(_req: Request, res: Response) {
  return ok(res, await markAllNotificationsRead(_req.user!.id));
}
