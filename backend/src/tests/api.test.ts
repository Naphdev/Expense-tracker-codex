import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { authAgent, setupTestEnv, teardown } from "./helpers.js";

let mongo: Awaited<ReturnType<typeof setupTestEnv>>["mongo"];
let app: Awaited<ReturnType<typeof setupTestEnv>>["app"];

beforeAll(async () => {
  const setup = await setupTestEnv();
  mongo = setup.mongo;
  app = setup.app;
});

afterAll(async () => {
  await teardown(mongo);
});

describe("auth and ownership", () => {
  it("separates liveness from database readiness", async () => {
    const { default: request } = await import("supertest");
    const live = await request(app).get("/health");
    const ready = await request(app).get("/ready");

    expect(live.status).toBe(200);
    expect(live.body.data.status).toBe("ok");
    expect(ready.status).toBe(200);
    expect(ready.body.data.status).toBe("ready");
  });

  it("registers, logs in, and isolates user data", async () => {
    const a = await authAgent(app, "one@example.com");
    const b = await authAgent(app, "two@example.com");

    const created = await a.agent
      .post("/api/transactions")
      .set("x-csrf-token", a.csrf)
      .send({
        type: "income",
        title: "Salary",
        amount: 25000,
        category: "salary",
        date: "2026-11-01",
        paymentMethod: "bank",
      });
    expect(created.status).toBe(201);

    const other = await b.agent.get(`/api/transactions/${created.body.data.id}`).set("x-csrf-token", b.csrf);
    expect(other.status).toBe(404);

    const me = await a.agent.get("/api/auth/me");
    expect(me.body.data.user.email).toBe("one@example.com");
  });

  it("rejects invalid login", async () => {
    const res = await (await import("supertest")).default(app).post("/api/auth/login").send({
      email: "missing@example.com",
      password: "Password123",
    });
    expect(res.status).toBe(401);
  });

  it("keeps finance resources and AI conversations isolated per user", async () => {
    const owner = await authAgent(app, "resource-owner@example.com");
    const other = await authAgent(app, "resource-other@example.com");

    const account = await owner.agent.post("/api/accounts").set("x-csrf-token", owner.csrf).send({
      name: "Private account",
      accountType: "bank",
      balance: 500,
    });
    expect(account.status).toBe(201);
    const accountId = account.body.data.id as string;
    const otherAccounts = await other.agent.get("/api/accounts");
    expect(otherAccounts.body.data.some((item: { id: string }) => item.id === accountId)).toBe(false);
    expect((await other.agent.put(`/api/accounts/${accountId}`).set("x-csrf-token", other.csrf).send({ name: "Changed" })).status).toBe(404);
    expect((await other.agent.delete(`/api/accounts/${accountId}`).set("x-csrf-token", other.csrf)).status).toBe(404);
    expect(
      (
        await other.agent.post("/api/transactions").set("x-csrf-token", other.csrf).send({
          type: "expense",
          title: "Cross-account attempt",
          amount: 25,
          category: "food",
          date: "2026-11-10",
          paymentMethod: "bank",
          sourceAccountId: accountId,
        })
      ).status,
    ).toBe(404);

    const transaction = await owner.agent.post("/api/transactions").set("x-csrf-token", owner.csrf).send({
      type: "income",
      title: "Private salary record",
      amount: 42000,
      category: "salary",
      date: "2026-11-10",
      paymentMethod: "bank",
      destinationAccountId: accountId,
    });
    expect(transaction.status).toBe(201);
    const transactionId = transaction.body.data.id as string;
    const otherTransactions = await other.agent.get("/api/transactions?search=Private%20salary%20record");
    expect(otherTransactions.body.data.total).toBe(0);
    expect((await other.agent.get(`/api/transactions/${transactionId}`)).status).toBe(404);
    expect(
      (
        await other.agent.put(`/api/transactions/${transactionId}`).set("x-csrf-token", other.csrf).send({
          type: "income",
          title: "Changed",
          amount: 42000,
          category: "salary",
          date: "2026-11-10",
          paymentMethod: "bank",
          destinationAccountId: accountId,
        })
      ).status,
    ).toBe(404);
    expect((await other.agent.delete(`/api/transactions/${transactionId}`).set("x-csrf-token", other.csrf)).status).toBe(404);
    const otherSummary = await other.agent.get("/api/dashboard/summary?range=this_month");
    expect(otherSummary.body.data.totals.income).toBe(0);
    const otherCalendar = await other.agent.get("/api/calendar?year=2026&month=11");
    expect(otherCalendar.body.data.days).toHaveLength(0);
    const { reportData } = await import("../services/reportService.js");
    const otherReport = await reportData(other.user.id, other.user.timezone, "this_month");
    expect(otherReport.totals.income).toBe(0);
    expect(otherReport.transactions).toHaveLength(0);

    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();
    const budget = await owner.agent.post("/api/budgets").set("x-csrf-token", owner.csrf).send({
      category: "food",
      amount: 3000,
      month,
      year,
    });
    const budgetId = budget.body.data.id as string;
    const otherBudgets = await other.agent.get(`/api/budgets?month=${month}&year=${year}`);
    expect(otherBudgets.body.data.some((item: { id: string }) => item.id === budgetId)).toBe(false);
    expect((await other.agent.put(`/api/budgets/${budgetId}`).set("x-csrf-token", other.csrf).send({ amount: 1 })).status).toBe(404);
    expect((await other.agent.delete(`/api/budgets/${budgetId}`).set("x-csrf-token", other.csrf)).status).toBe(404);

    const goal = await owner.agent.post("/api/saving-goals").set("x-csrf-token", owner.csrf).send({
      name: "Private goal",
      targetAmount: 10000,
      targetDate: "2027-12-31",
    });
    const goalId = goal.body.data.id as string;
    const otherGoals = await other.agent.get("/api/saving-goals");
    expect(otherGoals.body.data.some((item: { id: string }) => item.id === goalId)).toBe(false);
    expect((await other.agent.put(`/api/saving-goals/${goalId}`).set("x-csrf-token", other.csrf).send({ name: "Changed" })).status).toBe(404);
    expect((await other.agent.delete(`/api/saving-goals/${goalId}`).set("x-csrf-token", other.csrf)).status).toBe(404);
    expect((await other.agent.post(`/api/saving-goals/${goalId}/contributions`).set("x-csrf-token", other.csrf).send({ amount: 100 })).status).toBe(404);

    const recurring = await owner.agent.post("/api/recurring").set("x-csrf-token", owner.csrf).send({
      type: "expense",
      title: "Private recurring bill",
      amount: 250,
      category: "subscription",
      frequency: "monthly",
      startDate: "2099-01-01",
      paymentMethod: "card",
    });
    const recurringId = recurring.body.data.id as string;
    const otherRecurring = await other.agent.get("/api/recurring");
    expect(otherRecurring.body.data.some((item: { id: string }) => item.id === recurringId)).toBe(false);
    expect((await other.agent.put(`/api/recurring/${recurringId}`).set("x-csrf-token", other.csrf).send({ title: "Changed" })).status).toBe(404);
    expect((await other.agent.delete(`/api/recurring/${recurringId}`).set("x-csrf-token", other.csrf)).status).toBe(404);

    const advice = await owner.agent.post("/api/ai/advice").set("x-csrf-token", owner.csrf).send({ message: "Private question" });
    const conversationId = advice.body.data.conversationId as string;
    const otherConversations = await other.agent.get("/api/ai/conversations");
    expect(otherConversations.body.data.some((item: { id: string }) => item.id === conversationId)).toBe(false);
    expect((await other.agent.get(`/api/ai/conversations/${conversationId}`)).status).toBe(404);
    expect((await other.agent.delete(`/api/ai/conversations/${conversationId}`).set("x-csrf-token", other.csrf)).status).toBe(404);
  });
});

