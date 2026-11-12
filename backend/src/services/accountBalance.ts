import mongoose from "mongoose";
import { Account } from "../models/Account.js";
import { AppError } from "../utils/AppError.js";

export async function getOwnedAccount(userId: string, accountId: string, session?: mongoose.ClientSession) {
  const query = Account.findOne({ _id: accountId, userId, isArchived: false });
  if (session) query.session(session);
  const account = await query;
  if (!account) throw new AppError("Account not found", 404);
  return account;
}

export async function applyBalanceChange(
  accountId: string,
  deltaMinor: number,
  session?: mongoose.ClientSession,
) {
  const update = Account.findByIdAndUpdate(accountId, { $inc: { balanceMinor: deltaMinor } }, { new: true, session });
  const account = await update;
  if (!account) throw new AppError("Account not found", 404);
  return account;
}

export async function reverseTransactionEffect(tx: {
  type: string;
  amountMinor: number;
  sourceAccountId?: mongoose.Types.ObjectId | null;
  destinationAccountId?: mongoose.Types.ObjectId | null;
  status: string;
  affectsBalance?: boolean;
}, session?: mongoose.ClientSession) {
  if (tx.status !== "completed" || tx.affectsBalance === false) return;
  if (tx.type === "income" && tx.destinationAccountId) {
    await applyBalanceChange(tx.destinationAccountId.toString(), -tx.amountMinor, session);
  } else if (tx.type === "expense" && tx.sourceAccountId) {
    await applyBalanceChange(tx.sourceAccountId.toString(), tx.amountMinor, session);
  } else if (tx.type === "transfer" && tx.sourceAccountId && tx.destinationAccountId) {
    await applyBalanceChange(tx.sourceAccountId.toString(), tx.amountMinor, session);
    await applyBalanceChange(tx.destinationAccountId.toString(), -tx.amountMinor, session);
  }
}

export async function applyTransactionEffect(tx: {
  type: string;
  amountMinor: number;
  sourceAccountId?: mongoose.Types.ObjectId | string | null;
  destinationAccountId?: mongoose.Types.ObjectId | string | null;
  status?: string;
  affectsBalance?: boolean;
}, session?: mongoose.ClientSession) {
  if ((tx.status && tx.status !== "completed") || tx.affectsBalance === false) return;
  if (tx.type === "income" && tx.destinationAccountId) {
    await applyBalanceChange(String(tx.destinationAccountId), tx.amountMinor, session);
  } else if (tx.type === "expense" && tx.sourceAccountId) {
    await applyBalanceChange(String(tx.sourceAccountId), -tx.amountMinor, session);
  } else if (tx.type === "transfer" && tx.sourceAccountId && tx.destinationAccountId) {
    await applyBalanceChange(String(tx.sourceAccountId), -tx.amountMinor, session);
    await applyBalanceChange(String(tx.destinationAccountId), tx.amountMinor, session);
  }
}

export async function withOptionalTransaction<T>(fn: (session?: mongoose.ClientSession) => Promise<T>): Promise<T> {
  const session = await mongoose.startSession();
  try {
    session.startTransaction();
    const result = await fn(session);
    await session.commitTransaction();
    return result;
  } catch (error) {
    if (session.inTransaction()) await session.abortTransaction();
    const message = error instanceof Error ? error.message : "";
    if (message.includes("Transaction numbers are only allowed") || message.includes("replica set")) {
      return fn(undefined);
    }
    throw error;
  } finally {
    await session.endSession();
  }
}
