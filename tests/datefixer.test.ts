import { describe, it, expect } from "vitest";
import {
  generateCalendarDateRange,
  offsetBusinessDays,
  dateFix,
  dateToStr,
} from "../src/datefixer";

describe("generateCalendarDateRange", () => {
  it("with end option returns expected dates (5 days ending 2020-01-10)", () => {
    const dates = generateCalendarDateRange(5, { end: "2020-01-10" });
    expect(dates).toEqual([
      "2020-01-06",
      "2020-01-07",
      "2020-01-08",
      "2020-01-09",
      "2020-01-10",
    ]);
  });

  it("with start option returns correct number of business days", () => {
    const dates = generateCalendarDateRange(3, { start: "2020-01-02" });
    expect(dates.length).toBe(3);
    expect(dates[0]).toBe("2020-01-02");
  });
});

describe("offsetBusinessDays", () => {
  it("offset +3 from 2020-01-15 yields 2020-01-20", () => {
    const d = dateFix("2020-01-15");
    const result = offsetBusinessDays(d, 3);
    expect(dateToStr(result)).toBe("2020-01-20");
  });

  it("offset -2 from 2020-01-15 yields 2020-01-13", () => {
    const d = dateFix("2020-01-15");
    const result = offsetBusinessDays(d, -2);
    expect(dateToStr(result)).toBe("2020-01-13");
  });
});
