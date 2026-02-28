/**
 * Full-page series plot (line chart) output.
 * Analogous to Python openseries plot_series: single full-page HTML with optional title.
 */

import { writeFileSync, existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import open from "open";
import { OpenFrame } from "./frame";
import { OpenTimeSeries } from "./series";
import { ffill, pctChange } from "./utils";

const DEFAULT_LOGO_URL =
  "https://sales.captor.se/captor_logo_sv_1600_icketransparent.png";

export interface PlotSeriesOptions {
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

const DEFAULT_TITLE = "Series Plot";

function defaultOutputDir(): string {
  const documents = join(homedir(), "Documents");
  return existsSync(documents) ? documents : homedir();
}

function seriesToPlotData(
  series: OpenTimeSeries | OpenFrame,
): { name: string; dates: string[]; values: number[] }[] {
  if (series instanceof OpenTimeSeries) {
    return [
      {
        name: series.label,
        dates: series.dates,
        values: series.values,
      },
    ];
  }
  const frame = series as OpenFrame;
  const { dates, columns } = frame.tsdf;
  const colsFfilled = columns.map((col) => ffill(col));
  return frame.columnLabels.map((name, i) => ({
    name,
    dates,
    values: colsFfilled[i] ?? [],
  }));
}

function toCumulativeReturns(
  data: { name: string; dates: string[]; values: number[] }[],
): { name: string; dates: string[]; values: number[] }[] {
  return data.map((s) => {
    const vals = ffill(s.values);
    const rets = pctChange(vals);
    rets[0] = 0;
    const cum = [100];
    for (let i = 1; i < rets.length; i++) {
      cum.push((cum[i - 1] ?? 0) * (1 + rets[i]!));
    }
    return { name: s.name, dates: s.dates, values: cum };
  });
}

const COLORWAY = [
  "#66725B",
  "#D0C0B1",
  "#253551",
  "#8D929D",
  "#611A51",
  "#402D16",
  "#5D6C85",
  "#404752",
];

/**
 * Generate full-page HTML with a line chart of the series (or multiple series).
 * Plots cumulative returns (100 base) like Python plot_series.
 * Works with OpenTimeSeries or OpenFrame. For OpenFrame, use mergeSeries("inner") first.
 *
 * @param seriesOrFrame - OpenTimeSeries or OpenFrame
 * @param options - Optional title
 * @returns HTML string
 */
export function plotSeriesHtml(
  seriesOrFrame: OpenTimeSeries | OpenFrame,
  options: PlotSeriesOptions = {},
): string {
  const title = options.title ?? DEFAULT_TITLE;
  const logoUrl =
    options.addLogo !== false
      ? (options.logoUrl ?? DEFAULT_LOGO_URL)
      : "";
  const rawData = seriesToPlotData(seriesOrFrame);
  const cumData = toCumulativeReturns(rawData);
  const chartColors = cumData.map((_, i) => COLORWAY[i % COLORWAY.length]);

  const logoEl = logoUrl
    ? `<div class="plot-header-logo"><img src="${logoUrl}" alt="Logo" /></div>`
    : '<div></div>';

  const titleEl =
    title !== ""
      ? `<h1 class="plot-title">${title}</h1>`
      : '<div></div>';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${title}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap" rel="stylesheet">
  <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/chartjs-adapter-date-fns@3.0.0/dist/chartjs-adapter-date-fns.bundle.min.js"></script>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html, body { height: 100%; overflow: hidden; }
    body {
      font-family: 'Poppins', -apple-system, BlinkMacSystemFont, sans-serif;
      background: #fff;
      color: #253551;
      display: flex;
      flex-direction: column;
      min-height: 0;
    }
    .plot-header {
      flex-shrink: 0;
      display: grid;
      grid-template-columns: 1fr auto 1fr;
      align-items: center;
      gap: 16px;
      padding: 16px 24px;
      min-height: 80px;
    }
    .plot-header-logo { display: flex; align-items: center; }
    .plot-header-logo img { height: 60px; width: auto; max-width: 270px; object-fit: contain; }
    .plot-title { grid-column: 2; text-align: center; font-size: 1.5rem; font-weight: 600; margin: 0; line-height: 1.2; }
    @media (max-width: 768px) {
      .plot-header { grid-template-columns: 1fr; grid-template-rows: auto auto; gap: 12px; text-align: center; }
      .plot-header-logo { justify-content: center; grid-column: 1; }
      .plot-header-logo img { height: 54px; max-width: 210px; }
      .plot-title { grid-column: 1; grid-row: 2; font-size: 1.25rem; }
    }
    .plot-main {
      flex: 1;
      min-height: 0;
      display: flex;
      flex-direction: column;
      padding: 24px;
    }
    .plot-wrapper {
      flex: 1;
      min-height: 200px;
      position: relative;
    }
    .plot-wrapper canvas { max-width: 100%; }
    .plot-legend {
      flex-shrink: 0;
      display: flex;
      gap: 24px;
      flex-wrap: wrap;
      justify-content: center;
      padding-top: 16px;
      font-size: 0.8125rem;
      color: #253551;
    }
    .plot-legend-item {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .plot-legend-color {
      width: 20px;
      height: 3px;
      border-radius: 2px;
      flex-shrink: 0;
    }
  </style>
</head>
<body>
  <header class="plot-header">
    ${logoEl}
    ${titleEl}
  </header>
  <div class="plot-main">
    <div class="plot-wrapper"><canvas id="plotChart"></canvas></div>
    <div class="plot-legend" id="legend"></div>
  </div>

  <script>
    const cumData = ${JSON.stringify(cumData)};
    const chartColors = ${JSON.stringify(chartColors)};

    Chart.defaults.font.family = "'Poppins', sans-serif";
    const ctx = document.getElementById('plotChart').getContext('2d');
    new Chart(ctx, {
      type: 'line',
      data: {
        datasets: cumData.map((s, i) => ({
          label: s.name,
          data: s.dates.map((d, j) => ({ x: d, y: s.values[j] })),
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
          y: {
            beginAtZero: false,
            grid: { color: '#EEEEEE' },
            ticks: { callback: v => v + '%' },
          },
          x: {
            type: 'time',
            grid: { color: '#EEEEEE' },
            ticks: { maxRotation: 45 },
            time: {
              displayFormats: {
                millisecond: 'HH:mm:ss',
                second: 'HH:mm:ss',
                minute: 'HH:mm',
                hour: 'HH:mm',
                day: 'MMM d',
                week: 'MMM d',
                month: 'MMM yyyy',
                quarter: 'qqq yyyy',
                year: 'yyyy',
              },
              tooltipFormat: 'yyyy-MM-dd',
            },
          },
        },
        plugins: { legend: { display: false } },
      },
    });

    const legendEl = document.getElementById('legend');
    chartColors.forEach((c, i) => {
      const d = document.createElement('div');
      d.className = 'plot-legend-item';
      d.innerHTML = '<span class="plot-legend-color" style="background:' + c + '"></span><span>' + cumData[i].name + '</span>';
      legendEl.appendChild(d);
    });
  </script>
</body>
</html>`;
}

/**
 * Generate full-page series plot HTML, write to file, and optionally open in browser.
 * Analogous to Python plot_series with auto_open.
 *
 * @param seriesOrFrame - OpenTimeSeries or OpenFrame (use mergeSeries("inner") for frame)
 * @param options - Title, filename, autoOpen
 * @returns Path to the written HTML file
 */
export async function plotSeries(
  seriesOrFrame: OpenTimeSeries | OpenFrame,
  options: PlotSeriesOptions = {},
): Promise<string> {
  const { filename, autoOpen = true } = options;
  const html = plotSeriesHtml(seriesOrFrame, options);

  const defaultDir = defaultOutputDir();
  const plotPath =
    filename !== undefined
      ? filename.includes("/") || filename.includes("\\")
        ? filename
        : join(defaultDir, filename)
      : join(defaultDir, "plot.html");

  writeFileSync(plotPath, html, "utf-8");

  if (autoOpen) {
    await open(plotPath, { wait: false });
  }

  return plotPath;
}
