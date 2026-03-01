import { mean, std, pctChange, ffill } from "./utils";
import { OpenFrame } from "./frame";
import { ValueType } from "./types";
import { randomGenerator } from "./simulation";

export interface SimulatedPortfolio {
  stdev: number;
  ret: number;
  sharpe: number;
  weights: number[];
}

/** Simulates random long-only portfolios from frame returns and covariance. */
export function simulatePortfolios(
  frame: OpenFrame,
  numPorts: number,
  seed: number,
): SimulatedPortfolio[] {
  const rets = frame.tsdf.columns.map((col) => {
    const v = col.slice(1);
    return frame.constituents.every((c) => c.valuetype === ValueType.RTRN)
      ? v
      : (() => {
          const pcts = [0];
          let prev = col[0];
          for (let i = 1; i < col.length; i++) {
            const curr = Number.isNaN(col[i]) ? prev : col[i];
            pcts.push(prev === 0 ? 0 : (curr - prev) / prev);
            prev = curr;
          }
          return pcts.slice(1);
        })();
  });

  const n = rets[0].length;
  const tf = frame.periodInAYear;
  const meanRets = rets.map((r) => mean(r) * tf);
  const cov: number[][] = [];
  for (let i = 0; i < frame.itemCount; i++) {
    cov[i] = [];
    for (let j = 0; j < frame.itemCount; j++) {
      let c = 0;
      const mi = meanRets[i] / tf;
      const mj = meanRets[j] / tf;
      for (let k = 0; k < n; k++) {
        c += (rets[i][k] - mi) * (rets[j][k] - mj);
      }
      cov[i][j] = (c / (n - 1)) * tf;
    }
  }

  const rng = randomGenerator(seed);
  const result: SimulatedPortfolio[] = [];
  for (let p = 0; p < numPorts; p++) {
    const w = Array.from({ length: frame.itemCount }, () => rng());
    const sum = w.reduce((a, b) => a + b, 0);
    const normW = w.map((x) => x / sum);

    let ret = 0;
    for (let i = 0; i < frame.itemCount; i++) ret += normW[i] * meanRets[i];

    let varP = 0;
    for (let i = 0; i < frame.itemCount; i++) {
      for (let j = 0; j < frame.itemCount; j++) {
        varP += normW[i] * normW[j] * cov[i][j];
      }
    }
    const vol = Math.sqrt(varP);
    const sharpe = vol === 0 ? 0 : ret / vol;
    if (Number.isFinite(sharpe))
      result.push({ stdev: vol, ret, sharpe, weights: normW });
  }
  return result;
}

export interface EfficientFrontierPoint {
  stdev: number;
  ret: number;
  sharpe: number;
  weights: number[];
}

