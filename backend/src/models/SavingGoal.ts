import mongoose, { Schema } from "mongoose";

export interface SavingGoalDocument extends mongoose.Document {
  userId: mongoose.Types.ObjectId;
  name: string;
  targetAmountMinor: number;
  currentAmountMinor: number;
  targetDate: Date;
  description?: string;
  status: "active" | "completed" | "cancelled";
  createdAt: Date;
  updatedAt: Date;
}

const savingGoalSchema = new Schema<SavingGoalDocument>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 80 },
    targetAmountMinor: { type: Number, required: true, min: 1 },
    currentAmountMinor: { type: Number, required: true, default: 0, min: 0 },
    targetDate: { type: Date, required: true },
    description: { type: String, default: "", maxlength: 500 },
    status: { type: String, enum: ["active", "completed", "cancelled"], default: "active" },
  },
  { timestamps: true },
);

savingGoalSchema.index({ userId: 1, status: 1 });

export const SavingGoal = mongoose.model<SavingGoalDocument>("SavingGoal", savingGoalSchema);
