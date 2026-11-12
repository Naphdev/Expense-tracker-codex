import mongoose, { Schema } from "mongoose";
import { EXPENSE_CATEGORIES, FREQUENCIES, INCOME_CATEGORIES, PAYMENT_METHODS, TRANSACTION_TYPES } from "../config/constants.js";

export interface RecurringTransactionDocument extends mongoose.Document {
  userId: mongoose.Types.ObjectId;
  type: "income" | "expense";
  title: string;
  amountMinor: number;
  category: string;
  paymentMethod: (typeof PAYMENT_METHODS)[number];
  accountId?: mongoose.Types.ObjectId | null;
  frequency: (typeof FREQUENCIES)[number];
  startDate: Date;
  endDate?: Date | null;
  nextExecutionDate: Date;
  isActive: boolean;
  lastProcessedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const recurringSchema = new Schema<RecurringTransactionDocument>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    type: { type: String, enum: ["income", "expense"], required: true },
    title: { type: String, required: true, trim: true, maxlength: 120 },
    amountMinor: { type: Number, required: true, min: 0 },
    category: { type: String, enum: [...INCOME_CATEGORIES, ...EXPENSE_CATEGORIES], required: true },
    paymentMethod: { type: String, enum: PAYMENT_METHODS, default: "cash" },
    accountId: { type: Schema.Types.ObjectId, ref: "Account", default: null },
    frequency: { type: String, enum: FREQUENCIES, required: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, default: null },
    nextExecutionDate: { type: Date, required: true, index: true },
    isActive: { type: Boolean, default: true, index: true },
    lastProcessedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

recurringSchema.index({ isActive: 1, nextExecutionDate: 1 });
recurringSchema.index({ userId: 1, isActive: 1 });

export const RecurringTransaction = mongoose.model<RecurringTransactionDocument>(
  "RecurringTransaction",
  recurringSchema,
);
