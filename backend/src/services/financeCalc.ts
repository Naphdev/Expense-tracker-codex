import mongoose from "mongoose";
import { Account } from "../models/Account.js";
import { Budget } from "../models/Budget.js";
import { SavingGoal } from "../models/SavingGoal.js";
import { Transaction } from "../models/Transaction.js";
import { calendarParts, parseCalendarDate, rangeForPreset } from "../utils/dates.js";
import { fromMinorUnits, percent } from "../utils/money.js";

function oid(userId: string) {
  return new mongoose.Types.ObjectId(userId);
}

export async function totalsForRange(userId: string, start: Date, end: Date) {
  const user = oid(userId);
  const [income, expense, savings] = await Promise.all([
    Transaction.aggregate([
      { $match: { userId: user, type: "income", status: "completed", date: { $gte: start, $lte: end } } },
      { $group: { _id: null, total: { $sum: "$amountMinor" } } },
    ]),
    Transaction.aggregate([
      { $match: { userId: user, type: "expense", status: "completed", date: { $gte: start, $lte: end } } },
      { $group: { _id: null, total: { $sum: "$amountMinor" } } },
    ]),
    SavingGoal.aggregate([
      { $match: { userId: user, status: { $ne: "cancelled" } } },
      { $group: { _id: null, total: { $sum: "$currentAmountMinor" } } },
    ]),
  ]);

  const incomeMinor = income[0]?.total ?? 0;
  const expenseMinor = expense[0]?.total ?? 0;
  const savingsMinor = savings[0]?.total ?? 0;
  const cashFlowMinor = incomeMinor - expenseMinor;

  return {
    incomeMinor,
    expenseMinor,
    cashFlowMinor,
    savingsMinor,
    savingsRate: percent(savingsMinor, incomeMinor),
    cashFlowRate: percent(Math.max(cashFlowMinor, 0), incomeMinor),
    income: fromMinorUnits(incomeMinor),
    expenses: fromMinorUnits(expenseMinor),
    netCashFlow: fromMinorUnits(cashFlowMinor),
    totalSavings: fromMinorUnits(savingsMinor),
  };
}

export async function categoryBreakdown(userId: string, start: Date, end: Date, type: "income" | "expense") {
  const rows = await Transaction.aggregate([
    { $match: { userId: oid(userId), type, status: "completed", date: { $gte: start, $lte: end } } },
    { $group: { _id: "$category", total: { $sum: "$amountMinor" } } },
    { $sort: { total: -1 } },
  ]);
  const total = rows.reduce((sum, row) => sum + row.total, 0);
  return rows.map((row) => ({
    category: row._id as string,
    amountMinor: row.total as number,
    amount: fromMinorUnits(row.total),
    percent: percent(row.total, total),
  }));
}

export async function monthlyTrends(userId: string, start: Date, end: Date) {
  const rows = await Transaction.aggregate([
    { $match: { userId: oid(userId), status: "completed", type: { $in: ["income", "expense"] }, date: { $gte: start, $lte: end } } },
    {
      $group: {
        _id: { year: { $year: "$date" }, month: { $month: "$date" }, type: "$type" },
        total: { $sum: "$amountMinor" },
      },
    },
    { $sort: { "_id.year": 1, "_id.month": 1 } },
  ]);

  const map = new Map<string, { month: string; income: number; expenses: number }>();
  for (const row of rows) {
    const key = `${row._id.year}-${String(row._id.month).padStart(2, "0")}`;
    const current = map.get(key) ?? { month: key, income: 0, expenses: 0 };
    if (row._id.type === "income") current.income = fromMinorUnits(row.total);
    else current.expenses = fromMinorUnits(row.total);
    map.set(key, current);
  }
  return [...map.values()];
}

