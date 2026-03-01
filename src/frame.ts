import {
  LabelsNotUniqueError,
  MixedValuetypesError,
  NoWeightsError,
  ResampleDataLossError,
  ValueType,
  type LiteralPortfolioWeightings,
} from "./types";
import { mean, std } from "./utils";
import { OpenTimeSeries } from "./series";
import { pctChange, ffill, cumProd } from "./utils";
import type { CountryCode } from "./bizcalendar";
import { filterToBusinessDays, resampleToPeriodEnd, type ResampleFreq } from "./bizcalendar";

function normalizeCountries(c: CountryCode | CountryCode[]): CountryCode[] {
  return Array.isArray(c) ? c : [c];
}

function alignSeriesToCommonDates(
  series: OpenTimeSeries[],
  how: "inner" | "outer" = "outer",
): { dates: string[]; valuesBySeries: number[][] } {
  const allDates = new Set<string>();
  for (const s of series) {
    for (const r of s.tsdf) {
      allDates.add(r.date);
    }
  }
  let dates = Array.from(allDates).sort();
  if (how === "inner") {
    const dateSets = series.map((s) => new Set(s.tsdf.map((r) => r.date)));
    dates = dates.filter((d) => dateSets.every((set) => set.has(d)));
  }

  const seriesMaps = series.map((s) => {
    const dateToVal = new Map<string, number>();
    const seriesDates: string[] = [];
    for (const r of s.tsdf) {
      dateToVal.set(r.date, r.value);
      seriesDates.push(r.date);
    }
    seriesDates.sort();
    return { dateToVal, seriesDates };
  });

  const getVal = (
    { dateToVal, seriesDates }: { dateToVal: Map<string, number>; seriesDates: string[] },
    d: string,
  ): number | null => {
    const exact = dateToVal.get(d);
    if (exact !== undefined) return exact;
    if (seriesDates.length === 0) return null;
    if (d < seriesDates[0]) return dateToVal.get(seriesDates[0]) ?? null;
    if (d > seriesDates[seriesDates.length - 1])
      return dateToVal.get(seriesDates[seriesDates.length - 1]) ?? null;
    let lo = 0;
    let hi = seriesDates.length - 1;
    while (lo < hi) {
      const mid = Math.ceil((lo + hi) / 2);
      if (seriesDates[mid]! <= d) lo = mid;
      else hi = mid - 1;
    }
    return dateToVal.get(seriesDates[lo]!) ?? null;
  };

  const valuesBySeries = series.map((s, i) =>
    dates.map((d) => getVal(seriesMaps[i]!, d) ?? NaN),
  );

  const ffilled = valuesBySeries.map((vals) => {
    let last = vals[0];
    return vals.map((v) => {
      last = Number.isNaN(v) ? last : v;
      return last;
    });
  });

  return { dates, valuesBySeries: ffilled };
}

/** Result of Ordinary Least Squares regression (ord_least_squares_fit). */
export interface OrdLeastSquaresResult {
  coefficient: number;
  intercept: number;
  rsquared: number;
}

/** Collection of aligned timeseries with portfolio and correlation methods. */
export class OpenFrame {
  constituents: OpenTimeSeries[];
  weights: number[] | null;
  tsdf: { dates: string[]; columns: number[][] };
  columnLabels: string[];
  /** Country code(s) for business calendar (holidays, resampling). Used when adapting data to business days. */
  countries: CountryCode[];

  constructor(
    constituents: OpenTimeSeries[],
    weights: number[] | null = null,
    options?: { countries?: CountryCode | CountryCode[] },
  ) {
    const copied = constituents.map((c) => c.fromDeepcopy());
    const labels = copied.map((c) => c.label);
    if (new Set(labels).size !== labels.length) {
      throw new LabelsNotUniqueError("TimeSeries names/labels must be unique");
    }
    this.constituents = copied;
    this.weights = weights;
    const { dates, valuesBySeries } = alignSeriesToCommonDates(copied, "outer");
    this.tsdf = { dates, columns: valuesBySeries };
    this.columnLabels = labels;
    this.countries =
      options?.countries != null
        ? normalizeCountries(options.countries)
        : normalizeCountries(copied[0]?.countries ?? "SE");
  }

