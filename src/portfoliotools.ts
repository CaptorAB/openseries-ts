import { mean } from "./utils";
import { OpenFrame } from "./frame";
import { ValueType } from "./types";
import { randomGenerator } from "./simulation";

export interface SimulatedPortfolio {
  stdev: number;
  ret: number;
  sharpe: number;
  weights: number[];
}

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

  const minVolIdx = simulated.reduce<number>((best, s, i) =>
    s.stdev < simulated[best].stdev ? i : best,
  0);
  const frontierMinRet = simulated[minVolIdx].ret;
  const frontierMaxRet = Math.max(...meanRets);

  const frontier: EfficientFrontierPoint[] = [];
  const targetRets = Array.from(
    { length: frontierPoints },
    (_, i) =>
      frontierMinRet +
      (i / (frontierPoints - 1)) * (frontierMaxRet - frontierMinRet),
  );

  const invCov = invertMatrix(cov);
  const ones = new Array(frame.itemCount).fill(1);
  const A = vecDot(ones, matVec(invCov, meanRets));
  const B = vecDot(meanRets, matVec(invCov, meanRets));
  const C = vecDot(ones, matVec(invCov, ones));
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

  frontier.sort((a, b) => a.ret - b.ret);

  const maxSharpeIdx = frontier.reduce<number>((best, p, i) =>
    p.sharpe > frontier[best].sharpe ? i : best,
  0);
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
 * Analytic solution for min-variance portfolio with target return.
 * Minimizes (1/2) w'Σw s.t. w'μ = targetRet, w'1 = 1.
 * Solution: w = Σ^(-1)(λ1*μ + λ2*1) where λ1,λ2 from 2x2 linear system.
 * When solution has negative weights (long-only infeasible), falls back to
 * projected gradient to find feasible optimum.
 */
function solveEfficientWeights(
  meanRets: number[],
  cov: number[][],
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
  const linearCombo = meanRets.map((mu, i) => lambda1 * mu + lambda2 * ones[i]!);
  const w = matVec(invCov, linearCombo);

  const tol = 1e-10;
  const allNonNeg = w.every((wi) => wi >= -tol);
  if (allNonNeg) {
    const sum = w.reduce((a, b) => a + b, 0);
    if (Math.abs(sum) < 1e-12) return null;
    return w.map((wi) => Math.max(0, wi) / sum);
  }

  return minimizeVolForReturnProjected(meanRets, cov, targetRet, n);
}

/**
 * Projected gradient descent for min-variance subject to w'μ = targetRet,
 * w'1 = 1, w >= 0. Clips target to achievable range [rGmv, max(μ)] when needed.
 */
function minimizeVolForReturnProjected(
  meanRets: number[],
  cov: number[][],
  targetRet: number,
  n: number,
): number[] {
  const rMax = Math.max(...meanRets);
  const rMin = Math.min(...meanRets);
  const target = Math.max(rMin, Math.min(rMax, targetRet));

  if (target >= rMax - 1e-10) {
    const imax = meanRets.indexOf(rMax);
    const w = new Array(n).fill(0);
    w[imax] = 1;
    return w;
  }
  if (target <= rMin + 1e-10) {
    const imin = meanRets.indexOf(rMin);
    const w = new Array(n).fill(0);
    w[imin] = 1;
    return w;
  }

  let w = new Array(n).fill(1 / n);
  const maxIter = 2000;
  const tol = 1e-6;
  let step = 0.4;

  for (let iter = 0; iter < maxIter; iter++) {
    const grad = matVec(cov, w);
    let ret = vecDot(w, meanRets);
    const retErr = ret - target;
    const wNew = w.map((wi, i) => {
      let d = wi - step * grad[i]!;
      d += step * 2 * retErr * meanRets[i]!;
      return Math.max(0, d);
    });
    const sum = wNew.reduce((a, b) => a + b, 0);
    if (sum < 1e-12) return w;
    w = wNew.map((x) => x / sum);
    ret = vecDot(w, meanRets);
    if (Math.abs(ret - target) < tol) return w;
    if (iter > 200) step *= 0.995;
  }
  return w;
}