describe("transactions, transfers, budgets, goals", () => {
  it("calculates income, expenses, and ignores transfers", async () => {
    const { agent, csrf } = await authAgent(app, "calc@example.com");
    const accounts = await agent.get("/api/accounts");
    const cash = accounts.body.data.find((item: { accountType: string }) => item.accountType === "cash");
    const bank = accounts.body.data.find((item: { accountType: string }) => item.accountType === "bank");

    const createdIncome = await agent.post("/api/transactions").set("x-csrf-token", csrf).send({
      type: "income",
      title: "Salary",
      amount: 25000,
      category: "salary",
      date: "2026-11-02",
      paymentMethod: "bank",
      destinationAccountId: bank.id,
    });
    const createdExpense = await agent.post("/api/transactions").set("x-csrf-token", csrf).send({
      type: "expense",
      title: "Lunch",
      amount: 200,
      category: "food",
      date: "2026-11-03",
      paymentMethod: "cash",
      sourceAccountId: cash.id,
    });
    await agent.post("/api/transactions").set("x-csrf-token", csrf).send({
      type: "transfer",
      title: "To cash",
      amount: 1000,
      category: "transfer",
      date: "2026-11-04",
      paymentMethod: "bank",
      sourceAccountId: bank.id,
      destinationAccountId: cash.id,
    });

    const summary = await agent.get("/api/dashboard/summary?range=this_month");
    expect(createdIncome.status).toBe(201);
    expect(createdExpense.status).toBe(201);
    expect(summary.body.data.totals.income).toBe(25000);
    expect(summary.body.data.totals.expenses).toBe(200);
    expect(summary.body.data.totals.netCashFlow).toBe(24800);
    expect(summary.body.data.totals.availableBalance).toBe(24800);

    const refreshed = await agent.get("/api/accounts");
    const cashAfter = refreshed.body.data.find((item: { id: string }) => item.id === cash.id);
    const bankAfter = refreshed.body.data.find((item: { id: string }) => item.id === bank.id);
    expect(bankAfter.balance).toBe(24000);
    expect(cashAfter.balance).toBe(800);
  });

  it("tracks budgets and saving contributions without double-counting expenses", async () => {
    const { agent, csrf } = await authAgent(app, "budget@example.com");
    await agent.post("/api/transactions").set("x-csrf-token", csrf).send({
      type: "expense",
      title: "Groceries",
      amount: 90,
      category: "food",
      date: "2026-11-05",
      paymentMethod: "cash",
    });
    const budget = await agent.post("/api/budgets").set("x-csrf-token", csrf).send({
      category: "food",
      amount: 100,
      month: 11,
      year: 2026,
    });
    expect(budget.status).toBe(201);
    const budgets = await agent.get("/api/budgets?month=11&year=2026");
    expect(budgets.body.data[0].percentUsed).toBe(90);
    expect(budgets.body.data[0].warning).toBe("warning");

    const goal = await agent.post("/api/saving-goals").set("x-csrf-token", csrf).send({
      name: "Emergency",
      targetAmount: 1000,
      targetDate: "2027-01-01",
    });
    await agent.post(`/api/saving-goals/${goal.body.data.id}/contributions`).set("x-csrf-token", csrf).send({
      amount: 200,
    });
    const summary = await agent.get("/api/dashboard/summary?range=this_month");
    expect(summary.body.data.totals.expenses).toBe(90);
    expect(summary.body.data.totals.totalSavings).toBe(200);
  });
});

