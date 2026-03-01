import { describe, it, expect } from "vitest";
import { OpenTimeSeries, timeseriesChain } from "../src/series";
import { ValueType } from "../src/types";
import {
  DateAlignmentError,
  InitialValueZeroError,
  ResampleDataLossError,
} from "../src/types";
import { simulatedSeries } from "./fixtures";
import { ReturnSimulation } from "../src/simulation";
import { cumProd } from "../src/utils";

const to9 = (x: number) => x.toFixed(9);

describe("OpenTimeSeries", () => {
  describe("error handling", () => {
    it("geoRet throws InitialValueZeroError when first value is zero", () => {
      const series = OpenTimeSeries.fromArrays(
        "Test",
        ["2020-01-01", "2020-01-02"],
        [0, 100],
      );
      expect(() => series.geoRet()).toThrow(InitialValueZeroError);
      expect(() => series.geoRet()).toThrow("zero or negative");
    });

    it("geoRet throws InitialValueZeroError when last value is zero", () => {
      const series = OpenTimeSeries.fromArrays(
        "Test",
        ["2020-01-01", "2020-01-02"],
        [100, 0],
      );
      expect(() => series.geoRet()).toThrow(InitialValueZeroError);
    });

    it("valueRet throws InitialValueZeroError when initial value is zero", () => {
      const series = OpenTimeSeries.fromArrays(
        "Test",
        ["2020-01-01", "2020-01-02"],
        [0, 110],
      );
      expect(() => series.valueRet()).toThrow(InitialValueZeroError);
      expect(() => series.valueRet()).toThrow("initial value zero");
    });

    it("fromDateColumns throws when column index out of range", () => {
      const dateColumns = {
        dates: ["2020-01-01"],
        columns: [{ name: "A", values: [100] }],
      };
      expect(() =>
        OpenTimeSeries.fromDateColumns(dateColumns, { columnIndex: 5 }),
      ).toThrow("Column index out of range");
    });
  });

  it("creates from arrays", () => {
    const dates = ["2020-01-02", "2020-01-03", "2020-01-06"];
    const values = [100, 102, 101];
    const series = OpenTimeSeries.fromArrays("Test", dates, values);
    expect(series.length).toBe(3);
    expect(series.firstIdx).toBe("2020-01-02");
    expect(series.lastIdx).toBe("2020-01-06");
  });

  it("fromObject accepts Record<string, number>", () => {
    const obj: Record<string, number> = {
      "2020-01-01": 100,
      "2020-01-02": 101,
      "2020-01-03": 102,
    };
    const series = OpenTimeSeries.fromObject(obj);
    expect(series.length).toBe(3);
    expect(series.getTsdfValues()).toEqual([100, 101, 102]);
  });

  it("fromObject accepts array of {date, value}", () => {
    const arr = [
      { date: "2020-01-01", value: 100 },
      { date: "2020-01-02", value: 101 },
    ];
    const series = OpenTimeSeries.fromObject(arr);
    expect(series.length).toBe(2);
    expect(series.getTsdfValues()).toEqual([100, 101]);
  });

  it("setNewLabel updates label and valuetype", () => {
    const s = simulatedSeries("Orig");
    s.setNewLabel("NewLabel");
    expect(s.label).toBe("NewLabel");
    s.setNewLabel(undefined, ValueType.RTRN);
    expect(s.valuetype).toBe(ValueType.RTRN);
  });

  it("arithmeticRet with monthsFromLast exercises date slicing", () => {
    const s = simulatedSeries("Test", { days: 300 });
    const ret = s.arithmeticRet({ monthsFromLast: 1 });
    expect(Number.isFinite(ret)).toBe(true);
  });

  it("arithmeticRet with monthsFromLast throws when start after last date", () => {
    const s = OpenTimeSeries.fromArrays(
      "Short",
      ["2020-01-01", "2020-01-02", "2020-01-03"],
      [100, 101, 102],
    );
    // Negative monthsFromLast = start date after last date -> findIndex returns -1
    expect(() => s.arithmeticRet({ monthsFromLast: -12 })).toThrow(
      DateAlignmentError,
    );
  });

  it("arithmeticRet with fromDate and toDate", () => {
    const s = simulatedSeries("Test");
    const ret = s.arithmeticRet({
      fromDate: "2020-06-01",
      toDate: "2020-09-01",
    });
    expect(typeof ret).toBe("number");
  });

  it("vol with periodsInYearFixed", () => {
    const s = simulatedSeries("Test");
    const v = s.vol({ periodsInYearFixed: 252 });
    expect(Number.isFinite(v)).toBe(true);
  });

  it("computes value return", () => {
    const series = OpenTimeSeries.fromArrays(
      "Test",
      ["2020-01-01", "2020-01-02"],
      [100, 110],
    );
    expect(series.valueRet()).toBeCloseTo(0.1);
  });

  it("valueRet returns NaN when slice has fewer than 2 values", () => {
    const series = OpenTimeSeries.fromArrays(
      "Test",
      ["2020-01-01", "2020-01-02"],
      [100, 110],
    );
    const ret = series.valueRet({
      fromDate: "2020-01-02",
      toDate: "2020-01-02",
    });
    expect(ret).toBeNaN();
  });

  it("converts to returns and back", () => {
    const dates = ["2020-01-01", "2020-01-02", "2020-01-03"];
    const values = [100, 105, 102];
    const series = OpenTimeSeries.fromArrays(
      "Test",
      dates,
      values,
    ).fromDeepcopy();
    series.valueToRet();
    expect(series.valuetype).toBe(ValueType.RTRN);
    series.toCumret();
    expect(series.valuetype).toBe(ValueType.PRICE);
    expect(series.getTsdfValues()[0]).toBeCloseTo(1);
  });

  it("toCumret from RTRN (else branch) uses returns directly", () => {
    const dates = ["2020-01-01", "2020-01-02", "2020-01-03"];
    const returns = [0, 0.05, -0.03]; // RTRN series
    const series = OpenTimeSeries.fromArrays("Test", dates, returns, {
      valuetype: ValueType.RTRN,
    });
    series.toCumret();
    expect(series.valuetype).toBe(ValueType.PRICE);
    expect(series.getTsdfValues()[0]).toBeCloseTo(1);
    expect(series.getTsdfValues().length).toBe(3);
  });

  describe("numerical results (simulated seed 71)", () => {
    it("arithmeticRet matches expected", () => {
      const s = simulatedSeries("Test");
      s.valueToRet();
      expect(to9(s.arithmeticRet())).toBe("0.101976644");
    });

    it("geoRet matches expected", () => {
      const s = simulatedSeries("Test");
      s.toCumret();
      expect(to9(s.geoRet())).toBe("0.101991207");
    });

    it("vol matches expected", () => {
      const s = simulatedSeries("Test");
      expect(to9(s.vol())).toBe("0.098847739");
    });

    it("maxDrawdown matches expected", () => {
      const s = simulatedSeries("Test");
      expect(to9(s.maxDrawdown())).toBe("-0.059536861");
    });

    it("maxDrawdownBottomDate returns date of drawdown bottom", () => {
      const s = OpenTimeSeries.fromArrays(
        "Test",
        ["2020-01-01", "2020-01-02", "2020-01-03", "2020-01-06"],
        [100, 80, 90, 95],
      );
      expect(s.maxDrawdownBottomDate()).toBe("2020-01-02");
    });

    it("maxDrawdownBottomDate returns undefined when no drawdown", () => {
      const s = OpenTimeSeries.fromArrays(
        "Test",
        ["2020-01-01", "2020-01-02", "2020-01-03"],
        [100, 101, 102],
      );
      expect(s.maxDrawdownBottomDate()).toBeUndefined();
    });

    it("maxDrawdownBottomDate returns undefined when too few points", () => {
      const s = OpenTimeSeries.fromArrays("Test", ["2020-01-01"], [100]);
      expect(s.maxDrawdownBottomDate()).toBeUndefined();
    });

    it("maxDrawdownBottomDate respects fromDate and toDate", () => {
      // Full series: 100 -> 80 (bottom) -> 90 -> 70 (deeper bottom)
      const s = OpenTimeSeries.fromArrays(
        "Test",
        ["2020-01-01", "2020-01-02", "2020-01-03", "2020-01-06"],
        [100, 80, 90, 70],
      );
      expect(s.maxDrawdownBottomDate()).toBe("2020-01-06");
      expect(s.maxDrawdownBottomDate({ toDate: "2020-01-03" })).toBe(
        "2020-01-02",
      );
      expect(s.maxDrawdownBottomDate({ fromDate: "2020-01-03" })).toBe(
        "2020-01-06",
      );
    });

    it("maxDrawdownBottomDate returns last date when bottom is at end", () => {
      const s = OpenTimeSeries.fromArrays(
        "Test",
        ["2020-01-01", "2020-01-02", "2020-01-03"],
        [100, 90, 80],
      );
      expect(s.maxDrawdownBottomDate()).toBe("2020-01-03");
    });

    it("varDown matches expected", () => {
      const s = simulatedSeries("Test");
      s.valueToRet();
      expect(to9(s.varDown(0.95))).toBe("-0.009309743");
    });

    it("cvarDown matches expected", () => {
      const s = simulatedSeries("Test");
      s.valueToRet();
      expect(to9(s.cvarDown(0.95))).toBe("-0.011516791");
    });

    it("downsideDeviation matches expected", () => {
      const s = simulatedSeries("Test");
      s.valueToRet();
      expect(to9(s.downsideDeviation())).toBe("0.063904297");
    });

    it("retVolRatio matches expected", () => {
      const s = simulatedSeries("Test");
      s.valueToRet();
      expect(to9(s.retVolRatio())).toBe("1.031653786");
    });

    it("sortinoRatio matches expected", () => {
      const s = simulatedSeries("Test");
      s.valueToRet();
      expect(to9(s.sortinoRatio())).toBe("1.595771319");
    });

    it("positiveShare matches expected", () => {
      const s = simulatedSeries("Test");
      s.valueToRet();
      expect(to9(s.positiveShare())).toBe("0.517928287");
    });

    it("worst(1) matches expected", () => {
      const s = simulatedSeries("Test");
      s.valueToRet();
      expect(to9(s.worst(1))).toBe("-0.014452910");
    });

    it("skew matches expected", () => {
      const s = simulatedSeries("Test");
      s.valueToRet();
      expect(to9(s.skew())).toBe("0.261372225");
    });

    it("kurtosis matches expected", () => {
      const s = simulatedSeries("Test");
      s.valueToRet();
      expect(to9(s.kurtosis())).toBe("0.304593549");
    });

    it("zScore matches expected", () => {
      const s = simulatedSeries("Test");
      s.valueToRet();
      expect(to9(s.zScore())).toBe("-0.683595796");
    });

    it("volFromVar matches expected", () => {
      const s = simulatedSeries("Test");
      s.valueToRet();
      expect(to9(s.volFromVar(0.95))).toBe("0.091654172");
    });

    it("ewmaVolFunc last values match expected", () => {
      const s = simulatedSeries("Test2", { seed: 72 });
      const ewma = s.ewmaVolFunc(0.94, 11);
      expect(ewma.length).toBeGreaterThan(0);
      expect(to9(ewma[ewma.length - 3])).toBe("0.086600180");
      expect(to9(ewma[ewma.length - 2])).toBe("0.090452797");
      expect(to9(ewma[ewma.length - 1])).toBe("0.088364091");
    });

    it("ewmaVarFunc last values match expected", () => {
      const s = simulatedSeries("Test2", { seed: 72 });
      const ev = s.ewmaVarFunc(0.94, 11, 0.95);
      expect(ev.length).toBeGreaterThan(0);
      expect(to9(ev[ev.length - 3])).toBe("-0.142444620");
      expect(to9(ev[ev.length - 2])).toBe("-0.148781611");
      expect(to9(ev[ev.length - 1])).toBe("-0.145345995");
    });

    it("spanOfDays and yearfrac are consistent", () => {
      const s = simulatedSeries("Test");
      expect(s.spanOfDays).toBeGreaterThan(0);
      expect(s.yearfrac).toBeCloseTo(s.spanOfDays / 365.25);
    });

    it("periodsInAYear equals length / yearfrac", () => {
      const s = simulatedSeries("Test");
      expect(s.periodsInAYear).toBeCloseTo(s.length / s.yearfrac);
      expect(s.periodsInAYear).toBeGreaterThan(0);
    });

    it("toDrawdownSeries values match expected (seed 71)", () => {
      const s = simulatedSeries("Test");
      s.toDrawdownSeries();
      expect(s.getTsdfValues()[0]).toBe(0);
      expect(to9(s.getTsdfValues()[s.length - 1])).toBe("-0.003782338");
      expect(Math.min(...s.getTsdfValues())).toBeCloseTo(-0.059536861);
    });
  });

  describe("resampleToPeriodEnd and filterToBusinessDays", () => {
    it("filterToBusinessDays reduces observations to business days only", () => {
      const s = simulatedSeries("Test");
      const before = s.length;
      s.filterToBusinessDays();
      expect(s.length).toBeLessThanOrEqual(before);
      expect(s.length).toBeGreaterThan(0);
    });

    it("resampleToPeriodEnd reduces to month-end frequency", () => {
      const s = simulatedSeries("Test");
      const before = s.length;
      s.resampleToPeriodEnd("ME");
      expect(s.length).toBeLessThan(before);
      expect(s.length).toBeGreaterThan(0);
    });

    it("resampleToPeriodEnd throws ResampleDataLossError on RTRN series", () => {
      const s = simulatedSeries("Test");
      s.valueToRet();
      expect(() => s.resampleToPeriodEnd("ME")).toThrow(ResampleDataLossError);
      expect(() => s.resampleToPeriodEnd("ME")).toThrow("return series");
    });

    it("resampleToPeriodEnd accepts WE, QE, YE", () => {
      const s = simulatedSeries("Test", { days: 400 });
      s.resampleToPeriodEnd("WE");
      expect(s.length).toBeGreaterThan(0);
      const s2 = simulatedSeries("Test2", { days: 400 });
      s2.resampleToPeriodEnd("QE");
      expect(s2.length).toBeGreaterThan(0);
      const s3 = simulatedSeries("Test3", { days: 400 });
      s3.resampleToPeriodEnd("YE");
      expect(s3.length).toBeGreaterThan(0);
    });
  });

  describe("worstMonth", () => {
    it("worstMonth returns a number for price series", () => {
      const s = simulatedSeries("Test");
      const wm = s.worstMonth();
      expect(typeof wm).toBe("number");
      expect(Number.isFinite(wm) || Number.isNaN(wm)).toBe(true);
    });

    it("worstMonth throws ResampleDataLossError on RTRN series", () => {
      const s = simulatedSeries("Test");
      s.valueToRet();
      expect(() => s.worstMonth()).toThrow(ResampleDataLossError);
    });

    it("worstMonth returns NaN for short series", () => {
      const s = OpenTimeSeries.fromArrays(
        "Short",
        ["2020-01-01", "2020-01-02"],
        [100, 101],
      );
      expect(s.worstMonth()).toBeNaN();
    });
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

  it("throws DateAlignmentError when series do not overlap", () => {
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
    expect(() => timeseriesChain(front, back)).toThrow(DateAlignmentError);
    expect(() => timeseriesChain(front, back)).toThrow("overlap");
  });

  it("chains with oldFee applies fee adjustment (PRICE series)", () => {
    const front = OpenTimeSeries.fromArrays(
      "Front",
      ["2020-01-01", "2020-01-02", "2020-01-03"],
      [100, 101, 102],
    );
    const back = OpenTimeSeries.fromArrays(
      "Back",
      ["2020-01-02", "2020-01-03", "2020-01-06"],
      [102, 103, 104],
    );
    const chained = timeseriesChain(front, back, 0.01);
    expect(chained.length).toBeGreaterThan(2);
    expect(chained.valuetype).toBe(ValueType.PRICE);
  });

  it("chains with oldFee on RTRN series", () => {
    const front = OpenTimeSeries.fromArrays(
      "Front",
      ["2020-01-01", "2020-01-02", "2020-01-03"],
      [0, 0.01, 0.02],
      { valuetype: ValueType.RTRN },
    );
    const back = OpenTimeSeries.fromArrays(
      "Back",
      ["2020-01-02", "2020-01-03", "2020-01-06"],
      [0.02, 0.03, 0.04],
      { valuetype: ValueType.RTRN },
    );
    const chained = timeseriesChain(front, back, 0.01);
    expect(chained.length).toBeGreaterThan(2);
  });

  it("numerical result: chained length and values match expected (simulated seed 90)", () => {
    const sim = ReturnSimulation.fromGbm(1, 0.05, 0.1, 200, 252, 90);
    const dc = sim.toDateColumns("X", { end: "2021-06-30" });
    const frontDates = dc.dates.slice(0, 100);
    const backDates = dc.dates.slice(50, 150);
    const frontRets = dc.columns[0].values.slice(0, 100);
    const backRets = dc.columns[0].values.slice(50, 150);
    const frontCum = cumProd(
      frontRets.map((r) => 1 + r),
      1,
    );
    const frontNorm = frontCum.map((c) => c / frontCum[0]);
    const backCum = cumProd(
      backRets.map((r) => 1 + r),
      1,
    );
    const backNorm = backCum.map((c) => c / backCum[0]);
    const frontSer = OpenTimeSeries.fromArrays("F", frontDates, frontNorm, {
      valuetype: ValueType.PRICE,
    });
    const backSer = OpenTimeSeries.fromArrays("B", backDates, backNorm, {
      valuetype: ValueType.PRICE,
    });
    const chained = timeseriesChain(frontSer, backSer);
    expect(chained.length).toBe(150);
    expect(to9(chained.getTsdfValues()[0])).toBe("0.967447780");
    expect(to9(chained.getTsdfValues()[chained.length - 1])).toBe(
      "1.108997972",
    );
  });
});