  get itemCount(): number {
    return this.constituents.length;
  }

  get length(): number {
    return this.tsdf.dates.length;
  }

  get firstIdx(): string {
    return this.tsdf.dates[0];
  }

  get lastIdx(): string {
    return this.tsdf.dates[this.tsdf.dates.length - 1];
  }

  get periodInAYear(): number {
    const days =
      (new Date(this.lastIdx).getTime() - new Date(this.firstIdx).getTime()) /
      (1000 * 60 * 60 * 24);
    return this.length / (days / 365.25);
  }

  mergeSeries(how: "inner" | "outer" = "outer"): this {
    const { dates, valuesBySeries } = alignSeriesToCommonDates(
      this.constituents,
      how,
    );
    this.tsdf = { dates, columns: valuesBySeries };
    return this;
  }

  /** Returns return columns (first element 0). Throws if mixed PRICE/RTRN. */
  returnColumns(): number[][] {
    return this.ensureReturns();
  }

  private ensureReturns(): number[][] {
    const vtypes = this.constituents.map((c) => c.valuetype === ValueType.RTRN);
    if (vtypes.every(Boolean)) {
      return this.tsdf.columns.map((col) => {
        const rets = [...col];
        rets[0] = 0;
        return rets;
      });
    }
    if (vtypes.some(Boolean))
      throw new MixedValuetypesError("Mix of series types will give inconsistent results");
    const pcts = this.tsdf.columns.map((col) => pctChange(ffill(col)));
    pcts.forEach((p) => (p[0] = 0));
    return pcts;
  }

  correlMatrix(): number[][] {
    const rets = this.ensureReturns().map((col) => col.slice(1));
    const n = this.columnLabels.length;
    const matrix: number[][] = [];
    for (let i = 0; i < n; i++) {
      matrix[i] = [];
      for (let j = 0; j < n; j++) {
        const a = rets[i].filter((_, k) => !Number.isNaN(rets[i][k]) && !Number.isNaN(rets[j][k]));
        const b = rets[j].filter((_, k) => !Number.isNaN(rets[i][k]) && !Number.isNaN(rets[j][k]));
        if (a.length < 2) {
          matrix[i][j] = i === j ? 1 : NaN;
        } else {
          const ma = mean(a);
          const mb = mean(b);
          let cov = 0;
          let va = 0;
          let vb = 0;
          for (let k = 0; k < a.length; k++) {
            const da = a[k] - ma;
            const db = b[k] - mb;
            cov += da * db;
            va += da * da;
            vb += db * db;
          }
          const denom = Math.sqrt(va * vb);
          matrix[i][j] = denom === 0 ? (i === j ? 1 : NaN) : cov / denom;
        }
      }
    }
    return matrix;
  }

  makePortfolio(
    name: string,
    weightStrat?: LiteralPortfolioWeightings,
  ): { dates: string[]; values: number[] } {
    if (!this.weights && !weightStrat)
      throw new NoWeightsError("Weights must be provided to run makePortfolio");

    let w = this.weights ?? [];
    const rets = this.ensureReturns();

    if (weightStrat) {
      w = this.calcWeights(weightStrat, rets);
    }

    const n = rets[0].length;
    const portfolioRets: number[] = [];
    for (let t = 0; t < n; t++) {
      let r = 0;
      for (let i = 0; i < this.itemCount; i++) {
        r += rets[i][t] * w[i];
      }
      portfolioRets.push(r);
    }
    const cum = cumProd(portfolioRets.map((r) => 1 + r), 1);
    return { dates: this.tsdf.dates, values: cum };
  }

