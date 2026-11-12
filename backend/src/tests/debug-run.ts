import { setupTestEnv, teardown, authAgent } from "./helpers.js";

const { mongo, app } = await setupTestEnv();
const { agent, csrf } = await authAgent(app, "calc2@example.com");
const accounts = await agent.get("/api/accounts");
console.log("accounts", JSON.stringify(accounts.body, null, 2));
const cash = accounts.body.data.find((item: { accountType: string }) => item.accountType === "cash");
const bank = accounts.body.data.find((item: { accountType: string }) => item.accountType === "bank");
const inc = await agent
  .post("/api/transactions")
  .set("x-csrf-token", csrf)
  .send({
    type: "income",
    title: "Salary",
    amount: 25000,
    category: "salary",
    date: "2026-11-02",
    paymentMethod: "bank",
    destinationAccountId: bank.id,
  });
console.log("income", inc.status, JSON.stringify(inc.body));
const exp = await agent
  .post("/api/transactions")
  .set("x-csrf-token", csrf)
  .send({
    type: "expense",
    title: "Lunch",
    amount: 200,
    category: "food",
    date: "2026-11-03",
    paymentMethod: "cash",
    sourceAccountId: cash.id,
  });
console.log("expense", exp.status, JSON.stringify(exp.body, null, 2));
const list = await agent.get("/api/transactions?limit=50");
console.log("list", JSON.stringify(list.body, null, 2));
const summary = await agent.get("/api/dashboard/summary?range=this_month");
console.log("summary totals", JSON.stringify(summary.body.data?.totals));
console.log("today", new Date().toISOString());
await teardown(mongo);
process.exit(0);
