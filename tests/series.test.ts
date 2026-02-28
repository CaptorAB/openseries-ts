import { describe, it, expect } from "vitest";
import { OpenTimeSeries, timeseriesChain } from "../src/series";
import { ValueType } from "../src/types";

describe("OpenTimeSeries", () => {
  it("creates from arrays", () => {
    const dates = ["2020-01-02", "2020-01-03", "2020-01-06"];
    const values = [100, 102, 101];
    const series = OpenTimeSeries.fromArrays("Test", dates, values);
    expect(series.length).toBe(3);
    expect(series.firstIdx).toBe("2020-01-02");
    expect(series.lastIdx).toBe("2020-01-06");
  });

  it("computes value return", () => {
    const series = OpenTimeSeries.fromArrays("Test", ["2020-01-01", "2020-01-02"], [100, 110]);
    expect(series.valueRet()).toBeCloseTo(0.1);
  });

  it("converts to returns and back", () => {
    const dates = ["2020-01-01", "2020-01-02", "2020-01-03"];
    const values = [100, 105, 102];
    const series = OpenTimeSeries.fromArrays("Test", dates, values).fromDeepcopy();
    series.valueToRet();
    expect(series.valuetype).toBe(ValueType.RTRN);
    series.toCumret();
    expect(series.valuetype).toBe(ValueType.PRICE);
    expect(series.getTsdfValues()[0]).toBeCloseTo(1);
  });

  it("computes volatility", () => {
    const n = 252;
    const dates = Array.from({ length: n }, (_, i) => {
      const d = new Date("2020-01-01");
      d.setDate(d.getDate() + i);
      return d.toISOString().slice(0, 10);
    });
    const values = Array.from({ length: n }, (_, i) => 100 + Math.sin(i / 10) * 5);
    const series = OpenTimeSeries.fromArrays("Test", dates, values);
    series.valueToRet();
    const vol = series.vol();
    expect(vol).toBeGreaterThan(0);
  });

  it("computes max drawdown", () => {
    const series = OpenTimeSeries.fromArrays(
      "Test",
      ["2020-01-01", "2020-01-02", "2020-01-03", "2020-01-04"],
      [100, 110, 95, 105],
    );
    const mdd = series.maxDrawdown();
    expect(mdd).toBeLessThan(0);
  });
});

describe("timeseriesChain", () => {
  it("chains overlapping series", () => {
    const front = OpenTimeSeries.fromArrays(
      "Front",
      ["2020-01-01", "2020-01-02", "2020-01-03"],
      [100, 101, 102],
    );
    const back = OpenTimeSeries.fromArrays(
      "Back",
      ["2020-01-02", "2020-01-03", "2020-01-04"],
      [102, 103, 104],
    );
    const chained = timeseriesChain(front, back);
    expect(chained.getTsdfDates().length).toBeGreaterThan(2);
  });

  it("throws when series do not overlap", () => {
    const front = OpenTimeSeries.fromArrays(
      "Front",
      ["2020-01-01", "2020-01-02"],
      [100, 101],
    );
    const back = OpenTimeSeries.fromArrays(
      "Back",
      ["2020-01-05", "2020-01-06"],
      [105, 106],
    );
    expect(() => timeseriesChain(front, back)).toThrow("overlap");
  });
});
