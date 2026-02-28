#!/usr/bin/env node
/**
 * Captor Portfolio Report Generator
 *
 * Fetches timeseries data from the Captor Open API and generates an HTML report
 * with cumulative performance charts, annual returns, and performance statistics.
 *
 * Usage: npx tsx scripts/captor-report.ts [--title "Report Title"] [ids...]
 *        npm run report -- --title "Captor All Bond Sweden Portfolio"
 *
 * Options:
 *   --title "Title"  Custom report title (default: "Captor Portfolio Report")
 *
 * Default IDs: 638f681e0c2f4c8d28a13392 5b72a10c23d27735104e0576 5c1115fbce5b131cf0b224fc
 */

const CAPTOR_LOGO_URL = "https://sales.captor.se/captor_logo_sv_1600_icketransparent.png";

import { writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import open from "open";
import { fetchCaptorSeriesBatch } from "../src/captor";
import { OpenTimeSeries } from "../src/series";
import { OpenFrame } from "../src/frame";
import { pctChange, ffill } from "../src/utils";

function formatPct(val: number, decimals = 2): string {
  if (Number.isNaN(val)) return "";
  return `${(val * 100).toFixed(decimals)}%`;
}

function formatNum(val: number, decimals = 2): string {
  if (Number.isNaN(val)) return "";
  return val.toFixed(decimals);
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

function computeCaptureRatio(
  assetRets: number[],
  benchmarkRets: number[],
  periodsInYear: number,
): number {
  if (assetRets.length !== benchmarkRets.length || assetRets.length < 2) return NaN;
  const upIdx = benchmarkRets.map((r, i) => (r > 0 ? i : -1)).filter((i) => i >= 0);
  const downIdx = benchmarkRets.map((r, i) => (r < 0 ? i : -1)).filter((i) => i >= 0);
  const upside = upIdx.length > 0 ? upIdx.reduce((s, i) => s + assetRets[i], 0) / upIdx.length : 0;
  const downside =
    downIdx.length > 0 ? downIdx.reduce((s, i) => s + assetRets[i], 0) / downIdx.length : 0;
  if (downside >= 0 || Math.abs(downside) < 1e-10) return NaN;
  return (upside * periodsInYear) / (downside * periodsInYear);
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

  const colors = ["#2e7d32", "#78909c", "#1565c0"];
  const chartColors = seriesData.map((_, i) => colors[i % colors.length]);

  const tableRows = stats
    .map(
      (r) =>
        `<tr><th>${r.metric}</th>${r.values.map((v) => `<td>${v}</td>`).join("")}</tr>`,
    )
    .join("");
  const tableHtml = `<tr><th>Metric</th>${seriesData.map((s) => `<th>${s.name}</th>`).join("")}</tr>${tableRows}`;

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
    .header { display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; gap: 16px; margin-bottom: 24px; padding-bottom: 16px; border-bottom: 1px solid #e0e0e0; min-height: 80px; }
    .header-logo { display: flex; align-items: center; }
    .header-logo img { height: 60px; width: auto; max-width: 270px; object-fit: contain; }
    .header-title { grid-column: 2; text-align: center; font-size: 2.625rem; font-weight: 600; margin: 0; line-height: 1.2; }
    @media (max-width: 768px) {
      .header { grid-template-columns: 1fr; grid-template-rows: auto auto; gap: 12px; text-align: center; }
      .header-logo { justify-content: center; grid-column: 1; }
      .header-logo img { height: 54px; max-width: 210px; }
      .header-title { grid-column: 1; grid-row: 2; font-size: 2.025rem; }
    }
    .charts { display: grid; grid-template-columns: 1fr 400px; gap: 24px; max-width: 1400px; }
    @media (max-width: 1000px) { .charts { grid-template-columns: 1fr; } }
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
  <header class="header">
    <div class="header-logo">
      <img src="${logoUrl}" alt="Captor" />
    </div>
    <h1 class="header-title">${reportTitle}</h1>
  </header>

  <div class="charts">
    <div>
      <div class="chart-section">
        <h2>Cumulative Performance</h2>
        <div class="chart-wrapper"><canvas id="cumChart"></canvas></div>
      </div>
      <div class="chart-section">
        <h2>Annual Returns</h2>
        <div class="chart-wrapper"><canvas id="annualChart"></canvas></div>
      </div>
    </div>
    <div class="chart-section">
      <h2>Performance Statistics</h2>
      <table id="statsTable"></table>
    </div>
  </div>

  <div class="legend" id="legend"></div>

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
          tension: 0.1,
          pointRadius: 0,
        })),
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: { beginAtZero: false, ticks: { callback: v => v + '%' } },
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
      d.innerHTML = '<span class="legend-color" style="background:' + c + '"></span><span>' + seriesData[i].name + '</span>';
      legendEl.appendChild(d);
    });

    document.getElementById('statsTable').innerHTML = statsTableHtml;
  </script>
