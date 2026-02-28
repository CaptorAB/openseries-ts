import {
  LabelsNotUniqueError,
  MixedValuetypesError,
  NoWeightsError,
  ValueType,
  type LiteralPortfolioWeightings,
} from "./types";
import { mean, std } from "./utils";
import { OpenTimeSeries } from "./series";
import { pctChange, ffill, cumProd } from "./utils";

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

export class OpenFrame {
  constituents: OpenTimeSeries[];
  weights: number[] | null;
  tsdf: { dates: string[]; columns: number[][] };
  columnLabels: string[];

  constructor(constituents: OpenTimeSeries[], weights: number[] | null = null) {
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

  addTimeseries(series: OpenTimeSeries): this {
    this.constituents.push(series);
    this.mergeSeries("outer");
    this.columnLabels = this.constituents.map((c) => c.label);
    return this;
  }
}
