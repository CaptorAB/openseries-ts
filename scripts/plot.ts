#!/usr/bin/env node
/**
 * Plot CLI - full-page series line chart (like Python plot_series).
 *
 * Fetches timeseries from Captor API, builds OpenFrame, and calls plotSeries.
 *
 * Usage:
 *   npm run plot:iris [options]
 *   npm run plot -- --ids id1 id2 [options]
 *   npx tsx scripts/plot.ts --iris
 *
 * Options:
 *   --ids id1 id2 ...     Captor series IDs (alternative: --iris for Iris preset)
 *   --iris                Use Iris Bond + Benchmark preset IDs
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

const IRIS_ID = "5b72a10c23d27735104e0576";
const BENCHMARK_ID = "63892890473ba6918f4ee954";

const DEFAULT_IDS = [
  "638f681e0c2f4c8d28a13392",
  "5b72a10c23d27735104e0576",
  "5c1115fbce5b131cf0b224fc",
];

import { fetchCaptorSeriesBatch } from "../src/captor";
import { OpenTimeSeries } from "../src/series";
import { OpenFrame } from "../src/frame";
import { plotSeries } from "../src/plot";
import type { CountryCode } from "../src/bizcalendar";

function parseArgs(args: string[]): {
  ids: string[];
  title: string;
  countries: CountryCode[];
  fromDate: string | undefined;
  toDate: string | undefined;
  filename: string | undefined;
  autoOpen: boolean;
  addLogo: boolean;
  useIris: boolean;
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

  const finalIds =
    useIris ? [IRIS_ID, BENCHMARK_ID] : ids.length > 0 ? ids : DEFAULT_IDS;
  const finalTitle = useIris ? "Captor Iris Bond" : title;

  return {
    ids: finalIds,
    title: finalTitle,
    countries,
    fromDate,
    toDate,
    filename,
    autoOpen,
    addLogo,
    useIris,
  };
}

async function main(): Promise<void> {
  const opts = parseArgs(process.argv.slice(2));

  console.log("Fetching data from Captor API...");
  const raw = await fetchCaptorSeriesBatch(opts.ids);

  const seriesNames = opts.useIris
    ? ["Captor Iris Bond", "Benchmark Index"]
    : raw.map((r) => r.title || `Series ${r.id.slice(0, 8)}`);
  const series = raw.map((r, i) =>
    OpenTimeSeries.fromArrays(
      seriesNames[i] ?? r.title ?? `Series ${r.id.slice(0, 8)}`,
      r.dates,
      r.values,
      { countries: opts.countries },
    ),
  );

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

  const plotPath = await plotSeries(frame, {
    title: opts.title,
    logoUrl: opts.addLogo
      ? "https://sales.captor.se/captor_logo_sv_1600_icketransparent.png"
      : undefined,
    addLogo: opts.addLogo,
    filename: opts.filename,
    autoOpen: opts.autoOpen,
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