</body>
</html>`;
}

function parseArgs(args: string[]): { title: string; ids: string[] } {
  const defaultIds = [
    "638f681e0c2f4c8d28a13392",
    "5b72a10c23d27735104e0576",
    "5c1115fbce5b131cf0b224fc",
  ];
  let title = "Captor Portfolio Report";
  const ids: string[] = [];
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--title" && args[i + 1]) {
      title = args[i + 1];
      i++;
    } else if (!args[i].startsWith("--")) {
      ids.push(args[i]);
    }
  }
  return { title, ids: ids.length > 0 ? ids : defaultIds };
}

async function main(): Promise<void> {
  const { title: reportTitle, ids } = parseArgs(process.argv.slice(2));

  console.log("Fetching data from Captor API...");
  const raw = await fetchCaptorSeriesBatch(ids);

  const seriesData = raw.map((r) => ({
    name: r.title || `Series ${r.id.slice(0, 8)}`,
    dates: r.dates,
    values: r.values,
  }));

  const series = raw.map((r) =>
    OpenTimeSeries.fromArrays(r.title || `Series ${r.id.slice(0, 8)}`, r.dates, r.values),
  );

  const frame = new OpenFrame(series);
  frame.mergeSeries("inner");
  const benchmarkIdx = series.length - 1;

  const alignedSeriesData = frame.columnLabels.map((name, i) => ({
    name,
    dates: frame.tsdf.dates,
    values: frame.tsdf.columns[i],
  }));

  const stats: { metric: string; values: (string | number)[] }[] = [];

  const addRow = (label: string, fn: (s: OpenTimeSeries, i: number) => number) => {
    const vals = series.map((s, i) => fn(s, i));
    stats.push({ metric: label, values: vals.map((v) => (Number.isNaN(v) ? "" : formatPct(v))) });
  };

  addRow("Return (CAGR)", (s) => s.geoRet());
  addRow("Year-to-Date", (s) => {
    const y = new Date().getFullYear();
    return s.geoRet({ fromDate: `${y}-01-01` });
  });
  addRow("Month-to-Date", (s) => {
    const d = new Date();
    const from = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
    return s.geoRet({ fromDate: from });
  });
  addRow("Volatility", (s) => s.vol());
  addRow("Sharpe Ratio", (s) => s.retVolRatio(0));
  addRow("Sortino Ratio", (s) => s.sortinoRatio(0, 0));
  addRow("Worst Month", (s) => s.worst(21));

  const ir = frame.infoRatio(benchmarkIdx);
  const te = frame.trackingError(benchmarkIdx);
  stats.push({
    metric: "Jensen's Alpha",
    values: series.map((_, i) => (i === benchmarkIdx ? "" : formatPct(frame.jensenAlpha(i, benchmarkIdx)))),
  });
  stats.push({
    metric: "Information Ratio",
    values: ir.map((v) => (Number.isNaN(v) ? "" : formatNum(v))),
  });
  stats.push({
    metric: "Tracking Error (weekly)",
    values: te.map((v) => (Number.isNaN(v) ? "" : formatPct(v))),
  });

  const betas = series.map((_, i) =>
    i === benchmarkIdx ? NaN : frame.beta(i, benchmarkIdx),
  );
  stats.push({
    metric: "Index Beta (weekly)",
    values: betas.map((v) => (Number.isNaN(v) ? "" : formatNum(v))),
  });

  const cols = frame.tsdf.columns;
  const rets = cols.map((col) => {
    const r = pctChange(ffill(col));
    r[0] = 0;
    return r;
  });
  const periodsInYear = frame.periodInAYear;
  const captureRatios = series.map((_, i) => {
    if (i === benchmarkIdx) return NaN;
    const ar = rets[i].slice(1);
    const br = rets[benchmarkIdx].slice(1);
    return computeCaptureRatio(ar, br, periodsInYear);
  });
  stats.push({
    metric: "Capture Ratio (monthly)",
    values: captureRatios.map((v) => (Number.isNaN(v) ? "" : formatNum(v))),
  });

  stats.push({
    metric: "Comparison Start",
    values: series.map(() => frame.firstIdx),
  });
  stats.push({
    metric: "Comparison End",
    values: series.map(() => frame.lastIdx),
  });

  const tableHtml = `
    <tr><th>Metric</th>${seriesData.map((s) => `<th>${s.name}</th>`).join("")}</tr>
    ${stats
      .map(
        (r) =>
          `<tr><th>${r.metric}</th>${r.values.map((v) => `<td>${v}</td>`).join("")}</tr>`,
      )
      .join("")}
  `;

  const fullHtml = generateHtml(alignedSeriesData, reportTitle, stats, CAPTOR_LOGO_URL);

  const reportPath = join(tmpdir(), `captor-report-${Date.now()}.html`);
  writeFileSync(reportPath, fullHtml, "utf-8");

  console.log(`Report saved to ${reportPath}`);
  console.log("Opening in browser...");
  await open(reportPath, { wait: false });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
