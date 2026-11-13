import ExcelJS from "exceljs";
import PDFDocument from "pdfkit";
import mongoose from "mongoose";
import { existsSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Account } from "../models/Account.js";
import { Budget } from "../models/Budget.js";
import { SavingGoal } from "../models/SavingGoal.js";
import { Transaction } from "../models/Transaction.js";
import { AppError } from "../utils/AppError.js";
import { calendarParts, dateFromCalendar, endOfDay, rangeForPreset, startOfDay } from "../utils/dates.js";
import { fromMinorUnits, percent } from "../utils/money.js";

export type ReportRange = "this_week" | "this_month" | "last_month" | "this_year" | "custom";
export type ReportExportOptions = {
  range: ReportRange;
  startDate?: string;
  endDate?: string;
  compare: boolean;
  accountId?: string;
  type: "all" | "income" | "expense" | "transfer";
  category?: string;
  language: "th" | "en";
  pdfLayout: "summary" | "detailed";
};

type Period = { start: Date; end: Date };
type Totals = {
  income: number;
  expenses: number;
  netCashFlow: number;
  netCashFlowRate: number;
  incomeMinor: number;
  expenseMinor: number;
  netCashFlowMinor: number;
};
type ReportTransaction = {
  date: string;
  type: string;
  title: string;
  category: string;
  amount: number;
  paymentMethod: string;
  sourceAccount: string;
  destinationAccount: string;
  description: string;
  status: string;
};
type CategoryTotal = { type: string; category: string; amount: number; percent: number };
type Trend = { period: string; income: number; expenses: number; netCashFlow: number };
type BudgetLine = {
  month: number;
  year: number;
  category: string;
  budget: number;
  spent: number;
  remaining: number;
  usedPercent: number;
  status: string;
};
type GoalLine = {
  name: string;
  current: number;
  target: number;
  progress: number;
  targetDate: string;
  status: string;
};
type ReportData = {
  start: Date;
  end: Date;
  previous?: Period;
  totals: Totals;
  previousTotals?: Totals;
  categories: CategoryTotal[];
  trends: Trend[];
  trendUnit: string;
  budgets: BudgetLine[];
  goals: GoalLine[];
  transactions: ReportTransaction[];
  pending: ReportTransaction[];
  transfers: ReportTransaction[];
  accountName: string;
  options: ReportExportOptions;
  timezone: string;
  generatedAt: Date;
};

const TEXT = {
  en: {
    report: "Personal finance overview",
    period: "Selected period",
    generated: "Generated",
    filters: "Filters",
    allAccounts: "All accounts",
    allTypes: "All transaction types",
    allCategories: "All categories",
    income: "Income",
    expenses: "Expenses",
    net: "Net cash flow",
    netRate: "Net cash flow rate",
    previous: "Comparison period",
    change: "Change",
    changePercent: "Change %",
    categories: "Category breakdown",
    trends: "Cash flow trend",
    budgets: "Budgets (all accounts)",
    goals: "Savings goals (current snapshot)",
    transactions: "Completed transactions",
    pending: "Pending transactions (not included in totals)",
    transfers: "Completed transfers (not included in cash flow)",
    empty: "No data for the selected dates and filters.",
    noTransactions: "No transactions match the selected dates and filters.",
    date: "Date",
    type: "Type",
    category: "Category",
    title: "Description",
    amount: "Amount (THB)",
    method: "Payment method",
    account: "Account",
    sourceAccount: "From account",
    destinationAccount: "To account",
    status: "Status",
    notes: "Notes",
    percent: "Share %",
    month: "Month",
    budget: "Budget (THB)",
    spent: "Spent (THB)",
    remaining: "Remaining (THB)",
    usage: "Used %",
    target: "Target (THB)",
    saved: "Saved (THB)",
    progress: "Progress %",
    targetDate: "Target date",
    netNote: "Net cash flow rate = (income minus expenses) divided by income. Transfers are excluded.",
    budgetNote: "Budget limits are monthly and compare against completed expenses across all accounts. A partial selected month uses expenses inside the selected dates.",
    pendingNote: "Pending transactions are listed separately and are excluded from completed income, expenses, and net cash flow.",
    periodDay: "Day",
    periodMonth: "Month",
    allTime: "Snapshot date",
    summaryPdf: "Summary PDF",
    detailedPdf: "Detailed PDF",
    summaryNote: "Cash flow includes completed income and expenses only. Pending transactions and transfers are excluded.",
  },
  th: {
    report: "ภาพรวมการเงินส่วนบุคคล",
    period: "ช่วงเวลาที่เลือก",
    generated: "สร้างเมื่อ",
    filters: "ตัวกรอง",
    allAccounts: "ทุกบัญชี",
    allTypes: "ทุกรายการ",
    allCategories: "ทุกหมวดหมู่",
    income: "รายรับ",
    expenses: "รายจ่าย",
    net: "กระแสเงินสดสุทธิ",
    netRate: "อัตรากระแสเงินสดสุทธิ",
    previous: "ช่วงเปรียบเทียบ",
    change: "เปลี่ยนแปลง",
    changePercent: "เปลี่ยนแปลง %",
    categories: "สรุปตามหมวดหมู่",
    trends: "แนวโน้มกระแสเงินสด",
    budgets: "งบประมาณ (ทุกบัญชี)",
    goals: "เป้าหมายการออม (ข้อมูลปัจจุบัน)",
    transactions: "รายการที่เสร็จแล้ว",
    pending: "รายการรอดำเนินการ (ไม่รวมในยอดสรุป)",
    transfers: "รายการโอนที่เสร็จแล้ว (ไม่รวมในกระแสเงินสด)",
    empty: "ไม่มีข้อมูลตามช่วงวันที่และตัวกรองที่เลือก",
    noTransactions: "ไม่มีรายการตามช่วงวันที่และตัวกรองที่เลือก",
    date: "วันที่",
    type: "ประเภท",
    category: "หมวดหมู่",
    title: "รายละเอียด",
    amount: "จำนวนเงิน (บาท)",
    method: "วิธีชำระ",
    account: "บัญชี",
    sourceAccount: "บัญชีต้นทาง",
    destinationAccount: "บัญชีปลายทาง",
    status: "สถานะ",
    notes: "หมายเหตุ",
    percent: "สัดส่วน %",
    month: "เดือน",
    budget: "วงเงิน (บาท)",
    spent: "ใช้ไป (บาท)",
    remaining: "คงเหลือ (บาท)",
    usage: "ใช้ไป %",
    target: "เป้าหมาย (บาท)",
    saved: "ออมแล้ว (บาท)",
    progress: "ความคืบหน้า %",
    targetDate: "วันที่เป้าหมาย",
    netNote: "อัตรากระแสเงินสดสุทธิ = (รายรับ - รายจ่าย) หารด้วยรายรับ โดยไม่รวมรายการโอน",
    budgetNote: "วงเงินเป็นรายเดือนและเทียบกับรายจ่ายที่เสร็จแล้วจากทุกบัญชี หากเลือกช่วงเพียงบางส่วนของเดือน จะนับยอดจริงเฉพาะวันที่เลือก",
    pendingNote: "แสดงรายการรอดำเนินการแยกต่างหาก และไม่รวมในยอดรายรับ รายจ่าย และกระแสเงินสดสุทธิที่เสร็จแล้ว",
    periodDay: "วัน",
    periodMonth: "เดือน",
    allTime: "วันที่สรุปข้อมูล",
    summaryPdf: "PDF สรุปหน้าเดียว",
    detailedPdf: "PDF รายละเอียด",
    summaryNote: "กระแสเงินสดนับเฉพาะรายรับและรายจ่ายที่เสร็จแล้ว ไม่นับรายการรอดำเนินการและรายการโอน",
  },
} as const;

