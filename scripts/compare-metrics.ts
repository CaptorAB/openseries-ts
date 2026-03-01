#!/usr/bin/env node
/**
 * Compare TypeScript openseries-ts metrics vs Python metrics (from data.json).
 *
 * Two comparison groups:
 * 1. Single-asset metrics: Python OpenTimeSeries vs TS OpenTimeSeries for "Captor Iris Bond"
 * 2. Frame comparison metrics: Python OpenFrame vs TS OpenFrame (tracking_error, info_ratio,
 *    beta, jensen_alpha, capture_ratio_*, correlation, OLS coefficient) - all for Iris vs Benchmark
 *
 * Loads frame.json, builds OpenFrame. Single metrics from first constituent (Iris);
 * comparison metrics from the frame. Compares with data.json["Captor Iris Bond"].
 *
 * Run: npx tsx scripts/compare-metrics.ts [--decimals=N]
 *
 * Requires frame.json and data.json in ~/Documents (from the Python fetch snippet).
 */

import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

import { OpenFrame } from "../src/frame";
import { OpenTimeSeries } from "../src/series";

const DOCUMENTS = join(homedir(), "Documents");
const FRAME_PATH = join(DOCUMENTS, "frame.json");
const DATA_PATH = join(DOCUMENTS, "data.json");
const IRIS_LABEL = "Captor Iris Bond";

/** Map Python (data.json) metric names to TypeScript tsMetrics keys. */
const PY_TO_TS: Record<string, string> = {
  "Simple return": "value_ret",
  "Geometric return": "geo_ret",
  "Arithmetic return": "arithmetic_ret",
  "Volatility": "vol",
  "Downside deviation": "downside_deviation",
  "Return vol ratio": "ret_vol_ratio",
  "Sortino ratio": "sortino_ratio",
  "Z-score": "z_score",
  "Skew": "skew",
  "Kurtosis": "kurtosis",
  "Positive share": "positive_share",
  "VaR 95.0%": "var_down",
  "CVaR 95.0%": "cvar_down",
  "Imp vol from VaR 95%": "vol_from_var",
  "Worst": "worst",
  "Worst month": "worst_month",
  "Max drawdown": "max_drawdown",
  "Max drawdown date": "max_drawdown_date",
  "first indices": "first_idx",
  "last indices": "last_idx",
  "observations": "length",
  "span of days": "span_of_days",
  // Frame comparison metrics (same key in both)
  tracking_error: "tracking_error",
  info_ratio: "info_ratio",
  beta: "beta",
  jensen_alpha: "jensen_alpha",
  capture_ratio_up: "capture_ratio_up",
  capture_ratio_down: "capture_ratio_down",
  capture_ratio_both: "capture_ratio_both",
  correlation: "correlation",
  "OLS coefficient": "OLS coefficient",
};

interface FrameJsonItem {
  dates: string[];
  values: number[];
  name?: string;
  timeseries_id?: string;
  instrument_id?: string;
  valuetype?: string;
}

function loadFrameFromJson(path: string): { irisSeries: OpenTimeSeries; frame: OpenFrame } {
  const raw = JSON.parse(readFileSync(path, "utf-8"));
  const items: FrameJsonItem[] = Array.isArray(raw) ? raw : [raw];
  if (items.length < 1) {
    throw new Error("frame.json must contain at least one series");
  }
  const constituents = items.map((item) =>
    OpenTimeSeries.fromArrays(
      item.name ?? "Series",
      item.dates,
      item.values,
      { timeseriesId: item.timeseries_id ?? "", countries: "SE" },
    ),
  );
  const frame = new OpenFrame(constituents).truncFrame();
  frame.constituents.forEach((c) => c.toCumret());
  frame.mergeSeries("outer");
  const irisIdx = frame.columnLabels.indexOf(IRIS_LABEL);
  const irisSeries = irisIdx >= 0 ? frame.constituents[irisIdx] : frame.constituents[0];
  return { irisSeries, frame };
}

function loadPythonMetrics(path: string): Record<string, unknown> {
  const raw = JSON.parse(readFileSync(path, "utf-8"));
  const col =
    typeof raw === "object" && raw !== null && IRIS_LABEL in raw
      ? raw[IRIS_LABEL]
      : Object.values(raw)[0];
  return (col as Record<string, unknown>) ?? {};
}

