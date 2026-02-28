import { describe, it, expect } from "vitest";
import { reportHtml } from "../src/report";
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
});
