export type ReportRange = "this_week" | "this_month" | "last_month" | "this_year" | "custom";
export type DatePeriod = { start: string; end: string };

function partsInTimezone(date: Date, timezone: string) {
  const values = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const part = (type: string) => values.find((value) => value.type === type)?.value ?? "01";
  return { year: Number(part("year")), month: Number(part("month")), day: Number(part("day")) };
}

function makeDate(year: number, month: number, day: number) {
  return String(year).padStart(4, "0") + "-" + String(month).padStart(2, "0") + "-" + String(day).padStart(2, "0");
}

function shiftDate(value: string, days: number) {
  const date = new Date(value + "T12:00:00Z");
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function getReportPeriod(
  range: ReportRange,
  timezone: string,
  customStart: string,
  customEnd: string,
  now = new Date(),
): DatePeriod | null {
  if (range === "custom") {
    if (!customStart || !customEnd || customStart > customEnd) return null;
    return { start: customStart, end: customEnd };
  }
  const today = partsInTimezone(now, timezone);
  const todayKey = makeDate(today.year, today.month, today.day);
  if (range === "this_week") {
    const weekday = new Date(todayKey + "T12:00:00Z").getUTCDay() || 7;
    return { start: shiftDate(todayKey, 1 - weekday), end: todayKey };
  }
  if (range === "this_year") {
    return { start: makeDate(today.year, 1, 1), end: todayKey };
  }
  if (range === "last_month") {
    const startOfThisMonth = makeDate(today.year, today.month, 1);
    const endOfLastMonth = shiftDate(startOfThisMonth, -1);
    const end = new Date(endOfLastMonth + "T12:00:00Z");
    const year = end.getUTCFullYear();
    const month = end.getUTCMonth() + 1;
    return { start: makeDate(year, month, 1), end: endOfLastMonth };
  }
  return { start: makeDate(today.year, today.month, 1), end: todayKey };
}

export function getComparisonPeriod(range: ReportRange, selected: DatePeriod) {
  if (range === "last_month") {
    const priorEnd = shiftDate(selected.start, -1);
    const end = new Date(priorEnd + "T12:00:00Z");
    const year = end.getUTCFullYear();
    const month = end.getUTCMonth() + 1;
    return { start: makeDate(year, month, 1), end: priorEnd };
  }
  const start = new Date(selected.start + "T12:00:00Z");
  const end = new Date(selected.end + "T12:00:00Z");
  const length = Math.round((end.getTime() - start.getTime()) / 86_400_000) + 1;
  return { start: shiftDate(selected.start, -length), end: shiftDate(selected.start, -1) };
}

export function formatReportDate(value: string, locale: string) {
  const date = new Date(value + "T12:00:00Z");
  return new Intl.DateTimeFormat(locale === "th" ? "th-TH" : "en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

export function formatReportPeriod(period: DatePeriod | null, locale: string) {
  if (!period) return "";
  return formatReportDate(period.start, locale) + " – " + formatReportDate(period.end, locale);
}
