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
declare class ResampleDataLossError extends Error {
    constructor(message: string);
}

/**
 * Business calendar utilities with holiday awareness via date-holidays.
 *
 * Supports filtering dates to business days (excluding weekends and holidays),
 * finding last business day of period, and period-end resampling.
 */
type CountryCode = string;
/**
 * Returns the most recent business day strictly before today.
 * Uses the given country code(s) for holiday calendar (e.g. "SE" for XSTO/Stockholm).
 */
declare function getPreviousBusinessDayBeforeToday(countries: CountryCode | CountryCode[]): string;
/**
 * Filters an array of date strings to keep only business days.
 * Business day = not weekend (Sat/Sun) and not a holiday in any of the specified countries.
 *
 * @param dates - Array of date strings (YYYY-MM-DD)
 * @param countries - Country code(s) for holiday calendar, e.g. "SE", "US", ["SE", "NO"]
 * @returns Array of business-day date strings (subsequence of input, preserving order)
 */
declare function filterBusinessDays(dates: string[], countries: CountryCode | CountryCode[]): string[];
/**
 * Checks whether a date is a business day.
 */
declare function isBusinessDay(dateStr: string, countries: CountryCode | CountryCode[]): boolean;
/**
 * Finds the last business day on or before the given date.
 */
declare function prevBusinessDay(dateStr: string, countries: CountryCode | CountryCode[]): string;
/**
 * Last business day of the given month (1-indexed).
 */
declare function lastBusinessDayOfMonth(year: number, month: number, countries: CountryCode | CountryCode[]): string;
/**
 * Last business day of the given year.
 */
declare function lastBusinessDayOfYear(year: number, countries: CountryCode | CountryCode[]): string;
type ResampleFreq = "WE" | "ME" | "QE" | "YE";
/**
 * Resamples dates and columns to end-of-business period frequency.
 * Each period takes the last observation that falls on a business day within that period.
 *
 * @param dates - Sorted array of date strings
 * @param columns - Value columns (same length as dates)
 * @param freq - WE (week-end), ME (month-end), QE (quarter-end), YE (year-end)
 * @param countries - Country code(s) for holiday filtering
 */
declare function resampleToPeriodEnd(dates: string[], columns: number[][], freq: ResampleFreq, countries: CountryCode | CountryCode[]): {
    dates: string[];
    columns: number[][];
};
/**
 * Filters (dates, columns) to retain only rows where the date is a business day.
 * Preserves alignment across all columns.
 */
