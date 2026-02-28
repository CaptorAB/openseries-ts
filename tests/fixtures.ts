import { ReturnSimulation } from "../src/simulation";
import { OpenTimeSeries } from "../src/series";
import { OpenFrame } from "../src/frame";
import { ValueType } from "../src/types";

/** Shared seed for reproducible test data */
export const SEED = 71;

/** Creates a single simulated price series (252 days, GBM, seed 71) */
export function simulatedSeries(
  name: string,
  opts?: {
    seed?: number;
    days?: number;
    meanRet?: number;
    meanVol?: number;
  },
): OpenTimeSeries {
  const seed = opts?.seed ?? SEED;
  const days = opts?.days ?? 252;
  const meanRet = opts?.meanRet ?? 0.05;
  const meanVol = opts?.meanVol ?? 0.1;
  const sim = ReturnSimulation.fromGbm(1, meanRet, meanVol, days, 252, seed);
  const dc = sim.toDateColumns(name, { end: "2020-12-31" });
  const series = OpenTimeSeries.fromDateColumns(dc, {
    columnIndex: 0,
    valuetype: ValueType.RTRN,
  });
  return series.toCumret();
}

export type SimulationProcess = "gbm" | "normal" | "lognormal";

/** Creates a frame with 3 simulated constituents (252 days each, seed 71) */
export function simulatedFrame(opts?: {
  seed?: number;
  days?: number;
  numAssets?: number;
  meanRet?: number;
  meanVol?: number;
  process?: SimulationProcess;
  /** When true, keep returns (RTRN) instead of converting to cumret. Use for portfoliotools. */
  asReturns?: boolean;
}): OpenFrame {
  const seed = opts?.seed ?? SEED;
  const days = opts?.days ?? 252;
  const numAssets = opts?.numAssets ?? 3;
  const meanRet = opts?.meanRet ?? 0.05;
  const meanVol = opts?.meanVol ?? 0.1;
  const process = opts?.process ?? "gbm";

  let sim: ReturnSimulation;
  if (process === "normal") {
    sim = ReturnSimulation.fromNormal(numAssets, meanRet, meanVol, days, 252, seed);
  } else if (process === "lognormal") {
    sim = ReturnSimulation.fromLognormal(numAssets, meanRet, meanVol, days, 252, seed);
  } else {
    sim = ReturnSimulation.fromGbm(numAssets, meanRet, meanVol, days, 252, seed);
  }
  const dc = sim.toDateColumns("Asset", { end: "2020-12-31" });
  const base = Array.from({ length: numAssets }, (_, i) =>
    OpenTimeSeries.fromDateColumns(dc, { columnIndex: i, valuetype: ValueType.RTRN }),
  );
  const constituents = opts?.asReturns ? base : base.map((s) => s.toCumret());
  return new OpenFrame(constituents, [1 / numAssets, 1 / numAssets, 1 / numAssets].slice(0, numAssets));
}