  private calcWeights(
    strat: LiteralPortfolioWeightings,
    rets: number[][],
  ): number[] {
    if (strat === "eq_weights") {
      return new Array(this.itemCount).fill(1 / this.itemCount);
    }
    if (strat === "inv_vol") {
      const vols = rets.map((col) => {
        const r = col.slice(1).filter((x) => !Number.isNaN(x));
        return std(r, 1);
      });
      const inv = vols.map((v) => (v === 0 ? 0 : 1 / v));
      const sum = inv.reduce((a, b) => a + b, 0);
      return inv.map((i) => i / sum);
    }
    if (strat === "min_vol_overweight") {
      const vols = rets.map((col) => std(col.slice(1), 1));
      const minIdx = vols.indexOf(Math.min(...vols));
      const w = new Array(this.itemCount).fill(0.4 / (this.itemCount - 1));
      w[minIdx] = 0.6;
      return w;
    }
    if (strat === "max_div") {
      const r = rets.map((col) => col.slice(1).filter((x) => !Number.isNaN(x)));
      const n = Math.min(...r.map((a) => a.length));
      const mat = r.map((col) => col.slice(0, n));
      const cov: number[][] = [];
      for (let i = 0; i < this.itemCount; i++) {
        cov[i] = [];
        for (let j = 0; j < this.itemCount; j++) {
          const ai = mat[i];
          const aj = mat[j];
          const mi = mean(ai);
          const mj = mean(aj);
          let c = 0;
          for (let k = 0; k < n; k++) c += (ai[k] - mi) * (aj[k] - mj);
          cov[i][j] = c / (n - 1);
        }
      }
      const invCov = this.invertMatrix(cov);
      const sum = invCov.map((row) => row.reduce((a, b) => a + b, 0));
      const total = sum.reduce((a, b) => a + b, 0);
      return sum.map((s) => s / total);
    }
    return new Array(this.itemCount).fill(1 / this.itemCount);
  }

  private invertMatrix(m: number[][]): number[][] {
    const n = m.length;
    const a = m.map((row) => [...row]);
    const inv: number[][] = Array.from({ length: n }, (_, i) =>
      Array.from({ length: n }, (_, j) => (i === j ? 1 : 0)),
    );
    for (let col = 0; col < n; col++) {
      let maxRow = col;
      for (let row = col + 1; row < n; row++) {
        if (Math.abs(a[row][col]) > Math.abs(a[maxRow][col])) maxRow = row;
      }
      [a[col], a[maxRow]] = [a[maxRow], a[col]];
      [inv[col], inv[maxRow]] = [inv[maxRow], inv[col]];
      const pivot = a[col][col];
      if (Math.abs(pivot) < 1e-10) return m;
      for (let j = 0; j < n; j++) {
        a[col][j] /= pivot;
        inv[col][j] /= pivot;
      }
      for (let row = 0; row < n; row++) {
        if (row !== col) {
          const factor = a[row][col];
          for (let j = 0; j < n; j++) {
            a[row][j] -= factor * a[col][j];
            inv[row][j] -= factor * inv[col][j];
          }
        }
      }
    }
    return inv;
  }

  /**
   * Max drawdown per column (price series). Returns array of max drawdowns.
   */
  maxDrawdown(): number[] {
    const { dates, columns } = this.tsdf;
    if (dates.length < 2) return columns.map(() => 0);
    return columns.map((values) => {
      let peak = NaN;
      let mdd = 0;
      for (const v of values) {
        if (!Number.isFinite(v)) continue;
        peak = Number.isFinite(peak) ? Math.max(peak, v) : v;
        mdd = Math.min(mdd, v / peak - 1);
      }
      return mdd;
    });
  }

  /**
   * Date when max drawdown bottom occurs per column.
   * Returns array of date strings (or undefined when no drawdown).
   */
  maxDrawdownBottomDate(): (string | undefined)[] {
    const { dates, columns } = this.tsdf;
    if (dates.length < 2) return columns.map(() => undefined);
    return columns.map((values) => {
      let peak = NaN;
      let mdd = 0;
      let bottomIdx = -1;
      for (let i = 0; i < values.length; i++) {
        const v = values[i];
        if (!Number.isFinite(v)) continue;
        peak = Number.isFinite(peak) ? Math.max(peak, v) : v;
        const dd = v / peak - 1;
        if (dd < mdd) {
          mdd = dd;
          bottomIdx = i;
        }
      }
      return bottomIdx >= 0 ? dates[bottomIdx] : undefined;
    });
  }

