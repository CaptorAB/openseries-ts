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

/** Creates a frame with 3 simulated constituents (252 days each, seed 71) */
export function simulatedFrame(opts?: {
  seed?: number;
  days?: number;
  numAssets?: number;
}): OpenFrame {
  const seed = opts?.seed ?? SEED;
  const days = opts?.days ?? 252;
  const numAssets = opts?.numAssets ?? 3;
  const sim = ReturnSimulation.fromGbm(
    numAssets,
    0.05,
    0.1,
    days,
    252,
    seed,
  );
  const dc = sim.toDateColumns("Asset", { end: "2020-12-31" });
  const constituents = Array.from({ length: numAssets }, (_, i) =>
    OpenTimeSeries.fromDateColumns(dc, {
      columnIndex: i,
      valuetype: ValueType.RTRN,
    }).toCumret(),
  );
  return new OpenFrame(constituents, [1 / numAssets, 1 / numAssets, 1 / numAssets].slice(0, numAssets));
}
