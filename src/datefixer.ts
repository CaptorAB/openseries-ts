export function dateFix(input: string | Date): Date {
  if (typeof input === "string") {
    return new Date(input + "T12:00:00Z");
  }
  return input instanceof Date ? input : new Date(input);
}

export function dateToStr(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function generateCalendarDateRange(
  tradingDays: number,
  options?: { start?: string; end?: string },
): string[] {
  if (tradingDays < 1) {
    throw new Error("trading_days must be greater than zero");
  }
  const result: string[] = [];
  let current: Date;
  if (options?.start) {
    current = dateFix(options.start);
  } else if (options?.end) {
    current = dateFix(options.end);
    current.setDate(current.getDate() - tradingDays * 2);
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
  return result;
}

export function offsetBusinessDays(
  ddate: Date,
  days: number,
): Date {
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
