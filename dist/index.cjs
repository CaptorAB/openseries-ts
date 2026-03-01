"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
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
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
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
  ResampleDataLossError: () => ResampleDataLossError,
  ReturnSimulation: () => ReturnSimulation,
  ValueType: () => ValueType,
  dateFix: () => dateFix,
  dateToStr: () => dateToStr,
  efficientFrontier: () => efficientFrontier,
  fetchCaptorSeries: () => fetchCaptorSeries,
  fetchCaptorSeriesBatch: () => fetchCaptorSeriesBatch,
  filterBusinessDays: () => filterBusinessDays,
  filterToBusinessDays: () => filterToBusinessDays,
  generateCalendarDateRange: () => generateCalendarDateRange,
  getPreviousBusinessDayBeforeToday: () => getPreviousBusinessDayBeforeToday,
  isBusinessDay: () => isBusinessDay,
  lastBusinessDayOfMonth: () => lastBusinessDayOfMonth,
  lastBusinessDayOfYear: () => lastBusinessDayOfYear,
  mean: () => mean,
  offsetBusinessDays: () => offsetBusinessDays,
  pctChange: () => pctChange,
  plotSeries: () => plotSeries,
  plotSeriesHtml: () => plotSeriesHtml,
  preparePlotData: () => preparePlotData,
  prevBusinessDay: () => prevBusinessDay,
  quantile: () => quantile,
  randomGenerator: () => randomGenerator,
  reportHtml: () => reportHtml,
  resampleToPeriodEnd: () => resampleToPeriodEnd,
  sharpeplot: () => sharpeplot,
  sharpeplotHtml: () => sharpeplotHtml,
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
var ResampleDataLossError = class extends Error {
  constructor(message) {
    super(message);
    this.name = "ResampleDataLossError";
  }
};

// src/bizcalendar.ts
var import_date_holidays = __toESM(require("date-holidays"), 1);

