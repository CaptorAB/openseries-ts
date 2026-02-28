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
- **Date utilities**: Business day calendars, date offsets, period-end alignment

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

## Documentation

API docs are generated with TypeDoc:

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

```bash
npm run build          # Build dist/
npm run test           # Run tests
npm run test:coverage  # Tests with coverage
npm run lint           # ESLint
npm run lint:fix       # ESLint with auto-fix
npm run typecheck      # TypeScript check
npm run check          # lint + typecheck
npm run docs           # Generate API docs to docs/
npm run report         # Captor API report (optional --title)
```

## License

BSD-3-Clause
