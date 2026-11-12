import mongoose, { Schema } from "mongoose";

export interface UserDocument extends mongoose.Document {
  name: string;
  email: string;
  passwordHash: string;
  preferredLanguage: "th" | "en";
  preferredTheme: "system" | "light" | "dark";
  currency: "THB";
  timezone: string;
  passwordResetTokenHash?: string | null;
  passwordResetExpires?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<UserDocument>(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    email: { type: String, required: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true, select: false },
    preferredLanguage: { type: String, enum: ["th", "en"], default: "en" },
    preferredTheme: { type: String, enum: ["system", "light", "dark"], default: "system" },
    currency: { type: String, enum: ["THB"], default: "THB" },
    timezone: { type: String, default: "Asia/Bangkok" },
    passwordResetTokenHash: { type: String, default: null, select: false },
    passwordResetExpires: { type: Date, default: null, select: false },
  },
  { timestamps: true },
);

userSchema.index({ email: 1 }, { unique: true });

export const User = mongoose.model<UserDocument>("User", userSchema);