function tsDateStr(v: unknown): string {
  if (typeof v === "string") return v.slice(0, 10);
  return String(v);
}

function roundToStr(n: number, decimals: number): string {
  if (Number.isNaN(n)) return "NaN";
  if (!Number.isFinite(n)) return String(n);
  if (decimals <= 0) return String(Math.round(n));
  const rounded = Number(n.toFixed(decimals));
  return Number.isInteger(rounded) ? String(rounded) : n.toFixed(decimals);
}

function formatForDisplay(v: unknown, decimals: number): string {
  if (v === undefined) return "—";
  if (typeof v === "number") return roundToStr(v, decimals);
  return tsDateStr(v);
}

function parseDecimals(args: string[]): number {
  const def = 4;
  // --decimals=N
  const eqArg = args.find((a) => a.startsWith("--decimals="));
  if (eqArg) {
    const n = parseInt(eqArg.slice(11), 10);
    if (Number.isInteger(n) && n >= 0) return n;
  }
  // --decimals N
  const idx = args.indexOf("--decimals");
  if (idx >= 0 && args[idx + 1] != null) {
    const n = parseInt(args[idx + 1]!, 10);
    if (Number.isInteger(n) && n >= 0) return n;
  }
  // env COMPARE_DECIMALS (works with npm run even without --)
  const env = process.env.COMPARE_DECIMALS;
  if (env) {
    const n = parseInt(env, 10);
    if (Number.isInteger(n) && n >= 0) return n;
  }
  return def;
}