  trackingError(baseColumn = -1, _opts?: { fromDate?: string; toDate?: string }): number[] {
    const rets = this.ensureReturns().map((col) => col.slice(1));
    const baseIdx = baseColumn < 0 ? this.itemCount + baseColumn : baseColumn;
    const baseRets = rets[baseIdx];
    const tf = this.periodInAYear;
    const result: number[] = [];
    for (let i = 0; i < this.itemCount; i++) {
      if (i === baseIdx) {
        result.push(0);
        continue;
      }
      const diff = rets[i].map((r, k) => r - baseRets[k]);
      result.push(std(diff, 1) * Math.sqrt(tf));
    }
    return result;
  }

  infoRatio(baseColumn = -1): number[] {
    const rets = this.ensureReturns().map((col) => col.slice(1));
    const baseIdx = baseColumn < 0 ? this.itemCount + baseColumn : baseColumn;
    const baseRets = rets[baseIdx];
    const tf = this.periodInAYear;
    const result: number[] = [];
    for (let i = 0; i < this.itemCount; i++) {
      if (i === baseIdx) {
        result.push(0);
        continue;
      }
      const diff = rets[i].map((r, k) => r - baseRets[k]);
      const ret = mean(diff) * tf;
      const vol = std(diff, 1) * Math.sqrt(tf);
      result.push(vol === 0 ? NaN : ret / vol);
    }
    return result;
  }

  beta(assetColumn: number, marketColumn: number): number {
    const rets = this.ensureReturns().map((col) => col.slice(1));
    const y = rets[assetColumn];
    const x = rets[marketColumn];
    const n = y.length;
    let cov = 0;
    let varX = 0;
    const mx = mean(x);
    const my = mean(y);
    for (let i = 0; i < n; i++) {
      cov += (y[i] - my) * (x[i] - mx);
      varX += (x[i] - mx) ** 2;
    }
    cov /= n - 1;
    varX /= n - 1;
    return varX === 0 ? NaN : cov / varX;
  }

  jensenAlpha(
    assetColumn: number,
    marketColumn: number,
    riskfreeRate = 0,
  ): number {
    const rets = this.ensureReturns().map((col) => col.slice(1));
    const assetRets = rets[assetColumn];
    const marketRets = rets[marketColumn];
    const tf = this.periodInAYear;
    const assetMean = mean(assetRets) * tf;
    const marketMean = mean(marketRets) * tf;
    const b = this.beta(assetColumn, marketColumn);
    return assetMean - riskfreeRate - b * (marketMean - riskfreeRate);
  }

