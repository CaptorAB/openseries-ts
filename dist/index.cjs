"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var index_exports = {};
__export(index_exports, {
  DateAlignmentError: () => DateAlignmentError,
  IncorrectArgumentComboError: () => IncorrectArgumentComboError,
  InitialValueZeroError: () => InitialValueZeroError,
  MixedValuetypesError: () => MixedValuetypesError,
  NoWeightsError: () => NoWeightsError,
  OpenFrame: () => OpenFrame,
  OpenTimeSeries: () => OpenTimeSeries,
  ReturnSimulation: () => ReturnSimulation,
  ValueType: () => ValueType,
  dateFix: () => dateFix,
  dateToStr: () => dateToStr2,
  efficientFrontier: () => efficientFrontier,
  fetchCaptorSeries: () => fetchCaptorSeries,
  fetchCaptorSeriesBatch: () => fetchCaptorSeriesBatch,
  generateCalendarDateRange: () => generateCalendarDateRange,
  mean: () => mean,
  offsetBusinessDays: () => offsetBusinessDays,
  pctChange: () => pctChange,
  quantile: () => quantile,
  randomGenerator: () => randomGenerator,
  simulatePortfolios: () => simulatePortfolios,
  std: () => std,
  timeseriesChain: () => timeseriesChain
});
module.exports = __toCommonJS(index_exports);

// src/types.ts
var ValueType = /* @__PURE__ */ ((ValueType2) => {
  ValueType2["EWMA_VOL"] = "EWMA volatility";
  ValueType2["EWMA_VAR"] = "EWMA VaR";
  ValueType2["PRICE"] = "Price(Close)";
  ValueType2["RTRN"] = "Return(Total)";
  ValueType2["RELRTRN"] = "Relative return";
  ValueType2["ROLLBETA"] = "Beta";
  ValueType2["ROLLCORR"] = "Rolling correlation";
  ValueType2["ROLLCVAR"] = "Rolling CVaR";
  ValueType2["ROLLINFORATIO"] = "Information Ratio";
  ValueType2["ROLLRTRN"] = "Rolling returns";
  ValueType2["ROLLVAR"] = "Rolling VaR";
  ValueType2["ROLLVOL"] = "Rolling volatility";
  return ValueType2;
})(ValueType || {});
var DateAlignmentError = class extends Error {
  constructor(message) {
    super(message);
    this.name = "DateAlignmentError";
  }
};
var InitialValueZeroError = class extends Error {
  constructor(message) {
    super(message);
    this.name = "InitialValueZeroError";
  }
};
var MixedValuetypesError = class extends Error {
  constructor(message) {
    super(message);
    this.name = "MixedValuetypesError";
  }
};
var NoWeightsError = class extends Error {
  constructor(message) {
    super(message);
    this.name = "NoWeightsError";
  }
};
var IncorrectArgumentComboError = class extends Error {
  constructor(message) {
    super(message);
    this.name = "IncorrectArgumentComboError";
  }
};
var LabelsNotUniqueError = class extends Error {
  constructor(message) {
    super(message);
    this.name = "LabelsNotUniqueError";
  }
};

// src/utils.ts
function mean(arr) {
  if (arr.length === 0) return NaN;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}
