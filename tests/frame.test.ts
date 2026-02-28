import { describe, it, expect } from "vitest";
import { OpenFrame } from "../src/frame";
import { simulatedFrame } from "./fixtures";

const to9 = (x: number) => x.toFixed(9);

describe("OpenFrame", () => {
  it("creates from constituents", () => {
    const frame = simulatedFrame({ numAssets: 2 });
    expect(frame.itemCount).toBe(2);
  });

  it("computes correlation matrix - diagonal and off-diagonal match expected (seed 71)", () => {
    const frame = simulatedFrame();
    const corr = frame.correlMatrix();
    expect(corr.length).toBe(3);
    expect(to9(corr[0][0])).toBe("1.000000000");
    expect(to9(corr[1][1])).toBe("1.000000000");
    expect(to9(corr[2][2])).toBe("1.000000000");
    expect(to9(corr[0][1])).toBe("0.036829293");
  });

  it("makePortfolio with weights - first and last values match expected (seed 71)", () => {
    const frame = simulatedFrame();
    const port = frame.makePortfolio("P");
    expect(to9(port.values[0])).toBe("1.000000000");
    expect(to9(port.values[port.values.length - 1])).toBe("0.000044611");
  });

  it("makePortfolio eq_weights - last value matches expected (seed 71)", () => {
    const frame = simulatedFrame();
    const port = frame.makePortfolio("P", "eq_weights");
    expect(port.values[0]).toBeCloseTo(1);
    expect(to9(port.values[port.values.length - 1])).toBe("0.000044611");
  });

  it("makePortfolio inv_vol - last value matches expected (seed 71)", () => {
    const frame = simulatedFrame();
    const port = frame.makePortfolio("P", "inv_vol");
    expect(to9(port.values[port.values.length - 1])).toBe("6076.987351429");
  });

  it("trackingError matches expected (seed 71)", () => {
    const frame = simulatedFrame();
    const te = frame.trackingError(0);
    expect(to9(te[0])).toBe("0.000000000");
    expect(to9(te[1])).toBe("2051.797710559");
    expect(to9(te[2])).toBe("2057.289530032");
  });

  it("infoRatio matches expected (seed 71)", () => {
    const frame = simulatedFrame();
    const ir = frame.infoRatio(0);
    expect(to9(ir[0])).toBe("0.000000000");
    expect(to9(ir[1])).toBe("0.987702124");
    expect(to9(ir[2])).toBe("1.021492174");
  });

  it("beta and jensenAlpha match expected (seed 71)", () => {
    const frame = simulatedFrame();
    expect(to9(frame.beta(0, 1))).toBe("0.338496765");
    expect(to9(frame.jensenAlpha(0, 1))).toBe("-2005.822663171");
  });

  it("makePortfolio min_vol_overweight produces valid output (seed 71)", () => {
    const frame = simulatedFrame();
    const port = frame.makePortfolio("P", "min_vol_overweight");
    expect(port.values[0]).toBeCloseTo(1);
    expect(port.values.length).toBe(frame.length);
  });

  it("makePortfolio max_div produces valid output (seed 71)", () => {
    const frame = simulatedFrame();
    const port = frame.makePortfolio("P", "max_div");
    expect(port.values[0]).toBeCloseTo(1);
    expect(port.values.length).toBe(frame.length);
  });
});
