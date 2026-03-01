import { describe, it, expect, vi } from "vitest";
import { mkdtempSync, readFileSync, unlinkSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { sharpeplotHtml, sharpeplot } from "../src/sharpeplot";
import { simulatedFrame } from "./fixtures";
import { efficientFrontier, preparePlotData } from "../src/portfoliotools";

vi.mock("open", () => ({
  default: vi.fn().mockResolvedValue(undefined),
}));

describe("sharpeplotHtml", () => {
  it("returns valid HTML with chart elements", () => {
    const frame = simulatedFrame({
      meanRet: 0.07,
      meanVol: 0.15,
      process: "normal",
    });
    const current = frame.makePortfolio("Current Portfolio", "eq_weights");
    const ef = efficientFrontier(frame, 500, 71, 20);
    const plotframe = preparePlotData(frame, current, ef.maxSharpe);

    const html = sharpeplotHtml(ef.simulated, ef.frontier, plotframe, {
      title: "Test",
      addLogo: false,
    });

    expect(html).toMatch(/<!DOCTYPE html>/i);
    expect(html).toContain("sharpeChart");
    expect(html).toContain("Efficient Frontier");
    expect(html).toContain("Simulated");
    expect(html).toContain("Current Portfolio");
    expect(html).toContain("Max Sharpe Portfolio");
  });

  it("includes logo when addLogo is not false", () => {
    const frame = simulatedFrame({ numAssets: 2 });
    const current = frame.makePortfolio("Current Portfolio", "eq_weights");
    const ef = efficientFrontier(frame, 100, 71, 10);
    const plotframe = preparePlotData(frame, current, ef.maxSharpe);
    const html = sharpeplotHtml(ef.simulated, ef.frontier, plotframe);
    expect(html).toContain("plot-header-logo");
    expect(html).toContain("captor_logo");
  });

  it("uses custom logoUrl when provided", () => {
    const frame = simulatedFrame({ numAssets: 2 });
    const current = frame.makePortfolio("Current Portfolio", "eq_weights");
    const ef = efficientFrontier(frame, 100, 71, 10);
    const plotframe = preparePlotData(frame, current, ef.maxSharpe);
    const html = sharpeplotHtml(ef.simulated, ef.frontier, plotframe, {
      logoUrl: "https://example.com/logo.png",
    });
    expect(html).toContain("https://example.com/logo.png");
  });

  it("omits title when empty string", () => {
    const frame = simulatedFrame({ numAssets: 2 });
    const current = frame.makePortfolio("Current Portfolio", "eq_weights");
    const ef = efficientFrontier(frame, 100, 71, 10);
    const plotframe = preparePlotData(frame, current, ef.maxSharpe);
    const html = sharpeplotHtml(ef.simulated, ef.frontier, plotframe, {
      title: "",
      addLogo: false,
    });
    expect(html).toContain("<div></div>");
  });

  it("includes assetLabels in script when provided", () => {
    const frame = simulatedFrame({ numAssets: 2 });
    const current = frame.makePortfolio("Current Portfolio", "eq_weights");
    const ef = efficientFrontier(frame, 100, 71, 10);
    const plotframe = preparePlotData(frame, current, ef.maxSharpe);
    const html = sharpeplotHtml(ef.simulated, ef.frontier, plotframe, {
      assetLabels: ["Asset A", "Asset B"],
      addLogo: false,
    });
    expect(html).toContain('"Asset A"');
    expect(html).toContain('"Asset B"');
  });

  it("handles simulated portfolios with NaN sharpe (sharpeToColor fallback)", () => {
    const frame = simulatedFrame({ numAssets: 2 });
    const current = frame.makePortfolio("Current Portfolio", "eq_weights");
    const ef = efficientFrontier(frame, 100, 71, 10);
    const plotframe = preparePlotData(frame, current, ef.maxSharpe);
    const simulatedWithNan = [
      ...ef.simulated,
      { stdev: 0.1, ret: 0.05, sharpe: NaN, weights: [0.5, 0.5] },
    ];
    const html = sharpeplotHtml(simulatedWithNan, ef.frontier, plotframe, {
      addLogo: false,
    });
    expect(html).toMatch(/<!DOCTYPE html>/i);
    expect(html).toContain("sharpeChart");
  });

  it("handles empty simulated list (minS maxS defaults)", () => {
    const frame = simulatedFrame({ numAssets: 2 });
    const current = frame.makePortfolio("Current Portfolio", "eq_weights");
    const ef = efficientFrontier(frame, 100, 71, 10);
    const plotframe = preparePlotData(frame, current, ef.maxSharpe);
    const html = sharpeplotHtml([], ef.frontier, plotframe, { addLogo: false });
    expect(html).toContain("sharpeChart");
  });
});

describe("sharpeplot", () => {
  it("writes HTML file and returns path when filename has full path", async () => {
    const tmpDir = mkdtempSync(join(tmpdir(), "sharpeplot-test-"));
    const outputPath = join(tmpDir, "efficient-frontier.html");
    const frame = simulatedFrame({ numAssets: 2 });
    const current = frame.makePortfolio("Current Portfolio", "eq_weights");
    const ef = efficientFrontier(frame, 100, 71, 10);
    const plotframe = preparePlotData(frame, current, ef.maxSharpe);

    const result = await sharpeplot(ef.simulated, ef.frontier, plotframe, {
      filename: outputPath,
      autoOpen: false,
      addLogo: false,
    });

    expect(result).toBe(outputPath);
    const content = readFileSync(result, "utf-8");
    expect(content).toMatch(/<!DOCTYPE html>/i);
    expect(content).toContain("sharpeChart");
  });

  it("writes to default dir when filename has no path separator", async () => {
    const frame = simulatedFrame({ numAssets: 2 });
    const current = frame.makePortfolio("Current Portfolio", "eq_weights");
    const ef = efficientFrontier(frame, 100, 71, 10);
    const plotframe = preparePlotData(frame, current, ef.maxSharpe);
    const filename = `sharpeplot-test-${Date.now()}.html`;

    const result = await sharpeplot(ef.simulated, ef.frontier, plotframe, {
      filename,
      autoOpen: false,
      addLogo: false,
    });

    expect(result).toContain(filename);
    const content = readFileSync(result, "utf-8");
    expect(content).toContain("sharpeChart");
    if (existsSync(result)) unlinkSync(result);
  });

  it("calls open when autoOpen is true", async () => {
    const tmpDir = mkdtempSync(join(tmpdir(), "sharpeplot-open-"));
    const outputPath = join(tmpDir, "open-test.html");
    const frame = simulatedFrame({ numAssets: 2 });
    const current = frame.makePortfolio("Current Portfolio", "eq_weights");
    const ef = efficientFrontier(frame, 100, 71, 10);
    const plotframe = preparePlotData(frame, current, ef.maxSharpe);

    const open = (await import("open")).default;
    await sharpeplot(ef.simulated, ef.frontier, plotframe, {
      filename: outputPath,
      autoOpen: true,
      addLogo: false,
    });

    expect(open).toHaveBeenCalledWith(outputPath, { wait: false });
  });
});