export async function budgetProgress(userId: string, month: number, year: number) {
  const start = parseCalendarDate(`${year}-${String(month).padStart(2, "0")}-01`);
  const endMonth = month === 12 ? 1 : month + 1;
  const endYear = month === 12 ? year + 1 : year;
  const end = new Date(parseCalendarDate(`${endYear}-${String(endMonth).padStart(2, "0")}-01`).getTime() - 1);

  const [budgets, spent] = await Promise.all([
    Budget.find({ userId, month, year }),
    Transaction.aggregate([
      { $match: { userId: oid(userId), type: "expense", status: "completed", date: { $gte: start, $lte: end } } },
      { $group: { _id: "$category", total: { $sum: "$amountMinor" } } },
    ]),
  ]);

  const spentMap = new Map(spent.map((row) => [row._id as string, row.total as number]));
  return budgets.map((budget) => {
    const spentMinor = spentMap.get(budget.category) ?? 0;
    const remainingMinor = budget.amountMinor - spentMinor;
    const used = percent(spentMinor, budget.amountMinor);
    let warning: "ok" | "warning" | "full" | "exceeded" = "ok";
    if (used > 100) warning = "exceeded";
    else if (used >= 100) warning = "full";
    else if (used >= 80) warning = "warning";
    return {
      id: budget.id,
      category: budget.category,
      amount: fromMinorUnits(budget.amountMinor),
      spent: fromMinorUnits(spentMinor),
      remaining: fromMinorUnits(remainingMinor),
      percentUsed: used,
      warning,
      month,
      year,
    };
  });
}

export async function estimateGoalCompletion(userId: string, goal: { currentAmountMinor: number; targetAmountMinor: number; createdAt: Date; targetDate: Date }) {
  const remaining = Math.max(goal.targetAmountMinor - goal.currentAmountMinor, 0);
  if (remaining === 0) return { estimatedDate: new Date(), monthlyPace: 0, onTrack: true };
  const elapsedMs = Date.now() - goal.createdAt.getTime();
  const elapsedMonths = Math.max(elapsedMs / (1000 * 60 * 60 * 24 * 30), 1 / 30);
  const monthlyPace = goal.currentAmountMinor / elapsedMonths;
  if (monthlyPace <= 0) return { estimatedDate: null, monthlyPace: 0, onTrack: false };
  const monthsNeeded = remaining / monthlyPace;
  const estimatedDate = new Date();
  estimatedDate.setMonth(estimatedDate.getMonth() + monthsNeeded);
  return {
    estimatedDate,
    monthlyPace: fromMinorUnits(Math.round(monthlyPace)),
    onTrack: estimatedDate.getTime() <= goal.targetDate.getTime(),
  };
}

export async function dashboardSummary(
  userId: string,
  timezone: string,
  range: "this_week" | "this_month" | "last_month" | "this_year" | "custom",
  startDate?: string,
  endDate?: string,
) {
  const { start, end } = rangeForPreset(range, timezone, startDate, endDate);
  const today = calendarParts(new Date(), timezone);
  const [totals, categories, trends, budgets, recent, goals, accounts] = await Promise.all([
    totalsForRange(userId, start, end),
    categoryBreakdown(userId, start, end, "expense"),
    monthlyTrends(userId, start, end),
    budgetProgress(userId, today.month, today.year),
    Transaction.find({ userId, status: "completed" }).sort({ date: -1, createdAt: -1 }).limit(8),
    SavingGoal.find({ userId, status: "active" }).sort({ targetDate: 1 }).limit(5),
    Account.find({ userId, isArchived: false }),
  ]);
  const availableBalanceMinor = accounts.reduce((sum, account) => sum + account.balanceMinor, 0);

  const budgetUsed = budgets.length
    ? percent(
        budgets.reduce((sum, item) => sum + item.spent * 100, 0),
        budgets.reduce((sum, item) => sum + item.amount * 100, 0),
      )
    : 0;

  return {
    range: { start, end, preset: range },
    totals: {
      ...totals,
      remainingBalance: totals.netCashFlow,
      availableBalance: fromMinorUnits(availableBalanceMinor),
      monthlySavingRate: totals.savingsRate,
      monthlyBudgetUsage: budgetUsed,
    },
    categories,
    trends,
    budgets,
    recentTransactions: recent.map((tx) => ({
      id: tx.id,
      type: tx.type,
      title: tx.title,
      amount: fromMinorUnits(tx.amountMinor),
      category: tx.category,
      date: tx.date,
      paymentMethod: tx.paymentMethod,
    })),
    goals: goals.map((goal) => ({
      id: goal.id,
      name: goal.name,
      targetAmount: fromMinorUnits(goal.targetAmountMinor),
      currentAmount: fromMinorUnits(goal.currentAmountMinor),
      progress: percent(goal.currentAmountMinor, goal.targetAmountMinor),
      targetDate: goal.targetDate,
    })),
  };
}
