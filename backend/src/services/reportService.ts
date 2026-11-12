import ExcelJS from "exceljs";
import PDFDocument from "pdfkit";
import { Transaction } from "../models/Transaction.js";
import { rangeForPreset } from "../utils/dates.js";
import { fromMinorUnits } from "../utils/money.js";
import { categoryBreakdown, totalsForRange } from "./financeCalc.js";

export async function reportData(
  userId: string,
  timezone: string,
  range: "this_week" | "this_month" | "last_month" | "this_year" | "custom",
  startDate?: string,
  endDate?: string,
) {
  const { start, end } = rangeForPreset(range, timezone, startDate, endDate);
  const [totals, categories, transactions] = await Promise.all([
    totalsForRange(userId, start, end),
    categoryBreakdown(userId, start, end, "expense"),
    Transaction.find({
      userId,
      status: "completed",
      date: { $gte: start, $lte: end },
    }).sort({ date: 1 }),
  ]);
  return { start, end, totals, categories, transactions };
}

export async function buildExcel(userId: string, timezone: string, range: "this_month" | "this_week" | "last_month" | "this_year" | "custom", startDate?: string, endDate?: string) {
  const data = await reportData(userId, timezone, range, startDate, endDate);
  const workbook = new ExcelJS.Workbook();
  const summary = workbook.addWorksheet("Summary");
  summary.addRows([
    ["Personal Finance Advisor Report"],
    ["Range", data.start.toISOString().slice(0, 10), data.end.toISOString().slice(0, 10)],
    ["Total Income (THB)", data.totals.income],
    ["Total Expenses (THB)", data.totals.expenses],
    ["Net Cash Flow (THB)", data.totals.netCashFlow],
    ["Saving Rate (%)", data.totals.savingsRate],
  ]);
  const cats = workbook.addWorksheet("Categories");
  cats.addRow(["Category", "Amount", "Percent"]);
  data.categories.forEach((row) => cats.addRow([row.category, row.amount, row.percent]));
  const txs = workbook.addWorksheet("Transactions");
  txs.addRow(["Date", "Type", "Title", "Category", "Amount", "Method"]);
  data.transactions.forEach((tx) =>
    txs.addRow([
      tx.date.toISOString().slice(0, 10),
      tx.type,
      tx.title,
      tx.category,
      fromMinorUnits(tx.amountMinor),
      tx.paymentMethod,
    ]),
  );
  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

export async function buildPdf(userId: string, timezone: string, range: "this_month" | "this_week" | "last_month" | "this_year" | "custom", startDate?: string, endDate?: string) {
  const data = await reportData(userId, timezone, range, startDate, endDate);
  const doc = new PDFDocument({ margin: 40, size: "A4" });
  const chunks: Buffer[] = [];
  doc.on("data", (chunk) => chunks.push(chunk as Buffer));
  const done = new Promise<Buffer>((resolve) => doc.on("end", () => resolve(Buffer.concat(chunks))));

  doc.fontSize(18).text("Personal Finance Advisor");
  doc.moveDown(0.5).fontSize(11).text(`${data.start.toISOString().slice(0, 10)} to ${data.end.toISOString().slice(0, 10)}`);
  doc.moveDown().fontSize(12).text(`Income: ${data.totals.income} THB`);
  doc.text(`Expenses: ${data.totals.expenses} THB`);
  doc.text(`Net cash flow: ${data.totals.netCashFlow} THB`);
  doc.text(`Saving rate: ${data.totals.savingsRate}%`);
  doc.moveDown().fontSize(14).text("Category breakdown");
  data.categories.forEach((row) => doc.fontSize(11).text(`${row.category}: ${row.amount} THB (${row.percent}%)`));
  doc.moveDown().fontSize(14).text("Transactions");
  data.transactions.slice(0, 40).forEach((tx) => {
    doc.fontSize(10).text(`${tx.date.toISOString().slice(0, 10)}  ${tx.type}  ${tx.title}  ${fromMinorUnits(tx.amountMinor)} THB`);
  });
  doc.end();
  return done;
}