const CATEGORY_TEXT = {
  en: {
    salary: "Salary", freelance: "Freelance", business: "Business", investment_income: "Investment income",
    bonus: "Bonus", food: "Food", transportation: "Transportation", shopping: "Shopping", housing: "Housing",
    utilities: "Utilities", entertainment: "Entertainment", healthcare: "Healthcare", education: "Education",
    subscription: "Subscription", other: "Other", transfer: "Transfer",
  },
  th: {
    salary: "เงินเดือน", freelance: "งานอิสระ", business: "ธุรกิจ", investment_income: "รายได้จากการลงทุน",
    bonus: "โบนัส", food: "อาหาร", transportation: "การเดินทาง", shopping: "ช้อปปิ้ง", housing: "ที่อยู่อาศัย",
    utilities: "สาธารณูปโภค", entertainment: "บันเทิง", healthcare: "สุขภาพ", education: "การศึกษา",
    subscription: "ค่าสมาชิก", other: "อื่น ๆ", transfer: "โอนเงิน",
  },
} as const;

const TYPE_TEXT = {
  en: { income: "Income", expense: "Expense", transfer: "Transfer" },
  th: { income: "รายรับ", expense: "รายจ่าย", transfer: "โอนเงิน" },
} as const;

const METHOD_TEXT = {
  en: { cash: "Cash", bank: "Bank", card: "Card", e_wallet: "E-wallet", other: "Other" },
  th: { cash: "เงินสด", bank: "ธนาคาร", card: "บัตร", e_wallet: "กระเป๋าเงินดิจิทัล", other: "อื่น ๆ" },
} as const;

function label(language: "th" | "en", key: keyof typeof TEXT.en) {
  return TEXT[language][key];
}

function categoryLabel(language: "th" | "en", category: string) {
  return CATEGORY_TEXT[language][category as keyof typeof CATEGORY_TEXT.en] ?? category;
}

function dateKey(date: Date, timezone: string) {
  const parts = calendarParts(date, timezone);
  return String(parts.year).padStart(4, "0") + "-" + String(parts.month).padStart(2, "0") + "-" + String(parts.day).padStart(2, "0");
}

function monthKey(year: number, month: number) {
  return year + "-" + String(month).padStart(2, "0");
}

function makePreviousPeriod(range: ReportRange, start: Date, end: Date, timezone: string): Period {
  if (range === "last_month") {
    const previousEnd = new Date(start.getTime() - 1);
    const endParts = calendarParts(previousEnd, timezone);
    return {
      start: startOfDay(dateFromCalendar(endParts.year, endParts.month, 1)),
      end: endOfDay(previousEnd),
    };
  }
  const days = Math.floor((endOfDay(end).getTime() - startOfDay(start).getTime()) / 86_400_000) + 1;
  const previousEnd = new Date(startOfDay(start).getTime() - 1);
  const previousStart = new Date(startOfDay(start).getTime() - days * 86_400_000);
  return { start: startOfDay(previousStart), end: endOfDay(previousEnd) };
}

function selectedQuery(
  userId: string,
  status: "completed" | "pending",
  period: Period,
  options: ReportExportOptions,
) {
  const query: Record<string, unknown> = {
    userId: new mongoose.Types.ObjectId(userId),
    status,
    date: { $gte: period.start, $lte: period.end },
  };
  if (options.type !== "all") query.type = options.type;
  if (options.category) query.category = options.category;
  if (options.accountId) {
    query.$or = [
      { sourceAccountId: new mongoose.Types.ObjectId(options.accountId) },
      { destinationAccountId: new mongoose.Types.ObjectId(options.accountId) },
    ];
  }
  return query;
}

function totalsFrom(items: Array<{ type: string; amountMinor: number }>): Totals {
  const incomeMinor = items.reduce((sum, item) => sum + (item.type === "income" ? item.amountMinor : 0), 0);
  const expenseMinor = items.reduce((sum, item) => sum + (item.type === "expense" ? item.amountMinor : 0), 0);
  const netCashFlowMinor = incomeMinor - expenseMinor;
  return {
    income: fromMinorUnits(incomeMinor),
    expenses: fromMinorUnits(expenseMinor),
    netCashFlow: fromMinorUnits(netCashFlowMinor),
    netCashFlowRate: incomeMinor === 0 ? 0 : Number(((netCashFlowMinor / incomeMinor) * 100).toFixed(2)),
    incomeMinor,
    expenseMinor,
    netCashFlowMinor,
  };
}

