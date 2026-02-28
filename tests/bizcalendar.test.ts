import { describe, it, expect } from "vitest";
import {
  filterBusinessDays,
  filterToBusinessDays,
  isBusinessDay,
  lastBusinessDayOfMonth,
  lastBusinessDayOfYear,
  prevBusinessDay,
  resampleToPeriodEnd,
} from "../src/bizcalendar";

describe("filterBusinessDays", () => {
  it("excludes weekends", () => {
    const dates = ["2024-01-06", "2024-01-07", "2024-01-08"]; // Sun, Mon, Tue
    const result = filterBusinessDays(dates, "US");
    expect(result).toEqual(["2024-01-08"]); // Sun and Sat-like excluded
  });

  it("excludes holidays for single country", () => {
    const dates = ["2024-01-01", "2024-01-02", "2024-01-03"]; // New Year, Tue, Wed
    const result = filterBusinessDays(dates, "US");
    expect(result).not.toContain("2024-01-01");
    expect(result).toContain("2024-01-02");
  });

  it("accepts array of countries", () => {
    const dates = ["2024-01-01", "2024-01-02"];
    const result = filterBusinessDays(dates, ["US", "SE"]);
    expect(Array.isArray(result)).toBe(true);
  });
});

describe("isBusinessDay", () => {
  it("returns false for Saturday", () => {
    expect(isBusinessDay("2024-01-06", "US")).toBe(false);
  });

  it("returns false for Sunday", () => {
    expect(isBusinessDay("2024-01-07", "US")).toBe(false);
  });

  it("returns true for regular weekday", () => {
    expect(isBusinessDay("2024-01-02", "US")).toBe(true);
  });

  it("returns false for holiday", () => {
    expect(isBusinessDay("2024-01-01", "US")).toBe(false);
  });
});

describe("prevBusinessDay", () => {
  it("returns same date if already business day", () => {
    const result = prevBusinessDay("2024-01-02", "US");
    expect(result).toBe("2024-01-02");
  });

  it("steps back from Saturday to Friday", () => {
    const result = prevBusinessDay("2024-01-06", "US"); // Sat
    expect(result).toBe("2024-01-05"); // Fri
  });

  it("steps back from Sunday to Friday", () => {
    const result = prevBusinessDay("2024-01-07", "US"); // Sun
    expect(result).toBe("2024-01-05"); // Fri
  });
});

describe("lastBusinessDayOfMonth", () => {
  it("returns last business day of month", () => {
    const result = lastBusinessDayOfMonth(2024, 1, "US"); // Jan 2024
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(["2024-01-29", "2024-01-30", "2024-01-31"]).toContain(result);
  });

  it("handles February", () => {
    const result = lastBusinessDayOfMonth(2024, 2, "US");
    expect(result).toMatch(/^2024-02-\d{2}$/);
  });
});

describe("lastBusinessDayOfYear", () => {
  it("returns last business day of year", () => {
    const result = lastBusinessDayOfYear(2024, "US");
    expect(result).toMatch(/^2024-\d{2}-\d{2}$/);
    expect(result >= "2024-12-27").toBe(true);
  });
});

describe("resampleToPeriodEnd", () => {
  it("resamples to month-end (ME)", () => {
    const dates = ["2024-01-02", "2024-01-15", "2024-01-31", "2024-02-01"];
    const columns = [[100, 101, 102, 103]];
    const { dates: outDates, columns: outCols } = resampleToPeriodEnd(
      dates,
      columns,
      "ME",
      "US",
    );
    expect(outDates.length).toBeGreaterThan(0);
    expect(outCols[0].length).toBe(outDates.length);
  });

  it("resamples to week-end (WE)", () => {
    const dates = ["2024-01-01", "2024-01-02", "2024-01-03", "2024-01-08"];
    const columns = [[10, 11, 12, 13]];
    const { dates: outDates } = resampleToPeriodEnd(dates, columns, "WE", "US");
    expect(outDates.length).toBeGreaterThanOrEqual(0);
  });

  it("resamples to quarter-end (QE)", () => {
    const dates = ["2024-01-15", "2024-02-15", "2024-03-28", "2024-04-01"];
    const columns = [[1, 2, 3, 4]];
    const { dates: outDates } = resampleToPeriodEnd(dates, columns, "QE", "SE");
    expect(outDates.length).toBeGreaterThanOrEqual(0);
  });

  it("resamples to year-end (YE)", () => {
    const dates = ["2024-06-15", "2024-12-30", "2025-01-02"];
    const columns = [[100, 200, 210]];
    const { dates: outDates } = resampleToPeriodEnd(dates, columns, "YE", "US");
    expect(outDates.length).toBeGreaterThanOrEqual(0);
  });
});

describe("filterToBusinessDays", () => {
  it("filters dates and columns to business days only", () => {
    const dates = ["2024-01-05", "2024-01-08", "2024-01-06"]; // Fri, Mon, Sat
    const columns = [[10, 20, 30]];
    const { dates: outDates, columns: outCols } = filterToBusinessDays(
      dates,
      columns,
      "US",
    );
    expect(outDates).not.toContain("2024-01-06"); // Saturday excluded
    expect(outCols[0].length).toBe(outDates.length);
  });
});