describe("recurring, AI, export", () => {
  it("creates a due recurring transaction once", async () => {
    const { agent, csrf } = await authAgent(app, "recur@example.com");
    const created = await agent.post("/api/recurring").set("x-csrf-token", csrf).send({
      type: "expense",
      title: "Netflix",
      amount: 159,
      category: "subscription",
      frequency: "monthly",
      startDate: "2020-01-01",
      paymentMethod: "card",
    });
    expect(created.status).toBe(201);
    const list = await agent.get("/api/transactions?search=Netflix");
    expect(list.body.data.total).toBeGreaterThanOrEqual(1);
    await agent.get("/api/recurring");
    const again = await agent.get("/api/transactions?search=Netflix");
    expect(again.body.data.total).toBe(list.body.data.total);
  });

  it("returns structured AI fallback without exposing secrets", async () => {
    const { agent, csrf } = await authAgent(app, "ai@example.com");
    const res = await agent.post("/api/ai/advice").set("x-csrf-token", csrf).send({
      message: "How should I save more?",
    });
    expect(res.status).toBe(200);
    expect(res.body.data.advice.disclaimer).toContain("Not professional");
    expect(res.body.data.aiGenerated).toBe(false);
  });

  it("exports reports only for the authenticated user", async () => {
    const { agent } = await authAgent(app, "export@example.com");
    const pdf = await agent.get("/api/reports/export/pdf?range=this_month");
    expect(pdf.status).toBe(200);
    expect(pdf.headers["content-type"]).toContain("pdf");
    const xlsx = await agent.get("/api/reports/export/excel?range=this_month");
    expect(xlsx.status).toBe(200);
  });
});