function categoryTotals(items: Array<{ type: string; category: string; amountMinor: number }>): CategoryTotal[] {
  const amounts = new Map<string, number>();
  for (const item of items) {
    if (item.type === "transfer") continue;
    const key = item.type + "|" + item.category;
    amounts.set(key, (amounts.get(key) ?? 0) + item.amountMinor);
  }
  return [...amounts.entries()]
    .map(([key, minor]) => {
      const [type, category] = key.split("|");
      const typeTotal = items.reduce((sum, item) => sum + (item.type === type ? item.amountMinor : 0), 0);
      return { type, category, amount: fromMinorUnits(minor), percent: percent(minor, typeTotal) };
    })
    .sort((a, b) => b.amount - a.amount);
}

function trendRows(items: Array<{ type: string; amountMinor: number; date: Date }>, period: Period, timezone: string) {
  const dayCount = Math.floor((endOfDay(period.end).getTime() - startOfDay(period.start).getTime()) / 86_400_000) + 1;
  const monthly = dayCount > 45;
  const values = new Map<string, { income: number; expenses: number }>();
  for (const item of items) {
    if (item.type === "transfer") continue;
    const key = monthly ? dateKey(item.date, timezone).slice(0, 7) : dateKey(item.date, timezone);
    const value = values.get(key) ?? { income: 0, expenses: 0 };
    if (item.type === "income") value.income += item.amountMinor;
    if (item.type === "expense") value.expenses += item.amountMinor;
    values.set(key, value);
  }

  const keys: string[] = [];
  if (monthly) {
    let parts = calendarParts(period.start, timezone);
    const last = calendarParts(period.end, timezone);
    while (parts.year < last.year || (parts.year === last.year && parts.month <= last.month)) {
      keys.push(monthKey(parts.year, parts.month));
      const next = dateFromCalendar(parts.year, parts.month + 1, 1);
      parts = calendarParts(next, timezone);
    }
  } else {
    for (let cursor = startOfDay(period.start); cursor <= period.end; cursor = new Date(cursor.getTime() + 86_400_000)) {
      keys.push(dateKey(cursor, timezone));
    }
  }
  return {
    unit: monthly ? "month" : "day",
    rows: keys.map((periodKey) => {
      const value = values.get(periodKey) ?? { income: 0, expenses: 0 };
      return {
        period: periodKey,
        income: fromMinorUnits(value.income),
        expenses: fromMinorUnits(value.expenses),
        netCashFlow: fromMinorUnits(value.income - value.expenses),
      };
    }),
  };
}

function asReportTransaction(item: any, accounts: Map<string, string>, timezone: string): ReportTransaction {
  const sourceId = item.sourceAccountId?.toString?.() ?? "";
  const destinationId = item.destinationAccountId?.toString?.() ?? "";
  return {
    date: dateKey(item.date, timezone),
    type: item.type,
    title: item.title,
    category: item.category,
    amount: fromMinorUnits(item.amountMinor),
    paymentMethod: item.paymentMethod,
    sourceAccount: accounts.get(sourceId) ?? "",
    destinationAccount: accounts.get(destinationId) ?? "",
    description: item.description ?? "",
    status: item.status,
  };
}

export async function reportData(userId: string, timezone: string, options: ReportExportOptions): Promise<ReportData> {
  const { start, end } = rangeForPreset(options.range, timezone, options.startDate, options.endDate);
  const previous = options.compare ? makePreviousPeriod(options.range, start, end, timezone) : undefined;
  let accountName: string = label(options.language, "allAccounts");
  if (options.accountId) {
    const account = await Account.findOne({ _id: options.accountId, userId }).select("name").lean();
    if (!account) throw new AppError("Account not found", 404);
    accountName = account.name;
  }

  const [accounts, completedDocs, pendingDocs, previousDocs, budgets, goals] = await Promise.all([
    Account.find({ userId }).select("name").lean(),
    Transaction.find(selectedQuery(userId, "completed", { start, end }, options)).sort({ date: 1, _id: 1 }),
    Transaction.find(selectedQuery(userId, "pending", { start, end }, options)).sort({ date: 1, _id: 1 }),
    previous
      ? Transaction.find(selectedQuery(userId, "completed", previous, options)).sort({ date: 1, _id: 1 })
      : Promise.resolve([]),
    Budget.find({ userId }).lean(),
    SavingGoal.find({ userId, status: { $ne: "cancelled" } }).sort({ targetDate: 1 }).lean(),
  ]);
  const accountNames = new Map(accounts.map((account) => [account._id.toString(), account.name]));
  const completed = completedDocs.map((item) => item.toObject());
  const pending = pendingDocs.map((item) => item.toObject());
  const previousItems = previousDocs.map((item: any) => item.toObject());
  const totals = totalsFrom(completed);
  const previousTotals = previous ? totalsFrom(previousItems) : undefined;
  const trend = trendRows(completed, { start, end }, timezone);

  const monthKeys = new Set<string>();
  let monthCursor = calendarParts(start, timezone);
  const monthLast = calendarParts(end, timezone);
  while (monthCursor.year < monthLast.year || (monthCursor.year === monthLast.year && monthCursor.month <= monthLast.month)) {
    monthKeys.add(monthKey(monthCursor.year, monthCursor.month));
    monthCursor = calendarParts(dateFromCalendar(monthCursor.year, monthCursor.month + 1, 1), timezone);
  }
  const reportBudgets = options.type === "income" || options.type === "transfer"
    ? []
    : budgets.filter((budget) =>
        monthKeys.has(monthKey(budget.year, budget.month)) && (!options.category || budget.category === options.category),
      );
  const allBudgetExpenses = reportBudgets.length
    ? await Transaction.find({
        userId,
        status: "completed",
        type: "expense",
        date: { $gte: start, $lte: end },
        category: { $in: reportBudgets.map((budget) => budget.category) },
      }).select("date category amountMinor")
    : [];
  const actualByBudget = new Map<string, number>();
  for (const item of allBudgetExpenses) {
    const parts = calendarParts(item.date, timezone);
    const key = monthKey(parts.year, parts.month) + "|" + item.category;
    actualByBudget.set(key, (actualByBudget.get(key) ?? 0) + item.amountMinor);
  }
  const budgetLines: BudgetLine[] = reportBudgets
    .map((budget) => {
      const key = monthKey(budget.year, budget.month) + "|" + budget.category;
      const budgetMinor = budget.amountMinor;
      const spentMinor = actualByBudget.get(key) ?? 0;
      const remainingMinor = budgetMinor - spentMinor;
      const usedPercent = budgetMinor === 0 ? 0 : Number(((spentMinor / budgetMinor) * 100).toFixed(2));
      return {
        month: budget.month,
        year: budget.year,
        category: budget.category,
        budget: fromMinorUnits(budgetMinor),
        spent: fromMinorUnits(spentMinor),
        remaining: fromMinorUnits(remainingMinor),
        usedPercent,
        status: usedPercent >= 100 ? "exceeded" : usedPercent >= 80 ? "warning" : "on_track",
      };
    })
    .sort((a, b) => a.year - b.year || a.month - b.month || b.usedPercent - a.usedPercent);
  const goalLines: GoalLine[] = goals.map((goal) => ({
    name: goal.name,
    current: fromMinorUnits(goal.currentAmountMinor),
    target: fromMinorUnits(goal.targetAmountMinor),
    progress: goal.targetAmountMinor === 0 ? 0 : Number(((goal.currentAmountMinor / goal.targetAmountMinor) * 100).toFixed(2)),
    targetDate: dateKey(goal.targetDate, timezone),
    status: goal.status,
  }));

  return {
    start,
    end,
    previous,
    totals,
    previousTotals,
    categories: categoryTotals(completed),
    trends: trend.rows,
    trendUnit: trend.unit,
    budgets: budgetLines,
    goals: goalLines,
    transactions: completed.filter((item) => item.type !== "transfer").map((item) => asReportTransaction(item, accountNames, timezone)),
    pending: pending.map((item) => asReportTransaction(item, accountNames, timezone)),
    transfers: completed.filter((item) => item.type === "transfer").map((item) => asReportTransaction(item, accountNames, timezone)),
    accountName,
    options,
    timezone,
    generatedAt: new Date(),
  };
}

