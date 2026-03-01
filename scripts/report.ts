#!/usr/bin/env node
/**
 * Generic Portfolio Report CLI
 *
 * Fetches timeseries from Captor API (when --ids or --iris), builds OpenFrame,
 * and calls reportHtml(frame, options). Report logic is pure - no fetch inside.
 *
 * Usage:
 *   npx tsx scripts/report.ts --ids id1 id2 id3 [options]
 *   npx tsx scripts/report.ts --iris [options]
 *   npm run report -- --ids 638f681e 5b72a10c 5c1115fb
 *   npm run report -- --iris --title "Iris Bond Report"
 *
 * Options:
 *   --ids id1 id2 ...     Captor series IDs
 *   --iris                Use Iris Bond + Benchmark preset (default when no args)
 *   --captor              Use Captor Aster/Iris/Scilla preset
 *   --title "Title"       Report title
 *   --countries "SE,US"   Country codes for business-day metrics (default: SE)
 *   --from-date YYYY-MM-DD  Truncate to start from this date (tail the period)
 *   --to-date YYYY-MM-DD    Truncate to end at this date (tail the period)
 *   --filename path       Output path (default: ~/Documents/report.html, or ~/ if Documents missing)
 *   --no-open             Do not auto-open in browser
 *   --no-logo             Omit logo from report
 *
 * Examples:
 *   npm run report:iris -- --from-date 2023-01-01 --to-date 2024-12-31
 *   npm run report -- --ids id1 id2 --from-date 2020-06-01
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

import { existsSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

function defaultOutputDir(): string {
  const home = homedir();
  const documents = join(home, "Documents");
  return existsSync(documents) ? documents : home;
}
import open from "open";
import { fetchCaptorSeriesBatch } from "../src/captor";
import { OpenTimeSeries } from "../src/series";
import { OpenFrame } from "../src/frame";
import { reportHtml } from "../src/report";
import type { CountryCode } from "../src/bizcalendar";

function parseArgs(args: string[]): {
  ids: string[];
  presetNames: string[] | undefined;
  title: string;
  countries: CountryCode[];
  fromDate: string | undefined;
  toDate: string | undefined;
  filename: string;
  autoOpen: boolean;
  addLogo: boolean;
  useIris: boolean;
  isDefaultCaptor: boolean;
} {
  let title = "Captor Portfolio Report";
  let countries: CountryCode[] = ["SE"];
  let fromDate: string | undefined;
  let toDate: string | undefined;
  let filename = "";
  let autoOpen = true;
  let addLogo = true;
  const ids: string[] = [];
  let useIris = false;
  let useCaptor = false;

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
      countries = args[i + 1]!.split(",")
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
    } else if (a === "--captor") {
      useCaptor = true;
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

  const preset = useIris
    ? IRIS_SERIES
    : useCaptor
      ? DEFAULT_SERIES
      : ids.length > 0
        ? null
        : IRIS_SERIES;
  const finalIds = preset ? preset.map((s) => s.id) : ids;
  const presetNames = preset ? preset.map((s) => s.name) : undefined;
  const effectiveUseIris = preset === IRIS_SERIES;
  const finalTitle = effectiveUseIris ? IRIS_SERIES[0]!.name : title;

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
    useIris: effectiveUseIris,
    isDefaultCaptor: preset === DEFAULT_SERIES,
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

  const html = reportHtml(frame, {
    title: opts.title,
    logoUrl: opts.addLogo
      ? "https://sales.captor.se/captor_logo_sv_1600_icketransparent.png"
      : undefined,
    addLogo: opts.addLogo,
  });

  const defaultDir = defaultOutputDir();
  const defaultFilename = opts.useIris
    ? "iris_report.html"
    : opts.isDefaultCaptor
      ? "captor_report.html"
      : "report.html";
  const reportPath = opts.filename
    ? opts.filename.includes("/") || opts.filename.includes("\\")
      ? opts.filename
      : join(defaultDir, opts.filename)
    : join(defaultDir, defaultFilename);

  writeFileSync(reportPath, html, "utf-8");

  console.log(`Report saved to ${reportPath}`);
  if (opts.autoOpen) {
    console.log("Opening in browser...");
    await open(reportPath, { wait: false });
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
