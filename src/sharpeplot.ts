/**
 * Efficient frontier scatter plot with simulated portfolios, frontier line,
 * and labeled points (assets, current portfolio, max Sharpe).
 * Analogous to Python openseries sharpeplot.
 */

import { writeFileSync, existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import type {
  SimulatedPortfolio,
  EfficientFrontierPoint,
} from "./portfoliotools";
import type { SharpePlotPoint } from "./portfoliotools";

const DEFAULT_LOGO_URL =
  "https://sales.captor.se/captor_logo_sv_1600_icketransparent.png";

export interface SharpePlotOptions {
  title?: string;
  logoUrl?: string;
  addLogo?: boolean;
  filename?: string;
  autoOpen?: boolean;
  /** Asset labels for frontier/portfolio weight tooltips (e.g. from frame.columnLabels). */
  assetLabels?: string[];
}

function defaultOutputDir(): string {
  const documents = join(homedir(), "Documents");
  return existsSync(documents) ? documents : homedir();
}

/** Maps sharpe ratio to hex color (red low, blue high). */
function sharpeToColor(sharpe: number, minS: number, maxS: number): string {
  if (!Number.isFinite(sharpe) || maxS <= minS) return "#8D929D";
  const t = (sharpe - minS) / (maxS - minS);
  const r = Math.round(101 + 154 * (1 - t));
  const g = Math.round(26 + 129 * (1 - t));
  const b = Math.round(81 + 174 * t);
  return `rgb(${r},${g},${b})`;
}

/**
 * Generates full-page HTML with efficient frontier scatter plot.
 * Simulated portfolios colored by Sharpe ratio, frontier as line, labeled points.
 */
export function sharpeplotHtml(
  simulated: SimulatedPortfolio[],
  frontier: EfficientFrontierPoint[],
  pointFrame: SharpePlotPoint[],
  options: SharpePlotOptions = {},
): string {
  const title = options.title ?? "";
  const logoUrl =
    options.addLogo !== false ? (options.logoUrl ?? DEFAULT_LOGO_URL) : "";

  const sharpes = simulated.map((s) => s.sharpe).filter(Number.isFinite);
  const minS = sharpes.length > 0 ? Math.min(...sharpes) : 0;
  const maxS = sharpes.length > 0 ? Math.max(...sharpes) : 1;

  const simData = simulated.map((s) => ({
    x: s.stdev * 100,
    y: s.ret * 100,
    c: sharpeToColor(s.sharpe, minS, maxS),
  }));

  const assetLabels = options.assetLabels ?? [];
  const frontierData = frontier.map((p) => ({
    x: p.stdev * 100,
    y: p.ret * 100,
    weights: p.weights,
  }));

  const pointColors = [
    "#2E7D32",
    "#8D929D",
    "#253551",
    "#D0C0B1",
    "#611A51",
    "#402D16",
  ];
  const pointData = pointFrame.map((p, i) => ({
    x: p.stdev * 100,
    y: p.ret * 100,
    label: p.label,
    weights: p.weights,
    color: pointColors[i % pointColors.length],
  }));

  const logoEl = logoUrl
    ? `<div class="plot-header-logo"><img src="${logoUrl}" alt="Logo" /></div>`
    : "<div></div>";

  const titleEl =
    title !== "" ? `<h1 class="plot-title">${title}</h1>` : "<div></div>";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Efficient Frontier</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap" rel="stylesheet">
  <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js"></script>
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
    .plot-title { grid-column: 2; text-align: center; font-size: 3rem; font-weight: 600; margin: 0; }
    .plot-main { flex: 1; min-height: 0; padding: 24px; display: flex; flex-direction: column; }
    .plot-wrapper { flex: 1; min-height: 200px; position: relative; }
    .plot-wrapper canvas { max-width: 100%; }
    .plot-legend { flex-shrink: 0; display: flex; gap: 24px; flex-wrap: wrap; justify-content: center; padding-top: 16px; font-size: 0.8125rem; }
    .colorbar { display: flex; align-items: center; gap: 8px; margin-top: 12px; }
    .colorbar-label { font-size: 0.75rem; color: #666; }
  </style>
</head>
<body>
  <header class="plot-header">
    ${logoEl}
    ${titleEl}
  </header>
  <div class="plot-main">
    <div class="plot-wrapper">
      <canvas id="sharpeChart"></canvas>
    </div>
    <div class="colorbar">
      <span class="colorbar-label">Ratio ret / vol &larr;</span>
      <div style="width:120px;height:12px;background:linear-gradient(to right,rgb(255,53,81),rgb(101,114,91));border-radius:2px;"></div>
      <span class="colorbar-label">&rarr;</span>
    </div>
  </div>

  <script>
    const simData = ${JSON.stringify(simData)};
    const frontierData = ${JSON.stringify(frontierData)};
    const pointData = ${JSON.stringify(pointData)};
    const assetLabels = ${JSON.stringify(assetLabels)};

    Chart.defaults.font.family = "'Poppins', sans-serif";
    const ctx = document.getElementById('sharpeChart').getContext('2d');

    const simDs = {
      type: 'scatter',
      label: 'Simulated',
      data: simData.map(p => ({ x: p.x, y: p.y })),
      backgroundColor: simData.map(p => p.c),
      borderColor: simData.map(p => p.c),
      pointRadius: 4,
      pointHoverRadius: 6,
      order: 2,
    };

    const frontierDs = {
      type: 'line',
      label: 'Efficient Frontier',
      data: frontierData,
      borderColor: '#8B7355',
      borderWidth: 2,
      fill: false,
      pointRadius: 0,
      tension: 0.1,
      order: 1,
    };

    const pointDs = pointData.map((p, i) => ({
      type: 'scatter',
      label: p.label,
      data: [{ x: p.x, y: p.y }],
      backgroundColor: p.color,
      borderColor: '#333',
      borderWidth: 1,
      pointRadius: 10,
      pointHoverRadius: 12,
      order: 0,
    }));

    new Chart(ctx, {
      type: 'scatter',
      data: {
        datasets: [simDs, frontierDs, ...pointDs],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: {
            title: { display: true, text: 'annual volatility' },
            min: 0,
            grid: { color: '#EEEEEE' },
            ticks: { callback: v => v + '%' },
          },
          y: {
            title: { display: true, text: 'annual return' },
            grid: { color: '#EEEEEE' },
            ticks: { callback: v => v + '%' },
          },
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            filter: (ctx) => ctx.dataset.label !== 'Simulated',
            callbacks: {
              label: (ctx) => {
                const ds = ctx.dataset;
                const lines = [];
                if (ds.label === 'Efficient Frontier') {
                  lines.push('Efficient Frontier', ctx.raw.x.toFixed(2) + '% vol, ' + ctx.raw.y.toFixed(2) + '% ret');
                  const fp = frontierData[ctx.dataIndex];
                  if (fp?.weights?.length) {
                    const labels = assetLabels.length ? assetLabels : fp.weights.map((_, i) => 'Asset ' + i);
                    labels.forEach((name, i) => {
                      lines.push(name + ': ' + ((fp.weights[i] ?? 0) * 100).toFixed(1) + '%');
                    });
                  }
                } else {
                  const pd = pointData.find(p => p.label === ds.label);
                  if (pd) lines.push(pd.label);
                  lines.push(ctx.raw.x.toFixed(2) + '% vol, ' + ctx.raw.y.toFixed(2) + '% ret');
                  if (pd?.weights?.length) {
                    pd.weights.forEach(({ asset, weight }) => {
                      lines.push(asset + ': ' + (weight * 100).toFixed(1) + '%');
                    });
                  }
                }
                return lines;
              },
            },
          },
        },
      },
      plugins: [{
        id: 'pointLabels',
        afterDatasetsDraw(chart) {
          const ctx = chart.ctx;
          const dsOffset = 2;
          pointData.forEach((p, i) => {
            const idx = dsOffset + i;
            if (idx >= chart.data.datasets.length) return;
            const meta = chart.getDatasetMeta(idx);
            if (!meta.data || !meta.data[0]) return;
            const { x, y } = meta.data[0];
            ctx.save();
            ctx.font = '12px Poppins';
            ctx.fillStyle = '#253551';
            ctx.textAlign = 'center';
            ctx.fillText(p.label, x, y - 14);
            ctx.restore();
          });
        },
      }],
    });
  </script>
</body>
</html>`;
}

/**
 * Writes efficient-frontier HTML to file and optionally opens in browser.
 */
export async function sharpeplot(
  simulated: SimulatedPortfolio[],
  frontier: EfficientFrontierPoint[],
  pointFrame: SharpePlotPoint[],
  options: SharpePlotOptions = {},
): Promise<string> {
  const { filename, autoOpen = true } = options;
  const html = sharpeplotHtml(simulated, frontier, pointFrame, options);

  const defaultDir = defaultOutputDir();
  const plotPath =
    filename !== undefined
      ? filename.includes("/") || filename.includes("\\")
        ? filename
        : join(defaultDir, filename)
      : join(defaultDir, "efficient-frontier.html");

  writeFileSync(plotPath, html, "utf-8");

  if (autoOpen) {
    const open = (await import("open")).default;
    await open(plotPath, { wait: false });
  }

  return plotPath;
}