describe("transaction import and finance notifications", () => {
  it("previews duplicates, partially imports valid rows, and keeps imported history balance-neutral", async () => {
    const { agent, csrf } = await authAgent(app, "import-feature@example.com");
    const account = await agent.post("/api/accounts").set("x-csrf-token", csrf).send({
      name: "History account",
      accountType: "bank",
      balance: 1000,
    });
    const transaction = {
      type: "expense",
      title: "Imported lunch",
      amount: 42,
      category: "food",
      date: "2026-11-05",
      paymentMethod: "bank",
      sourceAccountId: account.body.data.id,
      clientRequestId: "d1f1c9df-1412-4a75-8e04-01490b777101",
    };
    const invalid = {
      type: "expense",
      amount: 12,
      category: "food",
      date: "2026-11-06",
      paymentMethod: "cash",
      clientRequestId: "d1f1c9df-1412-4a75-8e04-01490b777102",
    };

    const preview = await agent.post("/api/transactions/import/preview").set("x-csrf-token", csrf).send({
      items: [
        { rowNumber: 2, transaction },
        { rowNumber: 3, transaction: invalid },
      ],
    });
    expect(preview.status).toBe(200);
    expect(preview.body.data.items.map((item: { status: string }) => item.status)).toEqual(["ready", "invalid"]);

    const imported = await agent.post("/api/transactions/import").set("x-csrf-token", csrf).send({
      items: [
        { rowNumber: 2, transaction },
        { rowNumber: 3, transaction: invalid },
      ],
    });
    expect(imported.status).toBe(201);
    expect(imported.body.data.created).toBe(1);
    expect(imported.body.data.failed).toBe(1);

    const duplicateCandidate = {
      ...transaction,
      clientRequestId: "d1f1c9df-1412-4a75-8e04-01490b777103",
    };
    const duplicatePreview = await agent.post("/api/transactions/import/preview").set("x-csrf-token", csrf).send({
      items: [{ rowNumber: 4, transaction: duplicateCandidate }],
    });
    expect(duplicatePreview.body.data.items[0].status).toBe("duplicate");

    const skippedDuplicate = await agent.post("/api/transactions/import").set("x-csrf-token", csrf).send({
      items: [{ rowNumber: 4, transaction: duplicateCandidate, allowDuplicate: false }],
    });
    expect(skippedDuplicate.body.data.skipped).toBe(1);

    const explicitDuplicate = await agent.post("/api/transactions/import").set("x-csrf-token", csrf).send({
      items: [{ rowNumber: 4, transaction: duplicateCandidate, allowDuplicate: true }],
    });
    expect(explicitDuplicate.body.data.created).toBe(1);

    const accounts = await agent.get("/api/accounts");
    expect(accounts.body.data.find((item: { id: string }) => item.id === account.body.data.id).balance).toBe(1000);
    const activity = await agent.get("/api/transactions?search=Imported%20lunch");
    expect(activity.body.data.total).toBe(2);
  });

  it("creates one inbox alert at each budget threshold and supports read state", async () => {
    const { agent, csrf, user } = await authAgent(app, "budget-alerts@example.com");
    const { calendarParts } = await import("../utils/dates.js");
    const today = calendarParts(new Date(), user.timezone);
    const date = `${today.year}-${String(today.month).padStart(2, "0")}-${String(today.day).padStart(2, "0")}`;
    const budget = await agent.post("/api/budgets").set("x-csrf-token", csrf).send({
      category: "food",
      amount: 100,
      month: today.month,
      year: today.year,
    });
    expect(budget.status).toBe(201);

    await agent.post("/api/transactions").set("x-csrf-token", csrf).send({
      type: "expense", title: "Budget threshold 80", amount: 80, category: "food", date, paymentMethod: "cash",
    });
    const atEighty = await agent.get("/api/notifications");
    expect(atEighty.body.data.items.map((item: { data: { threshold: number } }) => item.data.threshold)).toEqual([80]);

    await agent.post("/api/transactions").set("x-csrf-token", csrf).send({
      type: "expense", title: "Budget threshold 100", amount: 20, category: "food", date, paymentMethod: "cash",
    });
    const atOneHundred = await agent.get("/api/notifications");
    expect(atOneHundred.body.data.items).toHaveLength(2);
    expect(atOneHundred.body.data.unreadCount).toBe(2);
    expect(atOneHundred.body.data.items.map((item: { data: { threshold: number } }) => item.data.threshold).sort()).toEqual([80, 100]);

    await agent.patch(`/api/notifications/${atOneHundred.body.data.items[0].id}/read`).set("x-csrf-token", csrf);
    expect((await agent.get("/api/notifications")).body.data.unreadCount).toBe(1);
    await agent.post("/api/notifications/read-all").set("x-csrf-token", csrf);
    expect((await agent.get("/api/notifications")).body.data.unreadCount).toBe(0);
  });

  it("stores an upcoming recurring reminder once without posting the schedule early", async () => {
    const { agent, user } = await authAgent(app, "recurring-reminder@example.com");
    const { RecurringTransaction } = await import("../models/RecurringTransaction.js");
    const { processDueRecurring } = await import("../services/recurringService.js");
    const dueDate = new Date(Date.now() + 23 * 60 * 60 * 1000);
    await RecurringTransaction.create({
      userId: user.id,
      type: "expense",
      title: "Internet bill",
      amountMinor: 1500,
      category: "utilities",
      paymentMethod: "bank",
      frequency: "monthly",
      startDate: dueDate,
      nextExecutionDate: dueDate,
      isActive: true,
    });

    await processDueRecurring(user.id);
    await processDueRecurring(user.id);
    const inbox = await agent.get("/api/notifications");
    expect(inbox.body.data.items.filter((item: { type: string }) => item.type === "recurring_due")).toHaveLength(1);
    expect((await agent.get("/api/transactions?search=Internet%20bill")).body.data.total).toBe(0);
  });
});
