export const MINOR_UNITS = 100;

export function toMinorUnits(amount: number | string): number {
  const value = typeof amount === "string" ? Number(amount) : amount;
  if (!Number.isFinite(value)) {
    throw new Error("Invalid monetary amount");
  }
  return Math.round(value * MINOR_UNITS);
}

export function fromMinorUnits(minor: number): number {
  return Number((minor / MINOR_UNITS).toFixed(2));
}

export function addMinor(...values: number[]): number {
  return values.reduce((sum, value) => sum + value, 0);
}

export function percent(part: number, total: number): number {
  if (total === 0) return 0;
  return Number(((part / total) * 100).toFixed(2));
}

export function formatTHB(minor: number, locale = "th-TH"): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "THB",
    currencyDisplay: "narrowSymbol",
  }).format(fromMinorUnits(minor));
}
