import { ValueType } from "./types";
import { ffill, mean, pctChange } from "./utils";

/** Autocorrelation or partial autocorrelation values indexed by lag. */
export interface LagSeries {
  lags: number[];
  values: number[];
}

/** Result of the Ljung-Box test. */
export type LjungBoxResult = [
  statistic: number,
  pvalue: number,
  lags: number[],
];

/** Return demeaned return series for autocorrelation analysis. */
export function demeanedReturnsForAutocorr(
  values: number[],
  valuetype: ValueType,
  squared = false,
): number[] {
  let rets: number[];
  if (valuetype === ValueType.RTRN) {
    rets = ffill(values).filter((r) => !Number.isNaN(r));
  } else {
    rets = pctChange(ffill(values))
      .slice(1)
      .filter((r) => !Number.isNaN(r));
  }
  const m = mean(rets);
  rets = rets.map((r) => r - m);
  if (squared) rets = rets.map((r) => r * r);
  return rets;
}

function normalizeAcfLags(lags: number | number[]): number[] {
  if (typeof lags === "number") {
    return Array.from({ length: lags + 1 }, (_, i) => i);
  }
  return [...new Set([0, ...lags])].sort((a, b) => a - b);
}

function normalizeLjungBoxLags(lags: number | number[]): number[] {
  if (typeof lags === "number") {
    return Array.from({ length: lags }, (_, i) => i + 1);
  }
  return [...new Set(lags.filter((k) => k > 0))].sort((a, b) => a - b);
}

/** Pearson autocorrelation at a given lag (matches pandas Series.autocorr). */
export function pearsonAutocorrAtLag(rets: number[], lag: number): number {
  if (rets.length <= lag) return NaN;
  const x = rets.slice(lag);
  const y = rets.slice(0, rets.length - lag);
  const mx = mean(x);
  const my = mean(y);
  let num = 0;
  let dx = 0;
  let dy = 0;
  for (let i = 0; i < x.length; i++) {
    const a = x[i] - mx;
    const b = y[i] - my;
    num += a * b;
    dx += a * a;
    dy += b * b;
  }
  const denom = Math.sqrt(dx * dy);
  return denom === 0 ? NaN : num / denom;
}

/** Autocorrelation function for specified lags. */
export function acfFromReturns(
  rets: number[],
  lags: number | number[],
): LagSeries {
  const lagList = normalizeAcfLags(lags);
  const values = lagList.map((lag) =>
    lag === 0 ? 1.0 : pearsonAutocorrAtLag(rets, lag),
  );
  return { lags: lagList, values };
}

/** Partial autocorrelation function for specified lags (Yule-Walker). */
export function pacfFromReturns(
  rets: number[],
  lags: number | number[],
): LagSeries {
  const lagList = normalizeAcfLags(lags);
  const maxLag = lagList.length > 0 ? Math.max(...lagList) : 0;
  const acfVals = acfFromReturns(
    rets,
    Array.from({ length: maxLag + 1 }, (_, i) => i),
  );
  const acfArr = acfVals.values;
  const pacfByLag = new Map<number, number>();
  pacfByLag.set(0, 1.0);
  const phi: number[][] = [];

  for (let k = 1; k <= maxLag; k++) {
    let phiKk: number;
    if (k === 1) {
      phiKk = acfArr[1]!;
    } else {
      let numer = acfArr[k];
      let denom = 1.0;
      for (let j = 0; j < k - 1; j++) {
        numer -= phi[k - 2][j] * acfArr[k - 1 - j];
        denom -= phi[k - 2][j] * acfArr[j + 1];
      }
      phiKk = numer / denom;
    }
    const phiRow = new Array<number>(k).fill(0);
    for (let j = 0; j < k - 1; j++) {
      phiRow[j] = phi[k - 2][j] - phiKk * phi[k - 2][k - 2 - j];
    }
    phiRow[k - 1] = phiKk;
    phi.push(phiRow);
    pacfByLag.set(k, phiKk);
  }

  return {
    lags: lagList,
    values: lagList.map((lag) => pacfByLag.get(lag)!),
  };
}

/** Ljung-Box test for autocorrelation at the given lags. */
export function ljungBoxFromReturns(
  rets: number[],
  lags: number | number[],
): LjungBoxResult {
  const lagList = normalizeLjungBoxLags(lags);
  if (lagList.length === 0) return [0, 1, []];

  const n = rets.length;
  let rKSqSum = 0;
  for (const k of lagList) {
    if (k < n) {
      const rk = pearsonAutocorrAtLag(rets, k);
      rKSqSum += (rk * rk) / (n - k);
    }
  }
  const qStat = n * (n + 2) * rKSqSum;
  const df = lagList.length;
  const pval = 1 - chi2Cdf(qStat, df);
  return [qStat, pval, lagList];
}

/** Chi-squared CDF (lower tail), matching scipy.stats.chi2.cdf. */
export function chi2Cdf(x: number, df: number): number {
  if (x <= 0) return 0;
  return regularizedGammaP(df / 2, x / 2);
}

function regularizedGammaP(a: number, x: number): number {
  if (x < 0 || a <= 0) return NaN;
  if (x === 0) return 0;
  if (x < a + 1) return gammaPSeries(a, x);
  return 1 - gammaQContinuedFraction(a, x);
}

function gammaPSeries(a: number, x: number): number {
  let sum = 1 / a;
  let term = 1 / a;
  for (let n = 1; n < 200; n++) {
    term *= x / (a + n);
    sum += term;
    if (Math.abs(term) < Math.abs(sum) * 1e-12) break;
  }
  return sum * Math.exp(-x + a * Math.log(x) - logGamma(a));
}

function gammaQContinuedFraction(a: number, x: number): number {
  let b = x + 1 - a;
  let c = 1 / 1e-30;
  let d = 1 / b;
  let h = d;
  for (let i = 1; i <= 200; i++) {
    const an = -i * (i - a);
    b += 2;
    d = an * d + b;
    if (Math.abs(d) < 1e-30) d = 1e-30;
    c = b + an / c;
    if (Math.abs(c) < 1e-30) c = 1e-30;
    d = 1 / d;
    const delta = d * c;
    h *= delta;
    if (Math.abs(delta - 1) < 1e-12) break;
  }
  return h * Math.exp(-x + a * Math.log(x) - logGamma(a));
}

function logGamma(z: number): number {
  const g = 7;
  const c = [
    0.99999999999980993, 676.5203681218851, -1259.1392167224028,
    771.32342877765313, -176.61502916214059, 12.507343278686905,
    -0.13857109526572012, 9.984979516e-6, 1.505632735e-7,
  ];
  if (z < 0.5) {
    return Math.log(Math.PI / Math.sin(Math.PI * z)) - logGamma(1 - z);
  }
  z -= 1;
  let x = c[0];
  for (let i = 1; i < g + 2; i++) x += c[i] / (z + i);
  const t = z + g + 0.5;
  return (
    0.5 * Math.log(2 * Math.PI) + (z + 0.5) * Math.log(t) - t + Math.log(x)
  );
}
