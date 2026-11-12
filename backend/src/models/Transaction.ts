import mongoose, { Schema } from "mongoose";
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES, PAYMENT_METHODS, TRANSACTION_TYPES } from "../config/constants.js";

export type TransactionType = (typeof TRANSACTION_TYPES)[number];
export type TransactionStatus = "completed" | "pending" | "cancelled";

export interface TransactionDocument extends mongoose.Document {
  userId: mongoose.Types.ObjectId;
  type: TransactionType;
  title: string;
  amountMinor: number;
  category: string;
  date: Date;
  paymentMethod: (typeof PAYMENT_METHODS)[number];
  sourceAccountId?: mongoose.Types.ObjectId | null;
  destinationAccountId?: mongoose.Types.ObjectId | null;
  description?: string;
  status: TransactionStatus;
  affectsBalance?: boolean;
  recurringTransactionId?: mongoose.Types.ObjectId | null;
  clientRequestId?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const categories = [...INCOME_CATEGORIES, ...EXPENSE_CATEGORIES, "transfer"] as const;

const transactionSchema = new Schema<TransactionDocument>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    type: { type: String, enum: TRANSACTION_TYPES, required: true },
    title: { type: String, required: true, trim: true, maxlength: 120 },
    amountMinor: { type: Number, required: true, min: 0 },
    category: { type: String, enum: categories, required: true },
    date: { type: Date, required: true, index: true },
    paymentMethod: { type: String, enum: PAYMENT_METHODS, default: "cash" },
    sourceAccountId: { type: Schema.Types.ObjectId, ref: "Account", default: null },
    destinationAccountId: { type: Schema.Types.ObjectId, ref: "Account", default: null },
    description: { type: String, default: "", maxlength: 500 },
    status: { type: String, enum: ["completed", "pending", "cancelled"], default: "completed", index: true },
    affectsBalance: { type: Boolean, default: true },
    recurringTransactionId: { type: Schema.Types.ObjectId, ref: "RecurringTransaction", default: null },
    clientRequestId: { type: String, default: null },
  },
  { timestamps: true },
);

transactionSchema.index({ userId: 1, date: -1 });
transactionSchema.index({ userId: 1, type: 1, date: -1 });
transactionSchema.index({ userId: 1, category: 1, date: -1 });
transactionSchema.index(
  { userId: 1, clientRequestId: 1 },
  { unique: true, partialFilterExpression: { clientRequestId: { $type: "string" } } },
);
transactionSchema.index(
  { recurringTransactionId: 1, date: 1 },
  { unique: true, sparse: true, partialFilterExpression: { recurringTransactionId: { $type: "objectId" } } },
);

export const Transaction = mongoose.model<TransactionDocument>("Transaction", transactionSchema);
