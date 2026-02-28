declare enum ValueType {
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
    ROLLVOL = "Rolling volatility"
}
type LiteralBizDayFreq = "B" | "BME" | "BQE" | "BYE";
type LiteralPortfolioWeightings = "eq_weights" | "inv_vol" | "max_div" | "min_vol_overweight";
declare class DateAlignmentError extends Error {
    constructor(message: string);
}
declare class InitialValueZeroError extends Error {
    constructor(message: string);
}
declare class MixedValuetypesError extends Error {
    constructor(message: string);
}
declare class NoWeightsError extends Error {
    constructor(message: string);
}
declare class IncorrectArgumentComboError extends Error {
    constructor(message: string);
}

/**
 * Options to slice a series by date range.
 */
type DateRangeOptions = {
    monthsFromLast?: number;
    fromDate?: string;
    toDate?: string;
    periodsInYearFixed?: number;
};
/** Timeseries of dates and values with methods for risk metrics. */
declare class OpenTimeSeries {
    readonly timeseriesId: string;
    readonly instrumentId: string;
    readonly name: string;
    label: string;
    valuetype: ValueType;
    readonly dates: string[];
    readonly values: number[];
    tsdf: {
        date: string;
        value: number;
    }[];
    currency: string;
    localCcy: boolean;
    countries: string;
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
        countries?: string;
        markets?: string | string[] | null;
    });
    /** Creates an OpenTimeSeries from a name, dates array, and values array. */
    static fromArrays(name: string, dates: string[], values: number[], options?: {
        valuetype?: ValueType;
        timeseriesId?: string;
        instrumentId?: string;
        baseccy?: string;
        localCcy?: boolean;
    }): OpenTimeSeries;
    /** Creates an OpenTimeSeries from a record or array of {date, value}. */
    static fromObject(data: Record<string, number> | {
        date: string;
        value: number;
    }[]): OpenTimeSeries;
    /** Creates an OpenTimeSeries from simulation dateColumns by column index. */
    static fromDateColumns(dateColumns: {
        dates: string[];
        columns: {
            name: string;
            values: number[];
        }[];
    }, options?: {
        columnIndex?: number;
        valuetype?: ValueType;
    }): OpenTimeSeries;
    fromDeepcopy(): OpenTimeSeries;
    getTsdfValues(): number[];
    getTsdfDates(): string[];
    private sliceByRange;
    private calcTimeFactor;
    get length(): number;
    get firstIdx(): string;
    get lastIdx(): string;
    get spanOfDays(): number;
    get yearfrac(): number;
    get periodsInAYear(): number;
    valueToRet(): this;
    toCumret(): this;
    geoRet(opts?: DateRangeOptions): number;
    arithmeticRet(opts?: DateRangeOptions): number;
    valueRet(opts?: DateRangeOptions): number;
    vol(opts?: DateRangeOptions): number;
    maxDrawdown(opts?: DateRangeOptions): number;
    varDown(level?: number, opts?: DateRangeOptions): number;
    cvarDown(level?: number, opts?: DateRangeOptions): number;
    downsideDeviation(opts?: DateRangeOptions, mar?: number): number;
    retVolRatio(riskfreeRate?: number, opts?: DateRangeOptions): number;
    sortinoRatio(riskfreeRate?: number, minAcceptedReturn?: number, opts?: DateRangeOptions): number;
    positiveShare(opts?: DateRangeOptions): number;
    worst(observations?: number, opts?: DateRangeOptions): number;
    skew(opts?: DateRangeOptions): number;
    kurtosis(opts?: DateRangeOptions): number;
    zScore(opts?: DateRangeOptions): number;
    volFromVar(level?: number, opts?: DateRangeOptions): number;
    ewmaVolFunc(lmbda?: number, dayChunk?: number, opts?: DateRangeOptions): number[];
    ewmaVarFunc(lmbda?: number, dayChunk?: number, level?: number, opts?: DateRangeOptions): number[];
    setNewLabel(lvlZero?: string, lvlOne?: ValueType): this;
    toDrawdownSeries(): this;
}
/**
 * Chains two timeseries at their overlap. Scales back by front's level at the overlap date.
 */
declare function timeseriesChain(front: OpenTimeSeries, back: OpenTimeSeries, oldFee?: number): OpenTimeSeries;

/** Collection of aligned timeseries with portfolio and correlation methods. */
declare class OpenFrame {
    constituents: OpenTimeSeries[];
    weights: number[] | null;
    tsdf: {
        dates: string[];
        columns: number[][];
    };
    columnLabels: string[];
    constructor(constituents: OpenTimeSeries[], weights?: number[] | null);
    get itemCount(): number;
    get length(): number;
    get firstIdx(): string;
    get lastIdx(): string;
    get periodInAYear(): number;
    mergeSeries(how?: "inner" | "outer"): this;
    private ensureReturns;
    correlMatrix(): number[][];
    makePortfolio(name: string, weightStrat?: LiteralPortfolioWeightings): {
        dates: string[];
        values: number[];
    };
    private calcWeights;
    private invertMatrix;
    trackingError(baseColumn?: number, _opts?: {
        fromDate?: string;
        toDate?: string;
    }): number[];
    infoRatio(baseColumn?: number): number[];
    beta(assetColumn: number, marketColumn: number): number;
    jensenAlpha(assetColumn: number, marketColumn: number, riskfreeRate?: number): number;
    addTimeseries(series: OpenTimeSeries): this;
}