function configureSheet(sheet: ExcelJS.Worksheet, headerRow: number, widths: number[]) {
  sheet.views = [{ state: "frozen", ySplit: headerRow }];
  widths.forEach((width, index) => { sheet.getColumn(index + 1).width = width; });
  const header = sheet.getRow(headerRow);
  header.height = 24;
  header.eachCell((cell) => {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF203454" } };
    cell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 10 };
    cell.alignment = { vertical: "middle", wrapText: true };
    cell.border = { bottom: { style: "medium", color: { argb: "FF3D5A80" } } };
  });
}

function setAutoFilter(sheet: ExcelJS.Worksheet, headerRow: number, columns: number) {
  sheet.autoFilter = {
    from: { row: headerRow, column: 1 },
    to: { row: Math.max(headerRow, sheet.rowCount), column: columns },
  };
}

function addStyledSheet(
  workbook: ExcelJS.Workbook,
  name: string,
  headers: string[],
  rows: unknown[][],
  widths: number[],
  options: { amountColumns?: number[]; percentColumns?: number[]; dateColumns?: number[]; note?: string } = {},
) {
  const sheet = workbook.addWorksheet(name);
  sheet.addRow(headers);
  for (const row of rows) sheet.addRow(row);
  if (rows.length === 0 && options.note) {
    const noteRow = sheet.addRow([options.note]);
    sheet.mergeCells(noteRow.number, 1, noteRow.number, headers.length);
    noteRow.height = 26;
    noteRow.getCell(1).font = { italic: true, color: { argb: "FF6B7789" } };
    noteRow.getCell(1).alignment = { vertical: "middle", wrapText: true };
  }
  configureSheet(sheet, 1, widths);
  if (rows.length > 0) setAutoFilter(sheet, 1, headers.length);
  for (const column of options.amountColumns ?? []) {
    sheet.getColumn(column).numFmt = '#,##0.00;[Red]-#,##0.00';
  }
  for (const column of options.percentColumns ?? []) {
    sheet.getColumn(column).numFmt = '0.00"%"';
  }
  for (const column of options.dateColumns ?? []) {
    sheet.getColumn(column).numFmt = "yyyy-mm-dd";
  }
  for (let row = 2; row <= sheet.rowCount; row += 1) {
    sheet.getRow(row).alignment = { vertical: "top", wrapText: true };
    if (row % 2 === 0) {
      sheet.getRow(row).eachCell((cell) => {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF3F6FA" } };
      });
    }
  }
  return sheet;
}

function displayDate(date: Date, language: "th" | "en", timezone: string) {
  return new Intl.DateTimeFormat(language === "th" ? "th-TH" : "en-GB", {
    day: "numeric", month: "short", year: "numeric", timeZone: timezone,
  }).format(date);
}

function displayPeriodDate(date: Date, language: "th" | "en") {
  return new Intl.DateTimeFormat(language === "th" ? "th-TH" : "en-GB", {
    day: "numeric", month: "short", year: "numeric", timeZone: "UTC",
  }).format(date);
}

function shortNumber(value: number) {
  return new Intl.NumberFormat("en", { maximumFractionDigits: 2 }).format(value);
}

