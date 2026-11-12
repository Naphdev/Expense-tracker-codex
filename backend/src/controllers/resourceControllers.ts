import type { Request, Response } from "express";
import { Account } from "../models/Account.js";
import { Budget } from "../models/Budget.js";
import { SavingGoal } from "../models/SavingGoal.js";
import { RecurringTransaction } from "../models/RecurringTransaction.js";
import { AiConversation } from "../models/AiConversation.js";
import { created, ok } from "../utils/apiResponse.js";
import { AppError } from "../utils/AppError.js";
import { toMinorUnits, fromMinorUnits, percent } from "../utils/money.js";
import { parseCalendarDate } from "../utils/dates.js";
import { applyBalanceChange, getOwnedAccount, withOptionalTransaction } from "../services/accountBalance.js";
import { budgetProgress, estimateGoalCompletion } from "../services/financeCalc.js";
import { createRecurring, processDueRecurring, updateRecurring } from "../services/recurringService.js";
import { getAdvice } from "../services/aiService.js";
import { buildExcel, buildPdf } from "../services/reportService.js";
import { calendarParts } from "../utils/dates.js";
import { Transaction } from "../models/Transaction.js";
import { createTransaction, deleteTransaction, updateTransaction, type TxInput } from "../services/transactionService.js";
import { createBudgetThresholdNotifications } from "../services/notificationService.js";

export async function listAccounts(req: Request, res: Response) {
  const items = await Account.find({ userId: req.user!.id, isArchived: false }).sort({ name: 1 });
  return ok(res, items.map((item) => ({ ...item.toObject(), id: item.id, balance: fromMinorUnits(item.balanceMinor) })));
}

export async function createAccount(req: Request, res: Response) {
  const item = await Account.create({
    userId: req.user!.id,
    name: req.body.name,
    accountType: req.body.accountType,
    balanceMinor: toMinorUnits(req.body.balance ?? 0),
  });
  return created(res, { ...item.toObject(), id: item.id, balance: fromMinorUnits(item.balanceMinor) });
}

export async function updateAccount(req: Request, res: Response) {
  const item = await Account.findOneAndUpdate(
    { _id: req.params.id, userId: req.user!.id },
    { name: req.body.name, accountType: req.body.accountType },
    { new: true },
  );
  if (!item) throw new AppError("Account not found", 404);
  return ok(res, { ...item.toObject(), id: item.id, balance: fromMinorUnits(item.balanceMinor) });
}

export async function deleteAccount(req: Request, res: Response) {
  const item = await Account.findOneAndUpdate(
    { _id: req.params.id, userId: req.user!.id },
    { isArchived: true },
    { new: true },
  );
  if (!item) throw new AppError("Account not found", 404);
  return ok(res, { id: item.id });
}

export async function listBudgets(req: Request, res: Response) {
  const now = calendarParts(new Date(), req.user!.timezone);
  const month = Number(req.query.month ?? now.month);
  const year = Number(req.query.year ?? now.year);
  const data = await budgetProgress(req.user!.id, month, year);
  return ok(res, data);
}

export async function createBudget(req: Request, res: Response) {
  const item = await Budget.create({
    userId: req.user!.id,
    category: req.body.category,
    amountMinor: toMinorUnits(req.body.amount),
    month: req.body.month,
    year: req.body.year,
  });
  await createBudgetThresholdNotifications(req.user!.id);
  return created(res, { id: item.id, ...req.body });
}

export async function updateBudget(req: Request, res: Response) {
  const item = await Budget.findOneAndUpdate(
    { _id: req.params.id, userId: req.user!.id },
    {
      category: req.body.category,
      amountMinor: req.body.amount ? toMinorUnits(req.body.amount) : undefined,
      month: req.body.month,
      year: req.body.year,
    },
    { new: true },
  );
  if (!item) throw new AppError("Budget not found", 404);
  await createBudgetThresholdNotifications(req.user!.id);
  return ok(res, { id: item.id, category: item.category, amount: fromMinorUnits(item.amountMinor), month: item.month, year: item.year });
}

export async function deleteBudget(req: Request, res: Response) {
  const item = await Budget.findOneAndDelete({ _id: req.params.id, userId: req.user!.id });
  if (!item) throw new AppError("Budget not found", 404);
  return ok(res, { id: item.id });
}

