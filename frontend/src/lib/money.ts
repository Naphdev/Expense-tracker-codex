export function formatTHB(amount: number, locale: string) {
  return new Intl.NumberFormat(locale === "th" ? "th-TH" : "en-TH", {
    style: "currency",
    currency: "THB",
    currencyDisplay: "narrowSymbol",
  }).format(amount);
}

export function formatDate(value: string | Date, locale: string) {
  return new Intl.DateTimeFormat(locale === "th" ? "th-TH" : "en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

export function todayISO() {
  const now = new Date();
  const tz = "Asia/Bangkok";
  return new Intl.DateTimeFormat("en-CA", { timeZone: tz }).format(now);
}
