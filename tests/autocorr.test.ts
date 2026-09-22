import { describe, it, expect } from "vitest";
import { ValueType } from "../src/types";
import {
  acfFromReturns,
  chi2Cdf,
  demeanedReturnsForAutocorr,
  ljungBoxFromReturns,
  pacfFromReturns,
  pearsonAutocorrAtLag,
} from "../src/autocorr";
import { mean } from "../src/utils";
import { simulatedSeries } from "./fixtures";
import { OpenTimeSeries } from "../src/series";

const to9 = (x: number) => x.toFixed(9);

describe("autocorr module", () => {
  it("demeanedReturnsForAutocorr handles price and return series", () => {
    const price = demeanedReturnsForAutocorr(
      [100, 101, 103, 102],
      ValueType.PRICE,
    );
    expect(price.length).toBe(3);
    const rets = demeanedReturnsForAutocorr(
      [0.01, -0.02, 0.03, 0.01],
      ValueType.RTRN,
    );
    expect(Math.abs(mean(rets))).toBeLessThan(1e-12);
    const squared = demeanedReturnsForAutocorr(
      [100, 101, 103, 102],
      ValueType.PRICE,
      true,
    );
    expect(squared.every((v) => v >= 0)).toBe(true);
  });

  it("pearsonAutocorrAtLag returns NaN for insufficient data or zero variance", () => {
    expect(pearsonAutocorrAtLag([1, 2, 3], 3)).toBeNaN();
    expect(pearsonAutocorrAtLag([5, 5, 5, 5], 1)).toBeNaN();
    expect(to9(pearsonAutocorrAtLag([1, 2, 3, 4, 5], 1))).toBe("1.000000000");
  });

  it("acfFromReturns and pacfFromReturns handle int and list lags", () => {
    const rets = demeanedReturnsForAutocorr(
      simulatedSeries("Test").getTsdfValues(),
      ValueType.PRICE,
    );
    const acf = acfFromReturns(rets, [1, 3, 5]);
    expect(acf.lags).toEqual([0, 1, 3, 5]);
    expect(acf.values[0]).toBe(1);
    const pacf = pacfFromReturns(rets, 3);
    expect(pacf.lags).toEqual([0, 1, 2, 3]);
    expect(pacf.values[0]).toBe(1);
  });

  it("ljungBoxFromReturns handles empty lags and lags beyond sample size", () => {
    const rets = demeanedReturnsForAutocorr(
      [100, 101, 102, 103],
      ValueType.PRICE,
    );
    expect(ljungBoxFromReturns(rets, [])).toEqual([0, 1, []]);
    const [stat, pval, lags] = ljungBoxFromReturns(rets, [1, 100]);
    expect(lags).toEqual([1, 100]);
    expect(Number.isFinite(stat)).toBe(true);
    expect(pval).toBeGreaterThanOrEqual(0);
    expect(pval).toBeLessThanOrEqual(1);
  });

  it("chi2Cdf matches scipy reference values", () => {
    expect(chi2Cdf(0, 5)).toBe(0);
    expect(to9(chi2Cdf(0.5, 5))).toBe("0.007876707");
    expect(to9(chi2Cdf(100, 5))).toBe("1.000000000");
    expect(to9(chi2Cdf(0.3, 1))).toBe("0.416117579");
    expect(chi2Cdf(0.5, 0.5)).toBeGreaterThan(0);
    expect(chi2Cdf(1, 0)).toBeNaN();
  });
});

describe("OpenTimeSeries autocorr extensions", () => {
  it("autocorr(lag=2) and squared=true match Python", () => {
    const s = simulatedSeries("Test");
    expect(to9(s.autocorr(2))).toBe("-0.091794828");
    expect(to9(s.autocorr(1, {}, true))).toBe("-0.051726453");
  });

  it("acf and pacf with squared=true match Python", () => {
    const s = simulatedSeries("Test");
    const acf = s.acf(3, {}, true);
    expect(acf.lags).toEqual([0, 1, 2, 3]);
    expect(to9(acf.values[1])).toBe("-0.051726453");
    const pacf = s.pacf(2, {}, true);
    expect(to9(pacf.values[2])).toBe("-0.005466009");
  });

  it("ljungBox with custom lags and squared=true match Python", () => {
    const s = simulatedSeries("Test");
    const [stat, pval, lags] = s.ljungBox([1, 3, 5]);
    expect(lags).toEqual([1, 3, 5]);
    expect(to9(stat)).toBe("1.786472435");
    expect(to9(pval)).toBe("0.617883101");
    const [statSq, pvalSq, lagsSq] = s.ljungBox(3, {}, true);
    expect(lagsSq).toEqual([1, 2, 3]);
    expect(to9(statSq)).toBe("0.699113027");
    expect(to9(pvalSq)).toBe("0.873412554");
  });

  it("partialAutocorr returns NaN when lag is missing from pacf output", () => {
    const s = OpenTimeSeries.fromArrays(
      "Short",
      ["2020-01-01", "2020-01-02"],
      [100, 101],
    );
    expect(s.partialAutocorr(5)).toBeNaN();
  });
});
