# openseries (TypeScript)

Tools for analyzing financial timeseries of a single asset or a group of assets. Designed for daily or less frequent data. TypeScript port of the [Python openseries](https://pypi.org/project/openseries/) package.

## Quick Start

```typescript
import { OpenTimeSeries } from "openseries-ts";

const dates = ["2020-01-02", "2020-01-03", "2020-01-06", "2020-01-07"];
const values = [100, 101, 102, 99];

const series = OpenTimeSeries.fromArrays("My Series", dates, values);
series.valueToRet();

console.log(series.geoRet());    // CAGR
console.log(series.vol());      // Annualized volatility
console.log(series.maxDrawdown()); // Max drawdown
```

## Features

- **OpenTimeSeries**: Single timeseries with risk metrics (CAGR, volatility, VaR, CVaR, Sortino ratio, max drawdown, etc.)
- **OpenFrame**: Multi-series comparison, correlation, portfolio construction, rebalancing
- **ReturnSimulation**: Monte Carlo with reproducible seeds (normal, lognormal, GBM, Merton jump-diffusion)
- **Portfolio tools**: Efficient frontier, simulated portfolios, weight strategies
- **Date utilities**: Business day calendars (via date-holidays), date offsets, period-end alignment
- **Captor API**: Fetch timeseries from Captor Open API (`fetchCaptorSeries`, `fetchCaptorSeriesBatch`)
- **Report**: `reportHtml(frame, options)` — programmatic HTML report; CLI via `npm run report`
- **Plot**: `plotSeriesHtml()`, `plotSeries()` — full-page series line chart (like Python `plot_series`)

## API Overview

### OpenTimeSeries

- `fromArrays()`, `fromObject()`, `fromDateColumns()` — create from dates/values or simulation output
- `valueToRet()`, `toCumret()` - Convert price ↔ returns
- `geoRet()`, `arithmeticRet()`, `vol()`, `varDown()`, `cvarDown()`
- `sortinoRatio()`, `retVolRatio()`, `maxDrawdown()`, `downsideDeviation()`
- `ewmaVolFunc()`, `ewmaVarFunc()` - EWMA risk measures

### OpenFrame

- `mergeSeries()`, `truncFrame()` - Align multiple series
- `makePortfolio()` - Weighted portfolio (eq_weights, inv_vol, max_div)
- `rebalancedPortfolio()` - Rebalanced TWR
- `correlMatrix()`, `trackingErrorFunc()`, `infoRatioFunc()`, `beta()`

### ReturnSimulation

- `fromNormal()`, `fromLognormal()`, `fromGbm()`, `fromMertonJumpGbm()` — all accept optional `seed` for reproducibility
- `toDateColumns(name, options?)` — returns dates and columns (as returns or cumulative prices)
- `randomGenerator(seed?)` — seeded RNG for custom use

### Captor API

- `fetchCaptorSeries(id)` — fetch a single series from Captor Open API
- `fetchCaptorSeriesBatch(ids)` — fetch multiple series

### Report

- `reportHtml(frame, options?)` — generate HTML report (cumulative performance, annual returns, stats) from an OpenFrame. Options: `title`, `logoUrl`, `addLogo`. Countries for business-day metrics come from `frame.countries`.

### Plot

- `plotSeriesHtml(seriesOrFrame, options?)` — generate full-page HTML with a line chart of cumulative returns (100 base). Works with `OpenTimeSeries` or `OpenFrame` (use `mergeSeries("inner")` first). Options: `title`, `logoUrl`, `addLogo`.
- `plotSeries(seriesOrFrame, options?)` — async: writes HTML to file and optionally opens in browser. Options: `title`, `logoUrl`, `addLogo`, `filename` (default: `~/Documents/plot.html`), `autoOpen` (default: true).

## Documentation

API reference: https://captorab.github.io/openseries-ts/

To regenerate docs locally:

```bash
npm run docs
```

This writes static HTML to `docs/`. To serve them via GitHub Pages:

1. Run `npm run docs` and commit the `docs/` folder
2. In the repo: **Settings → Pages**
3. Under **Source**, choose **Deploy from a branch**
4. Branch: `main` (or your default branch), folder: `/docs`

Docs will be available at `https://<username>.github.io/<repo>/`.

## Scripts

### Build & Development

| Command | Description |
|---------|-------------|
| `npm run build` | Build `dist/` (ESM + CJS + declarations) |
| `npm run test` | Run Vitest test suite |
| `npm run test:coverage` | Run tests with Istanbul coverage report |
| `npm run lint` | Run ESLint on `src/` |
| `npm run lint:fix` | ESLint with auto-fix |
| `npm run typecheck` | TypeScript check (`tsc --noEmit`) |
| `npm run check` | Run lint + typecheck |
| `npm run docs` | Generate API docs to `docs/` (TypeDoc) |

### Report Script

Generates an HTML portfolio report from Captor API timeseries (cumulative performance, annual returns, statistics).

| Command | Description |
|---------|-------------|
| `npm run report` | Report with custom or default Captor series IDs |
| `npm run report:iris` | Preset: Captor Iris Bond + Benchmark Index |
| `npm run report:captor` | Same as `report` (default Captor IDs) |

**Options** (pass after `--`): `--ids id1 id2 ...`, `--iris`, `--title "Title"`, `--countries "SE,US"`, `--from-date YYYY-MM-DD`, `--to-date YYYY-MM-DD`, `--filename path`, `--no-open`, `--no-logo`.

**Examples:**
```bash
npm run report -- --ids 638f681e 5b72a10c 5c1115fb
npm run report:iris -- --from-date 2023-01-01 --to-date 2024-12-31 --no-open
```

### Plot Script

Generates a full-page HTML line chart of cumulative returns (100 base) from Captor API timeseries.

| Command | Description |
|---------|-------------|
| `npm run plot` | Plot with custom or default Captor series IDs |
| `npm run plot:iris` | Preset: Captor Iris Bond + Benchmark Index |
| `npm run plot:captor` | Same as `plot` |

**Options** (pass after `--`): same as Report (`--ids`, `--iris`, `--title`, `--countries`, `--from-date`, `--to-date`, `--filename`, `--no-open`, `--no-logo`).

**Examples:**
```bash
npm run plot:iris
npm run plot -- --ids id1 id2 --no-open --filename my-plot.html
```

### Efficient Frontier Script

Simulates asset returns (lognormal), builds portfolio frame, computes efficient frontier and max-Sharpe portfolio, and plots simulated portfolios, frontier, and labeled points (assets, current, optimum). Mirrors the Python openseries Jupyter notebook workflow.

| Command | Description |
|---------|-------------|
| `npm run efficient-frontier` | Run efficient frontier demo |

**Options** (pass after `--`): `--simulations N` (default: 5000), `--points N` (default: 30), `--seed N` (default: 71), `--countries "SE"`, `--title "Title"`, `--filename path`, `--no-open`, `--no-logo`.

**Example:**
```bash
npm run efficient-frontier -- --simulations 3000 --points 25 --no-open
```

## License

BSD-3-Clause
