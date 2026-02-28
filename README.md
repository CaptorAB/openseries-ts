# openseries (TypeScript)

Tools for analyzing financial timeseries of a single asset or a group of assets. Designed for daily or less frequent data. TypeScript port of the [Python openseries](https://pypi.org/project/openseries/) package.

## Installation

```bash
npm install openseries-ts
```

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
- **ReturnSimulation**: Monte Carlo (normal, lognormal, GBM, Merton jump-diffusion)
- **Portfolio tools**: Efficient frontier, simulated portfolios, weight strategies
- **Date utilities**: Business day calendars, date offsets, period-end alignment

## API Overview

### OpenTimeSeries

- `fromArrays()`, `fromObject()` - Create from dates/values
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

- `ReturnSimulation.fromNormal()`, `fromLognormal()`, `fromGbm()`, `fromMertonJumpGbm()`

## License

BSD-3-Clause
