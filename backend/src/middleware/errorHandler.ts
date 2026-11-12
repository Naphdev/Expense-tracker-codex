import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { AppError } from "../utils/AppError.js";
import { fail } from "../utils/apiResponse.js";

export function notFound(_req: Request, res: Response) {
  return fail(res, "Not found", 404);
}

function isMongoNetworkError(error: unknown) {
  const visited = new Set<object>();
  let current = error;
  while (typeof current === "object" && current !== null && !visited.has(current)) {
    visited.add(current);
    const candidate = current as { name?: unknown; cause?: unknown };
    if (
      candidate.name === "MongoNetworkError" ||
      candidate.name === "MongoServerSelectionError" ||
      candidate.name === "MongooseServerSelectionError" ||
      candidate.name === "MongoTopologyClosedError"
    ) {
      return true;
    }
    current = candidate.cause;
  }
  return false;
}

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof AppError) {
    return fail(res, err.message, err.status, err.details);
  }
  if (err instanceof ZodError) {
    return fail(res, "Validation failed", 422, err.flatten());
  }
  if (isMongoNetworkError(err)) {
    res.setHeader("Retry-After", "2");
    console.error(err);
    return fail(res, "Database temporarily unavailable", 503);
  }
  const mongoErr = err as { code?: number; name?: string };
  if (mongoErr?.code === 11000) {
    return fail(res, "Duplicate record", 409);
  }
  console.error(err);
  return fail(res, "Internal server error", 500);
}
