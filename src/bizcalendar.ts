/**
 * Business calendar utilities with holiday awareness via date-holidays.
 *
 * Supports filtering dates to business days (excluding weekends and holidays),
 * finding last business day of period, and period-end resampling.
 */

import Holidays from "date-holidays";
import { dateToStr } from "./datefixer";

export type CountryCode = string;

function parseDate(s: string): Date {
  return new Date(s + "T12:00:00Z");
}

function isWeekend(dateStr: string): boolean {
  const d = parseDate(dateStr);
  const day = d.getUTCDay();
  return day === 0 || day === 6;
}

function createHolidayCheckers(countries: CountryCode | CountryCode[]): ((d: string) => boolean)[] {
  const codes = Array.isArray(countries) ? countries : [countries];
  return codes.map((c) => {
    const hd = new Holidays(c);
    return (dateStr: string) => {
      const result = hd.isHoliday(parseDate(dateStr));
      return result !== false && Array.isArray(result) && result.length > 0;
    };
  });
}

function isHoliday(dateStr: string, checkers: ((d: string) => boolean)[]): boolean {
  return checkers.some((check) => check(dateStr));
}

/**
 * Filters an array of date strings to keep only business days.
 * Business day = not weekend (Sat/Sun) and not a holiday in any of the specified countries.
 *
 * @param dates - Array of date strings (YYYY-MM-DD)
 * @param countries - Country code(s) for holiday calendar, e.g. "SE", "US", ["SE", "NO"]
 * @returns Array of business-day date strings (subsequence of input, preserving order)
 */
export function filterBusinessDays(
  dates: string[],
  countries: CountryCode | CountryCode[],
): string[] {
  const checkers = createHolidayCheckers(countries);
  return dates.filter((d) => !isWeekend(d) && !isHoliday(d, checkers));
}

/**
 * Checks whether a date is a business day.
 */
export function isBusinessDay(dateStr: string, countries: CountryCode | CountryCode[]): boolean {
  if (isWeekend(dateStr)) return false;
  const checkers = createHolidayCheckers(countries);
  return !isHoliday(dateStr, checkers);
}

/**
 * Finds the last business day on or before the given date.
 */
export function prevBusinessDay(
  dateStr: string,
  countries: CountryCode | CountryCode[],
): string {
  const d = parseDate(dateStr);
  const checkers = createHolidayCheckers(countries);
  while (true) {
    const str = dateToStr(d);
    if (!isWeekend(str) && !isHoliday(str, checkers)) return str;
    d.setUTCDate(d.getUTCDate() - 1);
  }
}

/**
 * Last business day of the given month (1-indexed).
 */
export function lastBusinessDayOfMonth(
  year: number,
  month: number,
  countries: CountryCode | CountryCode[],
): string {
  const lastDay = new Date(Date.UTC(year, month, 0));
  const str = dateToStr(lastDay);
  return prevBusinessDay(str, countries);
}

/**
 * Last business day of the given year.
 */
export function lastBusinessDayOfYear(
  year: number,
  countries: CountryCode | CountryCode[],
): string {
  return lastBusinessDayOfMonth(year, 12, countries);
}

export type ResampleFreq = "WE" | "ME" | "QE" | "YE";

function getWeekKey(dateStr: string): string {
  const d = parseDate(dateStr);
  const startOfYear = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const msPerWeek = 7 * 24 * 60 * 60 * 1000;
  const weekNum = Math.floor(
    (d.getTime() - startOfYear.getTime()) / msPerWeek,
  );
  return `${d.getUTCFullYear()}-W${weekNum}`;
}

/**
 * Resamples dates and columns to end-of-business period frequency.
 * Each period takes the last observation that falls on a business day within that period.
 *
 * @param dates - Sorted array of date strings
 * @param columns - Value columns (same length as dates)
 * @param freq - WE (week-end), ME (month-end), QE (quarter-end), YE (year-end)
 * @param countries - Country code(s) for holiday filtering
 */
export function resampleToPeriodEnd(
  dates: string[],
  columns: number[][],
  freq: ResampleFreq,
  countries: CountryCode | CountryCode[],
): { dates: string[]; columns: number[][] } {
  const checkers = createHolidayCheckers(countries);
  const isBiz = (d: string) => !isWeekend(d) && !isHoliday(d, checkers);

  const outDates: string[] = [];
  const outCols = columns.map(() => [] as number[]);

  const getPeriodKey = (dateStr: string): string => {
    const [y, m] = dateStr.split("-").map(Number);
    if (freq === "WE") return getWeekKey(dateStr);
    if (freq === "YE") return `${y}`;
    if (freq === "QE") return `${y}-Q${Math.ceil(m / 3)}`;
    return dateStr.slice(0, 7);
  };

  let i = 0;
  while (i < dates.length) {
    const periodKey = getPeriodKey(dates[i]!);
    let lastBizIdx = -1;
    let j = i;
    while (j < dates.length && getPeriodKey(dates[j]!) === periodKey) {
      if (isBiz(dates[j]!)) lastBizIdx = j;
      j++;
    }
    if (lastBizIdx >= 0) {
      outDates.push(dates[lastBizIdx]!);
      for (let c = 0; c < columns.length; c++) {
        outCols[c].push(columns[c][lastBizIdx]!);
      }
    }
    i = j;
  }
  return { dates: outDates, columns: outCols };
}

/**
 * Filters (dates, columns) to retain only rows where the date is a business day.
 * Preserves alignment across all columns.
 */
export function filterToBusinessDays(
  dates: string[],
  columns: number[][],
  countries: CountryCode | CountryCode[],
): { dates: string[]; columns: number[][] } {
  const checkers = createHolidayCheckers(countries);
  const indices: number[] = [];
  for (let i = 0; i < dates.length; i++) {
    if (!isWeekend(dates[i]!) && !isHoliday(dates[i]!, checkers)) indices.push(i);
  }
  return {
    dates: indices.map((i) => dates[i]!),
    columns: columns.map((col) => indices.map((i) => col[i]!)),
  };
}
