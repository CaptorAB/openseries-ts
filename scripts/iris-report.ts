#!/usr/bin/env node
/**
 * Captor Iris Bond Report Generator
 *
 * Equivalent to the Python openseries workflow:
 *   frame = OpenFrame(constituents=[iris, hmsatr]).trunc_frame().value_nan_handle().to_cumret()
 *   report_html(data=frame, auto_open=True, filename="report.html", title="Captor Iris Bond")
 *
 * Fetches Iris Bond and Benchmark index from Captor API, aligns metrics with Python report.
 *
 * Usage: npx tsx scripts/iris-report.ts
 *        npm run iris-report
 *
 * Options:
 *   --filename "report.html"   Output filename (default: report.html in temp dir)
 *   --no-open                  Do not auto-open in browser
 *   --countries "SE"           Country code(s) for holiday calendar, comma-separated (default: SE)
 */

const CAPTOR_LOGO_URL = "https://sales.captor.se/captor_logo_sv_1600_icketransparent.png";

const IRIS_ID = "5b72a10c23d27735104e0576";
const BENCHMARK_ID = "63892890473ba6918f4ee954";

const DEFAULT_COUNTRIES = ["SE"];

import { writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import open from "open";
import { fetchCaptorSeriesBatch } from "../src/captor";
import { OpenTimeSeries } from "../src/series";
import { OpenFrame } from "../src/frame";
import { pctChange, ffill } from "../src/utils";
import {
  filterToBusinessDays,
  lastBusinessDayOfMonth,
  lastBusinessDayOfYear,
  resampleToPeriodEnd,
  type CountryCode,
} from "../src/bizcalendar";

function formatPct(val: number, decimals = 2): string {
  if (Number.isNaN(val)) return "";
  return `${(val * 100).toFixed(decimals)}%`;
}

function formatNum(val: number, decimals = 2): string {
  if (Number.isNaN(val)) return "";
  return val.toFixed(decimals);
}

function parseArgs(args: string[]): {
  filename: string;
  autoOpen: boolean;
  countries: CountryCode[];
} {
  let filename = "report.html";
  let autoOpen = true;
  let countries = DEFAULT_COUNTRIES;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--filename" && args[i + 1]) {
      filename = args[i + 1];
      i++;
    } else if (args[i] === "--no-open") {
      autoOpen = false;
    } else if (args[i] === "--countries" && args[i + 1]) {
      countries = args[i + 1]!.split(",").map((c) => c.trim().toUpperCase()).filter(Boolean);
      i++;
    }
  }
  return { filename, autoOpen, countries };
}

function computeAnnualReturns(dates: string[], values: number[]): Record<string, number> {
  const byYear: Record<string, { first: number; last: number }> = {};
  for (let i = 0; i < dates.length; i++) {
    const year = dates[i].slice(0, 4);
    if (!byYear[year]) byYear[year] = { first: values[i], last: values[i] };
    else byYear[year].last = values[i];
  }
  const result: Record<string, number> = {};
  for (const year of Object.keys(byYear).sort()) {
    const { first, last } = byYear[year];
    result[year] = first <= 0 ? NaN : last / first - 1;
  }
  return result;
}

/**
 * Capture Ratio (both = up/down) using CAGR-based logic to match Python openseries.
 * Python: (Asset CAGR in up periods / Benchmark CAGR in up) / (Asset CAGR in down / Benchmark CAGR in down)
 */
function computeCaptureRatioCagr(
  assetRets: number[],
  benchmarkRets: number[],
  timeFactor: number,
): number {
  if (assetRets.length !== benchmarkRets.length || assetRets.length < 2) return NaN;
  const upMask = benchmarkRets.map((r) => r > 0);
  const downMask = benchmarkRets.map((r) => r < 0);
  const cagr = (rets: number[], mask: boolean[]): number => {
    const masked = rets
      .map((r, i) => (mask[i] ? r + 1 : NaN))
      .filter((x) => !Number.isNaN(x));
    if (masked.length === 0) return 0;
    const prod = masked.reduce((a, b) => a * b, 1);
    const exponent = 1 / (masked.length / timeFactor);
    return prod ** exponent - 1;
  };
  const upRtrn = cagr(assetRets, upMask);
  const upIdxReturn = cagr(benchmarkRets, upMask);
  const downReturn = cagr(assetRets, downMask);
  const downIdxReturn = cagr(benchmarkRets, downMask);
  if (Math.abs(upIdxReturn) < 1e-12 || Math.abs(downIdxReturn) < 1e-12) return NaN;
  if (downReturn >= 0 || Math.abs(downReturn) < 1e-12) return NaN;
  return (upRtrn / upIdxReturn) / (downReturn / downIdxReturn);
}