  /**
   * Ordinary Least Squares fit of y on x.
   * Regresses tsdf column yColumn (dependent) on xColumn (explanatory).
   * Matches Python openseries ord_least_squares_fit.
   *
   * @param yColumn - Column index of dependent variable y
   * @param xColumn - Column index of exogenous variable x
   * @param opts.fittedSeries - If true, add fitted values as new column (default true)
   * @returns Object with coefficient (slope), intercept, and rsquared
   */
  ordLeastSquaresFit(
    yColumn: number,
    xColumn: number,
    opts?: { fittedSeries?: boolean },
  ): OrdLeastSquaresResult {
    const fittedSeries = opts?.fittedSeries ?? true;
    const yCol = this.tsdf.columns[yColumn];
    const xCol = this.tsdf.columns[xColumn];
    if (!yCol || !xCol) {
      return { coefficient: NaN, intercept: NaN, rsquared: NaN };
    }
    const pairs: [number, number][] = [];
    for (let i = 0; i < Math.min(yCol.length, xCol.length); i++) {
      const yi = yCol[i];
      const xi = xCol[i];
      if (Number.isFinite(yi) && Number.isFinite(xi)) pairs.push([yi, xi]);
    }
    if (pairs.length < 2) {
      return { coefficient: NaN, intercept: NaN, rsquared: NaN };
    }
    const n = pairs.length;
    const my = pairs.reduce((s, [y]) => s + y, 0) / n;
    const mx = pairs.reduce((s, [, x]) => s + x, 0) / n;
    let cov = 0;
    let vx = 0;
    for (const [yi, xi] of pairs) {
      cov += (yi - my) * (xi - mx);
      vx += (xi - mx) ** 2;
    }
    const coefficient = vx > 0 ? cov / vx : NaN;
    const intercept = Number.isFinite(coefficient) ? my - coefficient * mx : NaN;
    let rsquared = NaN;
    if (Number.isFinite(coefficient) && Number.isFinite(intercept)) {
      let ssTot = 0;
      let ssRes = 0;
      for (const [yi, xi] of pairs) {
        const yHat = intercept + coefficient * xi;
        ssTot += (yi - my) ** 2;
        ssRes += (yi - yHat) ** 2;
      }
      rsquared = ssTot > 0 ? 1 - ssRes / ssTot : NaN;
    }
    if (fittedSeries && Number.isFinite(coefficient) && Number.isFinite(intercept)) {
      const fitted = xCol.map((xi) => (Number.isFinite(xi) ? intercept + coefficient * xi : NaN));
      this.tsdf.columns.push(fitted);
      const yLabel = this.columnLabels[yColumn] ?? "y";
      const xLabel = this.columnLabels[xColumn] ?? "x";
      this.columnLabels.push(`OLS fit (${yLabel} vs ${xLabel})`);
    }
    return { coefficient, intercept, rsquared };
  }

  addTimeseries(series: OpenTimeSeries): this {
    this.constituents.push(series);
    this.mergeSeries("outer");
    this.columnLabels = this.constituents.map((c) => c.label);
    return this;
  }

  /** Filters tsdf to retain only business days. Mutates in place. */
  filterToBusinessDays(): this {
    const { dates, columns } = filterToBusinessDays(
      this.tsdf.dates,
      this.tsdf.columns,
      this.countries,
    );
    this.tsdf = { dates, columns };
    for (const c of this.constituents) {
      const colIdx = this.columnLabels.indexOf(c.label);
      if (colIdx >= 0 && columns[colIdx]) {
        c.tsdf = dates.map((d, i) => ({ date: d, value: columns[colIdx][i] }));
      }
    }
    return this;
  }

  /**
   * Resamples all constituents to business period-end frequency, then re-merges.
   * Throws if any constituent is a return series.
   */
  resampleToPeriodEnd(freq: ResampleFreq = "ME"): this {
    if (this.constituents.some((c) => c.valuetype === ValueType.RTRN))
      throw new ResampleDataLossError(
        "Do not run resampleToPeriodEnd on return series. Convert to price series first.",
      );
    for (const c of this.constituents) {
      c.resampleToPeriodEnd(freq);
    }
    this.mergeSeries("outer");
    return this;
  }

