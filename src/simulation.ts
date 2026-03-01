import { generateCalendarDateRange } from "./datefixer";

export type RandomGenerator = () => number;

function createRng(seed?: number): () => number {
  let s = seed ?? Math.floor(Math.random() * 0xffffffff);
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
}

function boxMuller(rng: () => number): () => number {
  let spare: number | null = null;
  return () => {
    if (spare != null) {
      const s = spare;
      spare = null;
      return s;
    }
    let u = 0;
    let v = 0;
    while (u === 0) u = rng();
    while (v === 0) v = rng();
    const r = Math.sqrt(-2 * Math.log(u));
    spare = r * Math.sin(2 * Math.PI * v);
    return r * Math.cos(2 * Math.PI * v);
  };
}

function samplePoisson(lamda: number, rng: () => number): number {
  const u = rng();
  let p = Math.exp(-lamda);
  let s = p;
  let k = 0;
  while (u > s) {
    k++;
    p *= lamda / k;
    s += p;
  }
  return k;
}

/** Monte Carlo return simulation with optional seed for reproducibility. */
export class ReturnSimulation {
  readonly numberOfSims: number;
  readonly tradingDays: number;
  readonly tradingDaysInYear: number;
  readonly meanAnnualReturn: number;
  readonly meanAnnualVol: number;
  readonly dframe: number[][];
  readonly seed?: number;
  readonly jumpsLamda: number;
  readonly jumpsSigma: number;
  readonly jumpsMu: number;

  constructor(params: {
    number_of_sims: number;
    trading_days: number;
    trading_days_in_year: number;
    mean_annual_return: number;
    mean_annual_vol: number;
    dframe: number[][];
    seed?: number;
    jumps_lamda?: number;
    jumps_sigma?: number;
    jumps_mu?: number;
  }) {
    this.numberOfSims = params.number_of_sims;
    this.tradingDays = params.trading_days;
    this.tradingDaysInYear = params.trading_days_in_year;
    this.meanAnnualReturn = params.mean_annual_return;
    this.meanAnnualVol = params.mean_annual_vol;
    this.dframe = params.dframe;
    this.seed = params.seed;
    this.jumpsLamda = params.jumps_lamda ?? 0;
    this.jumpsSigma = params.jumps_sigma ?? 0;
    this.jumpsMu = params.jumps_mu ?? 0;
  }

  get results(): number[][] {
    return this.dframe.map((row) => {
      let acc = 1;
      return row.map((r) => (acc *= 1 + r));
    });
  }

  get realizedMeanReturn(): number {
    const res = this.results[0];
    const rets = [];
    for (let i = 1; i < res.length; i++) {
      rets.push((res[i] - res[i - 1]) / res[i - 1]);
    }
    return (
      (rets.reduce((a, b) => a + b, 0) / rets.length) * this.tradingDaysInYear
    );
  }

  get realizedVol(): number {
    const res = this.results[0];
    const rets = [];
    for (let i = 1; i < res.length; i++) {
      rets.push((res[i] - res[i - 1]) / res[i - 1]);
    }
    const mean = rets.reduce((a, b) => a + b, 0) / rets.length;
    const variance =
      rets.reduce((s, r) => s + (r - mean) ** 2, 0) / (rets.length - 1);
    return Math.sqrt(variance * this.tradingDaysInYear);
  }

  static fromNormal(
    number_of_sims: number,
    mean_annual_return: number,
    mean_annual_vol: number,
    trading_days: number,
    trading_days_in_year = 252,
    seed?: number,
  ): ReturnSimulation {
    const rng = boxMuller(createRng(seed));
    const mu = mean_annual_return / trading_days_in_year;
    const sigma = mean_annual_vol / Math.sqrt(trading_days_in_year);
    const dframe: number[][] = [];
    for (let i = 0; i < number_of_sims; i++) {
      const row: number[] = [];
      for (let j = 0; j < trading_days; j++) {
        row.push(mu + sigma * rng());
      }
      dframe.push(row);
    }
    return new ReturnSimulation({
      number_of_sims,
      trading_days: trading_days,
      trading_days_in_year,
      mean_annual_return,
      mean_annual_vol,
      dframe,
      seed,
    });
  }

