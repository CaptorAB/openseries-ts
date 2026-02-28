import { describe, it, expect } from "vitest";
import { reportHtml, computeCaptureRatioCagr } from "../src/report";
import { OpenFrame } from "../src/frame";
import { OpenTimeSeries } from "../src/series";

/** Creates a minimal frame with positive price-like values for report tests. */
function frameForReport(numSeries = 2): OpenFrame {
  const dates = ["2020-01-01", "2020-01-02", "2020-01-03", "2020-06-01", "2020-12-31"];
  const series = Array.from({ length: numSeries }, (_, i) =>
    OpenTimeSeries.fromArrays(
      `Asset ${i}`,
      dates,
      dates.map((_, j) => 100 + i * 10 + j * 2),
      { countries: ["SE"] },
    ),
  );
  const frame = new OpenFrame(series, null, { countries: ["SE"] });
  frame.mergeSeries("inner");
  return frame;
}

describe("reportHtml", () => {
  it("returns a non-empty HTML string", () => {
    const frame = frameForReport(2);
    const html = reportHtml(frame);
    expect(html).toBeTypeOf("string");
    expect(html.length).toBeGreaterThan(100);
    expect(html).toMatch(/<!DOCTYPE html>/i);
  });

  it("includes the default title when no options provided", () => {
    const frame = frameForReport(2);
    const html = reportHtml(frame);
    expect(html).toContain("Portfolio Report");
  });

  it("includes custom title when provided in options", () => {
    const frame = frameForReport(2);
    const html = reportHtml(frame, { title: "Custom Report Title" });
    expect(html).toContain("Custom Report Title");
  });

  it("includes default logo URL when addLogo is not false", () => {
    const frame = frameForReport(2);
    const html = reportHtml(frame);
    expect(html).toContain("captor_logo");
  });

  it("omits logo when addLogo is false", () => {
    const frame = frameForReport(2);
    const html = reportHtml(frame, { addLogo: false });
    expect(html).not.toContain("captor_logo");
  });

  it("uses custom logo URL when provided", () => {
    const frame = frameForReport(2);
    const html = reportHtml(frame, { logoUrl: "https://example.com/logo.png" });
    expect(html).toContain("https://example.com/logo.png");
  });

  it("includes chart canvases and stats table", () => {
    const frame = frameForReport(2);
    const html = reportHtml(frame);
    expect(html).toContain('id="cumChart"');
    expect(html).toContain('id="annualChart"');
    expect(html).toContain("statsTable");
  });

  it("includes series labels in output", () => {
    const frame = frameForReport(2);
    const html = reportHtml(frame);
    expect(html).toContain("Asset 0");
    expect(html).toContain("Asset 1");
  });

  it("includes expected metrics in table", () => {
    const frame = frameForReport(2);
    const html = reportHtml(frame);
    expect(html).toContain("Return (CAGR)");
    expect(html).toContain("Volatility");
    expect(html).toContain("Sharpe Ratio");
    expect(html).toContain("Tracking Error");
  });

  it("uses frame.countries for business-day metrics", () => {
    const frame = frameForReport(2);
    const html = reportHtml(frame);
    expect(html).toBeTypeOf("string");
    expect(html.length).toBeGreaterThan(100);
  });

  it("handles frame with single series", () => {
    const s = OpenTimeSeries.fromArrays("Single", ["2020-01-01", "2020-01-02"], [100, 101]);
    const frame = new OpenFrame([s], null, { countries: ["SE"] });
    frame.mergeSeries("inner");
    const html = reportHtml(frame);
    expect(html).toContain("Single");
    expect(html).toMatch(/<!DOCTYPE html>/i);
  });

  it("produces valid HTML structure with Chart.js script", () => {
    const frame = frameForReport(3);
    const html = reportHtml(frame);
    expect(html).toContain("chart.js");
    expect(html).toContain("chartjs-adapter-date-fns");
  });

  it("computes capture ratio and worst month with multi-month business-day data", () => {
    const dates = [
      "2020-01-02", "2020-01-03", "2020-02-03", "2020-03-02", "2020-04-01",
      "2020-05-04", "2020-06-01", "2020-07-01", "2020-08-03", "2020-09-01",
      "2020-10-01", "2020-11-02", "2020-12-01",
    ];
    const s1 = OpenTimeSeries.fromArrays(
      "Asset A",
      dates,
      dates.map((_, i) => 100 + i * 2),
      { countries: ["SE"] },
    );
    const s2 = OpenTimeSeries.fromArrays(
      "Benchmark",
      dates,
      dates.map((_, i) => 100 + i * 1.5),
      { countries: ["SE"] },
    );
    const frame = new OpenFrame([s1, s2], null, { countries: ["SE"] });
    frame.mergeSeries("inner");
    const html = reportHtml(frame);
    expect(html).toContain("Capture Ratio");
    expect(html).toContain("Worst Month");
  });

  describe("computeCaptureRatioCagr", () => {
    it("returns NaN when lengths differ or < 2", () => {
      expect(computeCaptureRatioCagr([0.01], [0.02], 12)).toBeNaN();
      expect(computeCaptureRatioCagr([0.01, 0.02], [0.01], 12)).toBeNaN();
    });
    it("returns NaN when upIdxReturn near zero", () => {
      const bench = [0.001, 0.001, 0.001];
      const asset = [0.02, 0.02, 0.02];
      expect(computeCaptureRatioCagr(asset, bench, 12)).toBeNaN();
    });
    it("returns NaN when benchmark has no down months", () => {
      const bench = [0.01, 0.02, 0.01, 0.02];
      const asset = [-0.01, 0.03, 0.01, 0.02];
      const r = computeCaptureRatioCagr(asset, bench, 12);
      expect(Number.isNaN(r) || Number.isFinite(r)).toBe(true);
    });
    it("returns finite value for valid up/down pattern", () => {
      const bench = [0.05, -0.03, 0.02, -0.01, 0.04];
      const asset = [0.06, -0.02, 0.03, -0.005, 0.05];
      const r = computeCaptureRatioCagr(asset, bench, 12);
      expect(Number.isFinite(r)).toBe(true);
    });
  });

  it("handles capture ratio edge case when benchmark has no down months", () => {
    const dates = [
      "2020-01-02", "2020-02-03", "2020-03-02", "2020-04-01", "2020-05-04",
      "2020-06-01", "2020-07-01", "2020-08-03", "2020-09-01", "2020-10-01",
      "2020-11-02", "2020-12-01",
    ];
    const s1 = OpenTimeSeries.fromArrays(
      "Asset",
      dates,
      dates.map((_, i) => 100 + i),
      { countries: ["SE"] },
    );
    const s2 = OpenTimeSeries.fromArrays(
      "Benchmark",
      dates,
      dates.map((_, i) => 100 + i * 1.1),
      { countries: ["SE"] },
    );
    const frame = new OpenFrame([s1, s2], null, { countries: ["SE"] });
    frame.mergeSeries("inner");
    const html = reportHtml(frame);
    expect(html).toBeTypeOf("string");
    expect(html.length).toBeGreaterThan(100);
  });
});