function generateHtml(
  seriesData: { name: string; dates: string[]; values: number[] }[],
  reportTitle: string,
  stats: { metric: string; values: (string | number)[] }[],
  logoUrl: string,
): string {
  const cumData = seriesData.map((s) => {
    const vals = ffill(s.values);
    const rets = pctChange(vals);
    rets[0] = 0;
    const cum = [100];
    for (let i = 1; i < rets.length; i++) {
      cum.push(cum[i - 1] * (1 + rets[i]));
    }
    return { name: s.name, dates: s.dates, values: cum };
  });

  const allYears = new Set<string>();
  const annualBySeries: Record<string, Record<string, number>> = {};
  for (const s of seriesData) {
    const ar = computeAnnualReturns(s.dates, s.values);
    annualBySeries[s.name] = ar;
    for (const y of Object.keys(ar)) allYears.add(y);
  }
  const years = [...allYears].sort();

  const colors = ["#2e7d32", "#795548"]; // Dark green (Iris), light brown (Benchmark) - match Python report
  const chartColors = seriesData.map((_, i) => colors[i % colors.length]);

  const tableRows = stats
    .map(
      (r) =>
        `<tr><th>${r.metric}</th>${r.values.map((v) => `<td>${v}</td>`).join("")}</tr>`,
    )
    .join("");
  const tableHtml = `<tr><th>Metric Name</th>${seriesData.map((s) => `<th>${s.name}</th>`).join("")}</tr>${tableRows}`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${reportTitle}</title>
  <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js"></script>
  <style>
    * { box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 24px; background: #fff; color: #333; }
    .header { display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; gap: 16px; margin-bottom: 24px; padding-bottom: 16px; min-height: 80px; }
    .header-logo { display: flex; align-items: center; }
    .header-logo img { height: 60px; width: auto; max-width: 270px; object-fit: contain; }
    .header-title { grid-column: 2; text-align: center; font-size: 2.625rem; font-weight: 600; margin: 0; line-height: 1.2; }
    @media (max-width: 768px) {
      .header { grid-template-columns: 1fr; grid-template-rows: auto auto; gap: 12px; text-align: center; }
      .header-logo { justify-content: center; grid-column: 1; }
      .header-logo img { height: 54px; max-width: 210px; }
      .header-title { grid-column: 1; grid-row: 2; font-size: 2.025rem; }
    }
    .main { max-width: min(1600px, 96vw); margin: 0 auto; }
    .charts { display: grid; grid-template-columns: 1fr minmax(480px, auto); gap: 24px; }
    @media (max-width: 1000px) { .charts { grid-template-columns: 1fr; } }
    .charts-left { display: flex; flex-direction: column; gap: 24px; }
    .chart-section { background: #fff; border: 1px solid #e0e0e0; border-radius: 8px; padding: 16px; }
    .chart-section h2 { font-size: 0.875rem; font-weight: 600; margin: 0 0 12px 0; color: #666; }
    .chart-wrapper { height: 280px; position: relative; }
    table { border-collapse: collapse; width: 100%; font-size: 0.8125rem; }
    th, td { padding: 6px 12px; text-align: right; border-bottom: 1px solid #eee; }
    th { font-weight: 600; color: #666; text-align: left; }
    tr:first-child th { border-bottom: 2px solid #333; }
    .legend { display: flex; gap: 24px; flex-wrap: wrap; margin-top: 16px; font-size: 0.8125rem; color: #666; }
    .legend-item { display: flex; align-items: center; gap: 8px; }
    .legend-color { width: 12px; height: 4px; border-radius: 2px; }
  </style>
</head>
<body>
  <div class="main">
    <header class="header">
      <div class="header-logo">
        <img src="${logoUrl}" alt="Captor" />
      </div>
      <h1 class="header-title">${reportTitle}</h1>
    </header>
    <div class="charts">
      <div class="charts-left">
        <div class="chart-section">
          <div class="chart-wrapper"><canvas id="cumChart"></canvas></div>
        </div>
        <div class="chart-section">
          <div class="chart-wrapper"><canvas id="annualChart"></canvas></div>
        </div>
      </div>
      <div class="chart-section">
        <table id="statsTable"></table>
      </div>
    </div>

    <div class="legend" id="legend"></div>
  </div>

  <script>
    const seriesData = ${JSON.stringify(seriesData)};
    const cumData = ${JSON.stringify(cumData)};
    const annualBySeries = ${JSON.stringify(annualBySeries)};
    const years = ${JSON.stringify(years)};
    const statsTableHtml = ${JSON.stringify(tableHtml)};
    const chartColors = ${JSON.stringify(chartColors)};

    const cumCtx = document.getElementById('cumChart').getContext('2d');
    new Chart(cumCtx, {
      type: 'line',
      data: {
        labels: cumData[0].dates,
        datasets: cumData.map((s, i) => ({
          label: s.name,
          data: s.values,
          borderColor: chartColors[i],
          backgroundColor: 'transparent',
          borderWidth: 2,
          borderDash: i === 1 ? [8, 4] : [],
          tension: 0.1,
          pointRadius: 0,
        })),
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: { beginAtZero: false, ticks: { callback: v => v.toFixed(1) + '%' } },
          x: { ticks: { maxRotation: 45 } },
        },
        plugins: { legend: { display: false } },
      },
    });

    const annualCtx = document.getElementById('annualChart').getContext('2d');
    const annualDatasets = seriesData.map((s, i) => ({
      label: s.name,
      data: years.map(y => annualBySeries[s.name][y] ?? null),
      backgroundColor: chartColors[i],
      barPercentage: 0.8,
      categoryPercentage: 0.9,
    }));
    new Chart(annualCtx, {
      type: 'bar',
      data: { labels: years, datasets: annualDatasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: { ticks: { callback: v => (v * 100).toFixed(1) + '%' } },
          x: { ticks: { maxRotation: 45 } },
        },
        plugins: { legend: { display: false } },
      },
    });

    const legendEl = document.getElementById('legend');
    chartColors.forEach((c, i) => {
      const d = document.createElement('div');
      d.className = 'legend-item';
      d.innerHTML = '<span class="legend-color" style="background:' + c + '; border-radius:2px;"></span><span>' + seriesData[i].name + '</span>';
      legendEl.appendChild(d);
    });

    document.getElementById('statsTable').innerHTML = statsTableHtml;
  </script>
</body>
</html>`;
}

async function main(): Promise<void> {
  const { filename, autoOpen, countries } = parseArgs(process.argv.slice(2));

  console.log("Fetching data from Captor API...");
  const raw = await fetchCaptorSeriesBatch([IRIS_ID, BENCHMARK_ID]);

  const names = ["Captor Iris Bond", "Benchmark index"];
  const series = raw.map((r, i) =>
    OpenTimeSeries.fromArrays(names[i] ?? r.title ?? `Series ${r.id.slice(0, 8)}`, r.dates, r.values),
  );

  const frame = new OpenFrame(series);
  frame.mergeSeries("inner"); // trunc_frame equivalent (inner join)
  // value_nan_handle: ffill is applied in alignSeriesToCommonDates

  const { dates: rawDates, columns: rawColumns } = frame.tsdf;
  const colsFfilled = rawColumns.map((col) => ffill(col));

  const { dates, columns } = filterToBusinessDays(
    rawDates,
    colsFfilled,
    countries,
  );

  const benchmarkIdx = 1;

  const toCumret = (vals: number[]): number[] => {
    const rets = pctChange(vals);
    rets[0] = 0;
    const cum = [1];
    for (let i = 1; i < rets.length; i++) cum.push(cum[i - 1] * (1 + rets[i]));
    const base = cum[0];
    return cum.map((c) => (c / base) * 100);
  };

  const cumretCols = columns.map(toCumret);

  const bizDayFrame = new OpenFrame(
    cumretCols.map((col, i) =>
      OpenTimeSeries.fromArrays(frame.columnLabels[i], dates, col),
    ),
  );
  bizDayFrame.mergeSeries("inner");

  const alignedSeriesData = frame.columnLabels.map((name, i) => ({
    name,
    dates,
    values: cumretCols[i],
  }));

  const alignedSeries = bizDayFrame.constituents;

  const stats: { metric: string; values: (string | number)[] }[] = [];
  const addRow = (label: string, vals: (string | number)[]) => {
    stats.push({ metric: label, values: vals });
  };

  addRow(
    "Return (CAGR)",
    alignedSeries.map((s) => formatPct(s.geoRet())),
  );
  const lastDate = dates[dates.length - 1]!;
  const lastYear = parseInt(lastDate.slice(0, 4), 10);
  const lastMonth = parseInt(lastDate.slice(5, 7), 10);
  const ytdFrom = lastBusinessDayOfYear(lastYear - 1, countries);
  const mtdFrom =
    lastMonth > 1
      ? lastBusinessDayOfMonth(lastYear, lastMonth - 1, countries)
      : lastBusinessDayOfMonth(lastYear - 1, 12, countries);
  addRow(
    "Year-to-Date",
    alignedSeries.map((s) => formatPct(s.valueRet({ fromDate: ytdFrom, toDate: lastDate }))),
  );
  addRow(
    "Month-to-Date",
    alignedSeries.map((s) => formatPct(s.valueRet({ fromDate: mtdFrom, toDate: lastDate }))),
  );
  addRow(
    "Volatility",
    alignedSeries.map((s) => formatPct(s.vol())),
  );
  addRow(
    "Sharpe Ratio",
    alignedSeries.map((s) => formatNum(s.retVolRatio(0))),
  );
  addRow(
    "Sortino Ratio",
    alignedSeries.map((s) => formatNum(s.sortinoRatio(0, 0))),
  );

  const weeklyResampled = resampleToPeriodEnd(dates, columns, "WE", countries);
  const weeklyFrame = new OpenFrame(
    weeklyResampled.columns.map((col, i) =>
      OpenTimeSeries.fromArrays(frame.columnLabels[i], weeklyResampled.dates, col),
    ),
  );
  weeklyFrame.mergeSeries("inner");

  const jensenAlpha = bizDayFrame.jensenAlpha(0, benchmarkIdx);
  addRow("Jensen's Alpha", [formatPct(jensenAlpha), ""]);

  const ir = bizDayFrame.infoRatio(benchmarkIdx);
  addRow("Information Ratio", [formatNum(ir[0]), ""]);

  const teWeekly = weeklyFrame.trackingError(benchmarkIdx);
  addRow("Tracking Error (weekly)", [formatPct(teWeekly[0]), ""]);

  const betaWeekly = weeklyFrame.beta(0, benchmarkIdx);
  addRow("Index Beta (weekly)", [formatNum(betaWeekly), ""]);

  const monthlyResampled = resampleToPeriodEnd(dates, columns, "ME", countries);
  const monthlyRets = monthlyResampled.columns.map((col) => {
    const r = pctChange(col);
    r[0] = 0;
    return r.slice(1);
  });
  const captureRatio = computeCaptureRatioCagr(
    monthlyRets[0],
    monthlyRets[benchmarkIdx],
    12,
  );
  addRow("Capture Ratio (monthly)", [formatNum(captureRatio), ""]);

  const worstMonths = monthlyRets.map((rets) =>
    rets.length > 0 ? Math.min(...rets) : NaN,
  );
  addRow(
    "Worst Month",
    worstMonths.map((v) => (Number.isNaN(v) ? "" : formatPct(v))),
  );

  addRow("Comparison Start", [dates[0], dates[0]]);
  addRow("Comparison End", [lastDate, lastDate]);

  const fullHtml = generateHtml(alignedSeriesData, "Captor Iris Bond", stats, CAPTOR_LOGO_URL);

  const reportPath = filename.includes("/") || filename.includes("\\")
    ? filename
    : join(tmpdir(), filename);
  writeFileSync(reportPath, fullHtml, "utf-8");

  console.log(`Report saved to ${reportPath}`);
  if (autoOpen) {
    console.log("Opening in browser...");
    await open(reportPath, { wait: false });
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
