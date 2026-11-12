import bcrypt from "bcryptjs";
import { createHash } from "node:crypto";
import mongoose from "mongoose";
import { connectDb, disconnectDb } from "../config/db.js";
import { loadEnv } from "../config/env.js";
import { Account } from "../models/Account.js";
import { Budget } from "../models/Budget.js";
import { RecurringTransaction } from "../models/RecurringTransaction.js";
import { SavingGoal } from "../models/SavingGoal.js";
import { Transaction } from "../models/Transaction.js";
import { User } from "../models/User.js";
import { createTransaction } from "../services/transactionService.js";
import { parseCalendarDate } from "../utils/dates.js";
import { toMinorUnits } from "../utils/money.js";

const DEMO_EMAIL = "demo@expenseflow.test";
const DEMO_PASSWORD = "ExpenseFlowDemo!2026";
const DEMO_NAME = "Mali Demo";
const TIMEZONE = "Asia/Bangkok";

type AccountName = "Cash" | "Bank" | "E-Wallet" | "Credit Card";
type DemoTransaction = {
  key: string;
  dayOffset: number;
  type: "income" | "expense";
  title: string;
  amount: number;
  category: string;
  paymentMethod: "cash" | "bank" | "card" | "e_wallet";
  account: AccountName;
  description?: string;
};

const transactions: DemoTransaction[] = [
  { key: "rent", dayOffset: -26, type: "expense", title: "Monthly rent", amount: 12000, category: "housing", paymentMethod: "bank", account: "Bank", description: "Apartment rent" },
  { key: "bts-pass", dayOffset: -28, type: "expense", title: "BTS Rabbit top-up", amount: 1200, category: "transportation", paymentMethod: "e_wallet", account: "E-Wallet" },
  { key: "coffee-1", dayOffset: -29, type: "expense", title: "Morning coffee", amount: 105, category: "food", paymentMethod: "cash", account: "Cash" },
  { key: "groceries-1", dayOffset: -27, type: "expense", title: "Lotus's groceries", amount: 1086, category: "food", paymentMethod: "card", account: "Credit Card" },
  { key: "electricity", dayOffset: -24, type: "expense", title: "Electricity bill", amount: 1748, category: "utilities", paymentMethod: "bank", account: "Bank" },
  { key: "lunch-1", dayOffset: -25, type: "expense", title: "Lunch near the office", amount: 195, category: "food", paymentMethod: "cash", account: "Cash" },
  { key: "grab-1", dayOffset: -23, type: "expense", title: "Grab ride home", amount: 218, category: "transportation", paymentMethod: "e_wallet", account: "E-Wallet" },
  { key: "internet", dayOffset: -22, type: "expense", title: "Home internet", amount: 599, category: "utilities", paymentMethod: "bank", account: "Bank" },
  { key: "dinner-1", dayOffset: -21, type: "expense", title: "Dinner with friends", amount: 486, category: "food", paymentMethod: "card", account: "Credit Card" },
  { key: "coffee-2", dayOffset: -20, type: "expense", title: "Iced latte", amount: 95, category: "food", paymentMethod: "cash", account: "Cash" },
  { key: "freelance", dayOffset: -20, type: "income", title: "Freelance design project", amount: 5200, category: "freelance", paymentMethod: "bank", account: "Bank", description: "Landing page design" },
  { key: "groceries-2", dayOffset: -19, type: "expense", title: "Big C weekly shop", amount: 1740, category: "food", paymentMethod: "card", account: "Credit Card" },
  { key: "lunch-2", dayOffset: -18, type: "expense", title: "Lunch set", amount: 160, category: "food", paymentMethod: "cash", account: "Cash" },
  { key: "fuel", dayOffset: -17, type: "expense", title: "Fuel", amount: 1300, category: "transportation", paymentMethod: "bank", account: "Bank" },
  { key: "phone", dayOffset: -16, type: "expense", title: "Mobile plan", amount: 499, category: "utilities", paymentMethod: "bank", account: "Bank" },
  { key: "course", dayOffset: -15, type: "expense", title: "Online design course", amount: 1290, category: "education", paymentMethod: "card", account: "Credit Card" },
  { key: "movie", dayOffset: -14, type: "expense", title: "Movie tickets", amount: 780, category: "entertainment", paymentMethod: "card", account: "Credit Card" },
  { key: "pharmacy", dayOffset: -13, type: "expense", title: "Pharmacy", amount: 385, category: "healthcare", paymentMethod: "cash", account: "Cash" },
  { key: "lunch-3", dayOffset: -12, type: "expense", title: "Food court lunch", amount: 245, category: "food", paymentMethod: "e_wallet", account: "E-Wallet" },
  { key: "salary", dayOffset: -10, type: "income", title: "Monthly salary", amount: 46500, category: "salary", paymentMethod: "bank", account: "Bank", description: "November salary" },
  { key: "netflix", dayOffset: -9, type: "expense", title: "Netflix", amount: 419, category: "subscription", paymentMethod: "card", account: "Credit Card" },
  { key: "cafe-2", dayOffset: -8, type: "expense", title: "Weekend café", amount: 155, category: "food", paymentMethod: "cash", account: "Cash" },
  { key: "groceries-3", dayOffset: -7, type: "expense", title: "Fresh market", amount: 890, category: "food", paymentMethod: "e_wallet", account: "E-Wallet" },
  { key: "clinic", dayOffset: -6, type: "expense", title: "Clinic visit", amount: 850, category: "healthcare", paymentMethod: "card", account: "Credit Card" },
  { key: "bts-2", dayOffset: -5, type: "expense", title: "BTS fare", amount: 122, category: "transportation", paymentMethod: "e_wallet", account: "E-Wallet" },
  { key: "reimbursement", dayOffset: -5, type: "income", title: "Travel reimbursement", amount: 1280, category: "other", paymentMethod: "bank", account: "Bank", description: "Client meeting transport" },
  { key: "clothes", dayOffset: -4, type: "expense", title: "Work shirt", amount: 1490, category: "shopping", paymentMethod: "card", account: "Credit Card" },
  { key: "lunch-4", dayOffset: -3, type: "expense", title: "Lunch with a teammate", amount: 225, category: "food", paymentMethod: "cash", account: "Cash" },
  { key: "weekend-trip", dayOffset: -2, type: "expense", title: "Kanchanaburi weekend stay", amount: 2400, category: "entertainment", paymentMethod: "card", account: "Credit Card" },
  { key: "dinner-2", dayOffset: -2, type: "expense", title: "Dinner after the trip", amount: 760, category: "food", paymentMethod: "e_wallet", account: "E-Wallet" },
  { key: "spotify", dayOffset: -1, type: "expense", title: "Spotify Premium", amount: 139, category: "subscription", paymentMethod: "card", account: "Credit Card" },
  { key: "coffee-3", dayOffset: -1, type: "expense", title: "Coffee on the way in", amount: 120, category: "food", paymentMethod: "cash", account: "Cash" },
  { key: "market-dinner", dayOffset: 0, type: "expense", title: "Dinner from the night market", amount: 285, category: "food", paymentMethod: "cash", account: "Cash" },
];

