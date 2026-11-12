import mongoose, { Schema } from "mongoose";

export type FinanceNotificationType = "budget_threshold" | "recurring_due";

export interface FinanceNotificationDocument extends mongoose.Document {
  userId: mongoose.Types.ObjectId;
  type: FinanceNotificationType;
  eventKey: string;
  data: Record<string, unknown>;
  readAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const financeNotificationSchema = new Schema<FinanceNotificationDocument>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    type: { type: String, enum: ["budget_threshold", "recurring_due"], required: true },
    eventKey: { type: String, required: true },
    data: { type: Schema.Types.Mixed, required: true },
    readAt: { type: Date, default: null },
  },
  { timestamps: true },
);

financeNotificationSchema.index({ userId: 1, eventKey: 1 }, { unique: true });
financeNotificationSchema.index({ userId: 1, readAt: 1, createdAt: -1 });

export const FinanceNotification = mongoose.model<FinanceNotificationDocument>(
  "FinanceNotification",
  financeNotificationSchema,
);
