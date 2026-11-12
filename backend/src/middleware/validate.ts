import type { NextFunction, Request, Response } from "express";
import type { AnyZodObject, ZodTypeAny } from "zod";

export function validate(schema: AnyZodObject | ZodTypeAny) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const parsed = schema.parse({
      body: req.body,
      query: req.query,
      params: req.params,
    });
    if ("body" in parsed) req.body = parsed.body;
    if ("query" in parsed) req.query = parsed.query;
    if ("params" in parsed) req.params = parsed.params;
    next();
  };
}
