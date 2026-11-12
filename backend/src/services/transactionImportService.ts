import { randomUUID } from "node:crypto";
import mongoose from "mongoose";
import { Transaction } from "../models/Transaction.js";
import { transactionSchema } from "../validators/finance.js";
import { AppError } from "../utils/AppError.js";
import { getOwnedAccount } from "./accountBalance.js";
import { createBudgetThresholdNotifications } from "./notificationService.js";
import { createTransaction, type TxInput } from "./transactionService.js";
import { parseCalendarDate } from "../utils/dates.js";
import { toMinorUnits } from "../utils/money.js";

type ImportCandidate = {
  rowNumber: number;
  transaction: TxInput;
  clientRequestId: string;
  allowDuplicate: boolean;
  date: Date;
  amountMinor: number;
};

type ImportRowResult = {
  rowNumber: number;
  status: "ready" | "duplicate" | "invalid" | "imported" | "already_imported" | "failed";
  errors?: string[];
  duplicate?: { id: string; title: string; date: string; amount: number };
  transactionId?: string;
};

function normalizeTitle(value: string) {
  return value.normalize("NFKC").trim().replace(/\s+/g, " ").toLocaleLowerCase();
}

function duplicateKey(row: Pick<ImportCandidate, "transaction" | "date" | "amountMinor">) {
  const accountId = row.transaction.sourceAccountId ?? row.transaction.destinationAccountId ?? "-";
  return [
    row.date.toISOString().slice(0, 10),
    row.transaction.type,
    row.amountMinor,
    normalizeTitle(row.transaction.title),
    accountId,
  ].join("|");
}

function parseIsoDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split("-").map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day, 12));
  if (parsed.getUTCFullYear() !== year || parsed.getUTCMonth() !== month - 1 || parsed.getUTCDate() !== day) return null;
  return parsed;
}

function getRowParts(value: unknown, index: number) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { rowNumber: index + 1, transaction: value, allowDuplicate: false };
  }
  const row = value as Record<string, unknown>;
  return {
    rowNumber: Number.isInteger(row.rowNumber) && Number(row.rowNumber) > 0 ? Number(row.rowNumber) : index + 1,
    transaction: row.transaction ?? row.data ?? value,
    allowDuplicate: row.allowDuplicate === true,
  };
}

async function prepareRows(userId: string, timezone: string, values: unknown[]) {
  const results: Array<{ candidate?: ImportCandidate; result: ImportRowResult }> = [];

  for (let index = 0; index < values.length; index += 1) {
    const parts = getRowParts(values[index], index);
    const parsed = transactionSchema.shape.body.safeParse(parts.transaction);
    if (!parsed.success) {
      results.push({
        result: {
          rowNumber: parts.rowNumber,
          status: "invalid",
          errors: parsed.error.issues.map((issue) => issue.message),
        },
      });
      continue;
    }
    if (parsed.data.type === "transfer") {
      results.push({
        result: { rowNumber: parts.rowNumber, status: "invalid", errors: ["Transfers need two accounts and cannot be inferred from one statement row"] },
      });
      continue;
    }
    const date = parseIsoDate(parsed.data.date);
    if (!date) {
      results.push({ result: { rowNumber: parts.rowNumber, status: "invalid", errors: ["Date must be a valid YYYY-MM-DD date"] } });
      continue;
    }

    const accountIds = new Set([parsed.data.sourceAccountId, parsed.data.destinationAccountId].filter((id): id is string => Boolean(id)));
    let accountUnavailable = false;
    for (const accountId of accountIds) {
      try {
        await getOwnedAccount(userId, accountId);
      } catch {
        accountUnavailable = true;
        break;
      }
    }
    if (accountUnavailable) {
      results.push({ result: { rowNumber: parts.rowNumber, status: "invalid", errors: ["Selected account is unavailable"] } });
      continue;
    }

    const input: TxInput = {
      ...parsed.data,
      date: date.toISOString().slice(0, 10),
      clientRequestId: parsed.data.clientRequestId ?? randomUUID(),
    };
    results.push({
      candidate: {
        rowNumber: parts.rowNumber,
        transaction: input,
        clientRequestId: input.clientRequestId!,
        allowDuplicate: parts.allowDuplicate,
        date: parseCalendarDate(input.date, timezone),
        amountMinor: toMinorUnits(input.amount),
      },
      result: { rowNumber: parts.rowNumber, status: "ready" },
    });
  }

  return results;
}

