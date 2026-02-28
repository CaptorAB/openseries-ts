import { describe, it, expect } from "vitest";
import { OpenTimeSeries } from "../src/series";
import { OpenFrame } from "../src/frame";
import { ValueType } from "../src/types";

function makeSeries(name: string, startVal: number, n: number): OpenTimeSeries {
  const dates = Array.from({ length: n }, (_, i) => {
    const d = new Date("2020-01-01");
    d.setDate(d.getDate() + i);
    return d.toISOString().slice(0, 10);
  });
  const values = Array.from({ length: n }, (_, i) => startVal + i * 0.5 + Math.random() * 0.2);
  return OpenTimeSeries.fromArrays(name, dates, values);
}

describe("OpenFrame", () => {
  it("creates from constituents", () => {
    const s1 = makeSeries("A", 100, 10);
    const s2 = makeSeries("B", 200, 10);
    const frame = new OpenFrame([s1, s2], [0.5, 0.5]);
    expect(frame.itemCount).toBe(2);
  });

  it("computes correlation matrix", () => {
    const s1 = makeSeries("A", 100, 50);
    const s2 = makeSeries("B", 100, 50);
    const frame = new OpenFrame([s1, s2]);
    const corr = frame.correlMatrix();
    expect(corr.length).toBe(2);
    expect(corr[0][0]).toBeCloseTo(1);
  });

  it("makes portfolio with weights", () => {
    const s1 = makeSeries("A", 100, 20);
    const s2 = makeSeries("B", 100, 20);
    const frame = new OpenFrame([s1, s2], [0.6, 0.4]);
    const port = frame.makePortfolio("Portfolio");
    expect(port.dates.length).toBeGreaterThan(0);
    expect(port.values.length).toBe(port.dates.length);
  });

  it("makes portfolio with eq_weights strategy", () => {
    const s1 = makeSeries("A", 100, 20);
    const s2 = makeSeries("B", 100, 20);
    const frame = new OpenFrame([s1, s2]);
    const port = frame.makePortfolio("Portfolio", "eq_weights");
    expect(port.values[0]).toBeCloseTo(1);
  });
});
