#!/usr/bin/env node
/**
 * Compare TypeScript openseries-ts metrics vs Python metrics (from data.json).
 *
 * Loads iris.json into OpenTimeSeries, computes metrics with the TS implementation,
 * and displays them side-by-side with Python-calculated metrics from data.json.
 *
 * Run: npx tsx scripts/compare-metrics.ts [--decimals=N]
 *       npm run compare-metrics -- --decimals=6
 *
 * Options:
 *   --decimals=N   Number of decimal places for comparison (default: 4)
 *   --decimals N   Same, space-separated
 *   COMPARE_DECIMALS   Env var (avoids npm -- when using npm run)
 *
 * Requires iris.json and data.json in ~/Documents (from the Python fetch snippet).
 */

import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

import { OpenTimeSeries } from "../src/series";

const DOCUMENTS = join(homedir(), "Documents");
const IRIS_PATH = join(DOCUMENTS, "iris.json");
const DATA_PATH = join(DOCUMENTS, "data.json");

interface IrisJsonItem {
  dates: string[];
  values: number[];
  name?: string;
  timeseries_id?: string;
}

function loadSeriesFromIrisJson(path: string): OpenTimeSeries {
  const raw = JSON.parse(readFileSync(path, "utf-8"));
  const item: IrisJsonItem = Array.isArray(raw) ? raw[0] : raw;
  return OpenTimeSeries.fromArrays(
    item.name ?? "Series",
    item.dates,
    item.values,
    { timeseriesId: item.timeseries_id ?? "", countries: "SE" },
  );
}

function loadPythonMetrics(path: string): Record<string, unknown> {
  const raw = JSON.parse(readFileSync(path, "utf-8"));
  // data.json: {"Captor Iris Bond": {"value_ret": 0.025, "geo_ret": ..., ...}}
  const col = typeof raw === "object" && raw !== null ? Object.values(raw)[0] : raw;
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

  if (!existsSync(IRIS_PATH)) {
    console.error(`iris.json not found at ${IRIS_PATH}`);
    process.exit(1);
  }
  if (!existsSync(DATA_PATH)) {
    console.error(`data.json not found at ${DATA_PATH}`);
    process.exit(1);
  }

  console.log("Loading timeseries from iris.json...");
  const series = loadSeriesFromIrisJson(IRIS_PATH);

  console.log("Loading Python metrics from data.json...");
  const pythonMetrics = loadPythonMetrics(DATA_PATH);

  // Compute TS metrics; map Python property names to TS getters/methods
  const tsMetrics: Record<string, string | number> = {};

  const metrics: { pyKey: string; getTs: () => number | string }[] = [
    { pyKey: "value_ret", getTs: () => series.valueRet() },
    { pyKey: "geo_ret", getTs: () => series.geoRet() },
    { pyKey: "arithmetic_ret", getTs: () => series.arithmeticRet() },
    { pyKey: "vol", getTs: () => series.vol() },
    { pyKey: "downside_deviation", getTs: () => series.downsideDeviation() },
    { pyKey: "ret_vol_ratio", getTs: () => series.retVolRatio(0) },
    { pyKey: "sortino_ratio", getTs: () => series.sortinoRatio(0, 0) },
    { pyKey: "z_score", getTs: () => series.zScore() },
    { pyKey: "skew", getTs: () => series.skew() },
    { pyKey: "kurtosis", getTs: () => series.kurtosis() },
    { pyKey: "positive_share", getTs: () => series.positiveShare() },
    { pyKey: "var_down", getTs: () => series.varDown(0.95) },
    { pyKey: "cvar_down", getTs: () => series.cvarDown(0.95) },
    { pyKey: "vol_from_var", getTs: () => series.volFromVar(0.95) },
    { pyKey: "worst", getTs: () => series.worst(1) },
    { pyKey: "worst_month", getTs: () => series.worstMonth() },
    { pyKey: "max_drawdown", getTs: () => series.maxDrawdown() },
    { pyKey: "first_idx", getTs: () => series.firstIdx },
    { pyKey: "last_idx", getTs: () => series.lastIdx },
    { pyKey: "length", getTs: () => series.length },
    { pyKey: "span_of_days", getTs: () => series.spanOfDays },
    { pyKey: "yearfrac", getTs: () => series.yearfrac },
    { pyKey: "periods_in_a_year", getTs: () => series.periodsInAYear },
  ];

  for (const { pyKey, getTs } of metrics) {
    try {
      const v = getTs();
      tsMetrics[pyKey] = typeof v === "number" ? v : v;
    } catch {
      tsMetrics[pyKey] = NaN;
    }
  }

  // Build comparison table
  const allKeys = new Set([
    ...Object.keys(pythonMetrics),
    ...Object.keys(tsMetrics),
  ]);
  const sortedKeys = [...allKeys].sort();

  const rows: string[] = [];
  let matches = 0;

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

  for (const key of sortedKeys) {
    const pyVal = pythonMetrics[key];
    const tsVal = tsMetrics[key];

    const pyStr = formatForDisplay(pyVal, decimals);
    const tsStr = formatForDisplay(tsVal, decimals);

    let match = "";
    if (pyVal !== undefined && tsVal !== undefined) {
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
      key.padEnd(col1) +
        pyStr.padEnd(col2) +
        tsStr.padEnd(col3) +
        match.padEnd(col4),
    );
  }

  console.log("\n" + rows.join("\n"));
  console.log("=".repeat(col1 + col2 + col3 + col4));

  const compared = sortedKeys.filter((k) => pythonMetrics[k] !== undefined && tsMetrics[k] !== undefined);
  console.log(`\nMatched: ${matches}/${compared.length} (rounded to ${decimals} decimals or same date)`);
}

main();