export async function buildExcel(userId: string, timezone: string, options: ReportExportOptions) {
  const data = await reportData(userId, timezone, options);
  const language = options.language;
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Personal Finance Advisor";
  workbook.subject = label(language, "report");
  workbook.title = label(language, "report");
  workbook.created = data.generatedAt;

  const overview = workbook.addWorksheet(language === "th" ? "ภาพรวม" : "Overview");
  overview.addRow([label(language, "report")]);
  overview.addRow([label(language, "period"), displayPeriodDate(data.start, language) + " - " + displayPeriodDate(data.end, language)]);
  overview.addRow([label(language, "filters"), label(language, "account") + ": " + data.accountName + "; " + label(language, "type") + ": " + (options.type === "all" ? label(language, "allTypes") : TYPE_TEXT[language][options.type]) + "; " + label(language, "category") + ": " + (options.category ? categoryLabel(language, options.category) : label(language, "allCategories"))]);
  if (data.previous) {
    overview.addRow([label(language, "previous"), displayPeriodDate(data.previous.start, language) + " - " + displayPeriodDate(data.previous.end, language)]);
  } else {
    overview.addRow([label(language, "previous"), ""]);
  }
  if (data.transactions.length + data.pending.length + data.transfers.length === 0) {
    const noTransactionsRow = overview.addRow([label(language, "noTransactions")]);
    overview.mergeCells(noTransactionsRow.number, 1, noTransactionsRow.number, 5);
    noTransactionsRow.height = 24;
    noTransactionsRow.getCell(1).font = { italic: true, color: { argb: "FF6B7789" } };
  }
  overview.addRow([]);
  const metricsHeader = overview.addRow([
    language === "th" ? "ตัวชี้วัด" : "Metric",
    language === "th" ? "ช่วงที่เลือก" : "Selected period",
    label(language, "previous"),
    label(language, "change"),
    label(language, "changePercent"),
  ]);
  const metrics = [
    [label(language, "income"), data.totals.income, data.previousTotals?.income],
    [label(language, "expenses"), data.totals.expenses, data.previousTotals?.expenses],
    [label(language, "net"), data.totals.netCashFlow, data.previousTotals?.netCashFlow],
    [label(language, "netRate"), data.totals.netCashFlowRate, data.previousTotals?.netCashFlowRate],
  ] as const;
  for (const [metric, current, previous] of metrics) {
    const row = overview.addRow([metric, current, previous ?? null, null, null]);
    if (data.previousTotals) {
      row.getCell(4).value = { formula: "B" + row.number + "-C" + row.number, result: Number(current) - Number(previous ?? 0) };
      if (metric === label(language, "netRate")) {
        row.getCell(5).value = { formula: "B" + row.number + "-C" + row.number, result: Number(current) - Number(previous ?? 0) };
        row.getCell(5).numFmt = '0.00" pp"';
      } else if (Number(previous) !== 0) {
        row.getCell(5).value = { formula: "D" + row.number + "/ABS(C" + row.number + ")", result: (Number(current) - Number(previous)) / Math.abs(Number(previous)) };
        row.getCell(5).numFmt = "0.00%";
      }
    }
    if (metric === label(language, "netRate")) {
      row.getCell(2).numFmt = '0.00"%"';
      row.getCell(3).numFmt = '0.00"%"';
      row.getCell(4).numFmt = '0.00" pp"';
    } else {
      row.getCell(2).numFmt = '#,##0.00;[Red]-#,##0.00';
      row.getCell(3).numFmt = '#,##0.00;[Red]-#,##0.00';
      row.getCell(4).numFmt = '#,##0.00;[Red]-#,##0.00';
    }
  }
  overview.addRow([]);
  overview.addRow([label(language, "netNote")]);
  overview.addRow([label(language, "pendingNote")]);
  overview.addRow([label(language, "budgetNote")]);
  overview.addRow([label(language, "generated"), displayDate(data.generatedAt, language, timezone)]);
  overview.mergeCells("A1:E1");
  overview.getCell("A1").font = { size: 18, bold: true, color: { argb: "FF203454" } };
  overview.getRow(metricsHeader.number).height = 28;
  configureSheet(overview, metricsHeader.number, [34, 22, 22, 22, 18]);
  for (const rowNumber of [metricsHeader.number]) {
    overview.getRow(rowNumber).eachCell((cell) => {
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF203454" } };
      cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
    });
  }
  for (let rowNumber = 2; rowNumber <= overview.rowCount; rowNumber += 1) {
    overview.getRow(rowNumber).alignment = { vertical: "top", wrapText: true };
  }
  overview.getColumn(1).width = 36;
  overview.getColumn(2).width = 24;
  overview.getColumn(3).width = 24;
  overview.getColumn(4).width = 20;
  overview.getColumn(5).width = 18;

  const trendRowsData = data.transactions.length
    ? data.trends.map((row) => [row.period, row.income, row.expenses, row.netCashFlow])
    : [];
  addStyledSheet(workbook, language === "th" ? "แนวโน้ม" : "Trends", [
    label(language, data.trendUnit === "day" ? "periodDay" : "periodMonth"),
    label(language, "income"), label(language, "expenses"), label(language, "net"),
  ], trendRowsData, [18, 20, 20, 22], { amountColumns: [2, 3, 4], note: label(language, "empty") });

  const categoryRows = data.categories.map((row) => [
    TYPE_TEXT[language][row.type as keyof typeof TYPE_TEXT.en],
    categoryLabel(language, row.category),
    row.amount,
    row.percent,
  ]);
  addStyledSheet(workbook, language === "th" ? "หมวดหมู่" : "Categories", [
    label(language, "type"), label(language, "category"), label(language, "amount"), label(language, "percent"),
  ], categoryRows, [18, 26, 20, 16], { amountColumns: [3], percentColumns: [4], note: label(language, "empty") });

  const budgetRows = data.budgets.map((row) => [
    monthKey(row.year, row.month), categoryLabel(language, row.category), row.budget, row.spent,
    row.remaining, row.usedPercent, row.status === "exceeded" ? (language === "th" ? "เกินงบ" : "Exceeded") : row.status === "warning" ? (language === "th" ? "ใกล้เต็ม" : "Near limit") : (language === "th" ? "ตามแผน" : "On track"),
  ]);
  addStyledSheet(workbook, language === "th" ? "งบประมาณ" : "Budgets", [
    label(language, "month"), label(language, "category"), label(language, "budget"),
    label(language, "spent"), label(language, "remaining"), label(language, "usage"), label(language, "status"),
  ], budgetRows, [14, 24, 18, 18, 18, 14, 18], { amountColumns: [3, 4, 5], percentColumns: [6], note: label(language, "empty") });

  const goalRows = data.goals.map((goal) => [goal.name, goal.current, goal.target, goal.progress, goal.targetDate, goal.status]);
  addStyledSheet(workbook, language === "th" ? "เป้าหมาย" : "Goals", [
    language === "th" ? "ชื่อเป้าหมาย" : "Goal", label(language, "saved"), label(language, "target"),
    label(language, "progress"), label(language, "targetDate"), label(language, "status"),
  ], goalRows, [30, 18, 18, 16, 18, 16], { amountColumns: [2, 3], percentColumns: [4], note: label(language, "empty") });

  const transactionHeaders = [
    label(language, "date"), label(language, "type"), label(language, "title"), label(language, "category"),
    label(language, "amount"), label(language, "method"), label(language, "account"), label(language, "status"), label(language, "notes"),
  ];
  const txRows = data.transactions.map((item) => [
    new Date(item.date + "T00:00:00.000Z"), TYPE_TEXT[language][item.type as keyof typeof TYPE_TEXT.en], item.title,
    categoryLabel(language, item.category), item.amount, METHOD_TEXT[language][item.paymentMethod as keyof typeof METHOD_TEXT.en],
    item.type === "income" ? item.destinationAccount : item.sourceAccount, item.status, item.description,
  ]);
  addStyledSheet(workbook, language === "th" ? "รายการเสร็จแล้ว" : "Transactions", transactionHeaders, txRows,
    [14, 14, 34, 22, 18, 20, 24, 16, 36], { amountColumns: [5], dateColumns: [1], note: label(language, "empty") });

  const pendingRows = data.pending.map((item) => [
    new Date(item.date + "T00:00:00.000Z"), TYPE_TEXT[language][item.type as keyof typeof TYPE_TEXT.en], item.title,
    categoryLabel(language, item.category), item.amount, METHOD_TEXT[language][item.paymentMethod as keyof typeof METHOD_TEXT.en],
    item.sourceAccount || item.destinationAccount, item.status, item.description,
  ]);
  addStyledSheet(workbook, language === "th" ? "รอดำเนินการ" : "Pending", transactionHeaders, pendingRows,
    [14, 14, 34, 22, 18, 20, 24, 16, 36], { amountColumns: [5], dateColumns: [1], note: label(language, "empty") });

  const transferRows = data.transfers.map((item) => [
    new Date(item.date + "T00:00:00.000Z"), TYPE_TEXT[language].transfer, item.title, categoryLabel(language, item.category), item.amount,
    METHOD_TEXT[language][item.paymentMethod as keyof typeof METHOD_TEXT.en], item.sourceAccount, item.destinationAccount,
    item.status, item.description,
  ]);
  addStyledSheet(workbook, language === "th" ? "รายการโอน" : "Transfers", [
    label(language, "date"), label(language, "type"), label(language, "title"), label(language, "category"),
    label(language, "amount"), label(language, "method"), label(language, "sourceAccount"),
    label(language, "destinationAccount"), label(language, "status"), label(language, "notes"),
  ], transferRows, [14, 14, 30, 20, 18, 20, 24, 24, 16, 36], { amountColumns: [5], dateColumns: [1], note: label(language, "empty") });

  const output = await workbook.xlsx.writeBuffer();
  return Buffer.from(output);
}

