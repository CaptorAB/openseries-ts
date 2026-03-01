#!/usr/bin/env node
/**
 * Plot CLI - full-page series line chart (like Python plot_series).
 *
 * Fetches timeseries from Captor API, builds OpenFrame, and calls plotSeries.
 *
 * Usage:
 *   npm run plot:iris [options]
 *   npm run plot:drawdown [options]
 *   npm run plot -- --ids id1 id2 [options]
 *   npx tsx scripts/plot.ts --iris
 *
 * Options:
 *   --ids id1 id2 ...     Captor series IDs (alternative: --iris for Iris preset)
 *   --iris                Use Iris Bond + Benchmark preset IDs
 *   --drawdown            Use DEFAULT_SERIES converted to drawdown series
 *   --title "Title"       Plot title
 *   --countries "SE,US"   Country codes (default: SE)
 *   --from-date YYYY-MM-DD  Truncate to start from this date
 *   --to-date YYYY-MM-DD    Truncate to end at this date
 *   --filename path       Output path (default: ~/Documents/plot.html)
 *   --no-open             Do not auto-open in browser
 *   --no-logo             Omit logo from plot
 *
 * Examples:
 *   npm run plot:iris
 *   npm run plot:iris -- --no-open --filename my-plot.html
 *   npm run plot:iris -- --from-date 2023-01-01 --to-date 2024-12-31
 */

const IRIS_SERIES = [
  { id: "5b72a10c23d27735104e0576", name: "Captor Iris Bond" },
  { id: "63892890473ba6918f4ee954", name: "Benchmark Index" },
] as const;

const DEFAULT_SERIES = [
  { id: "638f681e0c2f4c8d28a13392", name: "Captor Aster Global High Yield" },
  { id: "5b72a10c23d27735104e0576", name: "Captor Iris Bond" },
  { id: "5c1115fbce5b131cf0b224fc", name: "Captor Scilla Global Equity" },
] as const;

import { fetchCaptorSeriesBatch } from "../src/captor";
import { OpenTimeSeries } from "../src/series";
import { OpenFrame } from "../src/frame";
import { plotSeries } from "../src/plot";
import type { CountryCode } from "../src/bizcalendar";

function parseArgs(args: string[]): {
  ids: string[];
  presetNames: string[] | undefined;
  title: string;
  countries: CountryCode[];
  fromDate: string | undefined;
  toDate: string | undefined;
  filename: string | undefined;
  autoOpen: boolean;
  addLogo: boolean;
  useIris: boolean;
  useDrawdown: boolean;
  addPortfolio: boolean;
} {
  let title = "Series Plot";
  let countries: CountryCode[] = ["SE"];
  let fromDate: string | undefined;
  let toDate: string | undefined;
  let filename: string | undefined;
  let autoOpen = true;
  let addLogo = true;
  const ids: string[] = [];
  let useIris = false;
  let useDrawdown = false;

  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === "--title" && args[i + 1]) {
      title = args[i + 1]!;
      i++;
    } else if (a === "--from-date" && args[i + 1]) {
      fromDate = args[i + 1]!;
      i++;
    } else if (a === "--to-date" && args[i + 1]) {
      toDate = args[i + 1]!;
      i++;
    } else if (a === "--countries" && args[i + 1]) {
      countries = args[i + 1]!
        .split(",")
        .map((c) => c.trim().toUpperCase() as CountryCode)
        .filter(Boolean);
      i++;
    } else if (a === "--filename" && args[i + 1]) {
      filename = args[i + 1]!;
      i++;
    } else if (a === "--no-open") {
      autoOpen = false;
    } else if (a === "--no-logo") {
      addLogo = false;
    } else if (a === "--iris") {
      useIris = true;
    } else if (a === "--drawdown") {
      useDrawdown = true;
    } else if (a === "--ids") {
      i++;
      while (i < args.length && !args[i]!.startsWith("--")) {
        ids.push(args[i]!);
        i++;
      }
      i--;
    } else if (!a.startsWith("--")) {
      ids.push(a);
    }
  }

  const preset = useDrawdown
    ? DEFAULT_SERIES
    : useIris
      ? IRIS_SERIES
      : ids.length > 0
        ? null
        : DEFAULT_SERIES;
  const finalIds = preset ? preset.map((s) => s.id) : ids;
  const presetNames = preset ? preset.map((s) => s.name) : undefined;
  const finalTitle = useDrawdown
    ? "Drawdown Series"
    : useIris
      ? IRIS_SERIES[0]!.name
      : title;

  return {
    ids: finalIds,
    presetNames,
    title: finalTitle,
    countries,
    fromDate,
    toDate,
    filename,
    autoOpen,
    addLogo,
    useIris,
    useDrawdown,
    addPortfolio: !useIris && !useDrawdown && ids.length === 0,
  };
}

async function main(): Promise<void> {
  const opts = parseArgs(process.argv.slice(2));

  console.log("Fetching data from Captor API...");
  const raw = await fetchCaptorSeriesBatch(opts.ids);

  const seriesNames =
    opts.presetNames ?? raw.map((r) => r.title || `Series ${r.id.slice(0, 8)}`);
  const series = raw.map((r, i) =>
    OpenTimeSeries.fromArrays(
      seriesNames[i] ?? r.title ?? `Series ${r.id.slice(0, 8)}`,
      r.dates,
      r.values,
      { countries: opts.countries },
    ),
  );

  // Convert to drawdown series on constituents (OpenTimeSeries) before building OpenFrame.
  // OpenFrame does not have toDrawdownSeries; conversion applies only to OpenTimeSeries.
  if (opts.useDrawdown) {
    for (const s of series) s.toDrawdownSeries();
  }

  const frame = new OpenFrame(series, null, { countries: opts.countries });
  frame.mergeSeries("inner");

  if (opts.fromDate ?? opts.toDate) {
    frame.truncFrame({
      startCut: opts.fromDate,
      endCut: opts.toDate,
      where: "both",
    });
    console.log(`Truncated to ${frame.firstIdx} .. ${frame.lastIdx}`);
  }

  // Add portfolio timeseries only for default Captor preset (not Iris, not custom --ids)
  if (opts.addPortfolio && frame.itemCount >= 2) {
    const port = frame.makePortfolio("Portfolio (eq weights)", "eq_weights");
    const portSeries = OpenTimeSeries.fromArrays(
      "Portfolio (eq weights)",
      port.dates,
      port.values,
      { countries: opts.countries },
    );
    frame.addTimeseries(portSeries);
  }

  const defaultFilename = opts.useDrawdown
    ? "drawdown_plot.html"
    : opts.useIris
      ? "iris_plot.html"
      : opts.addPortfolio
        ? "captor_plot.html"
        : "plot.html";
  const plotPath = await plotSeries(frame, {
    title: opts.title,
    logoUrl: opts.addLogo
      ? "https://sales.captor.se/captor_logo_sv_1600_icketransparent.png"
      : undefined,
    addLogo: opts.addLogo,
    filename: opts.filename ?? defaultFilename,
    autoOpen: opts.autoOpen,
    asDrawdown: opts.useDrawdown,
  });

  console.log(`Plot saved to ${plotPath}`);
  if (opts.autoOpen) {
    console.log("Opening in browser...");
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
