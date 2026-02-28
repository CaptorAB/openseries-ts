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
} from "../src/utils";

const to9 = (x: number) => x.toFixed(9);

describe("utils", () => {
  it("mean of [1,2,3,4,5]", () => {
    expect(mean([1, 2, 3, 4, 5])).toBe(3);
  });

  it("std of [1,2,3,4,5] (ddof=1)", () => {
    const arr = [1, 2, 3, 4, 5];
    expect(to9(std(arr, 1))).toBe("1.581138830");
  });

  it("quantile of sorted array", () => {
    const arr = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    expect(quantile(arr, 0.5, true)).toBe(5.5);
    expect(quantile(arr, 0.25, true)).toBe(3.25);
  });

  it("pctChange of [100, 110, 99]", () => {
    const result = pctChange([100, 110, 99]);
    expect(result[0]).toBe(0);
    expect(to9(result[1])).toBe("0.100000000");
    expect(to9(result[2])).toBe("-0.100000000");
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
});
