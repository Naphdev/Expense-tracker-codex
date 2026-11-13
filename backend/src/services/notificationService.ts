import { FinanceNotification } from "../models/FinanceNotification.js";
import { RecurringTransaction } from "../models/RecurringTransaction.js";
import { User } from "../models/User.js";
import { budgetProgress } from "./financeCalc.js";
import { calendarParts } from "../utils/dates.js";
import { fromMinorUnits } from "../utils/money.js";

const BUDGET_THRESHOLDS = [80, 100] as const;
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

async function insertOnce(
  userId: string,
  eventKey: string,
  type: "budget_threshold" | "recurring_due",
  data: Record<string, unknown>,
) {
  try {
    await FinanceNotification.updateOne(
      { userId, eventKey },
      { $setOnInsert: { userId, eventKey, type, data, readAt: null } },
      { upsert: true },
    );
  } catch (error) {
    if ((error as { code?: number }).code !== 11000) throw error;
  }
}

export async function createBudgetThresholdNotifications(userId: string) {
  const user = await User.findById(userId).select("timezone").lean();
  if (!user) return;

  const { month, year } = calendarParts(new Date(), user.timezone || "Asia/Bangkok");
  const progress = await budgetProgress(userId, month, year);

  for (const budget of progress) {
    for (const threshold of BUDGET_THRESHOLDS) {
      if (budget.percentUsed < threshold) continue;
      await insertOnce(
        userId,
        `budget:${budget.id}:${year}-${String(month).padStart(2, "0")}:${threshold}`,
        "budget_threshold",
        {
          category: budget.category,
          month,
          year,
          threshold,
          percentUsed: budget.percentUsed,
          spent: budget.spent,
          amount: budget.amount,
          remaining: budget.remaining,
        },
      );
    }
  }
}

export async function createUpcomingRecurringNotifications(userId?: string) {
  const now = new Date();
  const dueBefore = new Date(now.getTime() + ONE_DAY_MS);
  const filter: Record<string, unknown> = {
    isActive: true,
    nextExecutionDate: { $gte: now, $lte: dueBefore },
  };
  if (userId) filter.userId = userId;

  const dueSoon = await RecurringTransaction.find(filter)
    .select("userId type title amountMinor category frequency nextExecutionDate")
    .limit(500);

  for (const schedule of dueSoon) {
    const dueDate = schedule.nextExecutionDate.toISOString().slice(0, 10);
    const ownerId = schedule.userId.toString();
    await insertOnce(
      ownerId,
      `recurring:${schedule.id}:${dueDate}`,
      "recurring_due",
      {
        recurringId: schedule.id,
        title: schedule.title,
        type: schedule.type,
        amount: fromMinorUnits(schedule.amountMinor),
        category: schedule.category,
        frequency: schedule.frequency,
        dueDate,
      },
    );
  }
}

export async function listUserNotifications(userId: string, limit = 100) {
  const [items, unreadCount] = await Promise.all([
    FinanceNotification.find({ userId }).sort({ createdAt: -1 }).limit(limit).lean(),
    FinanceNotification.countDocuments({ userId, readAt: null }),
  ]);
  return {
    items: items.map((item) => ({ ...item, id: item._id.toString() })),
    unreadCount,
  };
}

export async function markNotificationRead(userId: string, id: string) {
  return FinanceNotification.findOneAndUpdate(
    { _id: id, userId },
    { $set: { readAt: new Date() } },
    { new: true },
  );
}

export async function markAllNotificationsRead(userId: string) {
  const result = await FinanceNotification.updateMany({ userId, readAt: null }, { $set: { readAt: new Date() } });
  return { modified: result.modifiedCount };
}

export async function deleteNotification(userId: string, id: string) {
  return FinanceNotification.findOneAndDelete({ _id: id, userId });
}

export async function deleteAllNotifications(userId: string) {
  const result = await FinanceNotification.deleteMany({ userId });
  return { deleted: result.deletedCount };
}
