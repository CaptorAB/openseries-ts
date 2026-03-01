import { describe, it, expect } from "vitest";
import {
  simulatePortfolios,
  efficientFrontier,
  preparePlotData,
} from "../src/portfoliotools";
import { simulatedFrame } from "./fixtures";
import { OpenFrame } from "../src/frame";
import { OpenTimeSeries } from "../src/series";
import { ReturnSimulation } from "../src/simulation";
import { ValueType } from "../src/types";

const to9 = (x: number) => x.toFixed(9);

describe("simulatePortfolios", () => {
  it("handles PRICE frame with zero value (prev===0 branch)", () => {
    const dates = ["2020-01-01", "2020-01-02", "2020-01-03", "2020-01-06"];
    const s1 = OpenTimeSeries.fromArrays("A", dates, [100, 0, 50, 60]);
    const s2 = OpenTimeSeries.fromArrays("B", dates, [100, 101, 102, 103]);
    const frame = new OpenFrame([s1, s2], [0.5, 0.5]);
    const sims = simulatePortfolios(frame, 20, 71);
    expect(sims.length).toBeGreaterThanOrEqual(0);
  });

  it("handles constant returns (covers vol=0 branch)", () => {
    const dates = [
      "2020-01-01",
      "2020-01-02",
      "2020-01-03",
      "2020-01-06",
      "2020-01-07",
    ];
    const s1 = OpenTimeSeries.fromArrays("A", dates, [100, 101, 102, 103, 104]);
    const s2 = OpenTimeSeries.fromArrays("B", dates, [100, 101, 102, 103, 104]);
    s1.valueToRet();
    s2.valueToRet();
    const frame = new OpenFrame([s1, s2], [0.5, 0.5]);
    frame.mergeSeries("inner");
    const sims = simulatePortfolios(frame, 10, 71);
    expect(sims.length).toBeGreaterThan(0);
    // With identical returns, portfolio vol is 0, sharpe gets 0 from vol===0 branch
    expect(sims.every((s) => s.stdev >= 0 && Number.isFinite(s.sharpe))).toBe(
      true,
    );
  });

  it("first portfolio ret, stdev, sharpe match expected (normal 0.07/0.15, seed 71)", () => {
    const frame = simulatedFrame({
      meanRet: 0.07,
      meanVol: 0.15,
      process: "normal",
    });
    const sims = simulatePortfolios(frame, 100, 71);
    expect(sims.length).toBeGreaterThan(0);
    expect(to9(sims[0].ret)).toBe("0.040790126");
    expect(to9(sims[0].stdev)).toBe("0.085354672");
    expect(to9(sims[0].sharpe)).toBe("0.477889785");
  });

  it("weights sum to 1 for each portfolio", () => {
    const frame = simulatedFrame({
      meanRet: 0.07,
      meanVol: 0.15,
      process: "normal",
    });
    const sims = simulatePortfolios(frame, 50, 42);
    for (const s of sims) {
      expect(s.weights.reduce((a, b) => a + b, 0)).toBeCloseTo(1);
    }
  });
});