/** Computes the mean-variance efficient frontier using analytic QP. */
export function efficientFrontier(
  frame: OpenFrame,
  numPorts = 5000,
  seed = 71,
  frontierPoints = 50,
): {
  frontier: EfficientFrontierPoint[];
  simulated: SimulatedPortfolio[];
  maxSharpe: EfficientFrontierPoint;
} {
  const simulated = simulatePortfolios(frame, numPorts, seed);
  const rets = frame.tsdf.columns.map((col) => {
    const v = col.slice(1);
    return frame.constituents.every((c) => c.valuetype === ValueType.RTRN)
      ? v
      : (() => {
          const pcts = [0];
          let prev = col[0];
          for (let i = 1; i < col.length; i++) {
            const curr = Number.isNaN(col[i]) ? prev : col[i];
            pcts.push(prev === 0 ? 0 : (curr - prev) / prev);
            prev = curr;
          }
          return pcts.slice(1);
        })();
  });

  const n = rets[0].length;
  const tf = frame.periodInAYear;
  const meanRets = rets.map((r) => mean(r) * tf);
  const cov: number[][] = [];
  for (let i = 0; i < frame.itemCount; i++) {
    cov[i] = [];
    for (let j = 0; j < frame.itemCount; j++) {
      let c = 0;
      const mi = meanRets[i] / tf;
      const mj = meanRets[j] / tf;
      for (let k = 0; k < n; k++) {
        c += (rets[i][k] - mi) * (rets[j][k] - mj);
      }
      cov[i][j] = (c / (n - 1)) * tf;
    }
  }

  const invCov = invertMatrix(cov);
  const ones = new Array(frame.itemCount).fill(1);
  const invCovOnes = matVec(invCov, ones);
  const sumInv = invCovOnes.reduce((a, b) => a + b, 0);
  const wGmv = sumInv !== 0 ? invCovOnes.map((x) => x / sumInv) : null;
  const gmvRet =
    wGmv && Math.abs(sumInv) > 1e-12
      ? vecDot(wGmv, meanRets)
      : Math.min(...meanRets);
  const frontierMaxRet = Math.max(...meanRets);

  const frontier: EfficientFrontierPoint[] = [];
  const targetRets = Array.from(
    { length: frontierPoints },
    (_, i) =>
      gmvRet +
      (i / Math.max(1, frontierPoints - 1)) * (frontierMaxRet - gmvRet),
  );

  const A = vecDot(ones, matVec(invCov, meanRets));
  const B = vecDot(meanRets, matVec(invCov, meanRets));
  const C = vecDot(ones, invCovOnes);
  const det = B * C - A * A;

  for (const targetRet of targetRets) {
    const w = solveEfficientWeights(
      meanRets,
      cov,
      invCov,
      targetRet,
      A,
      B,
      C,
      det,
      frame.itemCount,
    );
    if (w) {
      let ret = 0;
      for (let i = 0; i < frame.itemCount; i++) ret += w[i]! * meanRets[i]!;
      let varP = 0;
      for (let i = 0; i < frame.itemCount; i++) {
        for (let j = 0; j < frame.itemCount; j++) {
          varP += w[i]! * w[j]! * cov[i]![j]!;
        }
      }
      const vol = Math.sqrt(varP);
      frontier.push({
        stdev: vol,
        ret,
        sharpe: vol === 0 ? 0 : ret / vol,
        weights: w,
      });
    }
  }

  frontier.sort((a, b) => a.stdev - b.stdev);

  const efficient: EfficientFrontierPoint[] = [];
  let maxRetSeen = -Infinity;
  for (const p of frontier) {
    if (p.ret >= maxRetSeen - 1e-10) {
      efficient.push(p);
      maxRetSeen = Math.max(maxRetSeen, p.ret);
    }
  }
  frontier.length = 0;
  frontier.push(...efficient);

  const maxSharpeIdx = frontier.reduce<number>(
    (best, p, i) => (p.sharpe > frontier[best].sharpe ? i : best),
    0,
  );
  return {
    frontier,
    simulated,
    maxSharpe: frontier[maxSharpeIdx],
  };
}

function matVec(m: number[][], v: number[]): number[] {
  return m.map((row) => row.reduce((s, mij, j) => s + mij * v[j], 0));
}

function vecDot(a: number[], b: number[]): number {
  return a.reduce((s, ai, i) => s + ai * b[i], 0);
}

function invertMatrix(m: number[][]): number[][] {
  const n = m.length;
  const a = m.map((row) => [...row]);
  const inv: number[][] = Array.from({ length: n }, (_, i) =>
    Array.from({ length: n }, (_, j) => (i === j ? 1 : 0)),
  );
  for (let col = 0; col < n; col++) {
    let maxRow = col;
    for (let row = col + 1; row < n; row++) {
      if (Math.abs(a[row][col]!) > Math.abs(a[maxRow][col]!)) maxRow = row;
    }
    [a[col], a[maxRow]] = [a[maxRow], a[col]];
    [inv[col], inv[maxRow]] = [inv[maxRow], inv[col]];
    const pivot = a[col][col];
    if (pivot === undefined || Math.abs(pivot) < 1e-12) return m;
    for (let j = 0; j < n; j++) {
      a[col][j]! /= pivot;
      inv[col][j]! /= pivot;
    }
    for (let row = 0; row < n; row++) {
      if (row !== col) {
        const factor = a[row][col]!;
        for (let j = 0; j < n; j++) {
          a[row][j]! -= factor * a[col][j]!;
          inv[row][j]! -= factor * inv[col][j]!;
        }
      }
    }
  }
  return inv;
}

