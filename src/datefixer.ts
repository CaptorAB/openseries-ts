/** Normalizes string or Date input to a Date. */
export function dateFix(input: string | Date): Date {
  if (typeof input === "string") {
    return new Date(input + "T12:00:00Z");
  }
  return input instanceof Date ? input : new Date(input);
}

/** Returns a Date as YYYY-MM-DD string. */
export function dateToStr(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Returns an array of business-day date strings (excludes weekends). */
export function generateCalendarDateRange(
  tradingDays: number,
  options?: { start?: string; end?: string },
): string[] {
  if (tradingDays < 1) {
    throw new Error("trading_days must be greater than zero");
  }
  const result: string[] = [];
  if (options?.end) {
    const current = dateFix(options.end);
    const temp: string[] = [];
    while (temp.length < tradingDays) {
      const day = current.getDay();
      if (day !== 0 && day !== 6) {
        temp.push(dateToStr(current));
      }
      current.setDate(current.getDate() - 1);
    }
    result.push(...temp.reverse());
  } else {
    let current: Date;
    if (options?.start) {
      current = dateFix(options.start);
    } else {
      current = new Date();
    }
    let count = 0;
    while (count < tradingDays) {
      const day = current.getDay();
      if (day !== 0 && day !== 6) {
        result.push(dateToStr(current));
        count++;
      }
      current.setDate(current.getDate() + 1);
    }
  }
  return result;
}

/** Offsets a date by a number of business days. */
export function offsetBusinessDays(ddate: Date, days: number): Date {
  const result = new Date(ddate);
  let remaining = Math.abs(days);
  const step = days >= 0 ? 1 : -1;
  while (remaining > 0) {
    result.setDate(result.getDate() + step);
    const day = result.getDay();
    if (day !== 0 && day !== 6) remaining--;
  }
  return result;
}