function std(arr, ddof = 1) {
  if (arr.length <= ddof) return NaN;
  const m = mean(arr);
  const variance = arr.reduce((sum, x) => sum + (x - m) ** 2, 0) / (arr.length - ddof);
  return Math.sqrt(variance);
}
function quantile(arr, q, sorted = false) {
  const a = sorted ? [...arr] : [...arr].sort((x, y) => x - y);
  if (a.length === 0) return NaN;
  const index = q * (a.length - 1);
  const lo = Math.floor(index);
  const hi = Math.ceil(index);
  const weight = index - lo;
  return a[lo] + weight * (a[hi] - a[lo]);
}
function pctChange(values) {
  const result = [0];
  for (let i = 1; i < values.length; i++) {
    const prev = values[i - 1];
    result.push(prev === 0 ? 0 : (values[i] - prev) / prev);
  }
  return result;
}
function cumProd(values, start = 1) {
  const result = [];
  let acc = start;
  for (const v of values) {
    acc *= v;
    result.push(acc);
  }
  return result;
}
function ffill(values) {
  const result = [];
  let last = values[0];
  for (const v of values) {
    last = Number.isNaN(v) ? last : v;
    result.push(last);
  }
  return result;
}
function logReturns(values) {
  const result = [0];
  for (let i = 1; i < values.length; i++) {
    result.push(Math.log(values[i] / values[i - 1]));
  }
  return result;
}
function normPpf(p) {
  if (p <= 0 || p >= 1) return NaN;
  const a = [
    -39.69683028665376,
    220.9460984245205,
    -275.9285104469687,
    138.357751867269,
    -30.66479806614719,
    2.506628277459239
  ];
  const b = [
    -54.47609879822406,
    161.5858368580409,
    -155.6989798598866,
    66.80131188771972,
    -13.28068155288572
  ];
  const c = [
    -0.007784894002430293,
    -0.3223964580411365,
    -2.400758277161838,
    -2.549732539343734,
    4.374664141464968,
    2.938163982698783
  ];
  const d = [
    0.007784695709041462,
    0.3224671290700398,
    2.445134137142996,
    3.754408661907416
  ];
  const pLow = 0.02425;
  const pHigh = 1 - pLow;
  let q;
  let r;
  let x;
  if (p < pLow) {
    q = Math.sqrt(-2 * Math.log(p));
    x = ((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5];
    x = x / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
  } else if (p <= pHigh) {
    q = p - 0.5;
    r = q * q;
    x = (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q;
    x = x / (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
  } else {
    q = Math.sqrt(-2 * Math.log(1 - p));
    x = ((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5];
    x = -x / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
  }
  return x;
}
function skewness(arr) {
  const n = arr.length;
  if (n < 3) return NaN;
  const m = mean(arr);
  const s = std(arr, 1);
  if (s === 0) return 0;
  const m3 = arr.reduce((sum, x) => sum + (x - m) ** 3, 0) / n;
  return m3 / s ** 3;
}
function kurtosis(arr) {
  const n = arr.length;
  if (n < 4) return NaN;
  const m = mean(arr);
  const s = std(arr, 1);
  if (s === 0) return 0;
  const m4 = arr.reduce((sum, x) => sum + (x - m) ** 4, 0) / n;
  return m4 / s ** 4 - 3;
}

// src/series.ts
function parseDate(s) {
  return /* @__PURE__ */ new Date(s + "T12:00:00Z");
}
function dateToStr(d) {
  return d.toISOString().slice(0, 10);
}
function daysBetween(a, b) {
  return Math.round(
    (parseDate(b).getTime() - parseDate(a).getTime()) / (1e3 * 60 * 60 * 24)
  );
}
var OpenTimeSeries = class _OpenTimeSeries {
  constructor(params) {
    this.timeseriesId = params.timeseriesId ?? "";
    this.instrumentId = params.instrumentId ?? "";
    this.name = params.name;
    this.label = params.label ?? params.name;
    this.dates = params.dates;
    this.values = params.values;
    this.valuetype = params.valuetype ?? "Price(Close)" /* PRICE */;
    this.currency = params.currency ?? "SEK";
    this.localCcy = params.localCcy ?? true;
    this.countries = params.countries ?? "SE";
    this.markets = params.markets ?? null;
    this.tsdf = this.dates.map((d, i) => ({ date: d, value: this.values[i] }));
  }
  static fromArrays(name, dates, values, options) {
    return new _OpenTimeSeries({
      name,
      label: name,
      dates,
      values,
      valuetype: options?.valuetype ?? "Price(Close)" /* PRICE */,
      timeseriesId: options?.timeseriesId ?? "",
      instrumentId: options?.instrumentId ?? "",
      currency: options?.baseccy ?? "SEK",
      localCcy: options?.localCcy ?? true
    });
  }
  static fromObject(data) {
    const entries = Array.isArray(data) ? data : Object.entries(data).map(([date, value]) => ({ date, value }));
    const dates = entries.map((e) => e.date);
    const values = entries.map((e) => e.value);
    return _OpenTimeSeries.fromArrays("Series", dates, values);
  }
  static fromDateColumns(dateColumns, options) {
    const idx = options?.columnIndex ?? 0;
    const col = dateColumns.columns[idx];
    if (!col) throw new Error("Column index out of range");
    return _OpenTimeSeries.fromArrays(col.name, dateColumns.dates, col.values, {
      valuetype: options?.valuetype
    });
  }
  fromDeepcopy() {
    return new _OpenTimeSeries({
      timeseriesId: this.timeseriesId,
      instrumentId: this.instrumentId,
      name: this.name,
      label: this.label,
      dates: [...this.dates],
      values: [...this.values],
      valuetype: this.valuetype,
      currency: this.currency,
      localCcy: this.localCcy,
      countries: this.countries,
      markets: this.markets
    });
  }
  getTsdfValues() {
    return this.tsdf.map((r) => r.value);
  }
  getTsdfDates() {
    return this.tsdf.map((r) => r.date);
  }
  sliceByRange(opts) {
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
      const idx = this.tsdf.findIndex((r) => r.date >= opts.fromDate);
      if (idx >= 0) fromIdx = idx;
    }
    if (opts.toDate != null) {
      const idx = this.tsdf.findIndex((r) => r.date > opts.toDate);
      toIdx = idx < 0 ? this.tsdf.length - 1 : idx - 1;
    }
    const dates = this.tsdf.slice(fromIdx, toIdx + 1).map((r) => r.date);
    const values = this.tsdf.slice(fromIdx, toIdx + 1).map((r) => r.value);
    return { dates, values };
  }
  calcTimeFactor(dates, values, periodsInYearFixed) {
    if (periodsInYearFixed != null) return periodsInYearFixed;
    const days = daysBetween(dates[0], dates[dates.length - 1]);
    const fraction = days / 365.25;
    return values.length / fraction;
  }
  get length() {
    return this.tsdf.length;
  }
  get firstIdx() {
    return this.tsdf[0].date;
  }
  get lastIdx() {
    return this.tsdf[this.tsdf.length - 1].date;
  }
  get spanOfDays() {
    return daysBetween(this.firstIdx, this.lastIdx);
  }
  get yearfrac() {
    return this.spanOfDays / 365.25;
  }
  get periodsInAYear() {
    return this.length / this.yearfrac;
  }
  valueToRet() {
    const vals = ffill(this.getTsdfValues());
    const rets = pctChange(vals);
    rets[0] = 0;
    this.tsdf = this.getTsdfDates().map((d, i) => ({ date: d, value: rets[i] }));
    this.valuetype = "Return(Total)" /* RTRN */;
    return this;
  }
  toCumret() {
    let rets;
    if (this.valuetype === "Price(Close)" /* PRICE */) {
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
    this.valuetype = "Price(Close)" /* PRICE */;
    return this;
  }
  geoRet(opts = {}) {
    const { dates, values } = this.sliceByRange(opts);
    if (dates.length < 2) return NaN;
    const first = values[0];
    const last = values[values.length - 1];
    if (first <= 0 || last <= 0)
      throw new InitialValueZeroError("Geometric return cannot be calculated due to zero or negative value");
    const fraction = daysBetween(dates[0], dates[dates.length - 1]) / 365.25;
    return (last / first) ** (1 / fraction) - 1;
  }
  arithmeticRet(opts = {}) {
    const { dates, values } = this.sliceByRange(opts);
    if (dates.length < 2) return NaN;
    const vals = this.valuetype === "Return(Total)" /* RTRN */ ? values : pctChange(ffill(values));
    vals[0] = 0;
    const tf = this.calcTimeFactor(dates, values, opts.periodsInYearFixed);
    return mean(vals) * tf;
  }
  valueRet(opts = {}) {
    const { values } = this.sliceByRange(opts);
    if (values.length < 2) return NaN;
    const first = values[0];
    const last = values[values.length - 1];
    if (first === 0)
      throw new InitialValueZeroError("Simple return cannot be calculated due to initial value zero");
    return last / first - 1;
  }
  vol(opts = {}) {
    const { dates, values } = this.sliceByRange(opts);
    if (dates.length < 2) return NaN;
    const vals = this.valuetype === "Return(Total)" /* RTRN */ ? values : pctChange(ffill(values));
    vals[0] = 0;
    const rets = vals.slice(1);
    const tf = this.calcTimeFactor(dates, values, opts.periodsInYearFixed);
    return std(rets, 1) * Math.sqrt(tf);
  }
  maxDrawdown(opts = {}) {
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
  varDown(level = 0.95, opts = {}) {
    const { dates, values } = this.sliceByRange(opts);
    if (dates.length < 2) return NaN;
    const vals = this.valuetype === "Return(Total)" /* RTRN */ ? values : pctChange(ffill(values));
    vals[0] = 0;
    const rets = vals.slice(1).filter((r) => !Number.isNaN(r));
    return quantile(rets, 1 - level);
  }
  cvarDown(level = 0.95, opts = {}) {
    const { dates, values } = this.sliceByRange(opts);
    if (dates.length < 2) return NaN;
    const vals = this.valuetype === "Return(Total)" /* RTRN */ ? values : pctChange(ffill(values));
    vals[0] = 0;
    const rets = vals.slice(1).filter((r) => !Number.isNaN(r)).sort((a, b) => a - b);
    const n = Math.ceil((1 - level) * rets.length);
    if (n === 0) return rets[0] ?? NaN;
    return mean(rets.slice(0, n));
  }
  downsideDeviation(opts = {}, mar = 0) {
    const { dates, values } = this.sliceByRange(opts);
    if (dates.length < 2) return NaN;
    const vals = this.valuetype === "Return(Total)" /* RTRN */ ? values : pctChange(ffill(values));
    vals[0] = 0;
    const tf = this.calcTimeFactor(dates, values, opts.periodsInYearFixed);
    const perPeriodMar = mar / tf;
    const shortfalls = vals.slice(1).map((r) => Math.max(0, perPeriodMar - r));
    const lpm2 = shortfalls.reduce((s, x) => s + x * x, 0) / vals.length;
    return Math.sqrt(lpm2) * Math.sqrt(tf);
  }
  retVolRatio(riskfreeRate = 0, opts = {}) {
    const ret = this.arithmeticRet(opts) - riskfreeRate;
    const v = this.vol(opts);
    return v === 0 ? NaN : ret / v;
  }
  sortinoRatio(riskfreeRate = 0, minAcceptedReturn = 0, opts = {}) {
    const ret = this.arithmeticRet(opts) - riskfreeRate;
    const dd = this.downsideDeviation(opts, minAcceptedReturn);
    return dd === 0 ? NaN : ret / dd;
  }
  positiveShare(opts = {}) {
    const { values } = this.sliceByRange(opts);
    if (values.length < 2) return NaN;
    const vals = this.valuetype === "Return(Total)" /* RTRN */ ? values : pctChange(ffill(values));
    vals[0] = 0;
    const rets = vals.slice(1).filter((r) => !Number.isNaN(r));
    const pos = rets.filter((r) => r > 0).length;
    return rets.length === 0 ? NaN : pos / rets.length;
  }
  worst(observations = 1, opts = {}) {
    const { values } = this.sliceByRange(opts);
    if (values.length < observations + 1) return NaN;
    const vals = this.valuetype === "Return(Total)" /* RTRN */ ? values : pctChange(ffill(values));
    vals[0] = 0;
    let minVal = 0;
    for (let i = observations; i < vals.length; i++) {
      let sum = 0;
      for (let j = 0; j < observations; j++) sum += vals[i - j];
      minVal = Math.min(minVal, sum);
    }
    return minVal;
  }
  skew(opts = {}) {
    const { dates, values } = this.sliceByRange(opts);
    if (dates.length < 3) return NaN;
    const vals = this.valuetype === "Return(Total)" /* RTRN */ ? values : pctChange(ffill(values));
    vals[0] = 0;
    const rets = vals.slice(1).filter((r) => !Number.isNaN(r));
    return skewness(rets);
  }
  kurtosis(opts = {}) {
    const { dates, values } = this.sliceByRange(opts);
    if (dates.length < 4) return NaN;
    const vals = this.valuetype === "Return(Total)" /* RTRN */ ? values : pctChange(ffill(values));
    vals[0] = 0;
    const rets = vals.slice(1).filter((r) => !Number.isNaN(r));
    return kurtosis(rets);
  }
  zScore(opts = {}) {
    const { dates, values } = this.sliceByRange(opts);
    if (dates.length < 2) return NaN;
    const vals = this.valuetype === "Return(Total)" /* RTRN */ ? values : pctChange(ffill(values));
    vals[0] = 0;
    const rets = vals.slice(1).filter((r) => !Number.isNaN(r));
    const m = mean(rets);
    const s = std(rets, 1);
    return s === 0 ? NaN : (rets[rets.length - 1] - m) / s;
  }
  volFromVar(level = 0.95, opts = {}) {
    const { dates, values } = this.sliceByRange(opts);
    if (dates.length < 2) return NaN;
    const vals = this.valuetype === "Return(Total)" /* RTRN */ ? values : pctChange(ffill(values));
    vals[0] = 0;
    const rets = vals.slice(1).filter((r) => !Number.isNaN(r));
    const tf = this.calcTimeFactor(dates, values, opts.periodsInYearFixed);
    const q = quantile(rets, 1 - level);
    return -Math.sqrt(tf) * q / normPpf(level);
  }
  ewmaVolFunc(lmbda = 0.94, dayChunk = 11, opts = {}) {
    const { dates, values } = this.sliceByRange(opts);
    if (dates.length < dayChunk) return [];
    const tf = this.calcTimeFactor(dates, values, opts.periodsInYearFixed);
    const logRet = logReturns(values);
    const chunk = logRet.slice(1, dayChunk);
    const initVol = std(chunk, 0) * Math.sqrt(tf);
    const result = [initVol];
    for (let i = dayChunk; i < logRet.length; i++) {
      const r = logRet[i];
      const prev = result[result.length - 1];
      result.push(
        Math.sqrt(r * r * tf * (1 - lmbda) + prev * prev * lmbda)
      );
    }
    return result;
  }
  ewmaVarFunc(lmbda = 0.94, dayChunk = 11, level = 0.95, opts = {}) {
    const vols = this.ewmaVolFunc(lmbda, dayChunk, opts);
    return vols.map((v) => v * normPpf(1 - level));
  }
  setNewLabel(lvlZero, lvlOne) {
    if (lvlZero != null) this.label = lvlZero;
    if (lvlOne != null) this.valuetype = lvlOne;
    return this;
  }
  toDrawdownSeries() {
    const vals = this.getTsdfValues().map((v) => Number.isNaN(v) ? -Infinity : v);
    let peak = vals[0];
    const drawdown = vals.map((v) => {
      peak = Math.max(peak, v);
      return v / peak - 1;
    });
    this.tsdf = this.getTsdfDates().map((d, i) => ({ date: d, value: drawdown[i] }));
    return this;
  }
};
function timeseriesChain(front, back, oldFee = 0) {
  const old = front.fromDeepcopy();
  if (oldFee !== 0) {
    const vals = old.valuetype === "Return(Total)" /* RTRN */ ? old.getTsdfValues() : pctChange(ffill(old.getTsdfValues()));
    vals[0] = 0;
    const daysInYear = 365;
    const dates2 = old.getTsdfDates();
    const dateDiffs = [];
    for (let i = 1; i < dates2.length; i++) {
      dateDiffs.push(daysBetween(dates2[i - 1], dates2[i]));
    }
    const adj = vals.slice(1).map((r, i) => 1 + r + oldFee * (dateDiffs[i] ?? 0) / daysInYear);
    const cum = cumProd(adj, 1);
    old.tsdf = dates2.map((d, i) => ({
      date: d,
      value: i === 0 ? 1 : cum[i - 1]
    }));
    old.valuetype = "Price(Close)" /* PRICE */;
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
  const oldDateToVal = /* @__PURE__ */ new Map();
  for (let i = 0; i < oldDates.length; i++) {
    oldDateToVal.set(oldDates[i], oldVals[i]);
  }
  const frontDates = oldDates.filter((d) => d < first);
  const frontVals = frontDates.map((d) => oldDateToVal.get(d));
  const oldValAtFirst = oldDateToVal.get(first);
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
    localCcy: back.localCcy
  });
}

// src/frame.ts
function alignSeriesToCommonDates(series, how = "outer") {
  const allDates = /* @__PURE__ */ new Set();
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
    const dateToVal = /* @__PURE__ */ new Map();
    const seriesDates = [];
    for (const r of s.tsdf) {
      dateToVal.set(r.date, r.value);
      seriesDates.push(r.date);
    }
    seriesDates.sort();
    return { dateToVal, seriesDates };
  });
  const getVal = ({ dateToVal, seriesDates }, d) => {
    const exact = dateToVal.get(d);
    if (exact !== void 0) return exact;
    if (seriesDates.length === 0) return null;
    if (d < seriesDates[0]) return dateToVal.get(seriesDates[0]) ?? null;
    if (d > seriesDates[seriesDates.length - 1])
      return dateToVal.get(seriesDates[seriesDates.length - 1]) ?? null;
    let lo = 0;
    let hi = seriesDates.length - 1;
    while (lo < hi) {
      const mid = Math.ceil((lo + hi) / 2);
      if (seriesDates[mid] <= d) lo = mid;
      else hi = mid - 1;
    }
    return dateToVal.get(seriesDates[lo]) ?? null;
  };
  const valuesBySeries = series.map(
    (s, i) => dates.map((d) => getVal(seriesMaps[i], d) ?? NaN)
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
var OpenFrame = class {
  constructor(constituents, weights = null) {
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
  get itemCount() {
    return this.constituents.length;
  }
  get length() {
    return this.tsdf.dates.length;
  }
  get firstIdx() {
    return this.tsdf.dates[0];
  }
  get lastIdx() {
    return this.tsdf.dates[this.tsdf.dates.length - 1];
  }
  get periodInAYear() {
    const days = (new Date(this.lastIdx).getTime() - new Date(this.firstIdx).getTime()) / (1e3 * 60 * 60 * 24);
    return this.length / (days / 365.25);
  }
  mergeSeries(how = "outer") {
    const { dates, valuesBySeries } = alignSeriesToCommonDates(
      this.constituents,
      how
    );
    this.tsdf = { dates, columns: valuesBySeries };
    return this;
  }
  ensureReturns() {
    const vtypes = this.constituents.map((c) => c.valuetype === "Return(Total)" /* RTRN */);
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
    pcts.forEach((p) => p[0] = 0);
    return pcts;
  }
  correlMatrix() {
    const rets = this.ensureReturns().map((col) => col.slice(1));
    const n = this.columnLabels.length;
    const matrix = [];
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
          matrix[i][j] = denom === 0 ? i === j ? 1 : NaN : cov / denom;
        }
      }
    }
    return matrix;
  }
  makePortfolio(name, weightStrat) {
    if (!this.weights && !weightStrat)
      throw new NoWeightsError("Weights must be provided to run makePortfolio");
    let w = this.weights ?? [];
    const rets = this.ensureReturns();
    if (weightStrat) {
      w = this.calcWeights(weightStrat, rets);
    }
    const n = rets[0].length;
    const portfolioRets = [];
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
  calcWeights(strat, rets) {
    if (strat === "eq_weights") {
      return new Array(this.itemCount).fill(1 / this.itemCount);
    }
    if (strat === "inv_vol") {
      const vols = rets.map((col) => {
        const r = col.slice(1).filter((x) => !Number.isNaN(x));
        return std(r, 1);
      });
      const inv = vols.map((v) => v === 0 ? 0 : 1 / v);
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
      const cov = [];
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
  invertMatrix(m) {
    const n = m.length;
    const a = m.map((row) => [...row]);
    const inv = Array.from(
      { length: n },
      (_, i) => Array.from({ length: n }, (_2, j) => i === j ? 1 : 0)
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
  trackingError(baseColumn = -1, _opts) {
    const rets = this.ensureReturns().map((col) => col.slice(1));
    const baseIdx = baseColumn < 0 ? this.itemCount + baseColumn : baseColumn;
    const baseRets = rets[baseIdx];
    const tf = this.periodInAYear;
    const result = [];
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
  infoRatio(baseColumn = -1) {
    const rets = this.ensureReturns().map((col) => col.slice(1));
    const baseIdx = baseColumn < 0 ? this.itemCount + baseColumn : baseColumn;
    const baseRets = rets[baseIdx];
    const tf = this.periodInAYear;
    const result = [];
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
  beta(assetColumn, marketColumn) {
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
  jensenAlpha(assetColumn, marketColumn, riskfreeRate = 0) {
    const rets = this.ensureReturns().map((col) => col.slice(1));
    const assetRets = rets[assetColumn];
    const marketRets = rets[marketColumn];
    const tf = this.periodInAYear;
    const assetMean = mean(assetRets) * tf;
    const marketMean = mean(marketRets) * tf;
    const b = this.beta(assetColumn, marketColumn);
    return assetMean - riskfreeRate - b * (marketMean - riskfreeRate);
  }
  addTimeseries(series) {
    this.constituents.push(series);
    this.mergeSeries("outer");
    this.columnLabels = this.constituents.map((c) => c.label);
    return this;
  }
};

// src/datefixer.ts
function dateFix(input) {
  if (typeof input === "string") {
    return /* @__PURE__ */ new Date(input + "T12:00:00Z");
  }
  return input instanceof Date ? input : new Date(input);
}
function dateToStr2(d) {
  return d.toISOString().slice(0, 10);
}
function generateCalendarDateRange(tradingDays, options) {
  if (tradingDays < 1) {
    throw new Error("trading_days must be greater than zero");
  }
  const result = [];
  if (options?.end) {
    const current = dateFix(options.end);
    const temp = [];
    while (temp.length < tradingDays) {
      const day = current.getDay();
      if (day !== 0 && day !== 6) {
        temp.push(dateToStr2(current));
      }
      current.setDate(current.getDate() - 1);
    }
    result.push(...temp.reverse());
  } else {
    let current;
    if (options?.start) {
      current = dateFix(options.start);
    } else {
      current = /* @__PURE__ */ new Date();
    }
    let count = 0;
    while (count < tradingDays) {
      const day = current.getDay();
      if (day !== 0 && day !== 6) {
        result.push(dateToStr2(current));
        count++;
      }
      current.setDate(current.getDate() + 1);
    }
  }
  return result;
}
function offsetBusinessDays(ddate, days) {
  const result = new Date(ddate);
  let remaining = Math.abs(days);
  const step = days >= 0 ? 1 : -1;
  while (remaining > 0) {
    result.setDate(result.getDate() + step);
    const day = result.getDay();
    if (day !== 0 && day !== 6) remaining--;
  }
  return result;
}

// src/simulation.ts
function createRng(seed) {
  let s = seed ?? Math.floor(Math.random() * 4294967295);
  return () => {
    s = s * 1664525 + 1013904223 >>> 0;
    return s / 4294967295;
  };
}
function boxMuller(rng) {
  let spare = null;
  return () => {
    if (spare != null) {
      const s = spare;
      spare = null;
      return s;
    }
    let u = 0;
    let v = 0;
    while (u === 0) u = rng();
    while (v === 0) v = rng();
    const r = Math.sqrt(-2 * Math.log(u));
    spare = r * Math.sin(2 * Math.PI * v);
    return r * Math.cos(2 * Math.PI * v);
  };
}
function samplePoisson(lamda, rng) {
  const u = rng();
  let p = Math.exp(-lamda);
  let s = p;
  let k = 0;
  while (u > s) {
    k++;
    p *= lamda / k;
    s += p;
  }
  return k;
}
var ReturnSimulation = class _ReturnSimulation {
  constructor(params) {
    this.numberOfSims = params.number_of_sims;
    this.tradingDays = params.trading_days;
    this.tradingDaysInYear = params.trading_days_in_year;
    this.meanAnnualReturn = params.mean_annual_return;
    this.meanAnnualVol = params.mean_annual_vol;
    this.dframe = params.dframe;
    this.seed = params.seed;
    this.jumpsLamda = params.jumps_lamda ?? 0;
    this.jumpsSigma = params.jumps_sigma ?? 0;
    this.jumpsMu = params.jumps_mu ?? 0;
  }
  get results() {
    return this.dframe.map((row) => {
      let acc = 1;
      return row.map((r) => acc *= 1 + r);
    });
  }
  get realizedMeanReturn() {
    const res = this.results[0];
    const rets = [];
    for (let i = 1; i < res.length; i++) {
      rets.push((res[i] - res[i - 1]) / res[i - 1]);
    }
    return rets.reduce((a, b) => a + b, 0) / rets.length * this.tradingDaysInYear;
  }
  get realizedVol() {
    const res = this.results[0];
    const rets = [];
    for (let i = 1; i < res.length; i++) {
      rets.push((res[i] - res[i - 1]) / res[i - 1]);
    }
    const mean2 = rets.reduce((a, b) => a + b, 0) / rets.length;
    const variance = rets.reduce((s, r) => s + (r - mean2) ** 2, 0) / (rets.length - 1);
    return Math.sqrt(variance * this.tradingDaysInYear);
  }
  static fromNormal(number_of_sims, mean_annual_return, mean_annual_vol, trading_days, trading_days_in_year = 252, seed) {
    const rng = boxMuller(createRng(seed));
    const mu = mean_annual_return / trading_days_in_year;
    const sigma = mean_annual_vol / Math.sqrt(trading_days_in_year);
    const dframe = [];
    for (let i = 0; i < number_of_sims; i++) {
      const row = [];
      for (let j = 0; j < trading_days; j++) {
        row.push(mu + sigma * rng());
      }
      dframe.push(row);
    }
    return new _ReturnSimulation({
      number_of_sims,
      trading_days,
      trading_days_in_year,
      mean_annual_return,
      mean_annual_vol,
      dframe,
      seed
    });
  }
  static fromGbm(number_of_sims, mean_annual_return, mean_annual_vol, trading_days, trading_days_in_year = 252, seed) {
    const rng = boxMuller(createRng(seed));
    const drift = (mean_annual_return - 0.5 * mean_annual_vol ** 2) / trading_days_in_year;
    const sigma = mean_annual_vol / Math.sqrt(trading_days_in_year);
    const dframe = [];
    for (let i = 0; i < number_of_sims; i++) {
      const row = [];
      for (let j = 0; j < trading_days; j++) {
        row.push(drift + sigma * rng());
      }
      dframe.push(row);
    }
    return new _ReturnSimulation({
      number_of_sims,
      trading_days,
      trading_days_in_year,
      mean_annual_return,
      mean_annual_vol,
      dframe,
      seed
    });
  }
  static fromLognormal(number_of_sims, mean_annual_return, mean_annual_vol, trading_days, trading_days_in_year = 252, seed) {
    const rng = boxMuller(createRng(seed));
    const mu = mean_annual_return / trading_days_in_year;
    const sigma = mean_annual_vol / Math.sqrt(trading_days_in_year);
    const dframe = [];
    for (let i = 0; i < number_of_sims; i++) {
      const row = [];
      for (let j = 0; j < trading_days; j++) {
        const z = rng();
        row.push(Math.exp(mu + sigma * z) - 1);
      }
      dframe.push(row);
    }
    return new _ReturnSimulation({
      number_of_sims,
      trading_days,
      trading_days_in_year,
      mean_annual_return,
      mean_annual_vol,
      dframe,
      seed
    });
  }
  static fromMertonJumpGbm(number_of_sims, trading_days, mean_annual_return, mean_annual_vol, jumps_lamda, jumps_sigma = 0, jumps_mu = 0, trading_days_in_year = 252, seed) {
    const uniformRng = createRng(seed);
    const normalRng = boxMuller(() => uniformRng());
    const sigmaDaily = mean_annual_vol / Math.sqrt(trading_days_in_year);
    const lamdaDaily = jumps_lamda / trading_days_in_year;
    const drift = (mean_annual_return - 0.5 * mean_annual_vol ** 2 - jumps_lamda * (jumps_mu + jumps_sigma ** 2)) / trading_days_in_year;
    const dframe = [];
    for (let i = 0; i < number_of_sims; i++) {
      const row = [];
      for (let j = 0; j < trading_days; j++) {
        const wiener = sigmaDaily * normalRng();
        const nJumps = samplePoisson(lamdaDaily, uniformRng);
        const jumpNormal = nJumps === 0 ? 0 : jumps_mu + jumps_sigma * normalRng();
        const poissonJumps = nJumps * jumpNormal;
        row.push(drift + wiener + poissonJumps);
      }
      row[0] = 0;
      dframe.push(row);
    }
    return new _ReturnSimulation({
      number_of_sims,
      trading_days,
      trading_days_in_year,
      mean_annual_return,
      mean_annual_vol,
      dframe,
      seed,
      jumps_lamda,
      jumps_sigma,
      jumps_mu
    });
  }
  toDateColumns(name, options) {
    const dates = generateCalendarDateRange(this.tradingDays, options);
    const asReturns = options?.asReturns !== false;
    const data = asReturns ? this.dframe : this.results;
    const columns = [];
    if (this.numberOfSims === 1) {
      columns.push({ name, values: data[0].map((v) => v) });
    } else {
      for (let i = 0; i < this.numberOfSims; i++) {
        columns.push({
          name: `${name}_${i}`,
          values: data[i].map((v) => v)
        });
      }
    }
    return { dates, columns };
  }
};
function randomGenerator(seed) {
  return createRng(seed);
}

// src/portfoliotools.ts
function simulatePortfolios(frame, numPorts, seed) {
  const rets = frame.tsdf.columns.map((col) => {
    const v = col.slice(1);
    return frame.constituents.every((c) => c.valuetype === "Return(Total)" /* RTRN */) ? v : (() => {
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
  const cov = [];
  for (let i = 0; i < frame.itemCount; i++) {
    cov[i] = [];
    for (let j = 0; j < frame.itemCount; j++) {
      let c = 0;
      const mi = meanRets[i] / tf;
      const mj = meanRets[j] / tf;
      for (let k = 0; k < n; k++) {
        c += (rets[i][k] - mi) * (rets[j][k] - mj);
      }
      cov[i][j] = c / (n - 1) * tf;
    }
  }
  const rng = randomGenerator(seed);
  const result = [];
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
function efficientFrontier(frame, numPorts = 5e3, seed = 71, frontierPoints = 50) {
  const simulated = simulatePortfolios(frame, numPorts, seed);
  const rets = frame.tsdf.columns.map((col) => {
    const v = col.slice(1);
    return frame.constituents.every((c) => c.valuetype === "Return(Total)" /* RTRN */) ? v : (() => {
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
  const cov = [];
  for (let i = 0; i < frame.itemCount; i++) {
    cov[i] = [];
    for (let j = 0; j < frame.itemCount; j++) {
      let c = 0;
      const mi = meanRets[i] / tf;
      const mj = meanRets[j] / tf;
      for (let k = 0; k < n; k++) {
        c += (rets[i][k] - mi) * (rets[j][k] - mj);
      }
      cov[i][j] = c / (n - 1) * tf;
    }
  }
  const minVolIdx = simulated.reduce(
    (best, s, i) => s.stdev < simulated[best].stdev ? i : best,
    0
  );
  const frontierMinRet = simulated[minVolIdx].ret;
  const frontierMaxRet = Math.max(...meanRets);
  const frontier = [];
  const targetRets = Array.from(
    { length: frontierPoints },
    (_, i) => frontierMinRet + i / (frontierPoints - 1) * (frontierMaxRet - frontierMinRet)
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
      frame.itemCount
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
        weights: w
      });
    }
  }
  frontier.sort((a, b) => a.ret - b.ret);
  const maxSharpeIdx = frontier.reduce(
    (best, p, i) => p.sharpe > frontier[best].sharpe ? i : best,
    0
  );
  return {
    frontier,
    simulated,
    maxSharpe: frontier[maxSharpeIdx]
  };
}
function matVec(m, v) {
  return m.map((row) => row.reduce((s, mij, j) => s + mij * v[j], 0));
}
function vecDot(a, b) {
  return a.reduce((s, ai, i) => s + ai * b[i], 0);
}
function invertMatrix(m) {
  const n = m.length;
  const a = m.map((row) => [...row]);
  const inv = Array.from(
    { length: n },
    (_, i) => Array.from({ length: n }, (_2, j) => i === j ? 1 : 0)
  );
  for (let col = 0; col < n; col++) {
    let maxRow = col;
    for (let row = col + 1; row < n; row++) {
      if (Math.abs(a[row][col]) > Math.abs(a[maxRow][col])) maxRow = row;
    }
    [a[col], a[maxRow]] = [a[maxRow], a[col]];
    [inv[col], inv[maxRow]] = [inv[maxRow], inv[col]];
    const pivot = a[col][col];
    if (pivot === void 0 || Math.abs(pivot) < 1e-12) return m;
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
function solveEfficientWeights(meanRets, cov, invCov, targetRet, A, B, C, det, n) {
  if (Math.abs(det) < 1e-14) return null;
  const lambda1 = (C * targetRet - A) / det;
  const lambda2 = (B - A * targetRet) / det;
  const ones = new Array(n).fill(1);
  const linearCombo = meanRets.map((mu, i) => lambda1 * mu + lambda2 * ones[i]);
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
function minimizeVolForReturnProjected(meanRets, cov, targetRet, n) {
  const rMax = Math.max(...meanRets);
  const rMin = Math.min(...meanRets);
  const target = Math.max(rMin, Math.min(rMax, targetRet));
  if (target >= rMax - 1e-10) {
    const imax = meanRets.indexOf(rMax);
    const w2 = new Array(n).fill(0);
    w2[imax] = 1;
    return w2;
  }
  if (target <= rMin + 1e-10) {
    const imin = meanRets.indexOf(rMin);
    const w2 = new Array(n).fill(0);
    w2[imin] = 1;
    return w2;
  }
  let w = new Array(n).fill(1 / n);
  const maxIter = 2e3;
  const tol = 1e-6;
  let step = 0.4;
  for (let iter = 0; iter < maxIter; iter++) {
    const grad = matVec(cov, w);
    let ret = vecDot(w, meanRets);
    const retErr = ret - target;
    const wNew = w.map((wi, i) => {
      let d = wi - step * grad[i];
      d += step * 2 * retErr * meanRets[i];
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

// src/captor.ts
var API_BASE = "https://api.captor.se/public/api/opentimeseries";
async function fetchCaptorSeries(id) {
  const url = `${API_BASE}/${id}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch ${id}: ${res.status} ${res.statusText}`);
  }
  return res.json();
}
async function fetchCaptorSeriesBatch(ids) {
  return Promise.all(ids.map((id) => fetchCaptorSeries(id)));
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  DateAlignmentError,
  IncorrectArgumentComboError,
  InitialValueZeroError,
  MixedValuetypesError,
  NoWeightsError,
  OpenFrame,
  OpenTimeSeries,
  ReturnSimulation,
  ValueType,
  dateFix,
  dateToStr,
  efficientFrontier,
  fetchCaptorSeries,
  fetchCaptorSeriesBatch,
  generateCalendarDateRange,
  mean,
  offsetBusinessDays,
  pctChange,
  quantile,
  randomGenerator,
  simulatePortfolios,
  std,
  timeseriesChain
});
