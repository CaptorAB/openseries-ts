import { describe, it, expect } from "vitest";
import { OpenTimeSeries, timeseriesChain } from "../src/series";
import { ValueType } from "../src/types";
import { simulatedSeries } from "./fixtures";
import { ReturnSimulation } from "../src/simulation";
import { cumProd } from "../src/utils";

const to9 = (x: number) => x.toFixed(9);

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

    it("toDrawdownSeries values match expected (seed 71)", () => {
      const s = simulatedSeries("Test");
      s.toDrawdownSeries();
      expect(s.getTsdfValues()[0]).toBe(0);
      expect(to9(s.getTsdfValues()[s.length - 1])).toBe("-0.003782338");
      expect(Math.min(...s.getTsdfValues())).toBeCloseTo(-0.059536861);
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

  it("numerical result: chained length and values match expected (simulated seed 90)", () => {
    const sim = ReturnSimulation.fromGbm(1, 0.05, 0.1, 200, 252, 90);
    const dc = sim.toDateColumns("X", { end: "2021-06-30" });
    const frontDates = dc.dates.slice(0, 100);
    const backDates = dc.dates.slice(50, 150);
    const frontRets = dc.columns[0].values.slice(0, 100);
    const backRets = dc.columns[0].values.slice(50, 150);
    const frontCum = cumProd(frontRets.map((r) => 1 + r), 1);
    const frontNorm = frontCum.map((c) => c / frontCum[0]);
    const backCum = cumProd(backRets.map((r) => 1 + r), 1);
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
    expect(to9(chained.getTsdfValues()[chained.length - 1])).toBe("1.108997972");
  });
});