// src/datefixer.ts
function dateFix(input) {
  if (typeof input === "string") {
    return /* @__PURE__ */ new Date(input + "T12:00:00Z");
  }
  return input instanceof Date ? input : new Date(input);
}
function dateToStr(d) {
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
        temp.push(dateToStr(current));
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
        result.push(dateToStr(current));
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

// src/bizcalendar.ts
function parseDate(s) {
  return /* @__PURE__ */ new Date(s + "T12:00:00Z");
}
function isWeekend(dateStr) {
  const d = parseDate(dateStr);
  const day = d.getUTCDay();
  return day === 0 || day === 6;
}
function createHolidayCheckers(countries) {
  const codes = Array.isArray(countries) ? countries : [countries];
  return codes.map((c) => {
    const hd = new import_date_holidays.default(c);
    return (dateStr) => {
      const result = hd.isHoliday(parseDate(dateStr));
      return result !== false && Array.isArray(result) && result.length > 0;
    };
  });
}
function isHoliday(dateStr, checkers) {
  return checkers.some((check) => check(dateStr));
}
function getPreviousBusinessDayBeforeToday(countries) {
  const today = /* @__PURE__ */ new Date();
  today.setUTCDate(today.getUTCDate() - 1);
  const yesterdayStr = dateToStr(today);
  return prevBusinessDay(yesterdayStr, countries);
}
function filterBusinessDays(dates, countries) {
  const checkers = createHolidayCheckers(countries);
  return dates.filter((d) => !isWeekend(d) && !isHoliday(d, checkers));
}
function isBusinessDay(dateStr, countries) {
  if (isWeekend(dateStr)) return false;
  const checkers = createHolidayCheckers(countries);
  return !isHoliday(dateStr, checkers);
}
function prevBusinessDay(dateStr, countries) {
  const d = parseDate(dateStr);
  const checkers = createHolidayCheckers(countries);
  while (true) {
    const str = dateToStr(d);
    if (!isWeekend(str) && !isHoliday(str, checkers)) return str;
    d.setUTCDate(d.getUTCDate() - 1);
  }
}
function lastBusinessDayOfMonth(year, month, countries) {
  const lastDay = new Date(Date.UTC(year, month, 0));
  const str = dateToStr(lastDay);
  return prevBusinessDay(str, countries);
}
function lastBusinessDayOfYear(year, countries) {
  return lastBusinessDayOfMonth(year, 12, countries);
}
function getWeekKey(dateStr) {
  const d = parseDate(dateStr);
  const startOfYear = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const msPerWeek = 7 * 24 * 60 * 60 * 1e3;
  const weekNum = Math.floor(
    (d.getTime() - startOfYear.getTime()) / msPerWeek
  );
  return `${d.getUTCFullYear()}-W${weekNum}`;
}
function resampleToPeriodEnd(dates, columns, freq, countries) {
  const checkers = createHolidayCheckers(countries);
  const isBiz = (d) => !isWeekend(d) && !isHoliday(d, checkers);
  const outDates = [];
  const outCols = columns.map(() => []);
  const getPeriodKey = (dateStr) => {
    const [y, m] = dateStr.split("-").map(Number);
    if (freq === "WE") return getWeekKey(dateStr);
    if (freq === "YE") return `${y}`;
    if (freq === "QE") return `${y}-Q${Math.ceil(m / 3)}`;
    return dateStr.slice(0, 7);
  };
  let i = 0;
  while (i < dates.length) {
    const periodKey = getPeriodKey(dates[i]);
    let lastBizIdx = -1;
    let j = i;
    while (j < dates.length && getPeriodKey(dates[j]) === periodKey) {
      if (isBiz(dates[j])) lastBizIdx = j;
      j++;
    }
    if (lastBizIdx >= 0) {
      outDates.push(dates[lastBizIdx]);
      for (let c = 0; c < columns.length; c++) {
        outCols[c].push(columns[c][lastBizIdx]);
      }
    }
    i = j;
  }
  return { dates: outDates, columns: outCols };
}
function filterToBusinessDays(dates, columns, countries) {
  const checkers = createHolidayCheckers(countries);
  const indices = [];
  for (let i = 0; i < dates.length; i++) {
    if (!isWeekend(dates[i]) && !isHoliday(dates[i], checkers)) indices.push(i);
  }
  return {
    dates: indices.map((i) => dates[i]),
    columns: columns.map((col) => indices.map((i) => col[i]))
  };
}

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
function parseDate2(s) {
  return /* @__PURE__ */ new Date(s + "T12:00:00Z");
}
function dateToStr2(d) {
  return d.toISOString().slice(0, 10);
}
function daysBetween(a, b) {
  const msPerDay = 1e3 * 60 * 60 * 24;
  const days = (parseDate2(b).getTime() - parseDate2(a).getTime()) / msPerDay;
  return Math.floor(days);
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
  /** Creates an OpenTimeSeries from a name, dates array, and values array. */
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
      localCcy: options?.localCcy ?? true,
      countries: options?.countries
    });
  }
  /** Creates an OpenTimeSeries from a record or array of {date, value}. */
  static fromObject(data) {
    const entries = Array.isArray(data) ? data : Object.entries(data).map(([date, value]) => ({ date, value }));
    const dates = entries.map((e) => e.date);
    const values = entries.map((e) => e.value);
    return _OpenTimeSeries.fromArrays("Series", dates, values);
  }
  /** Creates an OpenTimeSeries from simulation dateColumns by column index. */
  static fromDateColumns(dateColumns, options) {
    const idx = options?.columnIndex ?? 0;
    const col = dateColumns.columns[idx];
    if (!col) throw new Error("Column index out of range");
    return _OpenTimeSeries.fromArrays(col.name, dateColumns.dates, col.values, {
      valuetype: options?.valuetype,
      countries: options?.countries
    });
  }
  fromDeepcopy() {
    return new _OpenTimeSeries({
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
      const last = parseDate2(this.tsdf[toIdx].date);
      const earlier = new Date(last);
      earlier.setMonth(earlier.getMonth() - opts.monthsFromLast);
      const fromStr = dateToStr2(earlier);
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
  /**
   * Returns the date when the max drawdown bottom occurs (the date of the lowest point
   * relative to the preceding peak). Returns undefined if no drawdown occurs.
   */
  maxDrawdownBottomDate(opts = {}) {
    const { dates, values } = this.sliceByRange(opts);
    if (dates.length < 2) return void 0;
    let peak = values[0];
    let mdd = 0;
    let bottomIdx = -1;
    for (let i = 0; i < values.length; i++) {
      const v = values[i];
      peak = Math.max(peak, v);
      const dd = v / peak - 1;
      if (dd < mdd) {
        mdd = dd;
        bottomIdx = i;
      }
    }
    return bottomIdx >= 0 ? dates[bottomIdx] : void 0;
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
  /** Filters tsdf to retain only business days. Mutates in place. */
  filterToBusinessDays() {
    const dates = this.getTsdfDates();
    const columns = [this.getTsdfValues()];
    const { dates: outDates, columns: outCols } = filterToBusinessDays(
      dates,
      columns,
      this.countries
    );
    this.tsdf = outDates.map((d, i) => ({ date: d, value: outCols[0][i] }));
    return this;
  }
  /**
   * Resamples to business period-end frequency (week, month, quarter, year).
   * Mutates tsdf. Throws on return series (use price series).
   */
  resampleToPeriodEnd(freq = "ME") {
    if (this.valuetype === "Return(Total)" /* RTRN */)
      throw new ResampleDataLossError(
        "Do not run resampleToPeriodEnd on return series. The operation would pick the last data point per period, not sum returns, and data would be lost."
      );
    const dates = this.getTsdfDates();
    const columns = [this.getTsdfValues()];
    const { dates: outDates, columns: outCols } = resampleToPeriodEnd(
      dates,
      columns,
      freq,
      this.countries
    );
    this.tsdf = outDates.map((d, i) => ({ date: d, value: outCols[0][i] }));
    return this;
  }
  /**
   * Worst single calendar month return (business-month-end based).
   * Uses filterToBusinessDays + resampleToPeriodEnd(ME) + min of monthly returns.
   */
  worstMonth(opts = {}) {
    const { dates, values } = this.sliceByRange(opts);
    if (dates.length < 2) return NaN;
    if (this.valuetype === "Return(Total)" /* RTRN */)
      throw new ResampleDataLossError(
        "worstMonth requires price series. Convert to cumret first."
      );
    const filtered = filterToBusinessDays(dates, [values], this.countries);
    if (filtered.dates.length < 2) return NaN;
    const resampled = resampleToPeriodEnd(
      filtered.dates,
      filtered.columns,
      "ME",
      this.countries
    );
    if (resampled.dates.length < 2) return NaN;
    const vals = ffill(resampled.columns[0]);
    const rets = pctChange(vals);
    rets[0] = 0;
    const monthlyRets = rets.slice(1).filter((r) => !Number.isNaN(r));
    return monthlyRets.length === 0 ? NaN : Math.min(...monthlyRets);
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
  if (firstIdx >= newDates.length || parseDate2(newDates[firstIdx]) > parseDate2(oldDates[oldDates.length - 1]))
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
function normalizeCountries(c) {
  return Array.isArray(c) ? c : [c];
}
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
  constructor(constituents, weights = null, options) {
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
    this.countries = options?.countries != null ? normalizeCountries(options.countries) : normalizeCountries(copied[0]?.countries ?? "SE");
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
  /**
   * Converts each column to drawdown series (value / running peak - 1).
   * Operates on the frame's aligned tsdf. Call after mergeSeries and truncate
   * so drawdown is computed on the truncated date range.
   */
  toDrawdownSeries() {
    const newColumns = this.tsdf.columns.map((col) => {
      const vals = col.map((v) => Number.isNaN(v) ? -Infinity : v);
      let peak = vals[0];
      const drawdown = vals.map((v) => {
        peak = Math.max(peak, v);
        return v / peak - 1;
      });
      return drawdown;
    });
    this.tsdf = { dates: this.tsdf.dates, columns: newColumns };
    for (let i = 0; i < this.constituents.length && i < newColumns.length; i++) {
      const col = newColumns[i];
      this.constituents[i].tsdf = this.tsdf.dates.map((d, j) => ({
        date: d,
        value: col[j] ?? NaN
      }));
    }
    return this;
  }
  /** Returns return columns (first element 0). Throws if mixed PRICE/RTRN. */
  returnColumns() {
    return this.ensureReturns();
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
  /**
   * Max drawdown per column (price series). Returns array of max drawdowns.
   */
  maxDrawdown() {
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
  maxDrawdownBottomDate() {
    const { dates, columns } = this.tsdf;
    if (dates.length < 2) return columns.map(() => void 0);
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
      return bottomIdx >= 0 ? dates[bottomIdx] : void 0;
    });
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
  ordLeastSquaresFit(yColumn, xColumn, opts) {
    const fittedSeries = opts?.fittedSeries ?? true;
    const yCol = this.tsdf.columns[yColumn];
    const xCol = this.tsdf.columns[xColumn];
    if (!yCol || !xCol) {
      return { coefficient: NaN, intercept: NaN, rsquared: NaN };
    }
    const pairs = [];
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
      const fitted = xCol.map((xi) => Number.isFinite(xi) ? intercept + coefficient * xi : NaN);
      this.tsdf.columns.push(fitted);
      const yLabel = this.columnLabels[yColumn] ?? "y";
      const xLabel = this.columnLabels[xColumn] ?? "x";
      this.columnLabels.push(`OLS fit (${yLabel} vs ${xLabel})`);
    }
    return { coefficient, intercept, rsquared };
  }
  addTimeseries(series) {
    const sameDates = series.tsdf.length === this.tsdf.dates.length && series.tsdf.every((r, i) => r.date === this.tsdf.dates[i]);
    if (sameDates) {
      const vals = this.tsdf.dates.map(
        (d) => series.tsdf.find((x) => x.date === d)?.value ?? NaN
      );
      this.tsdf.columns.push(ffill(vals));
      this.columnLabels.push(series.label);
      this.constituents.push(series);
      return this;
    }
    this.constituents.push(series);
    this.mergeSeries("outer");
    this.columnLabels = this.constituents.map((c) => c.label);
    return this;
  }
  /** Filters tsdf to retain only business days. Mutates in place. */
  filterToBusinessDays() {
    const { dates, columns } = filterToBusinessDays(
      this.tsdf.dates,
      this.tsdf.columns,
      this.countries
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
  resampleToPeriodEnd(freq = "ME") {
    if (this.constituents.some((c) => c.valuetype === "Return(Total)" /* RTRN */))
      throw new ResampleDataLossError(
        "Do not run resampleToPeriodEnd on return series. Convert to price series first."
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
  truncFrame(opts = {}) {
    const { startCut, endCut, where = "both" } = opts;
    let fromDate = startCut;
    let toDate = endCut;
    if (!fromDate && (where === "before" || where === "both")) {
      fromDate = this.constituents.map((c) => c.firstIdx).reduce((a, b) => a > b ? a : b);
    }
    if (!toDate && (where === "after" || where === "both")) {
      toDate = this.constituents.map((c) => c.lastIdx).reduce((a, b) => a < b ? a : b);
    }
    if (!fromDate || !toDate) return this;
    const fromIdx = this.tsdf.dates.findIndex((d) => d >= fromDate);
    const toIdxRev = [...this.tsdf.dates].reverse().findIndex((d) => d <= toDate);
    const toIdx = toIdxRev < 0 ? this.tsdf.dates.length - 1 : this.tsdf.dates.length - 1 - toIdxRev;
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
   * Matches Python openseries capture_ratio_func behavior: uses frame data as-is (no resample)
   * with dynamic time_factor = observations / (span_days/365.25).
   *
   * @param ratio - "up" | "down" | "both" (up/down or both = up/down)
   * @param baseColumn - Benchmark column index (-1 = last)
   * @param opts.freq - If set, resample to period-end before computing (e.g. "ME" for monthly).
   *   When omitted, uses frame data as-is to match Python default.
   */
  captureRatio(ratio, baseColumn = -1, opts) {
    const baseIdx = baseColumn < 0 ? this.itemCount + baseColumn : baseColumn;
    const { dates, columns } = this.tsdf;
    const colsFfilled = columns.map((col) => ffill(col));
    let retCols;
    let timeFactor;
    const firstIdx = dates[0] ?? "";
    const lastIdx = dates[dates.length - 1] ?? "";
    if (opts?.freq) {
      const filtered = filterToBusinessDays(dates, colsFfilled, this.countries);
      const resampled = resampleToPeriodEnd(
        filtered.dates,
        filtered.columns,
        opts.freq,
        this.countries
      );
      retCols = resampled.columns.map((col) => {
        const r = pctChange(col);
        r[0] = 0;
        return r.slice(1);
      });
      timeFactor = opts.freq === "ME" ? 12 : opts.freq === "QE" ? 4 : opts.freq === "YE" ? 1 : 52;
    } else {
      retCols = colsFfilled.map((col) => {
        const r = pctChange(col);
        r[0] = 0;
        return r.slice(1);
      });
      const spanDays = firstIdx && lastIdx ? (new Date(lastIdx).getTime() - new Date(firstIdx).getTime()) / (1e3 * 60 * 60 * 24) : 0;
      const fraction = spanDays > 0 ? spanDays / 365.25 : 1;
      timeFactor = retCols[0]?.length ? retCols[0].length / fraction : 12;
    }
    const cagr = (rets, mask, tf) => {
      const masked = rets.map((r, i) => mask[i] ? r + 1 : NaN).filter((x) => !Number.isNaN(x));
      if (masked.length === 0) return 0;
      const prod = masked.reduce((a, b) => a * b, 1);
      const exponent = 1 / (masked.length / tf);
      return prod ** exponent - 1;
    };
    const benchRets = retCols[baseIdx] ?? [];
    const upMask = benchRets.map((r) => r > 0);
    const downMask = benchRets.map((r) => r < 0);
    return this.columnLabels.map((_, i) => {
      if (i === baseIdx) return 0;
      const assetRets = retCols[i] ?? [];
      if (assetRets.length !== benchRets.length || assetRets.length < 2) return NaN;
      if (ratio === "up") {
        const upRtrn2 = cagr(assetRets, upMask, timeFactor);
        const upIdx2 = cagr(benchRets, upMask, timeFactor);
        return upIdx2 === 0 ? NaN : upRtrn2 / upIdx2;
      }
      if (ratio === "down") {
        const downRtrn2 = cagr(assetRets, downMask, timeFactor);
        const downIdx2 = cagr(benchRets, downMask, timeFactor);
        return downIdx2 === 0 ? NaN : downRtrn2 / downIdx2;
      }
      const upRtrn = cagr(assetRets, upMask, timeFactor);
      const upIdx = cagr(benchRets, upMask, timeFactor);
      const downRtrn = cagr(assetRets, downMask, timeFactor);
      const downIdx = cagr(benchRets, downMask, timeFactor);
      if (Math.abs(upIdx) < 1e-12 || Math.abs(downIdx) < 1e-12) return NaN;
      if (downRtrn >= 0 || Math.abs(downRtrn) < 1e-12) return NaN;
      return upRtrn / upIdx / (downRtrn / downIdx);
    });
  }
};

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
  const invCov = invertMatrix(cov);
  const ones = new Array(frame.itemCount).fill(1);
  const invCovOnes = matVec(invCov, ones);
  const sumInv = invCovOnes.reduce((a, b) => a + b, 0);
  const wGmv = sumInv !== 0 ? invCovOnes.map((x) => x / sumInv) : null;
  const gmvRet = wGmv && Math.abs(sumInv) > 1e-12 ? vecDot(wGmv, meanRets) : Math.min(...meanRets);
  const frontierMaxRet = Math.max(...meanRets);
  const frontier = [];
  const targetRets = Array.from(
    { length: frontierPoints },
    (_, i) => gmvRet + i / Math.max(1, frontierPoints - 1) * (frontierMaxRet - gmvRet)
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
  frontier.sort((a, b) => a.stdev - b.stdev);
  const efficient = [];
  let maxRetSeen = -Infinity;
  for (const p of frontier) {
    if (p.ret >= maxRetSeen - 1e-10) {
      efficient.push(p);
      maxRetSeen = Math.max(maxRetSeen, p.ret);
    }
  }
  frontier.length = 0;
  frontier.push(...efficient);
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
function solveEfficientWeights(meanRets, _cov, invCov, targetRet, A, B, C, det, n) {
  if (Math.abs(det) < 1e-14) return null;
  const lambda1 = (C * targetRet - A) / det;
  const lambda2 = (B - A * targetRet) / det;
  const ones = new Array(n).fill(1);
  const linearCombo = meanRets.map((mu, i) => lambda1 * mu + lambda2 * ones[i]);
  const w = matVec(invCov, linearCombo);
  const sum = w.reduce((a, b) => a + b, 0);
  if (Math.abs(sum) < 1e-12) return null;
  return w.map((wi) => wi / sum);
}
function preparePlotData(assets, currentPortfolio, optimum) {
  const tf = assets.periodInAYear;
  const rets = assets.returnColumns().map((col) => col.slice(1));
  const points = [];
  for (let i = 0; i < assets.itemCount; i++) {
    const r = rets[i].filter((x) => !Number.isNaN(x));
    if (r.length < 2) continue;
    const m = mean(r) * tf;
    const v = std(r, 1) * Math.sqrt(tf);
    points.push({ stdev: v, ret: m, label: assets.columnLabels[i] ?? `Asset ${i}` });
  }
  const currRets = pctChange(ffill(currentPortfolio.values));
  currRets[0] = 0;
  const validCurr = currRets.slice(1).filter((x) => !Number.isNaN(x) && Number.isFinite(x));
  if (validCurr.length >= 2) {
    const m = mean(validCurr) * tf;
    const v = std(validCurr, 1) * Math.sqrt(tf);
    const eqWeights = assets.columnLabels.map((name) => ({
      asset: name,
      weight: 1 / assets.itemCount
    }));
    points.push({
      stdev: v,
      ret: m,
      label: "Current Portfolio",
      weights: eqWeights
    });
  }
  const maxSharpeWeights = assets.columnLabels.map((name, i) => ({
    asset: name,
    weight: optimum.weights[i] ?? 0
  }));
  points.push({
    stdev: optimum.stdev,
    ret: optimum.ret,
    label: "Max Sharpe Portfolio",
    weights: maxSharpeWeights
  });
  return points;
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

// src/report.ts
var DEFAULT_LOGO_URL = "https://sales.captor.se/captor_logo_sv_1600_icketransparent.png";
function formatPct(val, decimals = 2) {
  if (Number.isNaN(val)) return "";
  return `${(val * 100).toFixed(decimals)}%`;
}
function formatNum(val, decimals = 2) {
  if (Number.isNaN(val)) return "";
  return val.toFixed(decimals);
}
function computeAnnualReturns(dates, values) {
  const byYear = {};
  for (let i = 0; i < dates.length; i++) {
    const year = dates[i].slice(0, 4);
    if (!byYear[year]) byYear[year] = { first: values[i], last: values[i] };
    else byYear[year].last = values[i];
  }
  const result = {};
  for (const year of Object.keys(byYear).sort()) {
    const { first, last } = byYear[year];
    result[year] = first <= 0 ? NaN : last / first - 1;
  }
  return result;
}
function reportHtml(frame, options = {}) {
  if (frame.itemCount < 2) {
    throw new Error("OpenFrame must have at least 2 constituents to generate a report");
  }
  const title = options.title ?? "Portfolio Report";
  const logoUrl = options.addLogo !== false ? options.logoUrl ?? DEFAULT_LOGO_URL : "";
  const countries = frame.countries;
  const benchmarkIdx = frame.itemCount - 1;
  const { dates: rawDates, columns: rawColumns } = frame.tsdf;
  const colsFfilled = rawColumns.map((col) => ffill(col));
  const seriesData = frame.columnLabels.map((name, i) => ({
    name,
    dates: rawDates,
    values: colsFfilled[i]
  }));
  const series = frame.columnLabels.map(
    (_, i) => OpenTimeSeries.fromArrays(
      frame.columnLabels[i],
      rawDates,
      colsFfilled[i],
      { countries }
    )
  );
  const stats = [];
  const addRow = (label, fn) => {
    const vals = series.map((s, i) => fn(s, i));
    stats.push({ metric: label, values: vals.map((v) => Number.isNaN(v) ? "" : formatPct(v)) });
  };
  const lastDate = rawDates[rawDates.length - 1] ?? "";
  const lastYear = lastDate ? parseInt(lastDate.slice(0, 4), 10) : (/* @__PURE__ */ new Date()).getFullYear();
  const lastMonth = lastDate ? parseInt(lastDate.slice(5, 7), 10) : (/* @__PURE__ */ new Date()).getMonth() + 1;
  const ytdFrom = lastBusinessDayOfYear(lastYear - 1, countries);
  const mtdFrom = lastMonth > 1 ? lastBusinessDayOfMonth(lastYear, lastMonth - 1, countries) : lastBusinessDayOfMonth(lastYear - 1, 12, countries);
  addRow("Return (CAGR)", (s) => s.geoRet());
  addRow("Year-to-Date", (s) => s.valueRet({ fromDate: ytdFrom, toDate: lastDate }));
  addRow("Month-to-Date", (s) => s.valueRet({ fromDate: mtdFrom, toDate: lastDate }));
  addRow("Volatility", (s) => s.vol());
  stats.push({
    metric: "Sharpe Ratio",
    values: series.map((s) => {
      const v = s.retVolRatio(0);
      return Number.isNaN(v) ? "" : formatNum(v);
    })
  });
  stats.push({
    metric: "Sortino Ratio",
    values: series.map((s) => {
      const v = s.sortinoRatio(0, 0);
      return Number.isNaN(v) ? "" : formatNum(v);
    })
  });
  const ir = frame.infoRatio(benchmarkIdx);
  const te = frame.trackingError(benchmarkIdx);
  stats.push({
    metric: "Jensen's Alpha",
    values: series.map(
      (_, i) => i === benchmarkIdx ? "" : formatPct(frame.jensenAlpha(i, benchmarkIdx))
    )
  });
  stats.push({
    metric: "Information Ratio",
    values: ir.map(
      (v, i) => i === benchmarkIdx ? "" : Number.isNaN(v) ? "" : formatNum(v)
    )
  });
  stats.push({
    metric: "Tracking Error (weekly)",
    values: te.map(
      (v, i) => i === benchmarkIdx ? "" : Number.isNaN(v) ? "" : formatPct(v)
    )
  });
  const betas = series.map(
    (_, i) => i === benchmarkIdx ? NaN : frame.beta(i, benchmarkIdx)
  );
  stats.push({
    metric: "Index Beta (weekly)",
    values: betas.map((v) => Number.isNaN(v) ? "" : formatNum(v))
  });
  const captureRatios = frame.captureRatio("both", benchmarkIdx, { freq: "ME" });
  stats.push({
    metric: "Capture Ratio (monthly)",
    values: captureRatios.map(
      (v, i) => i === benchmarkIdx ? "" : Number.isNaN(v) ? "" : formatNum(v)
    )
  });
  const worstMonths = series.map((s) => s.worstMonth());
  stats.push({
    metric: "Worst Month",
    values: worstMonths.map((v) => Number.isNaN(v) ? "" : formatPct(v))
  });
  stats.push({
    metric: "Comparison Start",
    values: series.map(() => frame.firstIdx)
  });
  stats.push({
    metric: "Comparison End",
    values: series.map(() => frame.lastIdx)
  });
  return generateHtml(seriesData, title, stats, logoUrl);
}
function generateHtml(seriesData, reportTitle, stats, logoUrl) {
  const cumData = seriesData.map((s) => {
    const vals = ffill(s.values);
    const rets = pctChange(vals);
    rets[0] = 0;
    const cum = [1];
    for (let i = 1; i < rets.length; i++) {
      cum.push((cum[i - 1] ?? 0) * (1 + rets[i]));
    }
    return { name: s.name, dates: s.dates, values: cum };
  });
  const allYears = /* @__PURE__ */ new Set();
  const annualBySeries = {};
  for (const s of seriesData) {
    const ar = computeAnnualReturns(s.dates, s.values);
    annualBySeries[s.name] = ar;
    for (const y of Object.keys(ar)) allYears.add(y);
  }
  const years = [...allYears].sort();
  const colorway = [
    "#66725B",
    "#D0C0B1",
    "#253551",
    "#8D929D",
    "#611A51",
    "#402D16",
    "#5D6C85",
    "#404752"
  ];
  const chartColors = seriesData.map((_, i) => colorway[i % colorway.length]);
  const tableRows = stats.map(
    (r) => `<tr><th>${r.metric}</th>${r.values.map((v) => `<td>${v}</td>`).join("")}</tr>`
  ).join("");
  const tableHtml = `<tr><th>Metric</th>${seriesData.map((s) => `<th>${s.name}</th>`).join("")}</tr>${tableRows}`;
  const logoEl = logoUrl ? `<div class="header-logo"><img src="${logoUrl}" alt="Logo" /></div>` : "<div></div>";
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${reportTitle}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap" rel="stylesheet">
  <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/chartjs-adapter-date-fns@3.0.0/dist/chartjs-adapter-date-fns.bundle.min.js"></script>
  <style>
    * { box-sizing: border-box; }
    body { font-family: 'Poppins', -apple-system, BlinkMacSystemFont, sans-serif; margin: 24px; background: #fff; color: #253551; }
    .header { display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; gap: 16px; margin-bottom: 24px; padding-bottom: 16px; min-height: 80px; }
    .header-logo { display: flex; align-items: center; }
    .header-logo img { height: 60px; width: auto; max-width: 270px; object-fit: contain; }
    .header-title { grid-column: 2; text-align: center; font-size: 2.625rem; font-weight: 600; margin: 0; line-height: 1.2; }
    @media (max-width: 768px) {
      .header { grid-template-columns: 1fr; grid-template-rows: auto auto; gap: 12px; text-align: center; }
      .header-logo { justify-content: center; grid-column: 1; }
      .header-logo img { height: 54px; max-width: 210px; }
      .header-title { grid-column: 1; grid-row: 2; font-size: 2.025rem; }
    }
    .main { max-width: min(1600px, 96vw); margin: 0 auto; width: 100%; }
    .charts { display: grid; grid-template-columns: 1.2fr minmax(300px, 1fr); gap: 24px; align-items: stretch; min-width: 0; }
    @media (max-width: 1000px) { .charts { grid-template-columns: 1fr; } }
    .charts-left { display: flex; flex-direction: column; gap: 24px; min-width: 0; }
    .chart-section { background: #fff; border: 1px solid #e0e0e0; border-radius: 8px; padding: 16px; min-width: 0; }
    .chart-wrapper { height: 280px; position: relative; min-width: 0; width: 100%; }
    .chart-wrapper canvas { max-width: 100%; }
    .chart-section-table { min-width: 0; display: flex; flex-direction: column; justify-content: flex-start; }
    table { border-collapse: collapse; width: 100%; font-size: 0.8125rem; table-layout: fixed; }
    th, td { padding: 6px 12px; text-align: right; border-bottom: 1px solid #eee; }
    th { font-weight: 600; color: #253551; text-align: right; }
    tr:first-child th { border-bottom: 2px solid #333; }
    .legend { display: flex; gap: 24px; flex-wrap: wrap; margin-top: 24px; justify-content: center; font-size: 0.8125rem; color: #253551; }
    .legend-item { display: flex; align-items: center; gap: 8px; }
    .legend-color { width: 20px; height: 3px; border-radius: 2px; flex-shrink: 0; }
  </style>
</head>
<body>
  <div class="main">
    <header class="header">
      ${logoEl}
      <h1 class="header-title">${reportTitle}</h1>
    </header>
    <div class="charts">
      <div class="charts-left">
        <div class="chart-section">
          <div class="chart-wrapper"><canvas id="cumChart"></canvas></div>
        </div>
        <div class="chart-section">
          <div class="chart-wrapper"><canvas id="annualChart"></canvas></div>
        </div>
      </div>
      <div class="chart-section chart-section-table">
        <table id="statsTable"></table>
      </div>
    </div>
    <div class="legend" id="legend"></div>
  </div>

  <script>
    const seriesData = ${JSON.stringify(seriesData)};
    const cumData = ${JSON.stringify(cumData)};
    const annualBySeries = ${JSON.stringify(annualBySeries)};
    const years = ${JSON.stringify(years)};
    const statsTableHtml = ${JSON.stringify(tableHtml)};
    const chartColors = ${JSON.stringify(chartColors)};

    Chart.defaults.font.family = "'Poppins', sans-serif";
    const cumCtx = document.getElementById('cumChart').getContext('2d');
    new Chart(cumCtx, {
      type: 'line',
      data: {
        datasets: cumData.map((s, i) => ({
          label: s.name,
          data: s.dates.map((d, j) => ({ x: d, y: s.values[j] })),
          borderColor: chartColors[i],
          backgroundColor: 'transparent',
          borderWidth: 2,
          tension: 0.1,
          pointRadius: 0,
        })),
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: { beginAtZero: false, grid: { color: '#EEEEEE' }, ticks: { callback: v => (v * 100).toFixed(1) + '%' } },
          x: {
            type: 'time',
            grid: { color: '#EEEEEE' },
            ticks: { maxRotation: 45 },
            time: {
              displayFormats: {
                millisecond: 'HH:mm:ss',
                second: 'HH:mm:ss',
                minute: 'HH:mm',
                hour: 'HH:mm',
                day: 'MMM d',
                week: 'MMM d',
                month: 'MMM yyyy',
                quarter: 'qqq yyyy',
                year: 'yyyy',
              },
              tooltipFormat: 'yyyy-MM-dd',
            },
          },
        },
        plugins: { legend: { display: false } },
      },
    });

    const annualCtx = document.getElementById('annualChart').getContext('2d');
    const annualDatasets = seriesData.map((s, i) => ({
      label: s.name,
      data: years.map(y => annualBySeries[s.name][y] ?? null),
      backgroundColor: chartColors[i],
    }));
    new Chart(annualCtx, {
      type: 'bar',
      data: { labels: years, datasets: annualDatasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: { grid: { color: '#EEEEEE' }, ticks: { callback: v => (v * 100).toFixed(1) + '%' } },
          x: { grid: { color: '#EEEEEE' }, ticks: { maxRotation: 45 } },
        },
        plugins: { legend: { display: false } },
      },
    });

    const legendEl = document.getElementById('legend');
    chartColors.forEach((c, i) => {
      const d = document.createElement('div');
      d.className = 'legend-item';
      d.innerHTML = '<span class="legend-color" style="background:' + c + '"></span><span>' + seriesData[i].name + '</span>';
      legendEl.appendChild(d);
    });

    document.getElementById('statsTable').innerHTML = statsTableHtml;
  </script>
</body>
</html>`;
}

// src/plot.ts
var import_node_fs = require("fs");
var import_node_os = require("os");
var import_node_path = require("path");
var import_open = __toESM(require("open"), 1);
var DEFAULT_LOGO_URL2 = "https://sales.captor.se/captor_logo_sv_1600_icketransparent.png";
var DEFAULT_TITLE = "Series Plot";
function defaultOutputDir() {
  const documents = (0, import_node_path.join)((0, import_node_os.homedir)(), "Documents");
  return (0, import_node_fs.existsSync)(documents) ? documents : (0, import_node_os.homedir)();
}
function seriesToPlotData(series) {
  if (series instanceof OpenTimeSeries) {
    return [
      {
        name: series.label,
        dates: series.dates,
        values: series.values
      }
    ];
  }
  const frame = series;
  const { dates, columns } = frame.tsdf;
  const colsFfilled = columns.map((col) => ffill(col));
  return frame.columnLabels.map((name, i) => ({
    name,
    dates,
    values: colsFfilled[i] ?? []
  }));
}
function toCumulativeReturns(data) {
  return data.map((s) => {
    const vals = ffill(s.values);
    const rets = pctChange(vals);
    rets[0] = 0;
    const cum = [1];
    for (let i = 1; i < rets.length; i++) {
      cum.push((cum[i - 1] ?? 0) * (1 + rets[i]));
    }
    return { name: s.name, dates: s.dates, values: cum };
  });
}
var COLORWAY = [
  "#66725B",
  "#D0C0B1",
  "#253551",
  "#8D929D",
  "#611A51",
  "#402D16",
  "#5D6C85",
  "#404752"
];
function plotSeriesHtml(seriesOrFrame, options = {}) {
  const title = options.title ?? DEFAULT_TITLE;
  const logoUrl = options.addLogo !== false ? options.logoUrl ?? DEFAULT_LOGO_URL2 : "";
  const rawData = seriesToPlotData(seriesOrFrame);
  const asDrawdown = options.asDrawdown ?? false;
  const cumData = asDrawdown ? rawData.map((s) => ({
    name: s.name,
    dates: s.dates,
    values: s.values.map((v) => Number.isNaN(v) ? v : v * 100)
  })) : toCumulativeReturns(rawData);
  const chartColors = cumData.map((_, i) => COLORWAY[i % COLORWAY.length]);
  const logoEl = logoUrl ? `<div class="plot-header-logo"><img src="${logoUrl}" alt="Logo" /></div>` : "<div></div>";
  const titleEl = title !== "" ? `<h1 class="plot-title">${title}</h1>` : "<div></div>";
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${title}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap" rel="stylesheet">
  <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/chartjs-adapter-date-fns@3.0.0/dist/chartjs-adapter-date-fns.bundle.min.js"></script>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html, body { height: 100%; overflow: hidden; }
    body {
      font-family: 'Poppins', -apple-system, BlinkMacSystemFont, sans-serif;
      background: #fff;
      color: #253551;
      display: flex;
      flex-direction: column;
      min-height: 0;
    }
    .plot-header {
      flex-shrink: 0;
      display: grid;
      grid-template-columns: 1fr auto 1fr;
      align-items: center;
      gap: 16px;
      padding: 16px 24px;
      min-height: 80px;
    }
    .plot-header-logo { display: flex; align-items: center; }
    .plot-header-logo img { height: 60px; width: auto; max-width: 270px; object-fit: contain; }
    .plot-title { grid-column: 2; text-align: center; font-size: 1.5rem; font-weight: 600; margin: 0; line-height: 1.2; }
    @media (max-width: 768px) {
      .plot-header { grid-template-columns: 1fr; grid-template-rows: auto auto; gap: 12px; text-align: center; }
      .plot-header-logo { justify-content: center; grid-column: 1; }
      .plot-header-logo img { height: 54px; max-width: 210px; }
      .plot-title { grid-column: 1; grid-row: 2; font-size: 1.25rem; }
    }
    .plot-main {
      flex: 1;
      min-height: 0;
      display: flex;
      flex-direction: column;
      padding: 24px;
    }
    .plot-wrapper {
      flex: 1;
      min-height: 200px;
      position: relative;
    }
    .plot-wrapper canvas { max-width: 100%; }
    .plot-legend {
      flex-shrink: 0;
      display: flex;
      gap: 24px;
      flex-wrap: wrap;
      justify-content: center;
      padding-top: 16px;
      font-size: 0.8125rem;
      color: #253551;
    }
    .plot-legend-item {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .plot-legend-color {
      width: 20px;
      height: 3px;
      border-radius: 2px;
      flex-shrink: 0;
    }
  </style>
</head>
<body>
  <header class="plot-header">
    ${logoEl}
    ${titleEl}
  </header>
  <div class="plot-main">
    <div class="plot-wrapper"><canvas id="plotChart"></canvas></div>
    <div class="plot-legend" id="legend"></div>
  </div>

  <script>
    const cumData = ${JSON.stringify(cumData)};
    const chartColors = ${JSON.stringify(chartColors)};
    const asDrawdown = ${JSON.stringify(asDrawdown)};

    Chart.defaults.font.family = "'Poppins', sans-serif";
    const ctx = document.getElementById('plotChart').getContext('2d');
    new Chart(ctx, {
      type: 'line',
      data: {
        datasets: cumData.map((s, i) => ({
          label: s.name,
          data: s.dates.map((d, j) => ({ x: d, y: s.values[j] })),
          borderColor: chartColors[i],
          backgroundColor: 'transparent',
          borderWidth: 2,
          tension: 0.1,
          pointRadius: 0,
        })),
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            beginAtZero: false,
            grid: { color: '#EEEEEE' },
            ticks: { callback: v => asDrawdown ? (v + '%') : ((v * 100).toFixed(1) + '%') },
          },
          x: {
            type: 'time',
            grid: { color: '#EEEEEE' },
            ticks: { maxRotation: 45 },
            time: {
              displayFormats: {
                millisecond: 'HH:mm:ss',
                second: 'HH:mm:ss',
                minute: 'HH:mm',
                hour: 'HH:mm',
                day: 'MMM d',
                week: 'MMM d',
                month: 'MMM yyyy',
                quarter: 'qqq yyyy',
                year: 'yyyy',
              },
              tooltipFormat: 'yyyy-MM-dd',
            },
          },
        },
        plugins: { legend: { display: false } },
      },
    });

    const legendEl = document.getElementById('legend');
    chartColors.forEach((c, i) => {
      const d = document.createElement('div');
      d.className = 'plot-legend-item';
      d.innerHTML = '<span class="plot-legend-color" style="background:' + c + '"></span><span>' + cumData[i].name + '</span>';
      legendEl.appendChild(d);
    });
  </script>
</body>
</html>`;
}
async function plotSeries(seriesOrFrame, options = {}) {
  const { filename, autoOpen = true } = options;
  const html = plotSeriesHtml(seriesOrFrame, options);
  const defaultDir = defaultOutputDir();
  const plotPath = filename !== void 0 ? filename.includes("/") || filename.includes("\\") ? filename : (0, import_node_path.join)(defaultDir, filename) : (0, import_node_path.join)(defaultDir, "plot.html");
  (0, import_node_fs.writeFileSync)(plotPath, html, "utf-8");
  if (autoOpen) {
    await (0, import_open.default)(plotPath, { wait: false });
  }
  return plotPath;
}

// src/sharpeplot.ts
var import_node_fs2 = require("fs");
var import_node_os2 = require("os");
var import_node_path2 = require("path");
var import_open2 = __toESM(require("open"), 1);
var DEFAULT_LOGO_URL3 = "https://sales.captor.se/captor_logo_sv_1600_icketransparent.png";
function defaultOutputDir2() {
  const documents = (0, import_node_path2.join)((0, import_node_os2.homedir)(), "Documents");
  return (0, import_node_fs2.existsSync)(documents) ? documents : (0, import_node_os2.homedir)();
}
function sharpeToColor(sharpe, minS, maxS) {
  if (!Number.isFinite(sharpe) || maxS <= minS) return "#8D929D";
  const t = (sharpe - minS) / (maxS - minS);
  const r = Math.round(101 + 154 * (1 - t));
  const g = Math.round(26 + 129 * (1 - t));
  const b = Math.round(81 + 174 * t);
  return `rgb(${r},${g},${b})`;
}
function sharpeplotHtml(simulated, frontier, pointFrame, options = {}) {
  const title = options.title ?? "";
  const logoUrl = options.addLogo !== false ? options.logoUrl ?? DEFAULT_LOGO_URL3 : "";
  const sharpes = simulated.map((s) => s.sharpe).filter(Number.isFinite);
  const minS = sharpes.length > 0 ? Math.min(...sharpes) : 0;
  const maxS = sharpes.length > 0 ? Math.max(...sharpes) : 1;
  const simData = simulated.map((s) => ({
    x: s.stdev * 100,
    y: s.ret * 100,
    c: sharpeToColor(s.sharpe, minS, maxS)
  }));
  const assetLabels = options.assetLabels ?? [];
  const frontierData = frontier.map((p) => ({
    x: p.stdev * 100,
    y: p.ret * 100,
    weights: p.weights
  }));
  const pointColors = [
    "#2E7D32",
    "#8D929D",
    "#253551",
    "#D0C0B1",
    "#611A51",
    "#402D16"
  ];
  const pointData = pointFrame.map((p, i) => ({
    x: p.stdev * 100,
    y: p.ret * 100,
    label: p.label,
    weights: p.weights,
    color: pointColors[i % pointColors.length]
  }));
  const logoEl = logoUrl ? `<div class="plot-header-logo"><img src="${logoUrl}" alt="Logo" /></div>` : "<div></div>";
  const titleEl = title !== "" ? `<h1 class="plot-title">${title}</h1>` : "<div></div>";
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Efficient Frontier</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap" rel="stylesheet">
  <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js"></script>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html, body { height: 100%; overflow: hidden; }
    body {
      font-family: 'Poppins', -apple-system, BlinkMacSystemFont, sans-serif;
      background: #fff;
      color: #253551;
      display: flex;
      flex-direction: column;
      min-height: 0;
    }
    .plot-header {
      flex-shrink: 0;
      display: grid;
      grid-template-columns: 1fr auto 1fr;
      align-items: center;
      gap: 16px;
      padding: 16px 24px;
      min-height: 80px;
    }
    .plot-header-logo { display: flex; align-items: center; }
    .plot-header-logo img { height: 60px; width: auto; max-width: 270px; object-fit: contain; }
    .plot-title { grid-column: 2; text-align: center; font-size: 3rem; font-weight: 600; margin: 0; }
    .plot-main { flex: 1; min-height: 0; padding: 24px; display: flex; flex-direction: column; }
    .plot-wrapper { flex: 1; min-height: 200px; position: relative; }
    .plot-wrapper canvas { max-width: 100%; }
    .plot-legend { flex-shrink: 0; display: flex; gap: 24px; flex-wrap: wrap; justify-content: center; padding-top: 16px; font-size: 0.8125rem; }
    .colorbar { display: flex; align-items: center; gap: 8px; margin-top: 12px; }
    .colorbar-label { font-size: 0.75rem; color: #666; }
  </style>
</head>
<body>
  <header class="plot-header">
    ${logoEl}
    ${titleEl}
  </header>
  <div class="plot-main">
    <div class="plot-wrapper">
      <canvas id="sharpeChart"></canvas>
    </div>
    <div class="colorbar">
      <span class="colorbar-label">Ratio ret / vol &larr;</span>
      <div style="width:120px;height:12px;background:linear-gradient(to right,rgb(255,53,81),rgb(101,114,91));border-radius:2px;"></div>
      <span class="colorbar-label">&rarr;</span>
    </div>
  </div>

  <script>
    const simData = ${JSON.stringify(simData)};
    const frontierData = ${JSON.stringify(frontierData)};
    const pointData = ${JSON.stringify(pointData)};
    const assetLabels = ${JSON.stringify(assetLabels)};

    Chart.defaults.font.family = "'Poppins', sans-serif";
    const ctx = document.getElementById('sharpeChart').getContext('2d');

    const simDs = {
      type: 'scatter',
      label: 'Simulated',
      data: simData.map(p => ({ x: p.x, y: p.y })),
      backgroundColor: simData.map(p => p.c),
      borderColor: simData.map(p => p.c),
      pointRadius: 4,
      pointHoverRadius: 6,
      order: 2,
    };

    const frontierDs = {
      type: 'line',
      label: 'Efficient Frontier',
      data: frontierData,
      borderColor: '#8B7355',
      borderWidth: 2,
      fill: false,
      pointRadius: 0,
      tension: 0.1,
      order: 1,
    };

    const pointDs = pointData.map((p, i) => ({
      type: 'scatter',
      label: p.label,
      data: [{ x: p.x, y: p.y }],
      backgroundColor: p.color,
      borderColor: '#333',
      borderWidth: 1,
      pointRadius: 10,
      pointHoverRadius: 12,
      order: 0,
    }));

    new Chart(ctx, {
      type: 'scatter',
      data: {
        datasets: [simDs, frontierDs, ...pointDs],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: {
            title: { display: true, text: 'annual volatility' },
            min: 0,
            grid: { color: '#EEEEEE' },
            ticks: { callback: v => v + '%' },
          },
          y: {
            title: { display: true, text: 'annual return' },
            grid: { color: '#EEEEEE' },
            ticks: { callback: v => v + '%' },
          },
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            filter: (ctx) => ctx.dataset.label !== 'Simulated',
            callbacks: {
              label: (ctx) => {
                const ds = ctx.dataset;
                const lines = [];
                if (ds.label === 'Efficient Frontier') {
                  lines.push('Efficient Frontier', ctx.raw.x.toFixed(2) + '% vol, ' + ctx.raw.y.toFixed(2) + '% ret');
                  const fp = frontierData[ctx.dataIndex];
                  if (fp?.weights?.length) {
                    const labels = assetLabels.length ? assetLabels : fp.weights.map((_, i) => 'Asset ' + i);
                    labels.forEach((name, i) => {
                      lines.push(name + ': ' + ((fp.weights[i] ?? 0) * 100).toFixed(1) + '%');
                    });
                  }
                } else {
                  const pd = pointData.find(p => p.label === ds.label);
                  if (pd) lines.push(pd.label);
                  lines.push(ctx.raw.x.toFixed(2) + '% vol, ' + ctx.raw.y.toFixed(2) + '% ret');
                  if (pd?.weights?.length) {
                    pd.weights.forEach(({ asset, weight }) => {
                      lines.push(asset + ': ' + (weight * 100).toFixed(1) + '%');
                    });
                  }
                }
                return lines;
              },
            },
          },
        },
      },
      plugins: [{
        id: 'pointLabels',
        afterDatasetsDraw(chart) {
          const ctx = chart.ctx;
          const dsOffset = 2;
          pointData.forEach((p, i) => {
            const idx = dsOffset + i;
            if (idx >= chart.data.datasets.length) return;
            const meta = chart.getDatasetMeta(idx);
            if (!meta.data || !meta.data[0]) return;
            const { x, y } = meta.data[0];
            ctx.save();
            ctx.font = '12px Poppins';
            ctx.fillStyle = '#253551';
            ctx.textAlign = 'center';
            ctx.fillText(p.label, x, y - 14);
            ctx.restore();
          });
        },
      }],
    });
  </script>
</body>
</html>`;
}
async function sharpeplot(simulated, frontier, pointFrame, options = {}) {
  const { filename, autoOpen = true } = options;
  const html = sharpeplotHtml(simulated, frontier, pointFrame, options);
  const defaultDir = defaultOutputDir2();
  const plotPath = filename !== void 0 ? filename.includes("/") || filename.includes("\\") ? filename : (0, import_node_path2.join)(defaultDir, filename) : (0, import_node_path2.join)(defaultDir, "efficient-frontier.html");
  (0, import_node_fs2.writeFileSync)(plotPath, html, "utf-8");
  if (autoOpen) {
    await (0, import_open2.default)(plotPath, { wait: false });
  }
  return plotPath;
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
  ResampleDataLossError,
  ReturnSimulation,
  ValueType,
  dateFix,
  dateToStr,
  efficientFrontier,
  fetchCaptorSeries,
  fetchCaptorSeriesBatch,
  filterBusinessDays,
  filterToBusinessDays,
  generateCalendarDateRange,
  getPreviousBusinessDayBeforeToday,
  isBusinessDay,
  lastBusinessDayOfMonth,
  lastBusinessDayOfYear,
  mean,
  offsetBusinessDays,
  pctChange,
  plotSeries,
  plotSeriesHtml,
  preparePlotData,
  prevBusinessDay,
  quantile,
  randomGenerator,
  reportHtml,
  resampleToPeriodEnd,
  sharpeplot,
  sharpeplotHtml,
  simulatePortfolios,
  std,
  timeseriesChain
});
