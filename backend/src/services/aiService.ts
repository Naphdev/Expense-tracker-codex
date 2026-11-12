import OpenAI from "openai";
import { z } from "zod";
import { loadEnv } from "../config/env.js";
import { AiConversation } from "../models/AiConversation.js";
import { AppError } from "../utils/AppError.js";
import { calendarParts, rangeForPreset } from "../utils/dates.js";
import { categoryBreakdown, totalsForRange } from "./financeCalc.js";

const adviceSchema = z.object({
  summary: z.string(),
  insights: z.array(z.string()).max(8),
  recommendations: z.array(z.string()).max(8),
  savingsTarget: z.string().optional().default(""),
  disclaimer: z.string(),
});

const limiter = new Map<string, { count: number; resetAt: number }>();

function assertRateLimit(userId: string) {
  const now = Date.now();
  const current = limiter.get(userId);
  if (!current || current.resetAt < now) {
    limiter.set(userId, { count: 1, resetAt: now + 60 * 60 * 1000 });
    return;
  }
  if (current.count >= 20) throw new AppError("AI usage limit reached. Try again later.", 429);
  current.count += 1;
}

async function financialContext(userId: string, timezone: string) {
  const thisMonth = rangeForPreset("this_month", timezone);
  const lastMonth = rangeForPreset("last_month", timezone);
  const [current, previous, categories] = await Promise.all([
    totalsForRange(userId, thisMonth.start, thisMonth.end),
    totalsForRange(userId, lastMonth.start, lastMonth.end),
    categoryBreakdown(userId, thisMonth.start, thisMonth.end, "expense"),
  ]);
  return {
    currency: "THB",
    thisMonth: {
      income: current.income,
      expenses: current.expenses,
      netCashFlow: current.netCashFlow,
      savingsRate: current.savingsRate,
      totalSavings: current.totalSavings,
    },
    lastMonth: {
      income: previous.income,
      expenses: previous.expenses,
      netCashFlow: previous.netCashFlow,
    },
    topExpenseCategories: categories.slice(0, 5),
    generatedAt: new Date().toISOString(),
    timezone,
    calendar: calendarParts(new Date(), timezone),
  };
}

export async function getAdvice(userId: string, timezone: string, message: string, conversationId?: string) {
  assertRateLimit(userId);
  const env = loadEnv();
  const context = await financialContext(userId, timezone);

  let conversation = conversationId
    ? await AiConversation.findOne({ _id: conversationId, userId })
    : null;
  if (conversationId && !conversation) throw new AppError("Conversation not found", 404);
  if (!conversation) {
    conversation = await AiConversation.create({
      userId,
      title: message.slice(0, 60),
      messages: [],
    });
  }

  if (!env.OPENAI_API_KEY) {
    const fallback = {
      summary: "AI is not configured yet. These suggestions use your account totals only.",
      insights: [
        `This month income is ${context.thisMonth.income} THB and expenses are ${context.thisMonth.expenses} THB.`,
        `Net cash flow is ${context.thisMonth.netCashFlow} THB with a savings rate of ${context.thisMonth.savingsRate}%.`,
      ],
      recommendations: [
        "Set a monthly savings target below your remaining cash flow.",
        "Review the highest spending category and set a category budget.",
        "Build an emergency fund with small automatic transfers.",
      ],
      savingsTarget: `${Math.max(Math.round(context.thisMonth.netCashFlow * 0.6), 0)} THB`,
      disclaimer: "General educational information only. Not professional financial advice.",
    };
    conversation.messages.push({ role: "user", content: message, createdAt: new Date() });
    conversation.messages.push({ role: "assistant", content: JSON.stringify(fallback), createdAt: new Date() });
    await conversation.save();
    return { conversationId: conversation.id, advice: fallback, context, aiGenerated: false };
  }

  const client = new OpenAI({ apiKey: env.OPENAI_API_KEY });
  const history = conversation.messages.slice(-8).map((item) => ({
    role: item.role,
    content: item.content,
  }));

  const completion = await client.chat.completions.create({
    model: env.OPENAI_MODEL,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: `You are a personal finance education assistant for a Thai Baht budgeting app.
Return JSON with keys: summary, insights (array), recommendations (array), savingsTarget (string), disclaimer.
Use ONLY the provided financial totals as numeric facts. Do not invent balances.
Give general educational guidance, not certified advice, investment guarantees, or product pitches.
Never request or repeat passwords, emails, or account credentials.`,
      },
      {
        role: "user",
        content: `Financial context (source of truth): ${JSON.stringify(context)}\nUser question: ${message}`,
      },
      ...history,
    ],
    temperature: 0.4,
  });

  const raw = completion.choices[0]?.message?.content ?? "{}";
  let parsed: z.infer<typeof adviceSchema>;
  try {
    parsed = adviceSchema.parse(JSON.parse(raw));
  } catch {
    parsed = {
      summary: "I could not structure that answer. Please try a simpler question.",
      insights: [],
      recommendations: ["Review this month's income, expenses, and highest spending category."],
      savingsTarget: "",
      disclaimer: "General educational information only. Not professional financial advice.",
    };
  }
  parsed.disclaimer =
    parsed.disclaimer || "General educational information only. Not professional financial advice.";

  conversation.messages.push({ role: "user", content: message, createdAt: new Date() });
  conversation.messages.push({ role: "assistant", content: JSON.stringify(parsed), createdAt: new Date() });
  await conversation.save();

  return { conversationId: conversation.id, advice: parsed, context, aiGenerated: true };
}
