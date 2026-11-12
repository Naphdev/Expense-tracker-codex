export function calendarParts(date: Date, timeZone: string) {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const [year, month, day] = fmt.format(date).split("-").map(Number);
  return { year, month, day };
}

export function dateFromCalendar(year: number, month: number, day: number): Date {
  return new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
}

export function parseCalendarDate(value: string | Date, timeZone = "Asia/Bangkok"): Date {
  if (value instanceof Date) {
    const parts = calendarParts(value, "UTC");
    return dateFromCalendar(parts.year, parts.month, parts.day);
  }
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (match) {
    return dateFromCalendar(Number(match[1]), Number(match[2]), Number(match[3]));
  }
  const parsed = new Date(value);
  const parts = calendarParts(parsed, timeZone);
  return dateFromCalendar(parts.year, parts.month, parts.day);
}

export function startOfDay(date: Date): Date {
  const parts = calendarParts(date, "UTC");
  return new Date(Date.UTC(parts.year, parts.month - 1, parts.day, 0, 0, 0, 0));
}

export function endOfDay(date: Date): Date {
  const parts = calendarParts(date, "UTC");
  return new Date(Date.UTC(parts.year, parts.month - 1, parts.day, 23, 59, 59, 999));
}

export function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return parseCalendarDate(next, "UTC");
}

export function addMonths(date: Date, months: number): Date {
  const parts = calendarParts(date, "UTC");
  return dateFromCalendar(parts.year, parts.month + months, parts.day);
}

export function addYears(date: Date, years: number): Date {
  const parts = calendarParts(date, "UTC");
  return dateFromCalendar(parts.year + years, parts.month, parts.day);
}

export function rangeForPreset(
  preset: "this_week" | "this_month" | "last_month" | "this_year" | "custom",
  timeZone: string,
  customStart?: string,
  customEnd?: string,
) {
  const now = new Date();
  const today = calendarParts(now, timeZone);
  const todayDate = dateFromCalendar(today.year, today.month, today.day);

  if (preset === "custom" && customStart && customEnd) {
    return {
      start: startOfDay(parseCalendarDate(customStart, timeZone)),
      end: endOfDay(parseCalendarDate(customEnd, timeZone)),
    };
  }

  if (preset === "this_week") {
    const weekday = new Date(todayDate).getUTCDay() || 7;
    const start = addDays(todayDate, 1 - weekday);
    return { start: startOfDay(start), end: endOfDay(todayDate) };
  }

  if (preset === "last_month") {
    const firstThisMonth = dateFromCalendar(today.year, today.month, 1);
    const lastMonthEnd = addDays(firstThisMonth, -1);
    const last = calendarParts(lastMonthEnd, "UTC");
    return {
      start: startOfDay(dateFromCalendar(last.year, last.month, 1)),
      end: endOfDay(lastMonthEnd),
    };
  }

  if (preset === "this_year") {
    return {
      start: startOfDay(dateFromCalendar(today.year, 1, 1)),
      end: endOfDay(todayDate),
    };
  }

  return {
    start: startOfDay(dateFromCalendar(today.year, today.month, 1)),
    end: endOfDay(todayDate),
  };
}

export function nextOccurrence(current: Date, frequency: "daily" | "weekly" | "monthly" | "yearly"): Date {
  if (frequency === "daily") return addDays(current, 1);
  if (frequency === "weekly") return addDays(current, 7);
  if (frequency === "yearly") return addYears(current, 1);
  return addMonths(current, 1);
}
