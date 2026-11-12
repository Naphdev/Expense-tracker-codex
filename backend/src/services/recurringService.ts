import mongoose from "mongoose";
import { RecurringTransaction } from "../models/RecurringTransaction.js";
import { Transaction } from "../models/Transaction.js";
import { AppError } from "../utils/AppError.js";
import { nextOccurrence, parseCalendarDate } from "../utils/dates.js";
import { toMinorUnits } from "../utils/money.js";
import { applyTransactionEffect, withOptionalTransaction } from "./accountBalance.js";
import { createBudgetThresholdNotifications, createUpcomingRecurringNotifications } from "./notificationService.js";

export async function processDueRecurring(userId?: string) {
  await createUpcomingRecurringNotifications(userId);
  const now = new Date();
  const filter: Record<string, unknown> = { isActive: true, nextExecutionDate: { $lte: now } };
  if (userId) filter.userId = userId;
  const due = await RecurringTransaction.find(filter).limit(200);
  let created = 0;
  const usersWithNewExpenses = new Set<string>();

  for (const item of due) {
    try {
      await withOptionalTransaction(async (session) => {
        const locked = await RecurringTransaction.findOneAndUpdate(
          { _id: item._id, isActive: true, nextExecutionDate: item.nextExecutionDate },
          { $set: { lastProcessedAt: now } },
          { new: true, session },
        );
        if (!locked) return;

        const exists = await Transaction.findOne({
          recurringTransactionId: locked._id,
          date: locked.nextExecutionDate,
        }).session(session ?? null);
        if (!exists) {
          const [tx] = await Transaction.create(
            [
              {
                userId: locked.userId,
                type: locked.type,
                title: locked.title,
                amountMinor: locked.amountMinor,
                category: locked.category,
                date: locked.nextExecutionDate,
                paymentMethod: locked.paymentMethod,
                sourceAccountId: locked.type === "expense" ? locked.accountId : null,
                destinationAccountId: locked.type === "income" ? locked.accountId : null,
                description: "Recurring transaction",
                status: "completed",
                recurringTransactionId: locked._id,
              },
            ],
            session ? { session } : undefined,
          );
          await applyTransactionEffect(tx, session);
          created += 1;
          if (locked.type === "expense") usersWithNewExpenses.add(locked.userId.toString());
        }

        let next = nextOccurrence(locked.nextExecutionDate, locked.frequency);
        while (next.getTime() <= now.getTime()) {
          next = nextOccurrence(next, locked.frequency);
        }
        if (locked.endDate && next.getTime() > locked.endDate.getTime()) {
          locked.isActive = false;
        }
        locked.nextExecutionDate = next;
        await locked.save({ session });
      });
    } catch (error) {
      const duplicate = (error as { code?: number }).code === 11000;
      if (!duplicate) console.error("Recurring processing error", item.id);
    }
  }
  await Promise.all([...usersWithNewExpenses].map((ownerId) => createBudgetThresholdNotifications(ownerId)));
  return { processed: due.length, created };
}

export async function createRecurring(userId: string, body: Record<string, unknown>, timezone: string) {
  const startDate = parseCalendarDate(String(body.startDate), timezone);
  const endDate = body.endDate ? parseCalendarDate(String(body.endDate), timezone) : null;
  const created = await RecurringTransaction.create({
    userId,
    type: body.type,
    title: body.title,
    amountMinor: toMinorUnits(Number(body.amount)),
    category: body.category,
    paymentMethod: body.paymentMethod ?? "cash",
    accountId: body.accountId ?? null,
    frequency: body.frequency,
    startDate,
    endDate,
    nextExecutionDate: startDate,
    isActive: body.isActive ?? true,
  });
  await processDueRecurring(userId);
  return created;
}

export async function updateRecurring(userId: string, id: string, body: Record<string, unknown>, timezone: string) {
  const item = await RecurringTransaction.findOne({ _id: id, userId });
  if (!item) throw new AppError("Recurring transaction not found", 404);
  if (body.title) item.title = String(body.title);
  if (body.amount) item.amountMinor = toMinorUnits(Number(body.amount));
  if (body.category) item.category = String(body.category);
  if (body.frequency) item.frequency = body.frequency as never;
  if (body.paymentMethod) item.paymentMethod = body.paymentMethod as never;
  if (body.accountId !== undefined) item.accountId = body.accountId as never;
  if (body.isActive !== undefined) item.isActive = Boolean(body.isActive);
  if (body.startDate) item.startDate = parseCalendarDate(String(body.startDate), timezone);
  if (body.endDate !== undefined) item.endDate = body.endDate ? parseCalendarDate(String(body.endDate), timezone) : null;
  await item.save();
  return item;
}

export function toObjectId(id: string) {
  return new mongoose.Types.ObjectId(id);
}