function resolveThaiFont() {
  const candidates = [
    process.env.REPORT_THAI_FONT_PATH,
    path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../assets/NotoSansThai-Variable.ttf"),
    process.platform === "win32" ? "C:\\Windows\\Fonts\\tahoma.ttf" : "",
  ].filter((value): value is string => Boolean(value));
  for (const candidate of candidates) {
    if (existsSync(candidate)) return candidate;
  }

  const roots = ["/usr/share/fonts", "/usr/local/share/fonts"];
  for (const root of roots) {
    if (!existsSync(root)) continue;
    const pending = [root];
    while (pending.length) {
      const current = pending.pop()!;
      let entries;
      try { entries = readdirSync(current, { withFileTypes: true }); } catch { continue; }
      for (const entry of entries) {
        const fullPath = path.join(current, entry.name);
        if (entry.isDirectory()) pending.push(fullPath);
        else if (/NotoSansThai.*\.ttf$/i.test(entry.name)) return fullPath;
      }
    }
  }
  return undefined;
}

function pdfFont(doc: PDFKit.PDFDocument, language: "th" | "en", fontPath?: string) {
  if (language === "th") {
    if (!fontPath) throw new AppError("Thai PDF font is not installed", 500);
    doc.font(fontPath);
  } else {
    doc.font("Helvetica");
  }
}

function pdfText(language: "th" | "en", key: keyof typeof TEXT.en) {
  return label(language, key);
}

function pdfAmount(value: number) {
  return "THB " + shortNumber(value);
}

function ensurePageSpace(doc: PDFKit.PDFDocument, height: number, language: "th" | "en", fontPath?: string) {
  if (doc.y + height <= doc.page.height - doc.page.margins.bottom) return;
  doc.addPage();
  pdfFont(doc, language, fontPath);
}

function pdfHeader(doc: PDFKit.PDFDocument, data: ReportData, language: "th" | "en", fontPath?: string) {
  pdfFont(doc, language, fontPath);
  const x = doc.page.margins.left;
  const width = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  doc.fillColor("#203454").fontSize(language === "th" ? 19 : 20)
    .text(pdfText(language, "report"), x, doc.y, { width, lineGap: 2 });
  doc.moveDown(0.3).fillColor("#53647B").fontSize(9)
    .text(pdfText(language, "period") + ": " + displayPeriodDate(data.start, language) + " - " + displayPeriodDate(data.end, language), x, doc.y, { width });
  doc.text(pdfText(language, "generated") + ": " + displayDate(data.generatedAt, language, data.timezone), x, doc.y, { width });
  doc.text(pdfText(language, "filters") + ": " + pdfText(language, "account") + " " + data.accountName, x, doc.y, { width });
  if (data.options.category) doc.text(pdfText(language, "category") + ": " + categoryLabel(language, data.options.category), x, doc.y, { width });
  if (data.options.type !== "all") doc.text(pdfText(language, "type") + ": " + TYPE_TEXT[language][data.options.type], x, doc.y, { width });
  doc.moveDown(0.6);
  doc.x = x;
}

function pdfKpis(doc: PDFKit.PDFDocument, data: ReportData, language: "th" | "en") {
  const items = [
    [pdfText(language, "income"), pdfAmount(data.totals.income), "#267A5A"],
    [pdfText(language, "expenses"), pdfAmount(data.totals.expenses), "#B94E4E"],
    [pdfText(language, "net"), pdfAmount(data.totals.netCashFlow), "#315DDC"],
  ];
  const gap = 10;
  const width = (doc.page.width - doc.page.margins.left - doc.page.margins.right - gap * 2) / 3;
  const y = doc.y;
  for (let index = 0; index < items.length; index += 1) {
    const x = doc.page.margins.left + index * (width + gap);
    doc.roundedRect(x, y, width, 54, 7).fill("#F1F4F8");
    doc.fillColor(items[index][2]).fontSize(8).text(items[index][0], x + 10, y + 8, { width: width - 20 });
    doc.fillColor("#203454").fontSize(11).text(items[index][1], x + 10, y + 25, { width: width - 20 });
  }
  doc.y = y + 64;
  doc.x = doc.page.margins.left;
}