export async function listGoals(req: Request, res: Response) {
  const items = await SavingGoal.find({ userId: req.user!.id }).sort({ createdAt: -1 });
  const data = await Promise.all(
    items.map(async (item) => {
      const estimate = await estimateGoalCompletion(req.user!.id, item);
      return {
        id: item.id,
        name: item.name,
        targetAmount: fromMinorUnits(item.targetAmountMinor),
        currentAmount: fromMinorUnits(item.currentAmountMinor),
        targetDate: item.targetDate,
        description: item.description,
        status: item.status,
        progress: percent(item.currentAmountMinor, item.targetAmountMinor),
        estimate,
      };
    }),
  );
  return ok(res, data);
}

export async function createGoal(req: Request, res: Response) {
  const item = await SavingGoal.create({
    userId: req.user!.id,
    name: req.body.name,
    targetAmountMinor: toMinorUnits(req.body.targetAmount),
    currentAmountMinor: toMinorUnits(req.body.currentAmount ?? 0),
    targetDate: parseCalendarDate(req.body.targetDate, req.user!.timezone),
    description: req.body.description ?? "",
  });
  return created(res, { id: item.id });
}

export async function updateGoal(req: Request, res: Response) {
  const item = await SavingGoal.findOne({ _id: req.params.id, userId: req.user!.id });
  if (!item) throw new AppError("Goal not found", 404);
  if (req.body.name) item.name = req.body.name;
  if (req.body.targetAmount) item.targetAmountMinor = toMinorUnits(req.body.targetAmount);
  if (req.body.currentAmount !== undefined) item.currentAmountMinor = toMinorUnits(req.body.currentAmount);
  if (req.body.targetDate) item.targetDate = parseCalendarDate(req.body.targetDate, req.user!.timezone);
  if (req.body.description !== undefined) item.description = req.body.description;
  if (req.body.status) item.status = req.body.status;
  if (item.currentAmountMinor >= item.targetAmountMinor) item.status = "completed";
  await item.save();
  return ok(res, { id: item.id });
}

export async function deleteGoal(req: Request, res: Response) {
  const item = await SavingGoal.findOneAndDelete({ _id: req.params.id, userId: req.user!.id });
  if (!item) throw new AppError("Goal not found", 404);
  return ok(res, { id: item.id });
}

export async function contributeGoal(req: Request, res: Response) {
  const amountMinor = toMinorUnits(req.body.amount);
  const result = await withOptionalTransaction(async (session) => {
    const goal = await SavingGoal.findOne({ _id: req.params.id, userId: req.user!.id }).session(session ?? null);
    if (!goal) throw new AppError("Goal not found", 404);
    if (req.body.accountId) {
      await getOwnedAccount(req.user!.id, req.body.accountId, session);
      await applyBalanceChange(req.body.accountId, -amountMinor, session);
    }
    goal.currentAmountMinor += amountMinor;
    if (goal.currentAmountMinor >= goal.targetAmountMinor) goal.status = "completed";
    await goal.save({ session });
    return goal;
  });
  return ok(res, {
    id: result.id,
    currentAmount: fromMinorUnits(result.currentAmountMinor),
    status: result.status,
  });
}

export async function listRecurring(req: Request, res: Response) {
  await processDueRecurring(req.user!.id);
  const items = await RecurringTransaction.find({ userId: req.user!.id }).sort({ nextExecutionDate: 1 });
  return ok(
    res,
    items.map((item) => ({
      ...item.toObject(),
      id: item.id,
      amount: fromMinorUnits(item.amountMinor),
    })),
  );
}

export async function createRecurringCtrl(req: Request, res: Response) {
  const item = await createRecurring(req.user!.id, req.body, req.user!.timezone);
  return created(res, { id: item.id, amount: fromMinorUnits(item.amountMinor) });
}

export async function updateRecurringCtrl(req: Request, res: Response) {
  const item = await updateRecurring(req.user!.id, req.params.id, req.body, req.user!.timezone);
  return ok(res, { id: item.id });
}

export async function deleteRecurring(req: Request, res: Response) {
  const item = await RecurringTransaction.findOneAndDelete({ _id: req.params.id, userId: req.user!.id });
  if (!item) throw new AppError("Recurring transaction not found", 404);
  return ok(res, { id: item.id });
}