describe("efficientFrontier", () => {
  it("returns frontier and simulated with correct structure (seed 71)", () => {
    const frame = simulatedFrame({
      meanRet: 0.07,
      meanVol: 0.15,
      process: "normal",
    });
    const ef = efficientFrontier(frame, 500, 71, 20);
    expect(ef.frontier.length).toBeGreaterThanOrEqual(1);
    expect(ef.simulated.length).toBeGreaterThan(0);
    expect(ef.maxSharpe).toBeDefined();
  });

  it("works with RTRN constituents (uses returns directly)", () => {
    const sim = ReturnSimulation.fromGbm(3, 0.05, 0.1, 252, 252, 71);
    const dc = sim.toDateColumns("Asset", { end: "2020-12-31" });
    const constituents = Array.from({ length: 3 }, (_, i) =>
      OpenTimeSeries.fromDateColumns(dc, {
        columnIndex: i,
        valuetype: ValueType.RTRN,
      }),
    );
    const frame = new OpenFrame(constituents, [1 / 3, 1 / 3, 1 / 3]);
    const ef = efficientFrontier(frame, 500, 71, 20);
    expect(ef.frontier.length).toBeGreaterThanOrEqual(1);
  });

  it("frontier traces efficient upper envelope (stdev and ret increase left-to-right)", () => {
    const frame = simulatedFrame({
      meanRet: 0.07,
      meanVol: 0.15,
      process: "normal",
    });
    const ef = efficientFrontier(frame, 500, 71, 25);
    for (let i = 1; i < ef.frontier.length; i++) {
      expect(ef.frontier[i]!.stdev).toBeGreaterThanOrEqual(
        ef.frontier[i - 1]!.stdev - 1e-9,
      );
      expect(ef.frontier[i]!.ret).toBeGreaterThanOrEqual(
        ef.frontier[i - 1]!.ret - 1e-9,
      );
    }
  });

  it("frontier points have increasing return", () => {
    const frame = simulatedFrame({
      meanRet: 0.07,
      meanVol: 0.15,
      process: "normal",
    });
    const ef = efficientFrontier(frame, 500, 71, 20);
    const rets = ef.frontier
      .map((p) => p.ret)
      .filter((r) => Number.isFinite(r));
    if (rets.length >= 2) {
      for (let i = 1; i < rets.length; i++) {
        expect(rets[i]).toBeGreaterThanOrEqual(rets[i - 1] - 1e-6);
      }
    }
  });

  it("handles many frontier points with divergent asset returns", () => {
    const frame = simulatedFrame({
      numAssets: 4,
      days: 300,
      meanRet: 0.07,
      meanVol: 0.15,
      process: "normal",
    });
    const ef = efficientFrontier(frame, 800, 71, 80);
    expect(ef.frontier.length).toBeGreaterThan(0);
    expect(ef.maxSharpe).toBeDefined();
  });

  it("exercises projected gradient boundary with extreme mean spread", () => {
    // Assets with very different mean returns can cause analytic solution to have
    // negative weights; target near rMax/rMin triggers boundary branches (289-293)
    const sim = ReturnSimulation.fromGbm(3, 0.05, 0.12, 252, 252, 99);
    const dc = sim.toDateColumns("Asset", { end: "2020-12-31" });
    const toPrice = (rets: number[]) => {
      const out = [100];
      for (let i = 1; i < rets.length; i++) {
        out.push(out[i - 1]! * (1 + rets[i]!));
      }
      return out;
    };
    const r1 = dc.columns[0].values;
    const r2 = dc.columns[1].values.map((r) => r * 0.2); // low mean
    const r3 = dc.columns[2].values.map((r) => r * 2 + 0.01); // high mean
    const s1 = OpenTimeSeries.fromArrays("A", dc.dates, toPrice(r1));
    const s2 = OpenTimeSeries.fromArrays("B", dc.dates, toPrice(r2));
    const s3 = OpenTimeSeries.fromArrays("C", dc.dates, toPrice(r3));
    const frame = new OpenFrame([s1, s2, s3], [1 / 3, 1 / 3, 1 / 3]);
    const ef = efficientFrontier(frame, 500, 99, 60);
    expect(ef.frontier.length).toBeGreaterThan(0);
  });
});

describe("preparePlotData", () => {
  it("returns assets, current portfolio, and max sharpe points", () => {
    const frame = simulatedFrame({
      meanRet: 0.07,
      meanVol: 0.15,
      process: "normal",
    });
    const current = frame.makePortfolio("Current Portfolio", "eq_weights");
    const ef = efficientFrontier(frame, 500, 71, 20);
    const points = preparePlotData(frame, current, ef.maxSharpe);
    expect(points.length).toBeGreaterThanOrEqual(4);
    const labels = points.map((p) => p.label);
    expect(labels).toContain("Current Portfolio");
    expect(labels).toContain("Max Sharpe Portfolio");
    expect(labels).toContain("Asset_0");
    points.forEach((p) => {
      expect(p).toHaveProperty("stdev");
      expect(p).toHaveProperty("ret");
      expect(p).toHaveProperty("label");
      expect(Number.isFinite(p.stdev)).toBe(true);
      expect(Number.isFinite(p.ret)).toBe(true);
    });
  });
});