  /**
   * Truncates frame and constituents to a common date range.
   * @param opts - Truncation options
   * @param opts.startCut - New first date (default: latest first date of all constituents if where includes 'before')
   * @param opts.endCut - New last date (default: earliest last date if where includes 'after')
   * @param opts.where - Which end(s) to truncate when cuts not provided
   */
  truncFrame(opts: {
    startCut?: string;
    endCut?: string;
    where?: "before" | "after" | "both";
  } = {}): this {
    const { startCut, endCut, where = "both" } = opts;
    let fromDate = startCut;
    let toDate = endCut;
    if (!fromDate && (where === "before" || where === "both")) {
      fromDate = this.constituents
        .map((c) => c.firstIdx)
        .reduce((a, b) => (a > b ? a : b));
    }
    if (!toDate && (where === "after" || where === "both")) {
      toDate = this.constituents
        .map((c) => c.lastIdx)
        .reduce((a, b) => (a < b ? a : b));
    }
    if (!fromDate || !toDate) return this;
    const fromIdx = this.tsdf.dates.findIndex((d) => d >= fromDate);
    const toIdxRev = [...this.tsdf.dates]
      .reverse()
      .findIndex((d) => d <= toDate);
    const toIdx =
      toIdxRev < 0 ? this.tsdf.dates.length - 1 : this.tsdf.dates.length - 1 - toIdxRev;
    if (fromIdx < 0 || toIdx < fromIdx) return this;
    const dates = this.tsdf.dates.slice(fromIdx, toIdx + 1);
    const columns = this.tsdf.columns.map((col) => col.slice(fromIdx, toIdx + 1));
    this.tsdf = { dates, columns };
    for (const c of this.constituents) {
      const colIdx = this.columnLabels.indexOf(c.label);
      if (colIdx >= 0) {
        const vals = columns[colIdx];
        c.tsdf = dates.map((d, i) => ({ date: d, value: vals[i] }));
      }
    }
    return this;
  }

  /**
   * CAGR-based capture ratio vs benchmark column.
   * @param ratio - "up" | "down" | "both" (up/down or both = up/down)
   * @param baseColumn - Benchmark column index (-1 = last)
   * @param opts.freq - Resample frequency for capture (default "ME")
   */
  captureRatio(
    ratio: "up" | "down" | "both",
    baseColumn = -1,
    opts?: { freq?: ResampleFreq },
  ): number[] {
    const baseIdx = baseColumn < 0 ? this.itemCount + baseColumn : baseColumn;
    const { dates, columns } = this.tsdf;
    const colsFfilled = columns.map((col) => ffill(col));
    const filtered = filterToBusinessDays(dates, colsFfilled, this.countries);
    const resampled = resampleToPeriodEnd(
      filtered.dates,
      filtered.columns,
      opts?.freq ?? "ME",
      this.countries,
    );
    const monthlyRets = resampled.columns.map((col) => {
      const r = pctChange(col);
      r[0] = 0;
      return r.slice(1);
    });
    const timeFactor = 12;
    const cagr = (rets: number[], mask: boolean[]): number => {
      const masked = rets
        .map((r, i) => (mask[i] ? r + 1 : NaN))
        .filter((x) => !Number.isNaN(x));
      if (masked.length === 0) return 0;
      const prod = masked.reduce((a, b) => a * b, 1);
      const exponent = 1 / (masked.length / timeFactor);
      return prod ** exponent - 1;
    };
    const benchRets = monthlyRets[baseIdx] ?? [];
    const upMask = benchRets.map((r) => r > 0);
    const downMask = benchRets.map((r) => r < 0);
    return this.columnLabels.map((_, i) => {
      if (i === baseIdx) return 0;
      const assetRets = monthlyRets[i] ?? [];
      if (assetRets.length !== benchRets.length || assetRets.length < 2) return NaN;
      if (ratio === "up") {
        const upRtrn = cagr(assetRets, upMask);
        const upIdx = cagr(benchRets, upMask);
        return upIdx === 0 ? NaN : upRtrn / upIdx;
      }
      if (ratio === "down") {
        const downRtrn = cagr(assetRets, downMask);
        const downIdx = cagr(benchRets, downMask);
        return downIdx === 0 ? NaN : downRtrn / downIdx;
      }
      const upRtrn = cagr(assetRets, upMask);
      const upIdx = cagr(benchRets, upMask);
      const downRtrn = cagr(assetRets, downMask);
      const downIdx = cagr(benchRets, downMask);
      if (Math.abs(upIdx) < 1e-12 || Math.abs(downIdx) < 1e-12) return NaN;
      if (downRtrn >= 0 || Math.abs(downRtrn) < 1e-12) return NaN;
      return (upRtrn / upIdx) / (downRtrn / downIdx);
    });
  }
}