  static fromGbm(
    number_of_sims: number,
    mean_annual_return: number,
    mean_annual_vol: number,
    trading_days: number,
    trading_days_in_year = 252,
    seed?: number,
  ): ReturnSimulation {
    const rng = boxMuller(createRng(seed));
    const drift =
      (mean_annual_return - 0.5 * mean_annual_vol ** 2) / trading_days_in_year;
    const sigma = mean_annual_vol / Math.sqrt(trading_days_in_year);
    const dframe: number[][] = [];
    for (let i = 0; i < number_of_sims; i++) {
      const row: number[] = [];
      for (let j = 0; j < trading_days; j++) {
        row.push(drift + sigma * rng());
      }
      dframe.push(row);
    }
    return new ReturnSimulation({
      number_of_sims,
      trading_days: trading_days,
      trading_days_in_year,
      mean_annual_return,
      mean_annual_vol,
      dframe,
      seed,
    });
  }

  static fromLognormal(
    number_of_sims: number,
    mean_annual_return: number,
    mean_annual_vol: number,
    trading_days: number,
    trading_days_in_year = 252,
    seed?: number,
  ): ReturnSimulation {
    const rng = boxMuller(createRng(seed));
    const mu = mean_annual_return / trading_days_in_year;
    const sigma = mean_annual_vol / Math.sqrt(trading_days_in_year);
    const dframe: number[][] = [];
    for (let i = 0; i < number_of_sims; i++) {
      const row: number[] = [];
      for (let j = 0; j < trading_days; j++) {
        const z = rng();
        row.push(Math.exp(mu + sigma * z) - 1);
      }
      dframe.push(row);
    }
    return new ReturnSimulation({
      number_of_sims,
      trading_days,
      trading_days_in_year,
      mean_annual_return,
      mean_annual_vol,
      dframe,
      seed,
    });
  }

  static fromMertonJumpGbm(
    number_of_sims: number,
    trading_days: number,
    mean_annual_return: number,
    mean_annual_vol: number,
    jumps_lamda: number,
    jumps_sigma = 0,
    jumps_mu = 0,
    trading_days_in_year = 252,
    seed?: number,
  ): ReturnSimulation {
    const uniformRng = createRng(seed);
    const normalRng = boxMuller(() => uniformRng());
    const sigmaDaily = mean_annual_vol / Math.sqrt(trading_days_in_year);
    const lamdaDaily = jumps_lamda / trading_days_in_year;
    const drift =
      (mean_annual_return -
        0.5 * mean_annual_vol ** 2 -
        jumps_lamda * (jumps_mu + jumps_sigma ** 2)) /
      trading_days_in_year;

    const dframe: number[][] = [];
    for (let i = 0; i < number_of_sims; i++) {
      const row: number[] = [];
      for (let j = 0; j < trading_days; j++) {
        const wiener = sigmaDaily * normalRng();
        const nJumps = samplePoisson(lamdaDaily, uniformRng);
        const jumpNormal =
          nJumps === 0 ? 0 : jumps_mu + jumps_sigma * normalRng();
        const poissonJumps = nJumps * jumpNormal;
        row.push(drift + wiener + poissonJumps);
      }
      row[0] = 0;
      dframe.push(row);
    }
    return new ReturnSimulation({
      number_of_sims,
      trading_days,
      trading_days_in_year,
      mean_annual_return,
      mean_annual_vol,
      dframe,
      seed,
      jumps_lamda,
      jumps_sigma,
      jumps_mu,
    });
  }

  toDateColumns(
    name: string,
    options?: { start?: string; end?: string; asReturns?: boolean },
  ): { dates: string[]; columns: { name: string; values: number[] }[] } {
    const dates = generateCalendarDateRange(this.tradingDays, options);
    const asReturns = options?.asReturns !== false;
    const data = asReturns ? this.dframe : this.results;
    const columns: { name: string; values: number[] }[] = [];
    if (this.numberOfSims === 1) {
      columns.push({ name, values: data[0].map((v) => v) });
    } else {
      for (let i = 0; i < this.numberOfSims; i++) {
        columns.push({
          name: `${name}_${i}`,
          values: data[i].map((v) => v),
        });
      }
    }
    return { dates, columns };
  }
}

/** Returns a seeded RNG function returning values in [0, 1). */
export function randomGenerator(seed?: number): () => number {
  return createRng(seed);
}
