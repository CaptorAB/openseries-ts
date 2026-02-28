import { mean, std } from "./utils";
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
  const weights = frame.weights ?? frame.columnLabels.map(() => 1 / frame.itemCount);
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

  for (const targetRet of targetRets) {
    const w = minimizeVolForReturn(
      meanRets,
      cov,
      targetRet,
      frame.itemCount,
    );
    if (w) {
      let ret = 0;
      for (let i = 0; i < frame.itemCount; i++) ret += w[i] * meanRets[i];
      let varP = 0;
      for (let i = 0; i < frame.itemCount; i++) {
        for (let j = 0; j < frame.itemCount; j++) {
          varP += w[i] * w[j] * cov[i][j];
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

  const maxSharpeIdx = frontier.reduce<number>((best, p, i) =>
    p.sharpe > frontier[best].sharpe ? i : best,
  0);
  return {
    frontier,
    simulated,
    maxSharpe: frontier[maxSharpeIdx],
  };
}

function minimizeVolForReturn(
  meanRets: number[],
  cov: number[][],
  targetRet: number,
  n: number,
): number[] {
  let w = new Array(n).fill(1 / n);
  const maxIter = 200;
  const tol = 1e-6;

  for (let iter = 0; iter < maxIter; iter++) {
    let ret = 0;
    for (let i = 0; i < n; i++) ret += w[i] * meanRets[i];

    let varP = 0;
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        varP += w[i] * w[j] * cov[i][j];
      }
    }
    const vol = Math.sqrt(Math.max(0, varP));
    if (vol < 1e-12) return w;

    const grad: number[] = [];
    for (let i = 0; i < n; i++) {
      let g = 0;
      for (let j = 0; j < n; j++) g += cov[i][j] * w[j];
      grad[i] = g / vol;
    }

    const retErr = ret - targetRet;
    const scale = 0.1;
    const wNew = w.map((wi, i) => {
      let dw = grad[i] * scale;
      if (retErr > 0) dw += meanRets[i] * scale * 0.1;
      else if (retErr < 0) dw -= meanRets[i] * scale * 0.1;
      return Math.max(0, Math.min(1, wi - dw));
    });
    const sum = wNew.reduce((a, b) => a + b, 0);
    w = wNew.map((x) => x / sum);

    if (Math.abs(retErr) < tol) break;
  }
  return w;
}
