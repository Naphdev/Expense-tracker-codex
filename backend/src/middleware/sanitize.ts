import type { NextFunction, Request, Response } from "express";

function clean(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(clean);
  if (value && typeof value === "object") {
    const result: Record<string, unknown> = {};
    for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
      if (key.startsWith("$") || key.includes(".")) continue;
      result[key] = clean(nested);
    }
    return result;
  }
  return value;
}

export function sanitizeMongo(req: Request, _res: Response, next: NextFunction) {
  req.body = clean(req.body);
  req.query = clean(req.query) as typeof req.query;
  req.params = clean(req.params) as typeof req.params;
  next();
}