function pdfComparison(doc: PDFKit.PDFDocument, data: ReportData, language: "th" | "en", fontPath?: string) {
  if (!data.previous || !data.previousTotals) return;
  ensurePageSpace(doc, 72, language, fontPath);
  pdfFont(doc, language, fontPath);
  const x = doc.page.margins.left;
  const available = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const headingY = doc.y;
  doc.fillColor("#203454").fontSize(11).text(pdfText(language, "previous"), x, headingY, { width: available });
  doc.fillColor("#53647B").fontSize(8)
    .text(displayPeriodDate(data.previous.start, language) + " - " + displayPeriodDate(data.previous.end, language), x, headingY + 14, { width: available });
  const metrics = [
    [pdfText(language, "income"), data.totals.income, data.previousTotals.income],
    [pdfText(language, "expenses"), data.totals.expenses, data.previousTotals.expenses],
    [pdfText(language, "net"), data.totals.netCashFlow, data.previousTotals.netCashFlow],
  ];
  const columnGap = 10;
  const columnWidth = (available - columnGap * 2) / 3;
  const metricsY = headingY + 28;
  metrics.forEach(([name, current, previous], index) => {
    const change = Number(current) - Number(previous);
    const changePct = Number(previous) === 0 ? "—" : (change / Math.abs(Number(previous)) * 100).toFixed(1) + "%";
    const columnX = x + index * (columnWidth + columnGap);
    doc.fillColor("#53647B").fontSize(7).text(String(name), columnX, metricsY, { width: columnWidth });
    doc.fillColor("#203454").fontSize(8)
      .text((change >= 0 ? "+" : "") + pdfAmount(change) + " (" + changePct + ")", columnX, metricsY + 10, { width: columnWidth, height: 12 });
  });
  doc.y = metricsY + 23;
  doc.x = x;
  doc.moveDown(0.5);
}

function pdfBars(
  doc: PDFKit.PDFDocument,
  title: string,
  rows: Array<{ label: string; value: number; detail?: string }>,
  maxRows: number,
  language: "th" | "en",
  fontPath?: string,
) {
  const available = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  if (rows.length === 0 || maxRows <= 0) return;
  ensurePageSpace(doc, 36 + Math.min(rows.length, maxRows) * 24, language, fontPath);
  const left = doc.page.margins.left;
  pdfFont(doc, language, fontPath);
  doc.fillColor("#203454").fontSize(11).text(title, left, doc.y, { width: available });
  doc.moveDown(0.25);
  const values = rows.slice(0, maxRows);
  const max = Math.max(1, ...values.map((row) => Math.abs(row.value)));
  for (const row of values) {
    const y = doc.y;
    pdfFont(doc, language, fontPath);
    doc.fillColor("#34445B").fontSize(8).text(row.label, left, y, { continued: false, width: available * 0.32, height: 11 });
    const barX = left + available * 0.34;
    const barWidth = available * 0.25 * Math.abs(row.value) / max;
    doc.roundedRect(barX, y + 2, Math.max(2, barWidth), 7, 3).fill(row.value < 0 ? "#B94E4E" : "#315DDC");
    doc.fillColor("#34445B").fontSize(7)
      .text(row.detail ?? pdfAmount(row.value), left + available * 0.61, y, { width: available * 0.39, height: 11, align: "right" });
    doc.y = y + 16;
  }
  doc.moveDown(0.4);
  doc.x = left;
}

function drawTransactionList(
  doc: PDFKit.PDFDocument,
  title: string,
  transactions: ReportTransaction[],
  language: "th" | "en",
  fontPath?: string,
) {
  if (transactions.length === 0) return;
  pdfFont(doc, language, fontPath);
  doc.addPage();
  const left = doc.page.margins.left;
  const available = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  doc.fillColor("#203454").fontSize(14).text(title, left, doc.y, { width: available });
  doc.moveDown(0.4);
  for (const item of transactions) {
    const category = categoryLabel(language, item.category);
    const line1 = item.date + "   " + TYPE_TEXT[language][item.type as keyof typeof TYPE_TEXT.en] + "   " + category + "   " + pdfAmount(item.amount);
    const account = item.type === "income"
      ? item.destinationAccount
      : item.type === "transfer"
        ? [item.sourceAccount, item.destinationAccount].filter(Boolean).join(" -> ")
        : item.sourceAccount;
    const line2 = item.title + (account ? "   |   " + account : "") + "   |   " + METHOD_TEXT[language][item.paymentMethod as keyof typeof METHOD_TEXT.en];
    const line3 = item.description;
    pdfFont(doc, language, fontPath);
    doc.fontSize(9);
    const height = Math.max(34, doc.heightOfString(line2, { width: available }) + (line3 ? 21 : 0));
    ensurePageSpace(doc, height + 9, language, fontPath);
    const y = doc.y;
    doc.fillColor("#203454").fontSize(8).text(line1, left, y, { width: available });
    doc.fillColor("#34445B").fontSize(9).text(line2, left, y + 12, { width: available });
    if (line3) doc.fillColor("#6B7789").fontSize(8).text(line3, left, y + 25, { width: available });
    doc.moveTo(doc.page.margins.left, y + height + 2).lineTo(doc.page.width - doc.page.margins.right, y + height + 2).strokeColor("#E0E6EE").stroke();
    doc.y = y + height + 8;
  }
}

