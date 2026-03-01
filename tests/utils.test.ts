import { describe, it, expect } from "vitest";
import {
  mean,
  std,
  quantile,
  pctChange,
  cumProd,
  ffill,
  logReturns,
  skewness,
  kurtosis,
  normPpf,
} from "../src/utils";

const to9 = (x: number) => x.toFixed(9);

describe("utils", () => {
  it("mean of empty array returns NaN", () => {
    expect(mean([])).toBeNaN();
  });

  it("mean of [1,2,3,4,5]", () => {
    expect(mean([1, 2, 3, 4, 5])).toBe(3);
  });

  it("std of [1,2,3,4,5] (ddof=1)", () => {
    const arr = [1, 2, 3, 4, 5];
    expect(to9(std(arr, 1))).toBe("1.581138830");
  });

  it("std returns NaN when length <= ddof", () => {
    expect(std([1], 1)).toBeNaN();
    expect(std([1, 2], 2)).toBeNaN();
  });

  it("quantile of sorted array", () => {
    const arr = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    expect(quantile(arr, 0.5, true)).toBe(5.5);
    expect(quantile(arr, 0.25, true)).toBe(3.25);
  });

  it("quantile of unsorted array sorts internally", () => {
    const arr = [3, 1, 4, 1, 5];
    expect(quantile(arr, 0.5, false)).toBe(3);
  });

  it("quantile of empty array returns NaN", () => {
    expect(quantile([], 0.5)).toBeNaN();
  });

  it("pctChange of [100, 110, 99]", () => {
    const result = pctChange([100, 110, 99]);
    expect(result[0]).toBe(0);
    expect(to9(result[1])).toBe("0.100000000");
    expect(to9(result[2])).toBe("-0.100000000");
  });

  it("pctChange handles prev === 0", () => {
    const result = pctChange([0, 10, 20]);
    expect(result[0]).toBe(0);
    expect(result[1]).toBe(0);
    expect(result[2]).toBe(1);
  });

  it("cumProd with start 1", () => {
    const result = cumProd([2, 3, 4], 1);
    expect(result).toEqual([2, 6, 24]);
  });

  it("ffill fills NaN with previous", () => {
    const result = ffill([1, NaN, NaN, 4, NaN]);
    expect(result).toEqual([1, 1, 1, 4, 4]);
  });

  it("logReturns of price series", () => {
    const prices = [100, 110, 99];
    const result = logReturns(prices);
    expect(result[0]).toBe(0);
    expect(result[1]).toBeCloseTo(Math.log(110 / 100));
    expect(result[2]).toBeCloseTo(Math.log(99 / 110));
  });

  it("skewness of symmetric sample", () => {
    const arr = [1, 2, 3, 4, 5];
    expect(to9(skewness(arr))).toBe("0.000000000");
  });

  it("kurtosis of [1,2,3,4,5]", () => {
    const arr = [1, 2, 3, 4, 5];
    expect(to9(kurtosis(arr))).toBe("-1.912000000");
  });

  it("skewness returns 0 when std is 0", () => {
    expect(skewness([5, 5, 5])).toBe(0);
  });

  it("skewness returns NaN when n < 3", () => {
    expect(skewness([])).toBeNaN();
    expect(skewness([1])).toBeNaN();
    expect(skewness([1, 2])).toBeNaN();
  });

  it("kurtosis returns 0 when std is 0", () => {
    expect(kurtosis([5, 5, 5, 5])).toBe(0);
  });

  it("kurtosis returns NaN when n < 4", () => {
    expect(kurtosis([])).toBeNaN();
    expect(kurtosis([1])).toBeNaN();
    expect(kurtosis([1, 2, 3])).toBeNaN();
  });

  describe("normPpf", () => {
    it("returns NaN for p <= 0 or p >= 1", () => {
      expect(normPpf(0)).toBeNaN();
      expect(normPpf(1)).toBeNaN();
      expect(normPpf(-0.1)).toBeNaN();
    });
    it("low tail p < 0.02425", () => {
      const x = normPpf(0.01);
      expect(Number.isFinite(x)).toBe(true);
      expect(x).toBeLessThan(-2);
    });
    it("high tail p > 0.97575", () => {
      const x = normPpf(0.99);
      expect(Number.isFinite(x)).toBe(true);
      expect(x).toBeGreaterThan(2);
    });
    it("center p in (0.02425, 0.97575)", () => {
      expect(normPpf(0.5)).toBeCloseTo(0);
      expect(normPpf(0.95)).toBeCloseTo(1.645, 1);
    });
  });
});