declare function filterToBusinessDays(dates: string[], columns: number[][], countries: CountryCode | CountryCode[]): {
    dates: string[];
    columns: number[][];
};

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
    });
    /** Creates an OpenTimeSeries from a name, dates array, and values array. */
    static fromArrays(name: string, dates: string[], values: number[], options?: {
        valuetype?: ValueType;
        timeseriesId?: string;
        instrumentId?: string;
        baseccy?: string;
        localCcy?: boolean;
        countries?: CountryCode | CountryCode[];
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
        countries?: CountryCode | CountryCode[];
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
    /**
     * Returns the date when the max drawdown bottom occurs (the date of the lowest point
     * relative to the preceding peak). Returns undefined if no drawdown occurs.
     */
    maxDrawdownBottomDate(opts?: DateRangeOptions): string | undefined;
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
    /** Filters tsdf to retain only business days. Mutates in place. */
    filterToBusinessDays(): this;
    /**
     * Resamples to business period-end frequency (week, month, quarter, year).
     * Mutates tsdf. Throws on return series (use price series).
     */
    resampleToPeriodEnd(freq?: ResampleFreq): this;
    /**
     * Worst single calendar month return (business-month-end based).
     * Uses filterToBusinessDays + resampleToPeriodEnd(ME) + min of monthly returns.
     */
    worstMonth(opts?: DateRangeOptions): number;
    toDrawdownSeries(): this;
}
/**
 * Chains two timeseries at their overlap. Scales back by front's level at the overlap date.
 */
declare function timeseriesChain(front: OpenTimeSeries, back: OpenTimeSeries, oldFee?: number): OpenTimeSeries;

/** Result of Ordinary Least Squares regression (ord_least_squares_fit). */
interface OrdLeastSquaresResult {
    coefficient: number;
    intercept: number;
    rsquared: number;
}
/** Collection of aligned timeseries with portfolio and correlation methods. */
declare class OpenFrame {
    constituents: OpenTimeSeries[];
    weights: number[] | null;
    tsdf: {
        dates: string[];
        columns: number[][];
    };
    columnLabels: string[];
    /** Country code(s) for business calendar (holidays, resampling). Used when adapting data to business days. */
    countries: CountryCode[];
    constructor(constituents: OpenTimeSeries[], weights?: number[] | null, options?: {
        countries?: CountryCode | CountryCode[];
    });
    get itemCount(): number;
    get length(): number;
    get firstIdx(): string;
    get lastIdx(): string;
    get periodInAYear(): number;
    mergeSeries(how?: "inner" | "outer"): this;
    /** Returns return columns (first element 0). Throws if mixed PRICE/RTRN. */
    returnColumns(): number[][];
    private ensureReturns;
    correlMatrix(): number[][];
    makePortfolio(name: string, weightStrat?: LiteralPortfolioWeightings): {
        dates: string[];
        values: number[];
    };
    private calcWeights;
    private invertMatrix;
    /**
     * Max drawdown per column (price series). Returns array of max drawdowns.
     */
    maxDrawdown(): number[];
    /**
     * Date when max drawdown bottom occurs per column.
     * Returns array of date strings (or undefined when no drawdown).
     */
    maxDrawdownBottomDate(): (string | undefined)[];
    trackingError(baseColumn?: number, _opts?: {
        fromDate?: string;
        toDate?: string;
    }): number[];
    infoRatio(baseColumn?: number): number[];
    beta(assetColumn: number, marketColumn: number): number;
    jensenAlpha(assetColumn: number, marketColumn: number, riskfreeRate?: number): number;
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
    ordLeastSquaresFit(yColumn: number, xColumn: number, opts?: {
        fittedSeries?: boolean;
    }): OrdLeastSquaresResult;
    addTimeseries(series: OpenTimeSeries): this;
    /** Filters tsdf to retain only business days. Mutates in place. */
    filterToBusinessDays(): this;
    /**
     * Resamples all constituents to business period-end frequency, then re-merges.
     * Throws if any constituent is a return series.
     */
    resampleToPeriodEnd(freq?: ResampleFreq): this;
    /**
     * Truncates frame and constituents to a common date range.
     * @param opts - Truncation options
     * @param opts.startCut - New first date (default: latest first date of all constituents if where includes 'before')
     * @param opts.endCut - New last date (default: earliest last date if where includes 'after')
     * @param opts.where - Which end(s) to truncate when cuts not provided
     */
    truncFrame(opts?: {
        startCut?: string;
        endCut?: string;
        where?: "before" | "after" | "both";
    }): this;
    /**
     * CAGR-based capture ratio vs benchmark column.
     * @param ratio - "up" | "down" | "both" (up/down or both = up/down)
     * @param baseColumn - Benchmark column index (-1 = last)
     * @param opts.freq - Resample frequency for capture (default "ME")
     */
    captureRatio(ratio: "up" | "down" | "both", baseColumn?: number, opts?: {
        freq?: ResampleFreq;
    }): number[];
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
/** Point on the efficient-frontier plot (stdev and ret in decimal form). */
interface SharpePlotPoint {
    stdev: number;
    ret: number;
    label: string;
    /** Optional asset weights for tooltip (e.g. Current Portfolio, Max Sharpe). */
    weights?: {
        asset: string;
        weight: number;
    }[];
}
/**
 * Prepares labeled points for the efficient-frontier chart: individual assets,
 * current (e.g. eq-weight) portfolio, and the max-Sharpe optimum.
 */
declare function preparePlotData(assets: OpenFrame, currentPortfolio: {
    dates: string[];
    values: number[];
}, optimum: EfficientFrontierPoint): SharpePlotPoint[];

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

/**
 * HTML report generation for OpenFrame.
 * Mirror of Python openseries report_html: takes an OpenFrame and produces HTML.
 * Fetch logic is kept outside - callers provide the frame (e.g. from Captor API).
 */

interface ReportOptions {
    title?: string;
    logoUrl?: string;
    addLogo?: boolean;
}
/**
 * Generate HTML report from an OpenFrame.
 * Analogous to Python openseries report_html(data: OpenFrame, ...).
 * The frame should have mergeSeries("inner") already applied.
 *
 * @param frame - OpenFrame with aligned series (mergeSeries("inner"))
 * @param options - Report options (title, logo). Countries come from frame.countries.
 * @returns HTML string
 */
declare function reportHtml(frame: OpenFrame, options?: ReportOptions): string;

/**
 * Full-page series plot (line chart) output.
 * Analogous to Python openseries plot_series: single full-page HTML with optional title.
 */

interface PlotSeriesOptions {
    /** Optional title above the chart. */
    title?: string;
    /** Logo URL (e.g. company logo). Shown in upper left when addLogo is true. */
    logoUrl?: string;
    /** If true, show logo in upper left. Default: true. */
    addLogo?: boolean;
    /** Output file path. Default: ~/Documents/plot.html (or ~/ if Documents missing). */
    filename?: string;
    /** If true, open the HTML file in the default browser. Default: true. */
    autoOpen?: boolean;
}
/**
 * Generate full-page HTML with a line chart of the series (or multiple series).
 * Plots cumulative returns (100 base) like Python plot_series.
 * Works with OpenTimeSeries or OpenFrame. For OpenFrame, use mergeSeries("inner") first.
 *
 * @param seriesOrFrame - OpenTimeSeries or OpenFrame
 * @param options - Optional title
 * @returns HTML string
 */
declare function plotSeriesHtml(seriesOrFrame: OpenTimeSeries | OpenFrame, options?: PlotSeriesOptions): string;
/**
 * Generate full-page series plot HTML, write to file, and optionally open in browser.
 * Analogous to Python plot_series with auto_open.
 *
 * @param seriesOrFrame - OpenTimeSeries or OpenFrame (use mergeSeries("inner") for frame)
 * @param options - Title, filename, autoOpen
 * @returns Path to the written HTML file
 */
declare function plotSeries(seriesOrFrame: OpenTimeSeries | OpenFrame, options?: PlotSeriesOptions): Promise<string>;

/**
 * Efficient frontier scatter plot with simulated portfolios, frontier line,
 * and labeled points (assets, current portfolio, max Sharpe).
 * Analogous to Python openseries sharpeplot.
 */

interface SharpePlotOptions {
    title?: string;
    logoUrl?: string;
    addLogo?: boolean;
    filename?: string;
    autoOpen?: boolean;
    /** Asset labels for frontier/portfolio weight tooltips (e.g. from frame.columnLabels). */
    assetLabels?: string[];
}
/**
 * Generates full-page HTML with efficient frontier scatter plot.
 * Simulated portfolios colored by Sharpe ratio, frontier as line, labeled points.
 */
declare function sharpeplotHtml(simulated: SimulatedPortfolio[], frontier: EfficientFrontierPoint[], pointFrame: SharpePlotPoint[], options?: SharpePlotOptions): string;
/**
 * Writes efficient-frontier HTML to file and optionally opens in browser.
 */
declare function sharpeplot(simulated: SimulatedPortfolio[], frontier: EfficientFrontierPoint[], pointFrame: SharpePlotPoint[], options?: SharpePlotOptions): Promise<string>;

export { type CaptorSeriesResponse, type CountryCode, DateAlignmentError, type DateRangeOptions, type EfficientFrontierPoint, IncorrectArgumentComboError, InitialValueZeroError, type LiteralBizDayFreq, type LiteralPortfolioWeightings, MixedValuetypesError, NoWeightsError, OpenFrame, OpenTimeSeries, type OrdLeastSquaresResult, type PlotSeriesOptions, type RandomGenerator, type ReportOptions, ResampleDataLossError, type ResampleFreq, ReturnSimulation, type SharpePlotOptions, type SharpePlotPoint, type SimulatedPortfolio, ValueType, dateFix, dateToStr, efficientFrontier, fetchCaptorSeries, fetchCaptorSeriesBatch, filterBusinessDays, filterToBusinessDays, generateCalendarDateRange, getPreviousBusinessDayBeforeToday, isBusinessDay, lastBusinessDayOfMonth, lastBusinessDayOfYear, mean, offsetBusinessDays, pctChange, plotSeries, plotSeriesHtml, preparePlotData, prevBusinessDay, quantile, randomGenerator, reportHtml, resampleToPeriodEnd, sharpeplot, sharpeplotHtml, simulatePortfolios, std, timeseriesChain };