export async function calendar(req: Request, res: Response) {
  const year = Number(req.query.year ?? calendarParts(new Date(), req.user!.timezone).year);
  const month = Number(req.query.month ?? calendarParts(new Date(), req.user!.timezone).month);
  const start = parseCalendarDate(`${year}-${String(month).padStart(2, "0")}-01`);
  const endMonth = month === 12 ? 1 : month + 1;
  const endYear = month === 12 ? year + 1 : year;
  const end = new Date(parseCalendarDate(`${endYear}-${String(endMonth).padStart(2, "0")}-01`).getTime() - 1);
  const [transactions, recurring] = await Promise.all([
    Transaction.find({ userId: req.user!.id, date: { $gte: start, $lte: end } }).sort({ date: 1 }),
    RecurringTransaction.find({ userId: req.user!.id, isActive: true }),
  ]);
  return ok(res, {
    year,
    month,
    days: transactions.map((tx) => ({
      id: tx.id,
      date: tx.date,
      type: tx.type,
      title: tx.title,
      amount: fromMinorUnits(tx.amountMinor),
      category: tx.category,
      recurring: Boolean(tx.recurringTransactionId),
    })),
    scheduled: recurring.map((item) => ({
      id: item.id,
      title: item.title,
      type: item.type,
      amount: fromMinorUnits(item.amountMinor),
      nextExecutionDate: item.nextExecutionDate,
      frequency: item.frequency,
    })),
  });
}

export async function aiAdvice(req: Request, res: Response) {
  const data = await getAdvice(req.user!.id, req.user!.timezone, req.body.message, req.body.conversationId);
  return ok(res, data);
}

export async function listConversations(req: Request, res: Response) {
  const items = await AiConversation.find({ userId: req.user!.id }).sort({ updatedAt: -1 }).select("title updatedAt createdAt");
  return ok(res, items.map((item) => ({ id: item.id, title: item.title, updatedAt: item.updatedAt })));
}

export async function getConversation(req: Request, res: Response) {
  const item = await AiConversation.findOne({ _id: req.params.id, userId: req.user!.id });
  if (!item) throw new AppError("Conversation not found", 404);
  return ok(res, { id: item.id, title: item.title, messages: item.messages });
}

export async function deleteConversation(req: Request, res: Response) {
  const item = await AiConversation.findOneAndDelete({ _id: req.params.id, userId: req.user!.id });
  if (!item) throw new AppError("Conversation not found", 404);
  return ok(res, { id: item.id });
}

export async function exportPdf(req: Request, res: Response) {
  const range = (req.query.range as "this_month") || "this_month";
  const buffer = await buildPdf(req.user!.id, req.user!.timezone, range, req.query.startDate as string, req.query.endDate as string);
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", "attachment; filename=finance-report.pdf");
  return res.send(buffer);
}

export async function exportExcel(req: Request, res: Response) {
  const range = (req.query.range as "this_month") || "this_month";
  const buffer = await buildExcel(req.user!.id, req.user!.timezone, range, req.query.startDate as string, req.query.endDate as string);
  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  res.setHeader("Content-Disposition", "attachment; filename=finance-report.xlsx");
  return res.send(buffer);
}

export async function syncOffline(req: Request, res: Response) {
  const results = [];
  for (const op of req.body.operations) {
    try {
      if (op.entity !== "transaction") continue;
      const payload = op.payload as unknown as TxInput & { id?: string };
      if (op.method === "create") {
        const createdTx = await createTransaction(req.user!.id, { ...payload, clientRequestId: op.clientRequestId }, req.user!.timezone);
        results.push({ clientRequestId: op.clientRequestId, status: "ok", data: createdTx });
      } else if (op.method === "update") {
        const id = String(payload.id ?? "");
        if (!id || id.startsWith("local-")) {
          const createdTx = await createTransaction(
            req.user!.id,
            { ...payload, clientRequestId: op.clientRequestId },
            req.user!.timezone,
          );
          results.push({ clientRequestId: op.clientRequestId, status: "ok", data: createdTx });
        } else {
          const updated = await updateTransaction(req.user!.id, id, payload, req.user!.timezone);
          results.push({ clientRequestId: op.clientRequestId, status: "ok", data: updated });
        }
      } else if (op.method === "delete") {
        const id = String((op.payload as { id?: string }).id ?? "");
        if (id && !id.startsWith("local-")) {
          await deleteTransaction(req.user!.id, id);
        }
        results.push({ clientRequestId: op.clientRequestId, status: "ok" });
      }
    } catch (error) {
      results.push({
        clientRequestId: op.clientRequestId,
        status: "error",
        message: error instanceof Error ? error.message : "Sync failed",
      });
    }
  }
  return ok(res, { results });
}
