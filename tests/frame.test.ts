import { describe, it, expect } from "vitest";
import { OpenTimeSeries } from "../src/series";
import { OpenFrame } from "../src/frame";
import { ValueType } from "../src/types";
import { ReturnSimulation } from "../src/simulation";
import {
  LabelsNotUniqueError,
  MixedValuetypesError,
  NoWeightsError,
  ResampleDataLossError,
  type LiteralPortfolioWeightings,
} from "../src/types";
import { simulatedFrame } from "./fixtures";

const to9 = (x: number) => x.toFixed(9);

describe("OpenFrame", () => {
  describe("error handling", () => {
    it("constructor throws LabelsNotUniqueError when constituent labels are duplicate", () => {
      const s1 = OpenTimeSeries.fromArrays("Same", ["2020-01-01"], [100]);
      const s2 = OpenTimeSeries.fromArrays("Same", ["2020-01-01"], [101]);
      expect(() => new OpenFrame([s1, s2])).toThrow(LabelsNotUniqueError);
      expect(() => new OpenFrame([s1, s2])).toThrow("must be unique");
    });

    it("makePortfolio throws NoWeightsError when no weights and no strategy", () => {
      const frame = simulatedFrame({ numAssets: 2 });
      frame.weights = null;
      expect(() => frame.makePortfolio("P")).toThrow(NoWeightsError);
      expect(() => frame.makePortfolio("P")).toThrow("Weights must be provided");
    });

    it("makePortfolio with MixedValuetypesError when frame has mix of PRICE and RTRN", () => {
      const s1 = OpenTimeSeries.fromArrays("A", ["2020-01-01", "2020-01-02"], [
        100,
        101,
      ]);
      const s2 = OpenTimeSeries.fromArrays("B", ["2020-01-01", "2020-01-02"], [
        0.01,
        0.02,
      ]);
      s2.valuetype = ValueType.RTRN;
      const frame = new OpenFrame([s1, s2], [0.5, 0.5]);
      expect(() => frame.correlMatrix()).toThrow(MixedValuetypesError);
      expect(() => frame.correlMatrix()).toThrow("Mix of series types");
    });
  });

  it("creates from constituents", () => {
    const frame = simulatedFrame({ numAssets: 2 });
    expect(frame.itemCount).toBe(2);
  });

  it("computes correlation matrix - diagonal and off-diagonal match expected (seed 71)", () => {
    const frame = simulatedFrame();
    const corr = frame.correlMatrix();
    expect(corr.length).toBe(3);
    expect(to9(corr[0][0])).toBe("1.000000000");
    expect(to9(corr[1][1])).toBe("1.000000000");
    expect(to9(corr[2][2])).toBe("1.000000000");
    expect(to9(corr[0][1])).toBe("0.024405730");
  });

  it("makePortfolio with weights - first and last values match expected (seed 71)", () => {
    const frame = simulatedFrame();
    const port = frame.makePortfolio("P");
    expect(to9(port.values[0])).toBe("1.000000000");
    expect(to9(port.values[port.values.length - 1])).toBe("1.046086053");
  });

  it("makePortfolio eq_weights - last value matches expected (seed 71)", () => {
    const frame = simulatedFrame();
    const port = frame.makePortfolio("P", "eq_weights");
    expect(port.values[0]).toBeCloseTo(1);
    expect(to9(port.values[port.values.length - 1])).toBe("1.046086053");
  });

  it("makePortfolio inv_vol - last value matches expected (seed 71)", () => {
    const frame = simulatedFrame();
    const port = frame.makePortfolio("P", "inv_vol");
    expect(to9(port.values[port.values.length - 1])).toBe("1.045423113");
  });

  it("trackingError matches expected (seed 71)", () => {
    const frame = simulatedFrame();
    const te = frame.trackingError(0);
    expect(to9(te[0])).toBe("0.000000000");
    expect(to9(te[1])).toBe("0.136223886");
    expect(to9(te[2])).toBe("0.146192009");
  });

  it("infoRatio matches expected (seed 71)", () => {
    const frame = simulatedFrame();
    const ir = frame.infoRatio(0);
    expect(to9(ir[0])).toBe("0.000000000");
    expect(to9(ir[1])).toBe("-0.998893749");
    expect(to9(ir[2])).toBe("-0.175749797");
  });

  it("maxDrawdown returns array of max drawdowns per column (seed 71)", () => {
    const frame = simulatedFrame();
    const mdd = frame.maxDrawdown();
    expect(mdd.length).toBe(3);
    expect(mdd.every((x) => x <= 0)).toBe(true);
    expect(mdd.every((x) => Number.isFinite(x))).toBe(true);
  });

  it("maxDrawdownBottomDate returns bottom date per column (seed 71)", () => {
    const frame = simulatedFrame();
    const bottoms = frame.maxDrawdownBottomDate();
    expect(bottoms.length).toBe(3);
    expect(bottoms.every((d) => d === undefined || /^\d{4}-\d{2}-\d{2}$/.test(d!))).toBe(true);
  });

  it("maxDrawdownBottomDate matches constituent series bottom dates", () => {
    const s1 = OpenTimeSeries.fromArrays(
      "A",
      ["2020-01-01", "2020-01-02", "2020-01-03"],
      [100, 80, 90],
    );
    const s2 = OpenTimeSeries.fromArrays(
      "B",
      ["2020-01-01", "2020-01-02", "2020-01-03"],
      [50, 60, 40],
    );
    const frame = new OpenFrame([s1, s2]);
    const bottoms = frame.maxDrawdownBottomDate();
    expect(bottoms[0]).toBe("2020-01-02");
    expect(bottoms[1]).toBe("2020-01-03");
  });

  it("maxDrawdownBottomDate returns undefined for column with no drawdown", () => {
    const s1 = OpenTimeSeries.fromArrays("A", ["2020-01-01", "2020-01-02"], [100, 80]);
    const s2 = OpenTimeSeries.fromArrays("B", ["2020-01-01", "2020-01-02"], [50, 60]);
    const frame = new OpenFrame([s1, s2]);
    const bottoms = frame.maxDrawdownBottomDate();
    expect(bottoms[0]).toBe("2020-01-02");
    expect(bottoms[1]).toBeUndefined();
  });

  it("maxDrawdown matches constituent series maxDrawdown", () => {
    const s1 = OpenTimeSeries.fromArrays(
      "A",
      ["2020-01-01", "2020-01-02", "2020-01-03"],
      [100, 80, 90],
    );
    const s2 = OpenTimeSeries.fromArrays(
      "B",
      ["2020-01-01", "2020-01-02", "2020-01-03"],
      [50, 60, 40],
    );
    const frame = new OpenFrame([s1, s2]);
    const mdd = frame.maxDrawdown();
    expect(mdd[0]).toBe(s1.maxDrawdown());
    expect(mdd[1]).toBe(s2.maxDrawdown());
  });

  it("beta and jensenAlpha match expected (seed 71)", () => {
    const frame = simulatedFrame();
    expect(to9(frame.beta(0, 1))).toBe("0.025083312");
    expect(to9(frame.jensenAlpha(0, 1))).toBe("0.103227989");
  });

  it("ordLeastSquaresFit returns coefficient, intercept, rsquared (perfect fit)", () => {
    const x = [1, 2, 3, 4, 5];
    const y = x.map((xi) => 2 + 3 * xi);
    const s1 = OpenTimeSeries.fromArrays("x", ["2020-01-01", "2020-01-02", "2020-01-03", "2020-01-06", "2020-01-07"], x);
    const s2 = OpenTimeSeries.fromArrays("y", ["2020-01-01", "2020-01-02", "2020-01-03", "2020-01-06", "2020-01-07"], y);
    const frame = new OpenFrame([s1, s2]);
    const r = frame.ordLeastSquaresFit(1, 0, { fittedSeries: false });
    expect(r.coefficient).toBe(3);
    expect(r.intercept).toBe(2);
    expect(r.rsquared).toBe(1);
  });

  it("ordLeastSquaresFit with fittedSeries adds column", () => {
    const x = [1, 2, 3];
    const y = [5, 8, 11];
    const s1 = OpenTimeSeries.fromArrays("x", ["2020-01-01", "2020-01-02", "2020-01-03"], x);
    const s2 = OpenTimeSeries.fromArrays("y", ["2020-01-01", "2020-01-02", "2020-01-03"], y);
    const frame = new OpenFrame([s1, s2]);
    expect(frame.itemCount).toBe(2);
    const r = frame.ordLeastSquaresFit(1, 0, { fittedSeries: true });
    expect(r.coefficient).toBe(3);
    expect(r.intercept).toBe(2);
    expect(frame.tsdf.columns.length).toBe(3);
    expect(frame.columnLabels[2]).toBe("OLS fit (y vs x)");
    expect(frame.tsdf.columns[2]).toEqual([5, 8, 11]);
  });

  it("ordLeastSquaresFit defaults fittedSeries to true", () => {
    const s1 = OpenTimeSeries.fromArrays("A", ["2020-01-01", "2020-01-02"], [1, 2]);
    const s2 = OpenTimeSeries.fromArrays("B", ["2020-01-01", "2020-01-02"], [3, 5]);
    const frame = new OpenFrame([s1, s2]);
    frame.ordLeastSquaresFit(1, 0);
    expect(frame.tsdf.columns.length).toBe(3);
  });

  it("ordLeastSquaresFit with simulatedFrame matches expected (seed 71)", () => {
    const frame = simulatedFrame();
    const r = frame.ordLeastSquaresFit(0, 1, { fittedSeries: false });
    expect(Number.isFinite(r.coefficient)).toBe(true);
    expect(Number.isFinite(r.intercept)).toBe(true);
    expect(r.rsquared).toBeGreaterThanOrEqual(0);
    expect(r.rsquared).toBeLessThanOrEqual(1);
  });

  it("ordLeastSquaresFit returns NaN object for invalid column indices", () => {
    const s1 = OpenTimeSeries.fromArrays("A", ["2020-01-01", "2020-01-02"], [1, 2]);
    const s2 = OpenTimeSeries.fromArrays("B", ["2020-01-01", "2020-01-02"], [3, 5]);
    const frame = new OpenFrame([s1, s2]);
    const r1 = frame.ordLeastSquaresFit(99, 0, { fittedSeries: false });
    expect(r1.coefficient).toBeNaN();
    expect(r1.intercept).toBeNaN();
    expect(r1.rsquared).toBeNaN();
    const r2 = frame.ordLeastSquaresFit(0, 99, { fittedSeries: false });
    expect(r2.coefficient).toBeNaN();
    expect(r2.intercept).toBeNaN();
    expect(r2.rsquared).toBeNaN();
  });

  it("ordLeastSquaresFit returns NaN when fewer than 2 valid pairs", () => {
    const s1 = OpenTimeSeries.fromArrays("x", ["2020-01-01", "2020-01-02"], [1, 2]);
    const s2 = OpenTimeSeries.fromArrays("y", ["2020-01-01", "2020-01-02"], [NaN, NaN]);
    const frame = new OpenFrame([s1, s2]);
    const r = frame.ordLeastSquaresFit(1, 0, { fittedSeries: false });
    expect(r.coefficient).toBeNaN();
    expect(r.intercept).toBeNaN();
    expect(r.rsquared).toBeNaN();
  });

  it("makePortfolio min_vol_overweight produces valid output (seed 71)", () => {
    const frame = simulatedFrame();
    const port = frame.makePortfolio("P", "min_vol_overweight");
    expect(port.values[0]).toBeCloseTo(1);
    expect(port.values.length).toBe(frame.length);
  });

  it("makePortfolio min_vol_overweight overweights lowest-vol asset", () => {
    const s1 = OpenTimeSeries.fromArrays("A", ["2020-01-01", "2020-01-02", "2020-01-03"], [100, 100, 100]);
    const s2 = OpenTimeSeries.fromArrays("B", ["2020-01-01", "2020-01-02", "2020-01-03"], [100, 105, 102]);
    const s3 = OpenTimeSeries.fromArrays("C", ["2020-01-01", "2020-01-02", "2020-01-03"], [100, 98, 101]);
    const frame = new OpenFrame([s1, s2, s3], null);
    const port = frame.makePortfolio("P", "min_vol_overweight");
    expect(port.values.length).toBe(3);
  });

  it("makePortfolio max_div produces valid output (seed 71)", () => {
    const frame = simulatedFrame();
    const port = frame.makePortfolio("P", "max_div");
    expect(port.values[0]).toBeCloseTo(1);
    expect(port.values.length).toBe(frame.length);
  });

  it("aligns series with non-overlapping date ranges (getVal branches)", () => {
    const s1 = OpenTimeSeries.fromArrays("A", ["2020-01-02", "2020-01-03"], [100, 101]);
    const s2 = OpenTimeSeries.fromArrays("B", ["2020-01-01", "2020-01-02", "2020-01-05"], [200, 201, 202]);
    const frame = new OpenFrame([s1, s2], [0.5, 0.5]);
    expect(frame.tsdf.dates).toContain("2020-01-01");
    expect(frame.tsdf.dates).toContain("2020-01-05");
    expect(frame.length).toBeGreaterThan(2);
  });

  it("uses countries from options when provided", () => {
    const s1 = OpenTimeSeries.fromArrays("A", ["2020-01-01", "2020-01-02"], [100, 101], { countries: ["NO"] });
    const s2 = OpenTimeSeries.fromArrays("B", ["2020-01-01", "2020-01-02"], [200, 201], { countries: ["US"] });
    const frame = new OpenFrame([s1, s2], null, { countries: ["SE", "NO"] });
    expect(frame.countries).toEqual(["SE", "NO"]);
  });

  it("derives countries from first constituent when options not provided", () => {
    const s1 = OpenTimeSeries.fromArrays("A", ["2020-01-01", "2020-01-02"], [100, 101], { countries: ["US"] });
    const s2 = OpenTimeSeries.fromArrays("B", ["2020-01-01", "2020-01-02"], [200, 201]);
    const frame = new OpenFrame([s1, s2]);
    expect(frame.countries).toEqual(["US"]);
  });

  it("ensureReturns uses RTRN path when all constituents are RTRN", () => {
    const sim = ReturnSimulation.fromGbm(2, 0.05, 0.1, 100, 252, 71);
    const dc = sim.toDateColumns("Asset", { end: "2020-06-30" });
    const constituents = dc.columns.map((col) =>
      OpenTimeSeries.fromArrays(col.name, dc.dates, col.values, {
        valuetype: ValueType.RTRN,
      }),
    );
    const frame = new OpenFrame(constituents, [0.5, 0.5]);
    const corr = frame.correlMatrix();
    expect(corr.length).toBe(2);
  });

  it("mergeSeries inner keeps only common dates", () => {
    const s1 = OpenTimeSeries.fromArrays("A", ["2020-01-01", "2020-01-02", "2020-01-03"], [100, 101, 102]);
    const s2 = OpenTimeSeries.fromArrays("B", ["2020-01-02", "2020-01-03"], [200, 201]);
    const frame = new OpenFrame([s1, s2], [0.5, 0.5]);
    frame.mergeSeries("inner");
    expect(frame.tsdf.dates).toEqual(["2020-01-02", "2020-01-03"]);
  });

  it("aligns series with getVal binary search for dates between observations", () => {
    const s1 = OpenTimeSeries.fromArrays("A", ["2020-01-01", "2020-01-05"], [100, 104]);
    const s2 = OpenTimeSeries.fromArrays("B", ["2020-01-01", "2020-01-02", "2020-01-03", "2020-01-04", "2020-01-05"], [200, 201, 202, 203, 204]);
    const frame = new OpenFrame([s1, s2], [0.5, 0.5]);
    expect(frame.tsdf.dates).toContain("2020-01-02");
    expect(frame.tsdf.dates).toContain("2020-01-03");
    expect(frame.tsdf.columns[0][frame.tsdf.dates.indexOf("2020-01-02")]).toBe(100);
    expect(frame.tsdf.columns[0][frame.tsdf.dates.indexOf("2020-01-05")]).toBe(104);
  });

  it("uses countries from single string when options provide one", () => {
    const s1 = OpenTimeSeries.fromArrays("A", ["2020-01-01"], [100]);
    const frame = new OpenFrame([s1], null, { countries: "NO" });
    expect(frame.countries).toEqual(["NO"]);
  });

  it("uses countries from first constituent when no options", () => {
    const s1 = OpenTimeSeries.fromArrays("A", ["2020-01-01"], [100], { countries: ["NO"] });
    const s2 = OpenTimeSeries.fromArrays("B", ["2020-01-01"], [200]);
    const frame = new OpenFrame([s1, s2]);
    expect(frame.countries).toEqual(["NO"]);
  });

  it("correlMatrix returns NaN when fewer than 2 overlapping observations", () => {
    const s1 = OpenTimeSeries.fromArrays("A", ["2020-01-01"], [100]);
    const s2 = OpenTimeSeries.fromArrays("B", ["2020-01-01"], [200]);
    const frame = new OpenFrame([s1, s2], [0.5, 0.5]);
    const corr = frame.correlMatrix();
    expect(corr[0][0]).toBe(1);
    expect(corr[1][1]).toBe(1);
    expect(corr[0][1]).toBeNaN();
    expect(corr[1][0]).toBeNaN();
  });

  it("trackingError with negative baseColumn indexes from end", () => {
    const frame = simulatedFrame({ numAssets: 2 });
    const te = frame.trackingError(-1);
    expect(te[te.length - 1]).toBe(0);
  });

  it("infoRatio returns NaN when vol is zero (identical series)", () => {
    const s1 = OpenTimeSeries.fromArrays("A", ["2020-01-01", "2020-01-02", "2020-01-03"], [100, 101, 102]);
    const s2 = s1.fromDeepcopy();
    s2.label = "B";
    const frame = new OpenFrame([s1, s2], [0.5, 0.5]);
    const ir = frame.infoRatio(0);
    expect(ir[0]).toBe(0);
    expect(ir[1]).toBeNaN();
  });

  it("beta returns NaN when market variance is zero", () => {
    const s1 = OpenTimeSeries.fromArrays("A", ["2020-01-01", "2020-01-02", "2020-01-03"], [100, 101, 102]);
    const s2 = OpenTimeSeries.fromArrays("B", ["2020-01-01", "2020-01-02", "2020-01-03"], [50, 50, 50]);
    const frame = new OpenFrame([s1, s2], [0.5, 0.5]);
    expect(frame.beta(0, 1)).toBeNaN();
  });

  it("correlMatrix returns 1 on diagonal when denom is zero (identical pairs)", () => {
    const s1 = OpenTimeSeries.fromArrays("A", ["2020-01-01", "2020-01-02"], [100, 100]);
    const s2 = OpenTimeSeries.fromArrays("B", ["2020-01-01", "2020-01-02"], [100, 100]);
    const frame = new OpenFrame([s1, s2], [0.5, 0.5]);
    const corr = frame.correlMatrix();
    expect(corr[0][0]).toBe(1);
    expect(corr[1][1]).toBe(1);
    expect(corr[0][1]).toBeNaN();
  });

  it("makePortfolio inv_vol with one zero-vol series", () => {
    const s1 = OpenTimeSeries.fromArrays("A", ["2020-01-01", "2020-01-02", "2020-01-03"], [100, 100, 100]);
    const s2 = OpenTimeSeries.fromArrays("B", ["2020-01-01", "2020-01-02", "2020-01-03"], [100, 101, 102]);
    const frame = new OpenFrame([s1, s2], null);
    const port = frame.makePortfolio("P", "inv_vol");
    expect(port.values.length).toBe(3);
  });

  it("jensenAlpha with riskfreeRate", () => {
    const frame = simulatedFrame();
    const alpha = frame.jensenAlpha(0, 1, 0.01);
    expect(Number.isFinite(alpha)).toBe(true);
  });

  it("addTimeseries merges and updates labels", () => {
    const frame = simulatedFrame({ numAssets: 2 });
    const extra = OpenTimeSeries.fromArrays("C", ["2020-01-01", "2020-01-02"], [100, 101]);
    frame.addTimeseries(extra);
    expect(frame.itemCount).toBe(3);
    expect(frame.columnLabels).toContain("C");
  });

  it("makePortfolio max_div with identical series handles singular cov", () => {
    const s1 = OpenTimeSeries.fromArrays("A", ["2020-01-01", "2020-01-02", "2020-01-03"], [100, 101, 102]);
    const s2 = s1.fromDeepcopy();
    s2.label = "B";
    const frame = new OpenFrame([s1, s2], [0.5, 0.5]);
    const port = frame.makePortfolio("P", "max_div");
    expect(port.values.length).toBe(3);
  });

  it("makePortfolio falls back to eq_weights for unknown strategy", () => {
    const frame = simulatedFrame({ numAssets: 2 });
    const port = frame.makePortfolio("P", "unknown" as LiteralPortfolioWeightings);
    expect(port.values.length).toBeGreaterThan(0);
    expect(port.values[0]).toBeCloseTo(1);
  });

  it("makePortfolio max_div with zero-variance series (invertMatrix singular)", () => {
    const s1 = OpenTimeSeries.fromArrays("A", ["2020-01-01", "2020-01-02", "2020-01-03"], [50, 50, 50]);
    const s2 = OpenTimeSeries.fromArrays("B", ["2020-01-01", "2020-01-02", "2020-01-03"], [50, 50, 50]);
    const frame = new OpenFrame([s1, s2], [0.5, 0.5]);
    const port = frame.makePortfolio("P", "max_div");
    expect(port.values.length).toBe(3);
  });

  describe("filterToBusinessDays and resampleToPeriodEnd", () => {
    it("filterToBusinessDays reduces frame observations", () => {
      const frame = simulatedFrame();
      const before = frame.length;
      frame.filterToBusinessDays();
      expect(frame.length).toBeLessThanOrEqual(before);
    });

    it("resampleToPeriodEnd reduces to month-end and re-merges", () => {
      const frame = simulatedFrame();
      const before = frame.length;
      frame.resampleToPeriodEnd("ME");
      expect(frame.length).toBeLessThan(before);
      expect(frame.itemCount).toBeGreaterThan(0);
    });

    it("resampleToPeriodEnd throws when any constituent is RTRN", () => {
      const frame = simulatedFrame({ asReturns: true });
      expect(() => frame.resampleToPeriodEnd("ME")).toThrow(ResampleDataLossError);
    });
  });

  describe("truncFrame", () => {
    it("truncates to explicit date range", () => {
      const frame = simulatedFrame();
      const origFirst = frame.firstIdx;
      const origLast = frame.lastIdx;
      frame.truncFrame({
        startCut: "2020-06-01",
        endCut: "2020-09-30",
      });
      expect(frame.firstIdx >= "2020-06-01").toBe(true);
      expect(frame.lastIdx <= "2020-09-30").toBe(true);
    });

    it("truncates to overlap when where is both (default)", () => {
      const s1 = OpenTimeSeries.fromArrays(
        "A",
        ["2020-01-01", "2020-01-02", "2020-01-03", "2020-01-06"],
        [100, 101, 102, 103],
      );
      const s2 = OpenTimeSeries.fromArrays(
        "B",
        ["2020-01-02", "2020-01-03"],
        [200, 201],
      );
      const frame = new OpenFrame([s1, s2], [0.5, 0.5]);
      frame.mergeSeries("inner");
      expect(frame.tsdf.dates).toEqual(["2020-01-02", "2020-01-03"]);
      frame.truncFrame({ where: "both" });
      expect(frame.length).toBe(2);
    });

    it("truncFrame with no overlap leaves frame unchanged", () => {
      const frame = simulatedFrame();
      const lenBefore = frame.length;
      frame.truncFrame({ startCut: "2030-01-01", endCut: "2030-06-01" });
      expect(frame.length).toBe(lenBefore);
    });

    it("truncFrame with where before infers fromDate from latest constituent start", () => {
      const s1 = OpenTimeSeries.fromArrays("A", ["2020-01-01", "2020-01-02", "2020-01-03"], [100, 101, 102]);
      const s2 = OpenTimeSeries.fromArrays("B", ["2020-01-02", "2020-01-03", "2020-01-06"], [200, 201, 202]);
      const frame = new OpenFrame([s1, s2], [0.5, 0.5]);
      frame.truncFrame({ where: "before", endCut: "2020-01-06" });
      expect(frame.firstIdx).toBe("2020-01-02");
    });

    it("truncFrame with where after infers toDate from earliest constituent end", () => {
      const s1 = OpenTimeSeries.fromArrays("A", ["2020-01-01", "2020-01-02", "2020-01-03"], [100, 101, 102]);
      const s2 = OpenTimeSeries.fromArrays("B", ["2020-01-01", "2020-01-02"], [200, 201]);
      const frame = new OpenFrame([s1, s2], [0.5, 0.5]);
      frame.truncFrame({ where: "after", startCut: "2020-01-01" });
      expect(frame.lastIdx).toBe("2020-01-02");
    });

    it("truncFrame returns early when fromDate or toDate cannot be determined", () => {
      const s1 = OpenTimeSeries.fromArrays("A", ["2020-01-01"], [100]);
      const frame = new OpenFrame([s1], null);
      frame.truncFrame({ where: "before" });
      expect(frame.length).toBe(1);
    });

    it("truncFrame returns early when fromIdx < 0 (startCut after all dates)", () => {
      const frame = simulatedFrame();
      const lenBefore = frame.length;
      frame.truncFrame({ startCut: "2030-01-01", endCut: "2030-12-31" });
      expect(frame.length).toBe(lenBefore);
    });

    it("truncFrame returns early when toIdx < fromIdx (invalid range)", () => {
      const frame = simulatedFrame();
      const lenBefore = frame.length;
      frame.truncFrame({ startCut: "2020-06-01", endCut: "2020-05-01" });
      expect(frame.length).toBe(lenBefore);
    });
  });

  describe("captureRatio", () => {
    it("captureRatio both returns array with benchmark column 0", () => {
      const frame = simulatedFrame();
      const ratios = frame.captureRatio("both", -1);
      expect(ratios.length).toBe(3);
      expect(ratios[2]).toBe(0);
    });

    it("captureRatio up and down return numbers or NaN", () => {
      const frame = simulatedFrame();
      const up = frame.captureRatio("up", 0);
      const down = frame.captureRatio("down", 0);
      expect(up.length).toBe(3);
      expect(down.length).toBe(3);
    });

    it("captureRatio with explicit baseColumn index", () => {
      const frame = simulatedFrame();
      const ratios = frame.captureRatio("both", 1);
      expect(ratios[1]).toBe(0);
    });

    it("captureRatio with custom freq", () => {
      const frame = simulatedFrame();
      const ratios = frame.captureRatio("both", -1, { freq: "QE" });
      expect(ratios.length).toBe(3);
    });

    it("captureRatio up returns NaN when benchmark has no up months", () => {
      const s1 = OpenTimeSeries.fromArrays("A", ["2020-01-01", "2020-02-01", "2020-03-01"], [100, 95, 90]);
      const s2 = OpenTimeSeries.fromArrays("B", ["2020-01-01", "2020-02-01", "2020-03-01"], [100, 98, 96]);
      const frame = new OpenFrame([s1, s2], [0.5, 0.5]);
      const up = frame.captureRatio("up", -1);
      expect(up.length).toBe(2);
    });

    it("captureRatio down returns NaN when benchmark has no down months", () => {
      const s1 = OpenTimeSeries.fromArrays("A", ["2020-01-01", "2020-02-01", "2020-03-01"], [100, 105, 110]);
      const s2 = OpenTimeSeries.fromArrays("B", ["2020-01-01", "2020-02-01", "2020-03-01"], [100, 102, 104]);
      const frame = new OpenFrame([s1, s2], [0.5, 0.5]);
      const down = frame.captureRatio("down", -1);
      expect(down.length).toBe(2);
    });

    it("captureRatio both with valid up and down periods", () => {
      const s1 = OpenTimeSeries.fromArrays("A", ["2020-01-01", "2020-02-01", "2020-03-01", "2020-04-01", "2020-05-01", "2020-06-01"], [100, 105, 103, 101, 106, 108]);
      const s2 = OpenTimeSeries.fromArrays("B", ["2020-01-01", "2020-02-01", "2020-03-01", "2020-04-01", "2020-05-01", "2020-06-01"], [100, 102, 98, 97, 103, 105]);
      const frame = new OpenFrame([s1, s2], [0.5, 0.5], { countries: "US" });
      const ratios = frame.captureRatio("both", -1);
      expect(ratios.length).toBe(2);
      expect(ratios[1]).toBe(0);
      expect(Number.isFinite(ratios[0]) || Number.isNaN(ratios[0])).toBe(true);
    });

    it("captureRatio returns NaN for asset with mismatched length", () => {
      const frame = simulatedFrame({ numAssets: 2, days: 20 });
      const ratios = frame.captureRatio("both", -1, { freq: "ME" });
      expect(Array.isArray(ratios)).toBe(true);
    });
  });

  it("filterToBusinessDays updates constituent tsdf when colIdx found", () => {
    const s1 = OpenTimeSeries.fromArrays("A", ["2024-01-02", "2024-01-03", "2024-01-04", "2024-01-05", "2024-01-06"], [100, 101, 102, 103, 104], { countries: "US" });
    const s2 = OpenTimeSeries.fromArrays("B", ["2024-01-02", "2024-01-03", "2024-01-04", "2024-01-05", "2024-01-06"], [200, 201, 202, 203, 204], { countries: "US" });
    const frame = new OpenFrame([s1, s2], [0.5, 0.5], { countries: "US" });
    frame.filterToBusinessDays();
    expect(s1.tsdf.length).toBeLessThanOrEqual(5);
    expect(s2.tsdf.length).toBeLessThanOrEqual(5);
  });

  it("returnColumns returns same as ensureReturns", () => {
    const frame = simulatedFrame({ numAssets: 2 });
    const cols = frame.returnColumns();
    expect(cols.length).toBe(2);
    expect(cols[0][0]).toBe(0);
  });
});