function bangkokToday() {
  const parts = new Intl.DateTimeFormat("en", {
    timeZone: TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const part = (type: string) => parts.find((item) => item.type === type)?.value ?? "0";
  return new Date(Date.UTC(Number(part("year")), Number(part("month")) - 1, Number(part("day"))));
}

function dateAtOffset(offset: number) {
  const date = bangkokToday();
  date.setUTCDate(date.getUTCDate() + offset);
  return date.toISOString().slice(0, 10);
}

function nextMonthStart() {
  const today = bangkokToday();
  return new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() + 1, 1)).toISOString().slice(0, 10);
}

function stableRequestId(key: string) {
  const chars = createHash("sha256").update(`expenseflow-demo-v1:${key}`).digest("hex").slice(0, 32).split("");
  chars[12] = "5";
  chars[16] = ((Number.parseInt(chars[16], 16) & 0x3) | 0x8).toString(16);
  const hex = chars.join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

async function seed() {
  const env = loadEnv();
  const uri = new URL(env.MONGODB_URI);
  if (env.NODE_ENV === "production" || !["localhost", "127.0.0.1", "::1"].includes(uri.hostname)) {
    throw new Error("Demo data can only be seeded into a local, non-production MongoDB database.");
  }

  await connectDb();
  try {
    let user = await User.findOne({ email: DEMO_EMAIL });
    let isNewUser = false;
    if (!user) {
      const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 12);
      user = await User.create({
        name: DEMO_NAME,
        email: DEMO_EMAIL,
        passwordHash,
        preferredLanguage: "en",
        preferredTheme: "light",
        currency: "THB",
        timezone: TIMEZONE,
      });
      isNewUser = true;
    }

    const accounts = new Map<AccountName, mongoose.Types.ObjectId>();
    const accountRows: Array<{ name: AccountName; accountType: "cash" | "bank" | "e_wallet" | "credit"; balance: number }> = [
      { name: "Cash", accountType: "cash", balance: 1800 },
      { name: "Bank", accountType: "bank", balance: 22000 },
      { name: "E-Wallet", accountType: "e_wallet", balance: 850 },
      { name: "Credit Card", accountType: "credit", balance: 0 },
    ];

    for (const row of accountRows) {
      let account = await Account.findOne({ userId: user._id, name: row.name });
      if (!account) {
        account = await Account.create({
          userId: user._id,
          name: row.name,
          accountType: row.accountType,
          balanceMinor: toMinorUnits(isNewUser ? row.balance : 0),
          currency: "THB",
        });
      }
      accounts.set(row.name, account._id);
    }

    const requestIds = transactions.map((item) => stableRequestId(item.key));
    const seededCount = await Transaction.countDocuments({ userId: user._id, clientRequestId: { $in: requestIds } });
    if (seededCount === 0 && !isNewUser) {
      const [transactionCount, budgetCount, goalCount, recurringCount, nonZeroAccounts] = await Promise.all([
        Transaction.countDocuments({ userId: user._id }),
        Budget.countDocuments({ userId: user._id }),
        SavingGoal.countDocuments({ userId: user._id }),
        RecurringTransaction.countDocuments({ userId: user._id }),
        Account.countDocuments({ userId: user._id, balanceMinor: { $ne: 0 } }),
      ]);
      if (transactionCount || budgetCount || goalCount || recurringCount || nonZeroAccounts) {
        throw new Error("The demo account already contains data. No records were added.");
      }
      for (const row of accountRows) {
        await Account.updateOne({ userId: user._id, name: row.name }, { $set: { balanceMinor: toMinorUnits(row.balance) } });
      }
    }

    let added = 0;
    for (const item of transactions) {
      const accountId = accounts.get(item.account);
      if (!accountId) throw new Error(`Missing demo account: ${item.account}`);
      const before = await Transaction.exists({ userId: user._id, clientRequestId: stableRequestId(item.key) });
      await createTransaction(user.id, {
        type: item.type,
        title: item.title,
        amount: item.amount,
        category: item.category,
        date: dateAtOffset(item.dayOffset),
        paymentMethod: item.paymentMethod,
        ...(item.type === "income" ? { destinationAccountId: accountId.toString() } : { sourceAccountId: accountId.toString() }),
        description: item.description,
        clientRequestId: stableRequestId(item.key),
      }, TIMEZONE);
      if (!before) added++;
    }

    const today = bangkokToday();
    const month = today.getUTCMonth() + 1;
    const year = today.getUTCFullYear();
    const budgets = [
      ["food", 10500], ["transportation", 3200], ["housing", 12500], ["utilities", 3500],
      ["shopping", 4500], ["entertainment", 3500], ["healthcare", 2500], ["subscription", 900], ["education", 2500],
    ] as const;
    for (const [category, amount] of budgets) {
      await Budget.updateOne(
        { userId: user._id, category, month, year },
        { $setOnInsert: { userId: user._id, category, month, year, amountMinor: toMinorUnits(amount) } },
        { upsert: true },
      );
    }

    const goalExists = await SavingGoal.exists({ userId: user._id, name: "Emergency fund" });
    if (!goalExists) {
      const targetDate = new Date(today);
      targetDate.setUTCDate(targetDate.getUTCDate() + 180);
      await SavingGoal.create({
        userId: user._id,
        name: "Emergency fund",
        targetAmountMinor: toMinorUnits(100000),
        currentAmountMinor: toMinorUnits(32000),
        targetDate: parseCalendarDate(targetDate.toISOString().slice(0, 10), TIMEZONE),
        description: "Build a six-month safety net, one month at a time.",
        status: "active",
      });
    }

    const nextDate = nextMonthStart();
    const recurring = [
      { title: "Monthly rent", type: "expense" as const, amount: 12000, category: "housing", paymentMethod: "bank" as const, account: "Bank" as const },
      { title: "Home internet", type: "expense" as const, amount: 599, category: "utilities", paymentMethod: "bank" as const, account: "Bank" as const },
      { title: "Spotify Premium", type: "expense" as const, amount: 139, category: "subscription", paymentMethod: "card" as const, account: "Credit Card" as const },
    ];
    for (const item of recurring) {
      const exists = await RecurringTransaction.exists({ userId: user._id, title: item.title });
      if (!exists) {
        await RecurringTransaction.create({
          userId: user._id,
          type: item.type,
          title: item.title,
          amountMinor: toMinorUnits(item.amount),
          category: item.category,
          paymentMethod: item.paymentMethod,
          accountId: accounts.get(item.account),
          frequency: "monthly",
          startDate: parseCalendarDate(dateAtOffset(-29), TIMEZONE),
          nextExecutionDate: parseCalendarDate(nextDate, TIMEZONE),
          isActive: true,
        });
      }
    }

    user.preferredTheme = "light";
    await user.save();
    console.log(`Seeded ${added} transactions across the last 30 days for ${DEMO_EMAIL}.`);
    console.log(`Demo sign-in: ${DEMO_EMAIL} / ${DEMO_PASSWORD}`);
  } finally {
    await disconnectDb();
  }
}

seed().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
