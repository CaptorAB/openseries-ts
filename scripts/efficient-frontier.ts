#!/usr/bin/env node
/**
 * Efficient Frontier Script
 *
 * Simulates asset returns (Merton jump GBM), builds portfolio frame,
 * computes efficient frontier and max-Sharpe portfolio, and plots
 * simulated portfolios, frontier, and labeled points (assets, current, optimum).
 *
 * Mirrors the Python openseries Jupyter notebook workflow.
 *
 * Usage:
 *   npx tsx scripts/efficient-frontier.ts [options]
 *   npm run efficient-frontier
 *
 * Options:
 *   --simulations N      Number of random portfolios (default: 5000)
 *   --points N           Frontier points (default: 30)
 *   --seed N             Random seed (default: 71)
 *   --countries "SE"     Country for business days (default: SE, XSTO)
 *   --title "Title"      Plot title (default: Efficient Frontier)
 *   --filename path      Output path (default: ~/Documents/efficient-frontier.html)
 *   --no-open            Do not auto-open in browser
 *   --no-logo            Omit logo from plot
 *
 * Example:
 *   npm run efficient-frontier -- --simulations 3000 --points 25 --no-open
 */

import { ReturnSimulation } from "../src/simulation";
import { OpenTimeSeries } from "../src/series";
import { OpenFrame } from "../src/frame";
import { efficientFrontier, preparePlotData } from "../src/portfoliotools";
import { sharpeplot } from "../src/sharpeplot";
import { getPreviousBusinessDayBeforeToday } from "../src/bizcalendar";
import type { CountryCode } from "../src/bizcalendar";
import { ValueType } from "../src/types";

const DEFAULT_SIMULATIONS = 5000;
const DEFAULT_POINTS = 30;
const DEFAULT_SEED = 71;
const NUM_SIMS = 4;
const TRADING_DAYS = 2512;
const MEAN_ANNUAL_RETURN = 0.05;
const MEAN_ANNUAL_VOL = 0.1;
const TRADING_DAYS_IN_YEAR = 252;

function parseArgs(args: string[]): {
  simulations: number;
  points: number;
  seed: number;
  countries: CountryCode[];
  title: string;
  filename: string | undefined;
  autoOpen: boolean;
  addLogo: boolean;
} {
  let simulations = DEFAULT_SIMULATIONS;
  let points = DEFAULT_POINTS;
  let seed = DEFAULT_SEED;
  let countries: CountryCode[] = ["SE"];
  let title = "Efficient Frontier";
  let filename: string | undefined;
  let autoOpen = true;
  let addLogo = true;

  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === "--title" && args[i + 1]) {
      title = args[i + 1]!;
      i++;
    } else if (a === "--simulations" && args[i + 1]) {
      simulations = parseInt(args[i + 1]!, 10);
      i++;
    } else if (a === "--points" && args[i + 1]) {
      points = parseInt(args[i + 1]!, 10);
      i++;
    } else if (a === "--seed" && args[i + 1]) {
      seed = parseInt(args[i + 1]!, 10);
      i++;
    } else if (a === "--countries" && args[i + 1]) {
      countries = args[i + 1]!.split(",")
        .map((c) => c.trim().toUpperCase() as CountryCode)
        .filter(Boolean);
      i++;
    } else if (a === "--filename" && args[i + 1]) {
      filename = args[i + 1];
      i++;
    } else if (a === "--no-open") {
      autoOpen = false;
    } else if (a === "--no-logo") {
      addLogo = false;
    }
  }

  return {
    simulations,
    points,
    seed,
    countries,
    title,
    filename,
    autoOpen,
    addLogo,
  };
}

async function main(): Promise<void> {
  const opts = parseArgs(process.argv.slice(2));

  const endDate = getPreviousBusinessDayBeforeToday(opts.countries);
  console.log(`Using end date: ${endDate} (previous business day)`);

  const series = ReturnSimulation.fromLognormal(
    NUM_SIMS,
    MEAN_ANNUAL_RETURN,
    MEAN_ANNUAL_VOL,
    TRADING_DAYS,
    TRADING_DAYS_IN_YEAR,
    opts.seed,
  );

  const dc = series.toDateColumns("Asset", { end: endDate, asReturns: true });
  const assetsArr = Array.from({ length: NUM_SIMS }, (_, i) =>
    OpenTimeSeries.fromDateColumns(dc, {
      columnIndex: i,
      valuetype: ValueType.RTRN,
      countries: opts.countries,
    }).toCumret(),
  );

  const assets = new OpenFrame(assetsArr, null, {
    countries: opts.countries.length === 1 ? opts.countries[0] : opts.countries,
  });
  assets.mergeSeries("inner");

  const current = assets.makePortfolio("Current Portfolio", "eq_weights");
  const { frontier, simulated, maxSharpe } = efficientFrontier(
    assets,
    opts.simulations,
    opts.seed,
    opts.points,
  );

  const plotframe = preparePlotData(assets, current, maxSharpe);

  const plotPath = await sharpeplot(simulated, frontier, plotframe, {
    title: opts.title,
    addLogo: opts.addLogo,
    filename: opts.filename,
    autoOpen: opts.autoOpen,
    assetLabels: assets.columnLabels,
  });

  console.log(`Efficient frontier plot saved to ${plotPath}`);
  if (opts.autoOpen) {
    console.log("Opening in browser...");
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