type RandomGenerator = () => number;
/** Monte Carlo return simulation with optional seed for reproducibility. */
declare class ReturnSimulation {
    readonly numberOfSims: number;
    readonly tradingDays: number;
    readonly tradingDaysInYear: number;
    readonly meanAnnualReturn: number;
    readonly meanAnnualVol: number;
    readonly dframe: number[][];
    readonly seed?: number;
    readonly jumpsLamda: number;
    readonly jumpsSigma: number;
    readonly jumpsMu: number;
    constructor(params: {
        number_of_sims: number;
        trading_days: number;
        trading_days_in_year: number;
        mean_annual_return: number;
        mean_annual_vol: number;
        dframe: number[][];
        seed?: number;
        jumps_lamda?: number;
        jumps_sigma?: number;
        jumps_mu?: number;
    });
    get results(): number[][];
    get realizedMeanReturn(): number;
    get realizedVol(): number;
    static fromNormal(number_of_sims: number, mean_annual_return: number, mean_annual_vol: number, trading_days: number, trading_days_in_year?: number, seed?: number): ReturnSimulation;
    static fromGbm(number_of_sims: number, mean_annual_return: number, mean_annual_vol: number, trading_days: number, trading_days_in_year?: number, seed?: number): ReturnSimulation;
    static fromLognormal(number_of_sims: number, mean_annual_return: number, mean_annual_vol: number, trading_days: number, trading_days_in_year?: number, seed?: number): ReturnSimulation;
    static fromMertonJumpGbm(number_of_sims: number, trading_days: number, mean_annual_return: number, mean_annual_vol: number, jumps_lamda: number, jumps_sigma?: number, jumps_mu?: number, trading_days_in_year?: number, seed?: number): ReturnSimulation;
    toDateColumns(name: string, options?: {
        start?: string;
        end?: string;
        asReturns?: boolean;
    }): {
        dates: string[];
        columns: {
            name: string;
            values: number[];
        }[];
    };
}
/** Returns a seeded RNG function returning values in [0, 1). */
declare function randomGenerator(seed?: number): () => number;

/** Normalizes string or Date input to a Date. */
declare function dateFix(input: string | Date): Date;
/** Returns a Date as YYYY-MM-DD string. */
declare function dateToStr(d: Date): string;
/** Returns an array of business-day date strings (excludes weekends). */
declare function generateCalendarDateRange(tradingDays: number, options?: {
    start?: string;
    end?: string;
}): string[];
/** Offsets a date by a number of business days. */
declare function offsetBusinessDays(ddate: Date, days: number): Date;

interface SimulatedPortfolio {
    stdev: number;
    ret: number;
    sharpe: number;
    weights: number[];
}
/** Simulates random long-only portfolios from frame returns and covariance. */
declare function simulatePortfolios(frame: OpenFrame, numPorts: number, seed: number): SimulatedPortfolio[];
interface EfficientFrontierPoint {
    stdev: number;
    ret: number;
    sharpe: number;
    weights: number[];
}
/** Computes the mean-variance efficient frontier using analytic QP. */
declare function efficientFrontier(frame: OpenFrame, numPorts?: number, seed?: number, frontierPoints?: number): {
    frontier: EfficientFrontierPoint[];
    simulated: SimulatedPortfolio[];
    maxSharpe: EfficientFrontierPoint;
};

/**
 * Captor Open API client for fetching timeseries data.
 *
 * API: https://api.captor.se/public/api/opentimeseries/{id}
 */
type CaptorSeriesResponse = {
    id: string;
    title: string | null;
    dates: string[];
    values: number[];
    currency?: string;
    [key: string]: unknown;
};
/**
 * Fetches a single timeseries from the Captor Open API.
 *
 * @param id - The timeseries ID (e.g. "638f681e0c2f4c8d28a13392")
 * @returns The timeseries data with dates and values arrays
 */
declare function fetchCaptorSeries(id: string): Promise<CaptorSeriesResponse>;
/**
 * Fetches multiple timeseries from the Captor Open API.
 *
 * @param ids - Array of timeseries IDs
 * @returns Array of timeseries data
 */
declare function fetchCaptorSeriesBatch(ids: string[]): Promise<CaptorSeriesResponse[]>;

/** Returns the arithmetic mean of an array. */
declare function mean(arr: number[]): number;
/** Returns the sample standard deviation. */
declare function std(arr: number[], ddof?: number): number;
/** Returns the quantile at q (0-1) using linear interpolation. */
declare function quantile(arr: number[], q: number, sorted?: boolean): number;
/** Returns period-over-period percentage change. First element is 0. */
declare function pctChange(values: number[]): number[];

export { type CaptorSeriesResponse, DateAlignmentError, type DateRangeOptions, type EfficientFrontierPoint, IncorrectArgumentComboError, InitialValueZeroError, type LiteralBizDayFreq, type LiteralPortfolioWeightings, MixedValuetypesError, NoWeightsError, OpenFrame, OpenTimeSeries, type RandomGenerator, ReturnSimulation, type SimulatedPortfolio, ValueType, dateFix, dateToStr, efficientFrontier, fetchCaptorSeries, fetchCaptorSeriesBatch, generateCalendarDateRange, mean, offsetBusinessDays, pctChange, quantile, randomGenerator, simulatePortfolios, std, timeseriesChain };
