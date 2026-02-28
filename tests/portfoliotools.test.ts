import { describe, it, expect } from "vitest";
import { simulatePortfolios, efficientFrontier } from "../src/portfoliotools";
import { simulatedFrame } from "./fixtures";
import { OpenFrame } from "../src/frame";
import { OpenTimeSeries } from "../src/series";
import { ReturnSimulation } from "../src/simulation";
import { ValueType } from "../src/types";

const to9 = (x: number) => x.toFixed(9);

describe("simulatePortfolios", () => {
  it("first portfolio ret, stdev, sharpe match expected (seed 71)", () => {
    const frame = simulatedFrame();
    const sims = simulatePortfolios(frame, 100, 71);
    expect(sims.length).toBeGreaterThan(0);
    expect(to9(sims[0].ret)).toBe("-322.938388554");
    expect(to9(sims[0].stdev)).toBe("406.375423852");
    expect(to9(sims[0].sharpe)).toBe("-0.794679918");
  });

  it("weights sum to 1 for each portfolio", () => {
    const frame = simulatedFrame();
    const sims = simulatePortfolios(frame, 50, 42);
    for (const s of sims) {
      expect(s.weights.reduce((a, b) => a + b, 0)).toBeCloseTo(1);
    }
  });
});

describe("efficientFrontier", () => {
  it("returns frontier and simulated with correct structure (seed 71)", () => {
    const frame = simulatedFrame();
    const ef = efficientFrontier(frame, 500, 71, 20);
    expect(ef.frontier.length).toBe(20);
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
    expect(ef.frontier.length).toBe(20);
  });

  it("frontier points have increasing return", () => {
    const frame = simulatedFrame();
    const ef = efficientFrontier(frame, 500, 71, 20);
    const rets = ef.frontier.map((p) => p.ret).filter((r) => Number.isFinite(r));
    if (rets.length >= 2) {
      for (let i = 1; i < rets.length; i++) {
        expect(rets[i]).toBeGreaterThanOrEqual(rets[i - 1] - 1e-6);
      }
    }
  });
});
