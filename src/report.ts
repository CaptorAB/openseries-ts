/**
 * HTML report generation for OpenFrame.
 * Mirror of Python openseries report_html: takes an OpenFrame and produces HTML.
 * Fetch logic is kept outside - callers provide the frame (e.g. from Captor API).
 */

import { OpenFrame } from "./frame";
import { OpenTimeSeries } from "./series";
import { pctChange, ffill } from "./utils";
import {
  filterToBusinessDays,
  lastBusinessDayOfMonth,
  lastBusinessDayOfYear,
  resampleToPeriodEnd,
} from "./bizcalendar";

export interface ReportOptions {
  title?: string;
  logoUrl?: string;
  addLogo?: boolean;
}

const DEFAULT_LOGO_URL = "https://sales.captor.se/captor_logo_sv_1600_icketransparent.png";

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
    if (!byYear[year]) byYear[year] = { first: values[i]!, last: values[i]! };
    else byYear[year]!.last = values[i]!;
  }
  const result: Record<string, number> = {};
  for (const year of Object.keys(byYear).sort()) {
    const { first, last } = byYear[year]!;
    result[year] = first <= 0 ? NaN : last / first - 1;
  }
  return result;
}

/** Exported for testing. CAGR-based capture ratio; returns NaN for edge cases. */
export function computeCaptureRatioCagr(
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

/**
 * Generate HTML report from an OpenFrame.
 * Analogous to Python openseries report_html(data: OpenFrame, ...).
 * The frame should have mergeSeries("inner") already applied.
 *
 * @param frame - OpenFrame with aligned series (mergeSeries("inner"))
 * @param options - Report options (title, logo). Countries come from frame.countries.
 * @returns HTML string
 */
export function reportHtml(frame: OpenFrame, options: ReportOptions = {}): string {
  const title = options.title ?? "Portfolio Report";
  const logoUrl = options.addLogo !== false ? (options.logoUrl ?? DEFAULT_LOGO_URL) : "";
  const countries = frame.countries;

  const benchmarkIdx = frame.itemCount - 1;
  const { dates: rawDates, columns: rawColumns } = frame.tsdf;
  const colsFfilled = rawColumns.map((col) => ffill(col));

  const seriesData = frame.columnLabels.map((name, i) => ({
    name,
    dates: rawDates,
    values: colsFfilled[i]!,
  }));

  const series = frame.columnLabels.map((_, i) =>
    OpenTimeSeries.fromArrays(
      frame.columnLabels[i]!,
      rawDates,
      colsFfilled[i]!,
    ),
  );

  const stats: { metric: string; values: (string | number)[] }[] = [];

  const addRow = (label: string, fn: (s: OpenTimeSeries, i: number) => number) => {
    const vals = series.map((s, i) => fn(s, i));
    stats.push({ metric: label, values: vals.map((v) => (Number.isNaN(v) ? "" : formatPct(v))) });
  };

  const lastDate = rawDates[rawDates.length - 1] ?? "";
  const lastYear = lastDate ? parseInt(lastDate.slice(0, 4), 10) : new Date().getFullYear();
  const lastMonth = lastDate ? parseInt(lastDate.slice(5, 7), 10) : new Date().getMonth() + 1;
  const ytdFrom = lastBusinessDayOfYear(lastYear - 1, countries);
  const mtdFrom =
    lastMonth > 1
      ? lastBusinessDayOfMonth(lastYear, lastMonth - 1, countries)
      : lastBusinessDayOfMonth(lastYear - 1, 12, countries);

  addRow("Return (CAGR)", (s) => s.geoRet());
  addRow("Year-to-Date", (s) => s.valueRet({ fromDate: ytdFrom, toDate: lastDate }));
  addRow("Month-to-Date", (s) => s.valueRet({ fromDate: mtdFrom, toDate: lastDate }));
  addRow("Volatility", (s) => s.vol());
  stats.push({
    metric: "Sharpe Ratio",
    values: series.map((s) => {
      const v = s.retVolRatio(0);
      return Number.isNaN(v) ? "" : formatNum(v);
    }),
  });
  stats.push({
    metric: "Sortino Ratio",
    values: series.map((s) => {
      const v = s.sortinoRatio(0, 0);
      return Number.isNaN(v) ? "" : formatNum(v);
    }),
  });

  const ir = frame.infoRatio(benchmarkIdx);
  const te = frame.trackingError(benchmarkIdx);
  stats.push({
    metric: "Jensen's Alpha",
    values: series.map((_, i) =>
      i === benchmarkIdx ? "" : formatPct(frame.jensenAlpha(i, benchmarkIdx)),
    ),
  });
  stats.push({
    metric: "Information Ratio",
    values: ir.map((v, i) =>
      i === benchmarkIdx ? "" : Number.isNaN(v) ? "" : formatNum(v),
    ),
  });
  stats.push({
    metric: "Tracking Error (weekly)",
    values: te.map((v, i) =>
      i === benchmarkIdx ? "" : Number.isNaN(v) ? "" : formatPct(v),
    ),
  });

  const betas = series.map((_, i) =>
    i === benchmarkIdx ? NaN : frame.beta(i, benchmarkIdx),
  );
  stats.push({
    metric: "Index Beta (weekly)",
    values: betas.map((v) => (Number.isNaN(v) ? "" : formatNum(v))),
  });

  const { dates: bizDates, columns: bizCols } = filterToBusinessDays(
    rawDates,
    colsFfilled,
    countries,
  );
  const monthlyResampled = resampleToPeriodEnd(bizDates, bizCols, "ME", countries);
  const monthlyRets = monthlyResampled.columns.map((col) => {
    const r = pctChange(col);
    r[0] = 0;
    return r.slice(1);
  });

  const captureRatios = series.map((_, i) => {
    if (i === benchmarkIdx) return NaN;
    return computeCaptureRatioCagr(
      monthlyRets[i]!,
      monthlyRets[benchmarkIdx]!,
      12,
    );
  });
  stats.push({
    metric: "Capture Ratio (monthly)",
    values: captureRatios.map((v) => (Number.isNaN(v) ? "" : formatNum(v))),
  });

  const worstMonths = monthlyRets.map((rets) =>
    rets.length === 0 ? NaN : Math.min(...rets),
  );
  stats.push({
    metric: "Worst Month",
    values: worstMonths.map((v) => (Number.isNaN(v) ? "" : formatPct(v))),
  });

  stats.push({
    metric: "Comparison Start",
    values: series.map(() => frame.firstIdx),
  });
  stats.push({
    metric: "Comparison End",
    values: series.map(() => frame.lastIdx),
  });

  return generateHtml(seriesData, title, stats, logoUrl);
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
      cum.push((cum[i - 1] ?? 0) * (1 + rets[i]!));
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

  const colorway = [
    "#66725B",
    "#D0C0B1",
    "#253551",
    "#8D929D",
    "#611A51",
    "#402D16",
    "#5D6C85",
    "#404752",
  ];
  const chartColors = seriesData.map((_, i) => colorway[i % colorway.length]);

  const tableRows = stats
    .map(
      (r) =>
        `<tr><th>${r.metric}</th>${r.values.map((v) => `<td>${v}</td>`).join("")}</tr>`,
    )
    .join("");
  const tableHtml = `<tr><th>Metric</th>${seriesData.map((s) => `<th>${s.name}</th>`).join("")}</tr>${tableRows}`;

  const logoEl = logoUrl
    ? `<div class="header-logo"><img src="${logoUrl}" alt="Logo" /></div>`
    : '<div></div>';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${reportTitle}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap" rel="stylesheet">
  <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/chartjs-adapter-date-fns@3.0.0/dist/chartjs-adapter-date-fns.bundle.min.js"></script>
  <style>
    * { box-sizing: border-box; }
    body { font-family: 'Poppins', -apple-system, BlinkMacSystemFont, sans-serif; margin: 24px; background: #fff; color: #253551; }
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
    .charts { display: grid; grid-template-columns: 1.2fr minmax(300px, 1fr); gap: 24px; align-items: stretch; }
    @media (max-width: 1000px) { .charts { grid-template-columns: 1fr; } }
    .charts-left { display: flex; flex-direction: column; gap: 24px; }
    .chart-section { background: #fff; border: 1px solid #e0e0e0; border-radius: 8px; padding: 16px; }
    .chart-wrapper { height: 280px; position: relative; }
    .chart-section-table { min-width: 0; display: flex; flex-direction: column; justify-content: flex-start; }
    table { border-collapse: collapse; width: 100%; font-size: 0.8125rem; table-layout: fixed; }
    th, td { padding: 6px 12px; text-align: right; border-bottom: 1px solid #eee; }
    th { font-weight: 600; color: #253551; text-align: right; }
    tr:first-child th { border-bottom: 2px solid #333; }
    .legend { display: flex; gap: 24px; flex-wrap: wrap; margin-top: 24px; justify-content: center; font-size: 0.8125rem; color: #253551; }
    .legend-item { display: flex; align-items: center; gap: 8px; }
    .legend-color { width: 20px; height: 3px; border-radius: 2px; flex-shrink: 0; }
  </style>
</head>
<body>
  <div class="main">
    <header class="header">
      ${logoEl}
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
      <div class="chart-section chart-section-table">
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

    Chart.defaults.font.family = "'Poppins', sans-serif";
    const cumCtx = document.getElementById('cumChart').getContext('2d');
    new Chart(cumCtx, {
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
          y: { beginAtZero: false, grid: { color: '#EEEEEE' }, ticks: { callback: v => v + '%' } },
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
          y: { grid: { color: '#EEEEEE' }, ticks: { callback: v => (v * 100).toFixed(1) + '%' } },
          x: { grid: { color: '#EEEEEE' }, ticks: { maxRotation: 45 } },
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
