export const INCOME_CATEGORIES = [
  "salary",
  "freelance",
  "business",
  "investment_income",
  "bonus",
  "other",
] as const;

export const EXPENSE_CATEGORIES = [
  "food",
  "transportation",
  "shopping",
  "housing",
  "utilities",
  "entertainment",
  "healthcare",
  "education",
  "subscription",
  "other",
] as const;

export const PAYMENT_METHODS = ["cash", "bank", "card", "e_wallet", "other"] as const;
export const ACCOUNT_TYPES = ["cash", "bank", "e_wallet", "credit", "other"] as const;
export const TRANSACTION_TYPES = ["income", "expense", "transfer"] as const;
export const FREQUENCIES = ["daily", "weekly", "monthly", "yearly"] as const;

export const DEFAULT_ACCOUNTS = [
  { name: "Cash", accountType: "cash" as const },
  { name: "Bank", accountType: "bank" as const },
  { name: "E-Wallet", accountType: "e_wallet" as const },
];
