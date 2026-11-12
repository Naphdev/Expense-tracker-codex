import type { Request, Response } from "express";
import { categoryBreakdown, dashboardSummary, monthlyTrends } from "../services/financeCalc.js";
import { processDueRecurring } from "../services/recurringService.js";
import { rangeForPreset } from "../utils/dates.js";
import { ok } from "../utils/apiResponse.js";

function rangeFrom(req: Request) {
  const range = (req.query.range as "this_week" | "this_month" | "last_month" | "this_year" | "custom") || "this_month";
  const startDate = req.query.startDate as string | undefined;
  const endDate = req.query.endDate as string | undefined;
  return { range, startDate, endDate };
}

export async function summary(req: Request, res: Response) {
  await processDueRecurring(req.user!.id);
  const { range, startDate, endDate } = rangeFrom(req);
  const data = await dashboardSummary(req.user!.id, req.user!.timezone, range, startDate, endDate);
  return ok(res, data);
}

export async function trends(req: Request, res: Response) {
  const { range, startDate, endDate } = rangeFrom(req);
  const { start, end } = rangeForPreset(range, req.user!.timezone, startDate, endDate);
  const data = await monthlyTrends(req.user!.id, start, end);
  return ok(res, data);
}

export async function categories(req: Request, res: Response) {
  const { range, startDate, endDate } = rangeFrom(req);
  const type = (req.query.type as "income" | "expense") || "expense";
  const { start, end } = rangeForPreset(range, req.user!.timezone, startDate, endDate);
  const data = await categoryBreakdown(req.user!.id, start, end, type);
  return ok(res, data);
}