function main(): void {
  const decimals = parseDecimals(process.argv.slice(2));

  if (!existsSync(FRAME_PATH)) {
    console.error(`frame.json not found at ${FRAME_PATH}`);
    process.exit(1);
  }
  if (!existsSync(DATA_PATH)) {
    console.error(`data.json not found at ${DATA_PATH}`);
    process.exit(1);
  }

  console.log("Loading frame from frame.json...");
  const { irisSeries, frame } = loadFrameFromJson(FRAME_PATH);

  console.log("Loading Python metrics from data.json...");
  const pythonMetrics = loadPythonMetrics(DATA_PATH);

  // 1. Single-asset metrics: OpenTimeSeries("Captor Iris Bond") - TS vs Python
  const tsMetrics: Record<string, string | number | undefined> = {};
  const metrics: { pyKey: string; getTs: () => number | string | undefined }[] = [
    { pyKey: "value_ret", getTs: () => irisSeries.valueRet() },
    { pyKey: "geo_ret", getTs: () => irisSeries.geoRet() },
    { pyKey: "arithmetic_ret", getTs: () => irisSeries.arithmeticRet() },
    { pyKey: "vol", getTs: () => irisSeries.vol() },
    { pyKey: "downside_deviation", getTs: () => irisSeries.downsideDeviation() },
    { pyKey: "ret_vol_ratio", getTs: () => irisSeries.retVolRatio(0) },
    { pyKey: "sortino_ratio", getTs: () => irisSeries.sortinoRatio(0, 0) },
    { pyKey: "z_score", getTs: () => irisSeries.zScore() },
    { pyKey: "skew", getTs: () => irisSeries.skew() },
    { pyKey: "kurtosis", getTs: () => irisSeries.kurtosis() },
    { pyKey: "positive_share", getTs: () => irisSeries.positiveShare() },
    { pyKey: "var_down", getTs: () => irisSeries.varDown(0.95) },
    { pyKey: "cvar_down", getTs: () => irisSeries.cvarDown(0.95) },
    { pyKey: "vol_from_var", getTs: () => irisSeries.volFromVar(0.95) },
    { pyKey: "worst", getTs: () => irisSeries.worst(1) },
    { pyKey: "worst_month", getTs: () => irisSeries.worstMonth() },
    { pyKey: "max_drawdown", getTs: () => irisSeries.maxDrawdown() },
    { pyKey: "max_drawdown_date", getTs: () => irisSeries.maxDrawdownBottomDate() },
    { pyKey: "first_idx", getTs: () => irisSeries.firstIdx },
    { pyKey: "last_idx", getTs: () => irisSeries.lastIdx },
    { pyKey: "length", getTs: () => irisSeries.length },
    { pyKey: "span_of_days", getTs: () => irisSeries.spanOfDays },
    { pyKey: "yearfrac", getTs: () => irisSeries.yearfrac },
    { pyKey: "periods_in_a_year", getTs: () => irisSeries.periodsInAYear },
  ];

  for (const { pyKey, getTs } of metrics) {
    try {
      const v = getTs();
      tsMetrics[pyKey] = typeof v === "number" ? v : v;
    } catch {
      tsMetrics[pyKey] = NaN;
    }
  }

  // 2. Frame comparison metrics: OpenFrame produces Iris-vs-Benchmark metrics
  const irCol = frame.columnLabels.indexOf(IRIS_LABEL);
  const bmkCol = frame.itemCount >= 2 ? frame.itemCount - 1 : -1;
  if (irCol >= 0 && bmkCol >= 1 && irCol !== bmkCol) {
    try {
      const te = frame.trackingError(bmkCol);
      tsMetrics["tracking_error"] = te[irCol];
      const ir = frame.infoRatio(bmkCol);
      tsMetrics["info_ratio"] = ir[irCol];
      tsMetrics["beta"] = frame.beta(irCol, bmkCol);
      tsMetrics["jensen_alpha"] = frame.jensenAlpha(irCol, bmkCol);
      const capUp = frame.captureRatio("up", bmkCol);
      tsMetrics["capture_ratio_up"] = capUp[irCol];
      const capDown = frame.captureRatio("down", bmkCol);
      tsMetrics["capture_ratio_down"] = capDown[irCol];
      const capBoth = frame.captureRatio("both", bmkCol);
      tsMetrics["capture_ratio_both"] = capBoth[irCol];
      const corr = frame.correlMatrix();
      tsMetrics["correlation"] = corr[irCol][bmkCol];
      const ols = frame.ordLeastSquaresFit(irCol, bmkCol, { fittedSeries: false });
      tsMetrics["OLS coefficient"] = ols.coefficient;
    } catch (err) {
      console.warn("Could not compute comparison metrics:", err);
    }
  }

  // Build comparison table using mapping: Python key -> tsMetrics key
  const pyKeys = Object.keys(pythonMetrics).filter(
    (k) => pythonMetrics[k] != null && String(pythonMetrics[k]) !== "null",
  );
  const tsOnlyKeys = Object.keys(tsMetrics).filter(
    (tk) => !Object.values(PY_TO_TS).includes(tk) && !pyKeys.includes(tk),
  );
  const sortedKeys = [...new Set([...pyKeys, ...tsOnlyKeys])].sort();

  const rows: string[] = [];
  let matches = 0;
  let compared = 0;

  const col1 = 35;
  const col2 = 28;
  const col3 = 28;
  const col4 = 6;

  const header =
    "Metric".padEnd(col1) +
    "Python (data.json)".padEnd(col2) +
    "TypeScript (openseries-ts)".padEnd(col3) +
    "Match".padEnd(col4);
  rows.push(header);
  rows.push("=".repeat(col1 + col2 + col3 + col4));

  for (const pyKey of sortedKeys) {
    const tsKey = PY_TO_TS[pyKey] ?? pyKey;
    const pyVal = pythonMetrics[pyKey];
    const tsVal = tsMetrics[tsKey];
    const displayName = pyVal !== undefined ? pyKey : tsKey;

    const pyStr = formatForDisplay(pyVal, decimals);
    const tsStr = formatForDisplay(tsVal, decimals);

    let match = "";
    if (pyVal !== undefined && tsVal !== undefined) {
      compared++;
      let matchStr = false;
      if (typeof pyVal === "number" && typeof tsVal === "number") {
        matchStr = roundToStr(pyVal, decimals) === roundToStr(tsVal, decimals);
      } else {
        matchStr = tsDateStr(pyVal) === String(tsVal).slice(0, 10);
      }
      if (matchStr) {
        match = "✓";
        matches++;
      }
    }

    rows.push(
      displayName.padEnd(col1) +
        pyStr.padEnd(col2) +
        tsStr.padEnd(col3) +
        match.padEnd(col4),
    );
  }

  console.log("\n" + rows.join("\n"));
  console.log("=".repeat(col1 + col2 + col3 + col4));

  console.log(`\nMatched: ${matches}/${compared} (rounded to ${decimals} decimals or same date)`);
}

try {
  main();
} catch (err) {
  console.error(err);
  process.exit(1);
}
