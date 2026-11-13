import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import { DEFAULT_ACCOUNTS } from "../config/constants.js";
import { loadEnv } from "../config/env.js";
import { Account } from "../models/Account.js";
import { User, type UserDocument } from "../models/User.js";
import { AppError } from "../utils/AppError.js";

export function publicUser(user: UserDocument) {
  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    preferredLanguage: user.preferredLanguage,
    preferredTheme: user.preferredTheme,
    currency: user.currency,
    timezone: user.timezone,
  };
}

export async function registerUser(input: {
  name: string;
  email: string;
  password: string;
  preferredLanguage?: "th" | "en";
}) {
  const existing = await User.findOne({ email: input.email.toLowerCase() });
  if (existing) throw new AppError("Email already registered", 409);
  const passwordHash = await bcrypt.hash(input.password, 12);
  const user = await User.create({
    name: input.name,
    email: input.email.toLowerCase(),
    passwordHash,
    preferredLanguage: input.preferredLanguage ?? "en",
  });
  await Account.insertMany(
    DEFAULT_ACCOUNTS.map((account) => ({
      userId: user._id,
      name: account.name,
      accountType: account.accountType,
      balanceMinor: 0,
      currency: "THB",
    })),
  );
  return publicUser(user);
}

export async function loginUser(email: string, password: string) {
  const user = await User.findOne({ email: email.toLowerCase() }).select("+passwordHash");
  if (!user) throw new AppError("Invalid email or password", 401);
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) throw new AppError("Invalid email or password", 401);
  return publicUser(user);
}

export async function requestPasswordReset(email: string) {
  const env = loadEnv();
  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user) throw new AppError("Email is not registered", 404);
  const generic = { message: "If that email exists, a reset link was generated." };
  const token = crypto.randomBytes(32).toString("hex");
  user.passwordResetTokenHash = crypto.createHash("sha256").update(token).digest("hex");
  user.passwordResetExpires = new Date(Date.now() + env.PASSWORD_RESET_EXPIRES_MINUTES * 60 * 1000);
  await user.save();
  return {
    ...generic,
    ...(env.NODE_ENV !== "production" ? { resetToken: token } : {}),
  };
}

export async function resetPassword(token: string, password: string) {
  const hash = crypto.createHash("sha256").update(token).digest("hex");
  const user = await User.findOne({
    passwordResetTokenHash: hash,
    passwordResetExpires: { $gt: new Date() },
  }).select("+passwordResetTokenHash +passwordResetExpires +passwordHash");
  if (!user) throw new AppError("Invalid or expired reset token", 400);
  user.passwordHash = await bcrypt.hash(password, 12);
  user.passwordResetTokenHash = null;
  user.passwordResetExpires = null;
  await user.save();
  return publicUser(user);
}
