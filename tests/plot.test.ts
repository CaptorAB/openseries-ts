import { describe, it, expect, vi } from "vitest";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { plotSeriesHtml, plotSeries } from "../src/plot";

vi.mock("open", () => ({
  default: vi.fn().mockResolvedValue(undefined),
}));
import { OpenFrame } from "../src/frame";
import { OpenTimeSeries } from "../src/series";

function frameForPlot(numSeries = 2): OpenFrame {
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

describe("plotSeriesHtml", () => {
  it("returns a non-empty HTML string for OpenTimeSeries", () => {
    const series = OpenTimeSeries.fromArrays(
      "Single",
      ["2020-01-01", "2020-01-02", "2020-01-03"],
      [100, 101, 102],
    );
    const html = plotSeriesHtml(series);
    expect(html).toBeTypeOf("string");
    expect(html.length).toBeGreaterThan(100);
    expect(html).toMatch(/<!DOCTYPE html>/i);
  });

  it("returns a non-empty HTML string for OpenFrame", () => {
    const frame = frameForPlot(2);
    const html = plotSeriesHtml(frame);
    expect(html).toBeTypeOf("string");
    expect(html.length).toBeGreaterThan(100);
    expect(html).toMatch(/<!DOCTYPE html>/i);
  });

  it("includes default title when no options provided", () => {
    const series = OpenTimeSeries.fromArrays("S", ["2020-01-01"], [100]);
    const html = plotSeriesHtml(series);
    expect(html).toContain("Series Plot");
  });

  it("includes custom title when provided", () => {
    const series = OpenTimeSeries.fromArrays("S", ["2020-01-01"], [100]);
    const html = plotSeriesHtml(series, { title: "My Custom Chart" });
    expect(html).toContain("My Custom Chart");
  });

  it("includes chart canvas and Chart.js script", () => {
    const series = OpenTimeSeries.fromArrays("S", ["2020-01-01", "2020-01-02"], [100, 101]);
    const html = plotSeriesHtml(series);
    expect(html).toContain('id="plotChart"');
    expect(html).toContain("chart.js");
  });

  it("includes series labels in legend for OpenFrame", () => {
    const frame = frameForPlot(2);
    const html = plotSeriesHtml(frame);
    expect(html).toContain("Asset 0");
    expect(html).toContain("Asset 1");
  });

  it("handles OpenTimeSeries with single point", () => {
    const series = OpenTimeSeries.fromArrays("One", ["2020-01-01"], [100]);
    const html = plotSeriesHtml(series, { title: "" });
    expect(html).toMatch(/<!DOCTYPE html>/i);
    expect(html).toContain("One");
  });

  it("includes logo when addLogo is not false", () => {
    const series = OpenTimeSeries.fromArrays("S", ["2020-01-01"], [100]);
    const html = plotSeriesHtml(series);
    expect(html).toContain("plot-header-logo");
    expect(html).toContain("captor_logo");
  });

  it("omits logo when addLogo is false", () => {
    const series = OpenTimeSeries.fromArrays("S", ["2020-01-01"], [100]);
    const html = plotSeriesHtml(series, { addLogo: false });
    expect(html).not.toContain("captor_logo");
  });
});

describe("plotSeries", () => {
  it("writes HTML file and returns path when autoOpen is false", async () => {
    const tmpDir = mkdtempSync(join(tmpdir(), "plot-test-"));
    const outputPath = join(tmpDir, "output.html");
    const series = OpenTimeSeries.fromArrays(
      "Test",
      ["2020-01-01", "2020-01-02"],
      [100, 101],
    );

    const result = await plotSeries(series, {
      filename: outputPath,
      autoOpen: false,
    });

    expect(result).toBe(outputPath);
    expect(readFileSync(result, "utf-8")).toMatch(/<!DOCTYPE html>/i);
    expect(readFileSync(result, "utf-8")).toContain("Test");
  });

  it("uses filename as-is when it contains path separators", async () => {
    const tmpDir = mkdtempSync(join(tmpdir(), "plot-test-"));
    const outputPath = join(tmpDir, "chart.html");
    const series = OpenTimeSeries.fromArrays("S", ["2020-01-01"], [100]);

    const result = await plotSeries(series, {
      filename: outputPath,
      autoOpen: false,
    });

    expect(result).toBe(outputPath);
    expect(readFileSync(result, "utf-8")).toMatch(/<!DOCTYPE html>/i);
  });

  it("joins filename with default dir when filename has no path", async () => {
    const series = OpenTimeSeries.fromArrays("S", ["2020-01-01"], [100]);

    const result = await plotSeries(series, {
      filename: "custom-plot.html",
      autoOpen: false,
    });

    expect(result).toMatch(/custom-plot\.html$/);
    expect(readFileSync(result, "utf-8")).toMatch(/<!DOCTYPE html>/i);
  });

  it("works with OpenFrame", async () => {
    const frame = frameForPlot(2);
    const tmpDir = mkdtempSync(join(tmpdir(), "plot-test-"));
    const outputPath = join(tmpDir, "frame-plot.html");

    const result = await plotSeries(frame, {
      title: "Frame Plot",
      filename: outputPath,
      autoOpen: false,
    });

    const content = readFileSync(result, "utf-8");
    expect(content).toContain("Frame Plot");
    expect(content).toContain("Asset 0");
    expect(content).toContain("Asset 1");
  });

  it("calls open when autoOpen is true", async () => {
    const open = (await import("open")).default;
    const tmpDir = mkdtempSync(join(tmpdir(), "plot-test-"));
    const outputPath = join(tmpDir, "open-test.html");
    const series = OpenTimeSeries.fromArrays("S", ["2020-01-01"], [100]);

    await plotSeries(series, { filename: outputPath, autoOpen: true });

    expect(open).toHaveBeenCalledWith(outputPath, { wait: false });
  });
});
