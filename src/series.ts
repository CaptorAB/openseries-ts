import { DateAlignmentError, InitialValueZeroError, ResampleDataLossError, ValueType } from "./types";
import type { CountryCode } from "./bizcalendar";
import { filterToBusinessDays, resampleToPeriodEnd, type ResampleFreq } from "./bizcalendar";
import {
  cumProd,
  ffill,
  kurtosis,
  logReturns,
  mean,
  normPpf,
  pctChange,
  quantile,
  skewness,
  std,
} from "./utils";

/**
 * Options to slice a series by date range.
 */
export type DateRangeOptions = {
  monthsFromLast?: number;
  fromDate?: string;
  toDate?: string;
  periodsInYearFixed?: number;
};

function parseDate(s: string): Date {
  return new Date(s + "T12:00:00Z");
}

function dateToStr(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function daysBetween(a: string, b: string): number {
  return Math.round(
    (parseDate(b).getTime() - parseDate(a).getTime()) / (1000 * 60 * 60 * 24),
  );
}

/** Timeseries of dates and values with methods for risk metrics. */
export class OpenTimeSeries {
  readonly timeseriesId: string;
  readonly instrumentId: string;
  readonly name: string;
  label: string;
  valuetype: ValueType;
  readonly dates: string[];
  readonly values: number[];
  tsdf: { date: string; value: number }[];
  currency: string;
  localCcy: boolean;
  /** Country code(s) for business calendar (holidays, resampling). Default "SE". */
  countries: CountryCode | CountryCode[];
  markets: string | string[] | null;

  constructor(params: {
    timeseriesId?: string;
    instrumentId?: string;
    name: string;
    label?: string;
    dates: string[];
    values: number[];
    valuetype?: ValueType;
    currency?: string;
    localCcy?: boolean;
    countries?: CountryCode | CountryCode[];
    markets?: string | string[] | null;
  }) {
    this.timeseriesId = params.timeseriesId ?? "";
    this.instrumentId = params.instrumentId ?? "";
    this.name = params.name;
    this.label = params.label ?? params.name;
    this.dates = params.dates;
    this.values = params.values;
    this.valuetype = params.valuetype ?? ValueType.PRICE;
    this.currency = params.currency ?? "SEK";
    this.localCcy = params.localCcy ?? true;
    this.countries = params.countries ?? ("SE" as CountryCode);
    this.markets = params.markets ?? null;
    this.tsdf = this.dates.map((d, i) => ({ date: d, value: this.values[i] }));
  }

  /** Creates an OpenTimeSeries from a name, dates array, and values array. */
  static fromArrays(
    name: string,
    dates: string[],
    values: number[],
    options?: {
      valuetype?: ValueType;
      timeseriesId?: string;
      instrumentId?: string;
      baseccy?: string;
      localCcy?: boolean;
      countries?: CountryCode | CountryCode[];
    },
  ): OpenTimeSeries {
    return new OpenTimeSeries({
      name,
      label: name,
      dates,
      values,
      valuetype: options?.valuetype ?? ValueType.PRICE,
      timeseriesId: options?.timeseriesId ?? "",
      instrumentId: options?.instrumentId ?? "",
      currency: options?.baseccy ?? "SEK",
      localCcy: options?.localCcy ?? true,
      countries: options?.countries,
    });
  }

  /** Creates an OpenTimeSeries from a record or array of {date, value}. */
  static fromObject(
    data: Record<string, number> | { date: string; value: number }[],
  ): OpenTimeSeries {
    const entries = Array.isArray(data)
      ? data
      : Object.entries(data).map(([date, value]) => ({ date, value }));
    const dates = entries.map((e) => e.date);
    const values = entries.map((e) => e.value);
    return OpenTimeSeries.fromArrays("Series", dates, values);
  }

  /** Creates an OpenTimeSeries from simulation dateColumns by column index. */
  static fromDateColumns(
    dateColumns: { dates: string[]; columns: { name: string; values: number[] }[] },
    options?: { columnIndex?: number; valuetype?: ValueType; countries?: CountryCode | CountryCode[] },
  ): OpenTimeSeries {
    const idx = options?.columnIndex ?? 0;
    const col = dateColumns.columns[idx];
    if (!col) throw new Error("Column index out of range");
    return OpenTimeSeries.fromArrays(col.name, dateColumns.dates, col.values, {
      valuetype: options?.valuetype,
      countries: options?.countries,
    });
  }

  fromDeepcopy(): OpenTimeSeries {
    return new OpenTimeSeries({
      timeseriesId: this.timeseriesId,
      instrumentId: this.instrumentId,
      name: this.name,
      label: this.label,
      dates: [...this.dates],
      values: [...this.getTsdfValues()],
      valuetype: this.valuetype,
      currency: this.currency,
      localCcy: this.localCcy,
      countries: this.countries,
      markets: this.markets,
    });
  }

  getTsdfValues(): number[] {
    return this.tsdf.map((r) => r.value);
  }

  getTsdfDates(): string[] {
    return this.tsdf.map((r) => r.date);
  }

  private sliceByRange(opts: DateRangeOptions): { dates: string[]; values: number[] } {
    let fromIdx = 0;
    let toIdx = this.tsdf.length - 1;

    if (opts.monthsFromLast != null) {
      const last = parseDate(this.tsdf[toIdx].date);
      const earlier = new Date(last);
      earlier.setMonth(earlier.getMonth() - opts.monthsFromLast);
      const fromStr = dateToStr(earlier);
      fromIdx = this.tsdf.findIndex((r) => r.date >= fromStr);
      if (fromIdx < 0) throw new DateAlignmentError("months_offset implies start before first date");
    }
    if (opts.fromDate != null) {
      const idx = this.tsdf.findIndex((r) => r.date >= opts.fromDate!);
      if (idx >= 0) fromIdx = idx;
    }
    if (opts.toDate != null) {
      const idx = this.tsdf.findIndex((r) => r.date > opts.toDate!);
      toIdx = idx < 0 ? this.tsdf.length - 1 : idx - 1;
    }

    const dates = this.tsdf.slice(fromIdx, toIdx + 1).map((r) => r.date);
    const values = this.tsdf.slice(fromIdx, toIdx + 1).map((r) => r.value);
    return { dates, values };
  }

  private calcTimeFactor(dates: string[], values: number[], periodsInYearFixed?: number): number {
    if (periodsInYearFixed != null) return periodsInYearFixed;
    const days = daysBetween(dates[0], dates[dates.length - 1]);
    const fraction = days / 365.25;
    return values.length / fraction;
  }

  get length(): number {
    return this.tsdf.length;
  }

  get firstIdx(): string {
    return this.tsdf[0].date;
  }

  get lastIdx(): string {
    return this.tsdf[this.tsdf.length - 1].date;
  }

  get spanOfDays(): number {
    return daysBetween(this.firstIdx, this.lastIdx);
  }

  get yearfrac(): number {
    return this.spanOfDays / 365.25;
  }

  get periodsInAYear(): number {
    return this.length / this.yearfrac;
  }

  valueToRet(): this {
    const vals = ffill(this.getTsdfValues());
    const rets = pctChange(vals);
    rets[0] = 0;
    this.tsdf = this.getTsdfDates().map((d, i) => ({ date: d, value: rets[i] }));
    this.valuetype = ValueType.RTRN;
    return this;
  }

  toCumret(): this {
    let rets: number[];
    if (this.valuetype === ValueType.PRICE) {
      const vals = ffill(this.getTsdfValues());
      rets = pctChange(vals);
      rets[0] = 0;
    } else {
      rets = [...this.getTsdfValues()];
      rets[0] = 0;
    }
    const cum = cumProd(rets.map((r) => 1 + r), 1);
    const base = cum[0];
    const normalized = cum.map((c) => c / base);
    this.tsdf = this.getTsdfDates().map((d, i) => ({ date: d, value: normalized[i] }));
    this.valuetype = ValueType.PRICE;
    return this;
  }

  geoRet(opts: DateRangeOptions = {}): number {
    const { dates, values } = this.sliceByRange(opts);
    if (dates.length < 2) return NaN;
    const first = values[0];
    const last = values[values.length - 1];
    if (first <= 0 || last <= 0)
      throw new InitialValueZeroError("Geometric return cannot be calculated due to zero or negative value");
    const fraction = daysBetween(dates[0], dates[dates.length - 1]) / 365.25;
    return (last / first) ** (1 / fraction) - 1;
  }

  arithmeticRet(opts: DateRangeOptions = {}): number {
    const { dates, values } = this.sliceByRange(opts);
    if (dates.length < 2) return NaN;
    const vals = this.valuetype === ValueType.RTRN ? values : pctChange(ffill(values));
    vals[0] = 0;
    const tf = this.calcTimeFactor(dates, values, opts.periodsInYearFixed);
    return mean(vals) * tf;
  }

  valueRet(opts: DateRangeOptions = {}): number {
    const { values } = this.sliceByRange(opts);
    if (values.length < 2) return NaN;
    const first = values[0];
    const last = values[values.length - 1];
    if (first === 0)
      throw new InitialValueZeroError("Simple return cannot be calculated due to initial value zero");
    return last / first - 1;
  }

  vol(opts: DateRangeOptions = {}): number {
    const { dates, values } = this.sliceByRange(opts);
    if (dates.length < 2) return NaN;
    const vals = this.valuetype === ValueType.RTRN ? values : pctChange(ffill(values));
    vals[0] = 0;
    const rets = vals.slice(1);
    const tf = this.calcTimeFactor(dates, values, opts.periodsInYearFixed);
    return std(rets, 1) * Math.sqrt(tf);
  }

  maxDrawdown(opts: DateRangeOptions = {}): number {
    const { values } = this.sliceByRange(opts);
    if (values.length < 2) return 0;
    let peak = values[0];
    let mdd = 0;
    for (const v of values) {
      peak = Math.max(peak, v);
      mdd = Math.min(mdd, v / peak - 1);
    }
    return mdd;
  }

  varDown(level = 0.95, opts: DateRangeOptions = {}): number {
    const { dates, values } = this.sliceByRange(opts);
    if (dates.length < 2) return NaN;
    const vals = this.valuetype === ValueType.RTRN ? values : pctChange(ffill(values));
    vals[0] = 0;
    const rets = vals.slice(1).filter((r) => !Number.isNaN(r));
    return quantile(rets, 1 - level);
  }

  cvarDown(level = 0.95, opts: DateRangeOptions = {}): number {
    const { dates, values } = this.sliceByRange(opts);
    if (dates.length < 2) return NaN;
    const vals = this.valuetype === ValueType.RTRN ? values : pctChange(ffill(values));
    vals[0] = 0;
    const rets = vals.slice(1).filter((r) => !Number.isNaN(r)).sort((a, b) => a - b);
    const n = Math.ceil((1 - level) * rets.length);
    if (n === 0) return rets[0] ?? NaN;
    return mean(rets.slice(0, n));
  }

  downsideDeviation(opts: DateRangeOptions = {}, mar = 0): number {
    const { dates, values } = this.sliceByRange(opts);
    if (dates.length < 2) return NaN;
    const vals = this.valuetype === ValueType.RTRN ? values : pctChange(ffill(values));
    vals[0] = 0;
    const tf = this.calcTimeFactor(dates, values, opts.periodsInYearFixed);
    const perPeriodMar = mar / tf;
    const shortfalls = vals.slice(1).map((r) => Math.max(0, perPeriodMar - r));
    const lpm2 = shortfalls.reduce((s, x) => s + x * x, 0) / vals.length;
    return Math.sqrt(lpm2) * Math.sqrt(tf);
  }

  retVolRatio(riskfreeRate = 0, opts: DateRangeOptions = {}): number {
    const ret = this.arithmeticRet(opts) - riskfreeRate;
    const v = this.vol(opts);
    return v === 0 ? NaN : ret / v;
  }

  sortinoRatio(
    riskfreeRate = 0,
    minAcceptedReturn = 0,
    opts: DateRangeOptions = {},
  ): number {
    const ret = this.arithmeticRet(opts) - riskfreeRate;
    const dd = this.downsideDeviation(opts, minAcceptedReturn);
    return dd === 0 ? NaN : ret / dd;
  }

  positiveShare(opts: DateRangeOptions = {}): number {
    const { values } = this.sliceByRange(opts);
    if (values.length < 2) return NaN;
    const vals = this.valuetype === ValueType.RTRN ? values : pctChange(ffill(values));
    vals[0] = 0;
    const rets = vals.slice(1).filter((r) => !Number.isNaN(r));
    const pos = rets.filter((r) => r > 0).length;
    return rets.length === 0 ? NaN : pos / rets.length;
  }

  worst(observations = 1, opts: DateRangeOptions = {}): number {
    const { values } = this.sliceByRange(opts);
    if (values.length < observations + 1) return NaN;
    const vals = this.valuetype === ValueType.RTRN ? values : pctChange(ffill(values));
    vals[0] = 0;
    let minVal = 0;
    for (let i = observations; i < vals.length; i++) {
      let sum = 0;
      for (let j = 0; j < observations; j++) sum += vals[i - j];
      minVal = Math.min(minVal, sum);
    }
    return minVal;
  }

  skew(opts: DateRangeOptions = {}): number {
    const { dates, values } = this.sliceByRange(opts);
    if (dates.length < 3) return NaN;
    const vals = this.valuetype === ValueType.RTRN ? values : pctChange(ffill(values));
    vals[0] = 0;
    const rets = vals.slice(1).filter((r) => !Number.isNaN(r));
    return skewness(rets);
  }

  kurtosis(opts: DateRangeOptions = {}): number {
    const { dates, values } = this.sliceByRange(opts);
    if (dates.length < 4) return NaN;
    const vals = this.valuetype === ValueType.RTRN ? values : pctChange(ffill(values));
    vals[0] = 0;
    const rets = vals.slice(1).filter((r) => !Number.isNaN(r));
    return kurtosis(rets);
  }

  zScore(opts: DateRangeOptions = {}): number {
    const { dates, values } = this.sliceByRange(opts);
    if (dates.length < 2) return NaN;
    const vals = this.valuetype === ValueType.RTRN ? values : pctChange(ffill(values));
    vals[0] = 0;
    const rets = vals.slice(1).filter((r) => !Number.isNaN(r));
    const m = mean(rets);
    const s = std(rets, 1);
    return s === 0 ? NaN : (rets[rets.length - 1] - m) / s;
  }

  volFromVar(level = 0.95, opts: DateRangeOptions = {}): number {
    const { dates, values } = this.sliceByRange(opts);
    if (dates.length < 2) return NaN;
    const vals = this.valuetype === ValueType.RTRN ? values : pctChange(ffill(values));
    vals[0] = 0;
    const rets = vals.slice(1).filter((r) => !Number.isNaN(r));
    const tf = this.calcTimeFactor(dates, values, opts.periodsInYearFixed);
    const q = quantile(rets, 1 - level);
    return (-Math.sqrt(tf) * q) / normPpf(level);
  }

  ewmaVolFunc(
    lmbda = 0.94,
    dayChunk = 11,
    opts: DateRangeOptions = {},
  ): number[] {
    const { dates, values } = this.sliceByRange(opts);
    if (dates.length < dayChunk) return [];
    const tf = this.calcTimeFactor(dates, values, opts.periodsInYearFixed);
    const logRet = logReturns(values);
    const chunk = logRet.slice(1, dayChunk);
    const initVol =
      std(chunk, 0) * Math.sqrt(tf);
    const result: number[] = [initVol];
    for (let i = dayChunk; i < logRet.length; i++) {
      const r = logRet[i];
      const prev = result[result.length - 1];
      result.push(
        Math.sqrt(r * r * tf * (1 - lmbda) + prev * prev * lmbda),
      );
    }
    return result;
  }

  ewmaVarFunc(
    lmbda = 0.94,
    dayChunk = 11,
    level = 0.95,
    opts: DateRangeOptions = {},
  ): number[] {
    const vols = this.ewmaVolFunc(lmbda, dayChunk, opts);
    return vols.map((v) => v * normPpf(1 - level));
  }

  setNewLabel(lvlZero?: string, lvlOne?: ValueType): this {
    if (lvlZero != null) this.label = lvlZero;
    if (lvlOne != null) this.valuetype = lvlOne;
    return this;
  }

  /** Filters tsdf to retain only business days. Mutates in place. */
  filterToBusinessDays(): this {
    const dates = this.getTsdfDates();
    const columns = [this.getTsdfValues()];
    const { dates: outDates, columns: outCols } = filterToBusinessDays(
      dates,
      columns,
      this.countries,
    );
    this.tsdf = outDates.map((d, i) => ({ date: d, value: outCols[0][i] }));
    return this;
  }

  /**
   * Resamples to business period-end frequency (week, month, quarter, year).
   * Mutates tsdf. Throws on return series (use price series).
   */
  resampleToPeriodEnd(freq: ResampleFreq = "ME"): this {
    if (this.valuetype === ValueType.RTRN)
      throw new ResampleDataLossError(
        "Do not run resampleToPeriodEnd on return series. The operation would pick the last data point per period, not sum returns, and data would be lost.",
      );
    const dates = this.getTsdfDates();
    const columns = [this.getTsdfValues()];
    const { dates: outDates, columns: outCols } = resampleToPeriodEnd(
      dates,
      columns,
      freq,
      this.countries,
    );
    this.tsdf = outDates.map((d, i) => ({ date: d, value: outCols[0][i] }));
    return this;
  }

  /**
   * Worst single calendar month return (business-month-end based).
   * Uses filterToBusinessDays + resampleToPeriodEnd(ME) + min of monthly returns.
   */
  worstMonth(opts: DateRangeOptions = {}): number {
    const { dates, values } = this.sliceByRange(opts);
    if (dates.length < 2) return NaN;
    if (this.valuetype === ValueType.RTRN)
      throw new ResampleDataLossError(
        "worstMonth requires price series. Convert to cumret first.",
      );
    const filtered = filterToBusinessDays(dates, [values], this.countries);
    if (filtered.dates.length < 2) return NaN;
    const resampled = resampleToPeriodEnd(
      filtered.dates,
      filtered.columns,
      "ME",
      this.countries,
    );
    if (resampled.dates.length < 2) return NaN;
    const vals = ffill(resampled.columns[0]);
    const rets = pctChange(vals);
    rets[0] = 0;
    const monthlyRets = rets.slice(1).filter((r) => !Number.isNaN(r));
    return monthlyRets.length === 0 ? NaN : Math.min(...monthlyRets);
  }

  toDrawdownSeries(): this {
    const vals = this.getTsdfValues().map((v) => (Number.isNaN(v) ? -Infinity : v));
    let peak = vals[0];
    const drawdown = vals.map((v) => {
      peak = Math.max(peak, v);
      return v / peak - 1;
    });
    this.tsdf = this.getTsdfDates().map((d, i) => ({ date: d, value: drawdown[i] }));
    return this;
  }
}

/**
 * Chains two timeseries at their overlap. Scales back by front's level at the overlap date.
 */
export function timeseriesChain(
  front: OpenTimeSeries,
  back: OpenTimeSeries,
  oldFee = 0,
): OpenTimeSeries {
  const old = front.fromDeepcopy();
  if (oldFee !== 0) {
    const vals = old.valuetype === ValueType.RTRN
      ? old.getTsdfValues()
      : pctChange(ffill(old.getTsdfValues()));
    vals[0] = 0;
    const daysInYear = 365;
    const dates = old.getTsdfDates();
    const dateDiffs: number[] = [];
    for (let i = 1; i < dates.length; i++) {
      dateDiffs.push(daysBetween(dates[i - 1], dates[i]));
    }
    const adj = vals.slice(1).map((r, i) => 1 + r + oldFee * (dateDiffs[i] ?? 0) / daysInYear);
    const cum = cumProd(adj, 1);
    old.tsdf = dates.map((d, i) => ({
      date: d,
      value: i === 0 ? 1 : cum[i - 1],
    }));
    old.valuetype = ValueType.PRICE;
  }

  const newDates = back.getTsdfDates();
  const newVals = back.getTsdfValues();
  const oldDates = old.getTsdfDates();
  const oldVals = old.getTsdfValues();
  const oldDateSet = new Set(oldDates);

  let firstIdx = 0;
  while (firstIdx < newDates.length && !oldDateSet.has(newDates[firstIdx])) {
    firstIdx++;
  }
  if (firstIdx >= newDates.length || parseDate(newDates[firstIdx]) > parseDate(oldDates[oldDates.length - 1]))
    throw new DateAlignmentError("Timeseries dates must overlap to allow chaining");

  const first = newDates[firstIdx];
  const oldDateToVal = new Map<string, number>();
  for (let i = 0; i < oldDates.length; i++) {
    oldDateToVal.set(oldDates[i], oldVals[i]);
  }
  const frontDates = oldDates.filter((d) => d < first);
  const frontVals = frontDates.map((d) => oldDateToVal.get(d)!);
  const oldValAtFirst = oldDateToVal.get(first)!;
  const newValAtFirst = newVals[firstIdx];
  const scale = newValAtFirst / oldValAtFirst;
  const scaledFront = frontVals.map((v) => v * scale);
  const dates = [...frontDates, ...newDates];
  const values = [...scaledFront, ...newVals];

  return new OpenTimeSeries({
    timeseriesId: back.timeseriesId,
    instrumentId: back.instrumentId,
    name: back.name,
    label: back.label,
    dates,
    values,
    valuetype: back.valuetype,
    currency: back.currency,
    localCcy: back.localCcy,
  });
}
