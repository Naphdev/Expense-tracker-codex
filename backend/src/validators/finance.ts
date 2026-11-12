import { z } from "zod";
import {
  ACCOUNT_TYPES,
  EXPENSE_CATEGORIES,
  FREQUENCIES,
  INCOME_CATEGORIES,
  PAYMENT_METHODS,
  TRANSACTION_TYPES,
} from "../config/constants.js";

const objectId = z.string().regex(/^[a-f\d]{24}$/i, "Invalid id");
const amount = z.number().positive().max(1_000_000_000);
const dateString = z.string().min(8);

export const paginationQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
  type: z.enum(TRANSACTION_TYPES).optional(),
  category: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  sort: z.enum(["date_desc", "date_asc", "amount_desc", "amount_asc"]).default("date_desc"),
  status: z.enum(["completed", "pending", "cancelled"]).optional(),
});

export const transactionSchema = z.object({
  body: z
    .object({
      type: z.enum(TRANSACTION_TYPES),
      title: z.string().min(1).max(120),
      amount,
      category: z.string(),
      date: dateString,
      paymentMethod: z.enum(PAYMENT_METHODS).default("cash"),
      sourceAccountId: objectId.optional().nullable(),
      destinationAccountId: objectId.optional().nullable(),
      description: z.string().max(500).optional(),
      clientRequestId: z.string().uuid().optional(),
      status: z.enum(["completed", "pending", "cancelled"]).optional(),
    })
    .superRefine((value, ctx) => {
      if (value.type === "income" && !INCOME_CATEGORIES.includes(value.category as never)) {
        ctx.addIssue({ code: "custom", message: "Invalid income category", path: ["category"] });
      }
      if (value.type === "expense" && !EXPENSE_CATEGORIES.includes(value.category as never)) {
        ctx.addIssue({ code: "custom", message: "Invalid expense category", path: ["category"] });
      }
      if (value.type === "transfer") {
        if (!value.sourceAccountId || !value.destinationAccountId) {
          ctx.addIssue({ code: "custom", message: "Transfer requires both accounts" });
        }
        if (value.sourceAccountId === value.destinationAccountId) {
          ctx.addIssue({ code: "custom", message: "Source and destination must differ" });
        }
      }
    }),
});

export const transactionImportBatchSchema = z.object({
  body: z.object({
    items: z.array(z.unknown()).min(1).max(100),
  }),
});

export const idParams = z.object({
  params: z.object({ id: objectId }),
});

export const accountSchema = z.object({
  body: z.object({
    name: z.string().min(1).max(80),
    accountType: z.enum(ACCOUNT_TYPES),
    balance: z.number().min(0).max(1_000_000_000).optional(),
  }),
});

export const budgetSchema = z.object({
  body: z.object({
    category: z.enum(EXPENSE_CATEGORIES),
    amount,
    month: z.number().int().min(1).max(12),
    year: z.number().int().min(2000).max(2100),
  }),
});

export const goalSchema = z.object({
  body: z.object({
    name: z.string().min(1).max(80),
    targetAmount: amount,
    currentAmount: z.number().min(0).optional(),
    targetDate: dateString,
    description: z.string().max(500).optional(),
    status: z.enum(["active", "completed", "cancelled"]).optional(),
  }),
});

export const contributionSchema = z.object({
  params: z.object({ id: objectId }),
  body: z.object({
    amount,
    accountId: objectId.optional(),
    date: dateString.optional(),
    note: z.string().max(200).optional(),
  }),
});

export const recurringSchema = z.object({
  body: z.object({
    type: z.enum(["income", "expense"]),
    title: z.string().min(1).max(120),
    amount,
    category: z.string(),
    paymentMethod: z.enum(PAYMENT_METHODS).default("cash"),
    accountId: objectId.optional().nullable(),
    frequency: z.enum(FREQUENCIES),
    startDate: dateString,
    endDate: dateString.optional().nullable(),
    isActive: z.boolean().optional(),
  }),
});

export const rangeQuery = z.object({
  query: z.object({
    range: z.enum(["this_week", "this_month", "last_month", "this_year", "custom"]).default("this_month"),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    type: z.enum(["income", "expense"]).optional(),
    year: z.coerce.number().optional(),
    month: z.coerce.number().optional(),
  }),
});

export const aiAdviceSchema = z.object({
  body: z.object({
    message: z.string().min(1).max(2000),
    conversationId: objectId.optional(),
  }),
});

export const syncSchema = z.object({
  body: z.object({
    operations: z
      .array(
        z.object({
          clientRequestId: z.string().uuid(),
          method: z.enum(["create", "update", "delete"]),
          entity: z.enum(["transaction"]),
          payload: z.record(z.unknown()),
          updatedAt: z.string().optional(),
        }),
      )
      .max(100),
  }),
});