/**
 * Analytic solution for min-variance portfolio with target return (unconstrained).
 * Minimizes (1/2) w'Σw s.t. w'μ = targetRet, w'1 = 1.
 * Solution: w = Σ^(-1)(λ1*μ + λ2*1) where λ1,λ2 from 2x2 linear system.
 * Weights may be negative (short positions); no long-only constraint.
 */
function solveEfficientWeights(
  meanRets: number[],
  _cov: number[][],
  invCov: number[][],
  targetRet: number,
  A: number,
  B: number,
  C: number,
  det: number,
  n: number,
): number[] | null {
  if (Math.abs(det) < 1e-14) return null;
  const lambda1 = (C * targetRet - A) / det;
  const lambda2 = (B - A * targetRet) / det;
  const ones = new Array(n).fill(1);
  const linearCombo = meanRets.map(
    (mu, i) => lambda1 * mu + lambda2 * ones[i]!,
  );
  const w = matVec(invCov, linearCombo);
  const sum = w.reduce((a, b) => a + b, 0);
  if (Math.abs(sum) < 1e-12) return null;
  return w.map((wi) => wi / sum);
}

/** Point on the efficient-frontier plot (stdev and ret in decimal form). */
export interface SharpePlotPoint {
  stdev: number;
  ret: number;
  label: string;
  /** Optional asset weights for tooltip (e.g. Current Portfolio, Max Sharpe). */
  weights?: { asset: string; weight: number }[];
}

/**
 * Prepares labeled points for the efficient-frontier chart: individual assets,
 * current (e.g. eq-weight) portfolio, and the max-Sharpe optimum.
 */
export function preparePlotData(
  assets: OpenFrame,
  currentPortfolio: { dates: string[]; values: number[] },
  optimum: EfficientFrontierPoint,
): SharpePlotPoint[] {
  const tf = assets.periodInAYear;
  const rets = assets.returnColumns().map((col) => col.slice(1));
  const points: SharpePlotPoint[] = [];

  for (let i = 0; i < assets.itemCount; i++) {
    const r = rets[i].filter((x) => !Number.isNaN(x));
    if (r.length < 2) continue;
    const m = mean(r) * tf;
    const v = std(r, 1) * Math.sqrt(tf);
    points.push({
      stdev: v,
      ret: m,
      label: assets.columnLabels[i] ?? `Asset ${i}`,
    });
  }

  const currRets = pctChange(ffill(currentPortfolio.values));
  currRets[0] = 0;
  const validCurr = currRets
    .slice(1)
    .filter((x) => !Number.isNaN(x) && Number.isFinite(x));
  if (validCurr.length >= 2) {
    const m = mean(validCurr) * tf;
    const v = std(validCurr, 1) * Math.sqrt(tf);
    const eqWeights = assets.columnLabels.map((name) => ({
      asset: name,
      weight: 1 / assets.itemCount,
    }));
    points.push({
      stdev: v,
      ret: m,
      label: "Current Portfolio",
      weights: eqWeights,
    });
  }

  const maxSharpeWeights = assets.columnLabels.map((name, i) => ({
    asset: name,
    weight: optimum.weights[i] ?? 0,
  }));
  points.push({
    stdev: optimum.stdev,
    ret: optimum.ret,
    label: "Max Sharpe Portfolio",
    weights: maxSharpeWeights,
  });

  return points;
}
