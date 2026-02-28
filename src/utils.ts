/** Returns the arithmetic mean of an array. */
export function mean(arr: number[]): number {
  if (arr.length === 0) return NaN;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

/** Returns the sample standard deviation. */
export function std(arr: number[], ddof = 1): number {
  if (arr.length <= ddof) return NaN;
  const m = mean(arr);
  const variance =
    arr.reduce((sum, x) => sum + (x - m) ** 2, 0) / (arr.length - ddof);
  return Math.sqrt(variance);
}

/** Returns the quantile at q (0-1) using linear interpolation. */
export function quantile(arr: number[], q: number, sorted = false): number {
  const a = sorted ? [...arr] : [...arr].sort((x, y) => x - y);
  if (a.length === 0) return NaN;
  const index = q * (a.length - 1);
  const lo = Math.floor(index);
  const hi = Math.ceil(index);
  const weight = index - lo;
  return a[lo] + weight * (a[hi] - a[lo]);
}

/** Returns period-over-period percentage change. First element is 0. */
export function pctChange(values: number[]): number[] {
  const result: number[] = [0];
  for (let i = 1; i < values.length; i++) {
    const prev = values[i - 1];
    result.push(prev === 0 ? 0 : (values[i] - prev) / prev);
  }
  return result;
}

export function cumProd(values: number[], start = 1): number[] {
  const result: number[] = [];
  let acc = start;
  for (const v of values) {
    acc *= v;
    result.push(acc);
  }
  return result;
}

export function ffill(values: number[]): number[] {
  const result: number[] = [];
  let last = values[0];
  for (const v of values) {
    last = Number.isNaN(v) ? last : v;
    result.push(last);
  }
  return result;
}

export function logReturns(values: number[]): number[] {
  const result: number[] = [0];
  for (let i = 1; i < values.length; i++) {
    result.push(Math.log(values[i] / values[i - 1]));
  }
  return result;
}

export function normPpf(p: number): number {
  if (p <= 0 || p >= 1) return NaN;
  const a = [
    -3.969683028665376e1, 2.209460984245205e2, -2.759285104469687e2,
    1.38357751867269e2, -3.066479806614719e1, 2.506628277459239e0,
  ];
  const b = [
    -5.447609879822406e1, 1.615858368580409e2, -1.556989798598866e2,
    6.680131188771972e1, -1.328068155288572e1,
  ];
  const c = [
    -7.784894002430293e-3, -3.223964580411365e-1, -2.400758277161838e0,
    -2.549732539343734e0, 4.374664141464968e0, 2.938163982698783e0,
  ];
  const d = [
    7.784695709041462e-3, 3.224671290700398e-1, 2.445134137142996e0,
    3.754408661907416e0,
  ];

  const pLow = 0.02425;
  const pHigh = 1 - pLow;

  let q: number;
  let r: number;
  let x: number;

  if (p < pLow) {
    q = Math.sqrt(-2 * Math.log(p));
    x =
      ((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5];
    x =
      x /
      ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
  } else if (p <= pHigh) {
    q = p - 0.5;
    r = q * q;
    x =
      (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) *
      q;
    x =
      x /
      (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
  } else {
    q = Math.sqrt(-2 * Math.log(1 - p));
    x =
      ((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5];
    x =
      -x /
      ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
  }
  return x;
}

export function skewness(arr: number[]): number {
  const n = arr.length;
  if (n < 3) return NaN;
  const m = mean(arr);
  const s = std(arr, 1);
  if (s === 0) return 0;
  const m3 = arr.reduce((sum, x) => sum + (x - m) ** 3, 0) / n;
  return m3 / (s ** 3);
}

export function kurtosis(arr: number[]): number {
  const n = arr.length;
  if (n < 4) return NaN;
  const m = mean(arr);
  const s = std(arr, 1);
  if (s === 0) return 0;
  const m4 = arr.reduce((sum, x) => sum + (x - m) ** 4, 0) / n;
  return m4 / (s ** 4) - 3;
}
