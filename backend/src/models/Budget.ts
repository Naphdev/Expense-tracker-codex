import mongoose, { Schema } from "mongoose";
import { EXPENSE_CATEGORIES } from "../config/constants.js";

export interface BudgetDocument extends mongoose.Document {
  userId: mongoose.Types.ObjectId;
  category: (typeof EXPENSE_CATEGORIES)[number];
  amountMinor: number;
  month: number;
  year: number;
  createdAt: Date;
  updatedAt: Date;
}

const budgetSchema = new Schema<BudgetDocument>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    category: { type: String, enum: EXPENSE_CATEGORIES, required: true },
    amountMinor: { type: Number, required: true, min: 0 },
    month: { type: Number, required: true, min: 1, max: 12 },
    year: { type: Number, required: true },
  },
  { timestamps: true },
);

budgetSchema.index({ userId: 1, year: 1, month: 1, category: 1 }, { unique: true });

export const Budget = mongoose.model<BudgetDocument>("Budget", budgetSchema);