export async function buildPdf(userId: string, timezone: string, options: ReportExportOptions) {
  const data = await reportData(userId, timezone, options);
  const fontPath = options.language === "th" ? resolveThaiFont() : undefined;
  const doc = new PDFDocument({ size: "A4", margin: 38, bufferPages: true });
  const chunks: Buffer[] = [];
  doc.on("data", (chunk) => chunks.push(chunk as Buffer));
  const done = new Promise<Buffer>((resolve) => doc.on("end", () => resolve(Buffer.concat(chunks))));

  pdfHeader(doc, data, options.language, fontPath);
  pdfKpis(doc, data, options.language);
  if (data.transactions.length + data.pending.length + data.transfers.length === 0) {
    pdfFont(doc, options.language, fontPath);
    const left = doc.page.margins.left;
    doc.moveDown(0.2).fillColor("#6B7789").fontSize(8)
      .text(pdfText(options.language, "noTransactions"), left, doc.y, { width: doc.page.width - 2 * left });
  }
  pdfComparison(doc, data, options.language, fontPath);
  const compact = options.pdfLayout === "summary";
  const categories = data.categories.filter((row) => row.type === "expense")
    .map((row) => ({ label: categoryLabel(options.language, row.category), value: row.amount, detail: pdfAmount(row.amount) + " · " + row.percent + "%" }));
  pdfBars(doc, pdfText(options.language, "categories"), categories, compact ? 4 : 5, options.language, fontPath);
  pdfBars(
    doc,
    pdfText(options.language, "trends"),
    data.transactions.length
      ? data.trends.slice(compact ? -5 : -7).map((row) => ({ label: row.period, value: row.netCashFlow, detail: pdfAmount(row.netCashFlow) }))
      : [],
    compact ? 5 : 7,
    options.language,
    fontPath,
  );
  if (data.budgets.length) {
    pdfBars(
      doc,
      pdfText(options.language, "budgets"),
      data.budgets
        .slice()
        .sort((a, b) => b.usedPercent - a.usedPercent)
        .map((row) => ({ label: categoryLabel(options.language, row.category) + " " + monthKey(row.year, row.month), value: row.spent, detail: row.usedPercent + "% / " + pdfAmount(row.budget) })),
      compact ? 3 : 4,
      options.language,
      fontPath,
    );
  }
  if (compact && data.goals.length) {
    pdfBars(
      doc,
      pdfText(options.language, "goals"),
      data.goals.map((goal) => ({
        label: goal.name,
        value: goal.progress,
        detail: goal.progress + "% / " + pdfAmount(goal.current) + " / " + pdfAmount(goal.target),
      })),
      3,
      options.language,
      fontPath,
    );
  }
  if (compact) {
    pdfFont(doc, options.language, fontPath);
    const left = doc.page.margins.left;
    doc.moveDown(0.2).fillColor("#6B7789").fontSize(7)
      .text(pdfText(options.language, "summaryNote"), left, doc.y, { width: doc.page.width - 2 * left });
  }
  if (options.pdfLayout === "detailed") {
    const hasDetailSections = data.categories.length > 0 || data.budgets.length > 0 || data.goals.length > 0;
    if (hasDetailSections) {
      pdfFont(doc, options.language, fontPath);
      doc.addPage();
      pdfFont(doc, options.language, fontPath);
      const left = doc.page.margins.left;
      const width = doc.page.width - doc.page.margins.left - doc.page.margins.right;

      if (data.categories.length > 0) {
        doc.fillColor("#203454").fontSize(14).text(pdfText(options.language, "categories"), left, doc.y, { width });
        doc.moveDown(0.4);
        for (const row of data.categories) {
          ensurePageSpace(doc, 18, options.language, fontPath);
          const line = categoryLabel(options.language, row.category) + " (" + TYPE_TEXT[options.language][row.type as keyof typeof TYPE_TEXT.en] + "): " + pdfAmount(row.amount) + " (" + row.percent + "%)";
          doc.fillColor("#34445B").fontSize(9).text(line, left, doc.y, { width });
        }
        doc.moveDown(0.6);
      }

      if (data.budgets.length > 0) {
        ensurePageSpace(doc, 28, options.language, fontPath);
        doc.fillColor("#203454").fontSize(14).text(pdfText(options.language, "budgets"), left, doc.y, { width });
        doc.moveDown(0.3);
        for (const budget of data.budgets) {
          ensurePageSpace(doc, 18, options.language, fontPath);
          const status = budget.status === "exceeded" ? " · " + (options.language === "th" ? "เกินงบ" : "Exceeded") : "";
          doc.fillColor("#34445B").fontSize(8).text(
            monthKey(budget.year, budget.month) + "  " + categoryLabel(options.language, budget.category) + "  " +
            pdfAmount(budget.spent) + " / " + pdfAmount(budget.budget) + "  (" + budget.usedPercent + "%)" + status,
            left,
            doc.y,
            { width },
          );
        }
        doc.moveDown(0.6);
      }

      if (data.goals.length > 0) {
        ensurePageSpace(doc, 28, options.language, fontPath);
        doc.fillColor("#203454").fontSize(14).text(pdfText(options.language, "goals"), left, doc.y, { width });
        doc.moveDown(0.3);
        for (const goal of data.goals) {
          ensurePageSpace(doc, 18, options.language, fontPath);
          doc.fillColor("#34445B").fontSize(8).text(
            goal.name + "  " + pdfAmount(goal.current) + " / " + pdfAmount(goal.target) + "  (" + goal.progress + "%)  " + goal.targetDate,
            left,
            doc.y,
            { width },
          );
        }
      }

      const notes = [
        ...(data.transactions.length > 0 || data.transfers.length > 0 ? [pdfText(options.language, "netNote")] : []),
        ...(data.budgets.length > 0 ? [pdfText(options.language, "budgetNote")] : []),
        ...(data.pending.length > 0 ? [pdfText(options.language, "pendingNote")] : []),
      ];
      for (const note of notes) {
        ensurePageSpace(doc, 18, options.language, fontPath);
        doc.fillColor("#6B7789").fontSize(8).text(note, left, doc.y, { width });
      }
    }
    drawTransactionList(doc, pdfText(options.language, "transactions"), data.transactions, options.language, fontPath);
    drawTransactionList(doc, pdfText(options.language, "pending"), data.pending, options.language, fontPath);
    drawTransactionList(doc, pdfText(options.language, "transfers"), data.transfers, options.language, fontPath);
  }

  const pageRange = doc.bufferedPageRange();
  for (let index = 0; index < pageRange.count; index += 1) {
    doc.switchToPage(pageRange.start + index);
    pdfFont(doc, options.language, fontPath);
    doc.fillColor("#7C8798").fontSize(8)
      .text(String(index + 1) + " / " + pageRange.count, doc.page.margins.left, doc.page.height - doc.page.margins.bottom - 14, {
        width: doc.page.width - doc.page.margins.left - doc.page.margins.right,
        align: "right",
      });
  }
  doc.end();
  return done;
}