async function findStoredDuplicates(userId: string, candidates: ImportCandidate[]) {
  const matchable = candidates.filter((candidate) => candidate.transaction.type === "income" || candidate.transaction.type === "expense");
  if (!matchable.length) return new Map<string, { id: string; title: string; date: string; amount: number }>();

  const filters = matchable.map((candidate) => ({
    date: candidate.date,
    type: candidate.transaction.type,
    amountMinor: candidate.amountMinor,
  }));
  const existing = await Transaction.find({ userId, $or: filters })
    .select("title date type amountMinor sourceAccountId destinationAccountId")
    .limit(2000)
    .lean();
  const duplicateMap = new Map<string, { id: string; title: string; date: string; amount: number }>();
  for (const transaction of existing) {
    const key = duplicateKey({
      transaction: {
        type: transaction.type,
        title: transaction.title,
        amount: transaction.amountMinor / 100,
        category: "other",
        date: "",
        paymentMethod: "other",
        sourceAccountId: transaction.sourceAccountId?.toString() ?? null,
        destinationAccountId: transaction.destinationAccountId?.toString() ?? null,
      },
      date: transaction.date,
      amountMinor: transaction.amountMinor,
    });
    duplicateMap.set(key, {
      id: transaction._id.toString(),
      title: transaction.title,
      date: transaction.date.toISOString().slice(0, 10),
      amount: transaction.amountMinor / 100,
    });
  }
  return duplicateMap;
}

export async function previewTransactionImport(userId: string, timezone: string, values: unknown[]) {
  const prepared = await prepareRows(userId, timezone, values);
  const candidates = prepared.flatMap((item) => (item.candidate ? [item.candidate] : []));
  const stored = await findStoredDuplicates(userId, candidates);
  const seen = new Map<string, number>();

  return prepared.map(({ candidate, result }) => {
    if (!candidate) return result;
    const key = duplicateKey(candidate);
    const duplicate = stored.get(key);
    const seenAt = seen.get(key);
    seen.set(key, candidate.rowNumber);
    if (duplicate) return { ...result, status: "duplicate" as const, duplicate };
    if (seenAt !== undefined) return { ...result, status: "duplicate" as const, duplicate: { id: "", title: "Another row in this file", date: candidate.date.toISOString().slice(0, 10), amount: candidate.transaction.amount, rowNumber: seenAt } };
    return { ...result, transaction: candidate.transaction };
  });
}

export async function commitTransactionImport(userId: string, timezone: string, values: unknown[]) {
  const prepared = await prepareRows(userId, timezone, values);
  const candidates = prepared.flatMap((item) => (item.candidate ? [item.candidate] : []));
  const stored = await findStoredDuplicates(userId, candidates);
  const seen = new Map<string, { id: string; title: string; date: string; amount: number }>();
  const results: ImportRowResult[] = [];
  let created = 0;
  let skipped = 0;
  let failed = 0;

  for (const item of prepared) {
    if (!item.candidate) {
      results.push(item.result);
      failed += 1;
      continue;
    }
    const candidate = item.candidate;
    const key = duplicateKey(candidate);
    const existingRequest = await Transaction.findOne({ userId, clientRequestId: candidate.clientRequestId }).select("_id");
    if (existingRequest) {
      results.push({ rowNumber: candidate.rowNumber, status: "already_imported", transactionId: existingRequest.id });
      skipped += 1;
      continue;
    }

    const duplicate = stored.get(key) ?? seen.get(key);
    if (duplicate && !candidate.allowDuplicate) {
      results.push({ rowNumber: candidate.rowNumber, status: "duplicate", duplicate });
      skipped += 1;
      continue;
    }

    try {
      const transaction = await createTransaction(userId, candidate.transaction, timezone, {
        affectsBalance: false,
        createBudgetAlerts: false,
      });
      const createdRef = transaction as { id?: string; _id?: mongoose.Types.ObjectId; title: string; date: Date | string; amount: number };
      const transactionId = createdRef.id ?? createdRef._id?.toString();
      results.push({ rowNumber: candidate.rowNumber, status: "imported", transactionId });
      seen.set(key, {
        id: transactionId ?? "",
        title: createdRef.title,
        date: new Date(createdRef.date).toISOString().slice(0, 10),
        amount: createdRef.amount,
      });
      created += 1;
    } catch (error) {
      const retried = await Transaction.findOne({ userId, clientRequestId: candidate.clientRequestId }).select("_id");
      if (retried) {
        results.push({ rowNumber: candidate.rowNumber, status: "already_imported", transactionId: retried.id });
        skipped += 1;
        continue;
      }
      results.push({
        rowNumber: candidate.rowNumber,
        status: "failed",
        errors: [error instanceof AppError ? error.message : "Could not import this row"],
      });
      failed += 1;
    }
  }

  if (created > 0) await createBudgetThresholdNotifications(userId);
  return { created, skipped, failed, items: results };
}
