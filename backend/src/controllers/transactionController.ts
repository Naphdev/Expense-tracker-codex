import type { Request, Response } from "express";
import { created, ok } from "../utils/apiResponse.js";
import {
  createTransaction,
  deleteTransaction,
  getTransaction,
  listTransactions,
  updateTransaction,
} from "../services/transactionService.js";
import { paginationQuery } from "../validators/finance.js";
import { previewTransactionImport, commitTransactionImport } from "../services/transactionImportService.js";

export async function list(req: Request, res: Response) {
  const query = paginationQuery.parse(req.query);
  const data = await listTransactions(req.user!.id, query, req.user!.timezone);
  return ok(res, data);
}

export async function create(req: Request, res: Response) {
  const data = await createTransaction(req.user!.id, req.body, req.user!.timezone);
  return created(res, data);
}

export async function importPreview(req: Request, res: Response) {
  const items = await previewTransactionImport(req.user!.id, req.user!.timezone, req.body.items);
  return ok(res, { items });
}

export async function importBatch(req: Request, res: Response) {
  const result = await commitTransactionImport(req.user!.id, req.user!.timezone, req.body.items);
  return created(res, result);
}

export async function getOne(req: Request, res: Response) {
  const data = await getTransaction(req.user!.id, req.params.id);
  return ok(res, data);
}

export async function update(req: Request, res: Response) {
  const data = await updateTransaction(req.user!.id, req.params.id, req.body, req.user!.timezone);
  return ok(res, data);
}

export async function remove(req: Request, res: Response) {
  const data = await deleteTransaction(req.user!.id, req.params.id);
  return ok(res, data);
}

export async function createBulk(req: Request, res: Response) {
  const { items } = req.body;

  if (!Array.isArray(items) || items.length === 0) {
    throw new Error("Items must be a non-empty array");
  }

  if (items.length > 100) {
    throw new Error("Maximum 100 transactions per request");
  }

  const results = [];

  for (const item of items) {
    const data = await createTransaction(
      req.user!.id,
      item,
      req.user!.timezone
    );

    results.push(data);
  }

  return created(res, {
    count: results.length,
    items: results,
  });
}
