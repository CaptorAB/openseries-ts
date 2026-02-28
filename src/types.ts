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

export type DateString = string;
export type DateList = DateString[];
export type ValueList = number[];

export interface TsdfRow {
  date: DateString;
  value: number;
}

export type LiteralBizDayFreq = "B" | "BME" | "BQE" | "BYE";
export type LiteralPortfolioWeightings =
  | "eq_weights"
  | "inv_vol"
  | "max_div"
  | "min_vol_overweight";

export class DateAlignmentError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DateAlignmentError";
  }
}

export class InitialValueZeroError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InitialValueZeroError";
  }
}

export class MixedValuetypesError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MixedValuetypesError";
  }
}

export class NoWeightsError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NoWeightsError";
  }
}

export class IncorrectArgumentComboError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "IncorrectArgumentComboError";
  }
}

export class LabelsNotUniqueError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LabelsNotUniqueError";
  }
}

export class ResampleDataLossError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ResampleDataLossError";
  }
}
