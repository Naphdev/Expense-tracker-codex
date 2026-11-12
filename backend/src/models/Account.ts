import mongoose, { Schema } from "mongoose";
import { ACCOUNT_TYPES } from "../config/constants.js";

export interface AccountDocument extends mongoose.Document {
  userId: mongoose.Types.ObjectId;
  name: string;
  accountType: (typeof ACCOUNT_TYPES)[number];
  balanceMinor: number;
  currency: "THB";
  isArchived: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const accountSchema = new Schema<AccountDocument>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 80 },
    accountType: { type: String, enum: ACCOUNT_TYPES, required: true },
    balanceMinor: { type: Number, required: true, default: 0 },
    currency: { type: String, enum: ["THB"], default: "THB" },
    isArchived: { type: Boolean, default: false },
  },
  { timestamps: true },
);

accountSchema.index({ userId: 1, name: 1 });

export const Account = mongoose.model<AccountDocument>("Account", accountSchema);
