import mongoose from "mongoose";
import { Transaction } from "../models/Transaction.js";
import { AppError } from "../utils/AppError.js";
import { parseCalendarDate } from "../utils/dates.js";
import { toMinorUnits } from "../utils/money.js";
import { createBudgetThresholdNotifications } from "./notificationService.js";
import {
  applyTransactionEffect,
  getOwnedAccount,
  reverseTransactionEffect,
  withOptionalTransaction,
} from "./accountBalance.js";

export interface TxInput {
  type: "income" | "expense" | "transfer";
  title: string;
  amount: number;
  category: string;
  date: string;
  paymentMethod: "cash" | "bank" | "card" | "e_wallet" | "other";
  sourceAccountId?: string | null;
  destinationAccountId?: string | null;
  description?: string;
  clientRequestId?: string;
  status?: "completed" | "pending" | "cancelled";
  recurringTransactionId?: string;
}

function serialize(tx: mongoose.Document) {
  const value = tx.toObject();
  return {
    ...value,
    id: tx.id,
    amount: Number(((value as { amountMinor: number }).amountMinor / 100).toFixed(2)),
  };
}

export async function createTransaction(
  userId: string,
  input: TxInput,
  timezone: string,
  options: { affectsBalance?: boolean; createBudgetAlerts?: boolean } = {},
) {
  if (input.clientRequestId) {
    const existing = await Transaction.findOne({ userId, clientRequestId: input.clientRequestId });
    if (existing) return serialize(existing);
  }

  const amountMinor = toMinorUnits(input.amount);
  const date = parseCalendarDate(input.date, timezone);
  const category = input.type === "transfer" ? "transfer" : input.category;
  const status = input.status ?? "completed";

  const result = await withOptionalTransaction(async (session) => {
    if (input.type === "transfer") {
      await getOwnedAccount(userId, input.sourceAccountId!, session);
      await getOwnedAccount(userId, input.destinationAccountId!, session);
    } else if (input.type === "income" && input.destinationAccountId) {
      await getOwnedAccount(userId, input.destinationAccountId, session);
    } else if (input.type === "expense" && input.sourceAccountId) {
      await getOwnedAccount(userId, input.sourceAccountId, session);
    }

    const payload = {
      userId,
      type: input.type,
      title: input.title,
      amountMinor,
      category,
      date,
      paymentMethod: input.paymentMethod,
      sourceAccountId: input.sourceAccountId ?? null,
      destinationAccountId: input.destinationAccountId ?? null,
      description: input.description ?? "",
      status,
      affectsBalance: options.affectsBalance ?? true,
      recurringTransactionId: input.recurringTransactionId ?? null,
      ...(input.clientRequestId ? { clientRequestId: input.clientRequestId } : {}),
    };
    const created = session
      ? (await Transaction.create([payload], { session }))[0]
      : await Transaction.create(payload);
    if (options.affectsBalance !== false) await applyTransactionEffect(created, session);
    return serialize(created);
  });

  if (input.type === "expense" && status === "completed" && options.createBudgetAlerts !== false) {
    await createBudgetThresholdNotifications(userId);
  }
  return result;
}

export async function updateTransaction(userId: string, id: string, input: Partial<TxInput>, timezone: string) {
  const result = await withOptionalTransaction(async (session) => {
    const existing = await Transaction.findOne({ _id: id, userId }).session(session ?? null);
    if (!existing) throw new AppError("Transaction not found", 404);

    await reverseTransactionEffect(existing, session);

    if (input.title !== undefined) existing.title = input.title;
    if (input.amount !== undefined) existing.amountMinor = toMinorUnits(input.amount);
    if (input.category !== undefined && existing.type !== "transfer") existing.category = input.category;
    if (input.date !== undefined) existing.date = parseCalendarDate(input.date, timezone);
    if (input.paymentMethod !== undefined) existing.paymentMethod = input.paymentMethod;
    if (input.description !== undefined) existing.description = input.description;
    if (input.status !== undefined) existing.status = input.status;
    if (input.sourceAccountId !== undefined) existing.sourceAccountId = input.sourceAccountId as never;
    if (input.destinationAccountId !== undefined) existing.destinationAccountId = input.destinationAccountId as never;

    await existing.save({ session });
    await applyTransactionEffect(existing, session);
    return serialize(existing);
  });
  await createBudgetThresholdNotifications(userId);
  return result;
}

export async function deleteTransaction(userId: string, id: string) {
  return withOptionalTransaction(async (session) => {
    const existing = await Transaction.findOne({ _id: id, userId }).session(session ?? null);
    if (!existing) throw new AppError("Transaction not found", 404);
    await reverseTransactionEffect(existing, session);
    await existing.deleteOne({ session });
    return { id };
  });
}

export async function getTransaction(userId: string, id: string) {
  const tx = await Transaction.findOne({ _id: id, userId });
  if (!tx) throw new AppError("Transaction not found", 404);
  return serialize(tx);
}

export async function listTransactions(
  userId: string,
  query: {
    page: number;
    limit: number;
    search?: string;
    type?: string;
    category?: string;
    startDate?: string;
    endDate?: string;
    sort: string;
    status?: string;
  },
  timezone: string,
) {
  const filter: Record<string, unknown> = { userId };
  if (query.type) filter.type = query.type;
  if (query.category) filter.category = query.category;
  if (query.status) filter.status = query.status;
  if (query.search) filter.title = { $regex: query.search, $options: "i" };
  if (query.startDate || query.endDate) {
    filter.date = {
      ...(query.startDate ? { $gte: parseCalendarDate(query.startDate, timezone) } : {}),
      ...(query.endDate ? { $lte: parseCalendarDate(query.endDate, timezone) } : {}),
    };
  }

  const sortMap: Record<string, Record<string, 1 | -1>> = {
    date_desc: { date: -1, createdAt: -1 },
    date_asc: { date: 1 },
    amount_desc: { amountMinor: -1 },
    amount_asc: { amountMinor: 1 },
  };

  const skip = (query.page - 1) * query.limit;
  const [items, total] = await Promise.all([
    Transaction.find(filter).sort(sortMap[query.sort] ?? { date: -1 }).skip(skip).limit(query.limit),
    Transaction.countDocuments(filter),
  ]);

  return {
    items: items.map(serialize),
    page: query.page,
    limit: query.limit,
    total,
    pages: Math.ceil(total / query.limit),
  };
}
