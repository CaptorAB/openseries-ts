import { describe, it, expect } from "vitest";
import { ReturnSimulation, randomGenerator } from "../src/simulation";
import { OpenTimeSeries } from "../src/series";
import { ValueType } from "../src/types";

const SEED = 71;
const TRADING_DAYS = 2512;
const MEAN_RET = 0.05;
const MEAN_VOL = 0.1;
const JUMPS_LAMDA = 0.1;
const JUMPS_SIGMA = 0.3;
const JUMPS_MU = -0.2;

describe("ReturnSimulation", () => {
  describe("reproducibility with seed", () => {
    it("fromNormal produces identical results with same seed", () => {
      const a = ReturnSimulation.fromNormal(1, 0.05, 0.1, 100, 252, 42);
      const b = ReturnSimulation.fromNormal(1, 0.05, 0.1, 100, 252, 42);
      expect(a.dframe[0]).toEqual(b.dframe[0]);
    });

    it("randomGenerator without seed produces values in [0,1)", () => {
      const rng = randomGenerator();
      for (let i = 0; i < 10; i++) {
        const v = rng();
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThan(1);
      }
    });

    it("fromGbm produces identical results with same seed", () => {
      const a = ReturnSimulation.fromGbm(1, 0.05, 0.1, 100, 252, 42);
      const b = ReturnSimulation.fromGbm(1, 0.05, 0.1, 100, 252, 42);
      expect(a.dframe[0]).toEqual(b.dframe[0]);
    });

    it("fromLognormal produces identical results with same seed", () => {
      const a = ReturnSimulation.fromLognormal(1, 0.05, 0.1, 100, 252, 42);
      const b = ReturnSimulation.fromLognormal(1, 0.05, 0.1, 100, 252, 42);
      expect(a.dframe[0]).toEqual(b.dframe[0]);
    });

    it("fromMertonJumpGbm produces identical results with same seed", () => {
      const a = ReturnSimulation.fromMertonJumpGbm(
        1,
        100,
        0.05,
        0.1,
        0.1,
        0.3,
        -0.2,
        252,
        42,
      );
      const b = ReturnSimulation.fromMertonJumpGbm(
        1,
        100,
        0.05,
        0.1,
        0.1,
        0.3,
        -0.2,
        252,
        42,
      );
      expect(a.dframe[0]).toEqual(b.dframe[0]);
    });

    it("different seeds produce different results", () => {
      const a = ReturnSimulation.fromNormal(1, 0.05, 0.1, 100, 252, 1);
      const b = ReturnSimulation.fromNormal(1, 0.05, 0.1, 100, 252, 2);
      expect(a.dframe[0]).not.toEqual(b.dframe[0]);
    });
  });

  describe("processes - numerical results (seed=71)", () => {
    const to9 = (x: number) => x.toFixed(9);

    it("fromNormal matches expected realized stats", () => {
      const sim = ReturnSimulation.fromNormal(
        1,
        MEAN_RET,
        MEAN_VOL,
        TRADING_DAYS,
        252,
        SEED,
      );
      expect(to9(sim.realizedMeanReturn)).toBe("0.082818640");
      expect(to9(sim.realizedVol)).toBe("0.097395667");
    });

    it("fromNormal with higher mean/vol matches expected stats", () => {
      const sim = ReturnSimulation.fromNormal(
        1,
        MEAN_RET + 0.01,
        MEAN_VOL + 0.01,
        TRADING_DAYS,
        252,
        SEED,
      );
      expect(to9(sim.realizedMeanReturn)).toBe("0.096100504");
      expect(to9(sim.realizedVol)).toBe("0.107135233");
    });

    it("fromLognormal matches expected realized stats", () => {
      const sim = ReturnSimulation.fromLognormal(
        1,
        MEAN_RET,
        MEAN_VOL,
        TRADING_DAYS,
        252,
        SEED,
      );
      expect(to9(sim.realizedMeanReturn)).toBe("0.087574695");
      expect(to9(sim.realizedVol)).toBe("0.097423538");
    });

    it("fromLognormal with higher mean/vol matches expected stats", () => {
      const sim = ReturnSimulation.fromLognormal(
        1,
        MEAN_RET + 0.01,
        MEAN_VOL + 0.01,
        TRADING_DAYS,
        252,
        SEED,
      );
      expect(to9(sim.realizedMeanReturn)).toBe("0.101857475");
      expect(to9(sim.realizedVol)).toBe("0.107171443");
    });

    it("fromGbm matches expected realized stats", () => {
      const sim = ReturnSimulation.fromGbm(
        1,
        MEAN_RET,
        MEAN_VOL,
        TRADING_DAYS,
        252,
        SEED,
      );
      expect(to9(sim.realizedMeanReturn)).toBe("0.077818640");
      expect(to9(sim.realizedVol)).toBe("0.097395667");
    });

    it("fromGbm with higher mean/vol matches expected stats", () => {
      const sim = ReturnSimulation.fromGbm(
        1,
        MEAN_RET + 0.01,
        MEAN_VOL + 0.01,
        TRADING_DAYS,
        252,
        SEED,
      );
      expect(to9(sim.realizedMeanReturn)).toBe("0.090050504");
      expect(to9(sim.realizedVol)).toBe("0.107135233");
    });

    it("fromMertonJumpGbm matches expected realized stats", () => {
      const sim = ReturnSimulation.fromMertonJumpGbm(
        1,
        TRADING_DAYS,
        MEAN_RET,
        MEAN_VOL,
        JUMPS_LAMDA,
        JUMPS_SIGMA,
        JUMPS_MU,
        252,
        SEED,
      );
      expect(to9(sim.realizedMeanReturn)).toBe("0.092042467");
      expect(to9(sim.realizedVol)).toBe("0.137360826");
    });

    it("fromMertonJumpGbm with higher jump params matches expected stats", () => {
      const sim = ReturnSimulation.fromMertonJumpGbm(
        1,
        TRADING_DAYS,
        MEAN_RET,
        MEAN_VOL,
        JUMPS_LAMDA + 0.1,
        JUMPS_SIGMA + 0.1,
        JUMPS_MU + 0.1,
        252,
        SEED,
      );
      expect(to9(sim.realizedMeanReturn)).toBe("0.046422323");
      expect(to9(sim.realizedVol)).toBe("0.100391149");
    });
  });

  describe("properties", () => {
    it("results have correct shape (trading_days columns per sim)", () => {
      const sim = ReturnSimulation.fromMertonJumpGbm(
        5,
        TRADING_DAYS,
        MEAN_RET,
        MEAN_VOL,
        JUMPS_LAMDA,
        JUMPS_SIGMA,
        JUMPS_MU,
        252,
        SEED,
      );
      expect(sim.results.length).toBe(sim.numberOfSims);
      expect(sim.results[0].length).toBe(sim.tradingDays);
    });

    it("realized stats are in plausible range for Merton jump GBM", () => {
      const sim = ReturnSimulation.fromMertonJumpGbm(
        5,
        TRADING_DAYS,
        MEAN_RET,
        MEAN_VOL,
        JUMPS_LAMDA,
        JUMPS_SIGMA,
        JUMPS_MU,
        252,
        SEED,
      );
      expect(sim.realizedMeanReturn).toBeGreaterThan(-0.5);
      expect(sim.realizedMeanReturn).toBeLessThan(0.5);
      expect(sim.realizedVol).toBeGreaterThan(0);
      expect(sim.realizedVol).toBeLessThan(1);
    });
  });

  describe("toDateColumns", () => {
    it("returns returns by default (asReturns=true)", () => {
      const sim = ReturnSimulation.fromNormal(1, 0.05, 0.1, 10, 252, 1);
      const df = sim.toDateColumns("Asset");
      expect(df.columns[0].values).toEqual(sim.dframe[0]);
    });

    it("returns cumulative prices when asReturns=false", () => {
      const sim = ReturnSimulation.fromNormal(1, 0.05, 0.1, 10, 252, 1);
      const df = sim.toDateColumns("Asset", { asReturns: false });
      expect(df.columns[0].values).toEqual(sim.results[0]);
      expect(df.columns[0].values.length).toBe(10);
    });

    it("generates correct number of dates with end option", () => {
      const sim = ReturnSimulation.fromMertonJumpGbm(
        5,
        TRADING_DAYS,
        MEAN_RET,
        MEAN_VOL,
        JUMPS_LAMDA,
        JUMPS_SIGMA,
        JUMPS_MU,
        252,
        SEED,
      );
      const df = sim.toDateColumns("Asset", { end: "2019-06-28" });
      expect(df.dates.length).toBe(TRADING_DAYS);
      expect(df.dates[df.dates.length - 1]).toBe("2019-06-28");
    });

    it("multiple sims produce multiple columns", () => {
      const sim = ReturnSimulation.fromNormal(5, 0.05, 0.1, 20, 252, 1);
      const df = sim.toDateColumns("Asset");
      expect(df.columns.length).toBe(5);
      expect(df.columns.map((c) => c.name)).toEqual([
        "Asset_0",
        "Asset_1",
        "Asset_2",
        "Asset_3",
        "Asset_4",
      ]);
    });
  });

  describe("integration with OpenTimeSeries", () => {
    it("fromDateColumns creates series from simulated returns and toCumret works", () => {
      const sim = ReturnSimulation.fromMertonJumpGbm(
        1,
        100,
        MEAN_RET,
        MEAN_VOL,
        JUMPS_LAMDA,
        JUMPS_SIGMA,
        JUMPS_MU,
        252,
        SEED,
      );
      const df = sim.toDateColumns("Asset", { end: "2020-06-30" });
      const series = OpenTimeSeries.fromDateColumns(df, {
        columnIndex: 0,
        valuetype: ValueType.RTRN,
      });
      expect(series.valuetype).toBe(ValueType.RTRN);
      series.toCumret();
      expect(series.valuetype).toBe(ValueType.PRICE);
      expect(series.getTsdfValues()[0]).toBeCloseTo(1);
    });

    it("multiple sims can create OpenFrame constituents", () => {
      const sim = ReturnSimulation.fromMertonJumpGbm(
        3,
        50,
        MEAN_RET,
        MEAN_VOL,
        JUMPS_LAMDA,
        JUMPS_SIGMA,
        JUMPS_MU,
        252,
        SEED,
      );
      const df = sim.toDateColumns("Asset", { end: "2020-01-31" });
      const series = [
        OpenTimeSeries.fromDateColumns(df, {
          columnIndex: 0,
          valuetype: ValueType.RTRN,
        }),
        OpenTimeSeries.fromDateColumns(df, {
          columnIndex: 1,
          valuetype: ValueType.RTRN,
        }),
        OpenTimeSeries.fromDateColumns(df, {
          columnIndex: 2,
          valuetype: ValueType.RTRN,
        }),
      ];
      expect(series).toHaveLength(3);
      expect(series[0].length).toBe(50);
    });
  });
});

describe("randomGenerator", () => {
  it("produces same sequence for same seed", () => {
    const rng1 = randomGenerator(123);
    const rng2 = randomGenerator(123);
    for (let i = 0; i < 10; i++) {
      expect(rng1()).toBe(rng2());
    }
  });

  it("produces values in [0, 1)", () => {
    const rng = randomGenerator(42);
    for (let i = 0; i < 100; i++) {
      const v = rng();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
});
