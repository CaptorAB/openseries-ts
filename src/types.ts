/** Identifies what kind of quantity a timeseries or column holds. */
export enum ValueType {
  EWMA_VOL = "EWMA volatility",
  EWMA_VAR = "EWMA VaR",
  PRICE = "Price(Close)",
  RTRN = "Return(Total)",
  RELRTRN = "Relative return",
  ROLLBETA = "Beta",
  ROLLCORR = "Rolling correlation",
  ROLLCVAR = "Rolling CVaR",
  ROLLINFORATIO = "Information Ratio",
  ROLLRTRN = "Rolling returns",
  ROLLVAR = "Rolling VaR",
  ROLLVOL = "Rolling volatility",
}

/** A calendar date formatted as `YYYY-MM-DD`. */
export type DateString = string;
/** An array of {@link DateString}, typically aligned index-for-index with a {@link ValueList}. */
export type DateList = DateString[];
/** An array of numeric observations, typically aligned index-for-index with a {@link DateList}. */
export type ValueList = number[];

/** A single date/value observation, as used when building a timeseries row by row. */
export interface TsdfRow {
  date: DateString;
  value: number;
}

/**
 * Business-day resampling frequency, matching pandas' offset aliases:
 * `"B"` business day, `"BME"` business month end, `"BQE"` business quarter
 * end, `"BYE"` business year end.
 */
export type LiteralBizDayFreq = "B" | "BME" | "BQE" | "BYE";
/** Strategy used by `OpenFrame.makePortfolio` to derive constituent weights. */
export type LiteralPortfolioWeightings =
  | "eq_weights"
  | "inv_vol"
  | "max_div"
  | "min_vol_overweight";

/** Thrown when a date range or lookup falls outside a series' date index. */
export class DateAlignmentError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DateAlignmentError";
  }
}

/** Thrown when a return-style calculation needs a non-zero starting value. */
export class InitialValueZeroError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InitialValueZeroError";
  }
}

/** Thrown when an operation requires constituents to share a single {@link ValueType}. */
export class MixedValuetypesError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MixedValuetypesError";
  }
}

/** Thrown when portfolio weights are required but none were provided or derivable. */
export class NoWeightsError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NoWeightsError";
  }
}

/** Thrown when the combination of arguments passed to a function is invalid. */
export class IncorrectArgumentComboError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "IncorrectArgumentComboError";
  }
}

/** Thrown when timeseries labels that are required to be unique collide. */
export class LabelsNotUniqueError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LabelsNotUniqueError";
  }
}

/** Thrown when resampling would silently discard information (e.g. resampling a return series). */
export class ResampleDataLossError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ResampleDataLossError";
  }
}

/** Thrown when a single argument's value is outside its valid range. */
export class InvalidArgumentError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidArgumentError";
  }
}

/** Thrown when a request to the Captor Open API fails. */
export class CaptorApiError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CaptorApiError";
  }
}
