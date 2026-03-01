import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { fetchCaptorSeries, fetchCaptorSeriesBatch } from "../src/captor";

describe("fetchCaptorSeries", () => {
  const mockResponse = {
    id: "test-id",
    title: "Test Series",
    dates: ["2020-01-01", "2020-01-02"],
    values: [100, 101],
  };

  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn((url: string) => {
        if (url.includes("/opentimeseries/")) {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({ ...mockResponse, id: url.split("/").pop() }),
          } as Response);
        }
        return Promise.resolve({
          ok: false,
          status: 404,
          statusText: "Not Found",
        } as Response);
      }),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns timeseries data on success", async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    } as Response);

    const result = await fetchCaptorSeries("638f681e0c2f4c8d28a13392");
    expect(result).toEqual(mockResponse);
    expect(result.id).toBe("test-id");
    expect(result.dates).toEqual(["2020-01-01", "2020-01-02"]);
    expect(result.values).toEqual([100, 101]);
  });

  it("throws on fetch failure", async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: false,
      status: 404,
      statusText: "Not Found",
    } as Response);

    await expect(fetchCaptorSeries("nonexistent-id")).rejects.toThrow(
      "Failed to fetch nonexistent-id: 404 Not Found",
    );
  });

  it("calls correct API URL", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    } as Response);
    vi.stubGlobal("fetch", fetchMock);

    await fetchCaptorSeries("abc123");
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.captor.se/public/api/opentimeseries/abc123",
    );

    vi.unstubAllGlobals();
  });
});

describe("fetchCaptorSeriesBatch", () => {
  const mockResponse1 = {
    id: "id-1",
    title: "Series 1",
    dates: ["2020-01-01"],
    values: [100],
  };
  const mockResponse2 = {
    id: "id-2",
    title: "Series 2",
    dates: ["2020-01-01"],
    values: [200],
  };

  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn((url: string) => {
        const id = url.split("/").pop() ?? "";
        const data = id === "id-1" ? mockResponse1 : mockResponse2;
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ ...data, id }),
        } as Response);
      }),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("fetches multiple series and returns array", async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse1),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse2),
      } as Response);

    const result = await fetchCaptorSeriesBatch(["id-1", "id-2"]);
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual(mockResponse1);
    expect(result[1]).toEqual(mockResponse2);
  });

  it("throws when any fetch fails", async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse1),
      } as Response)
      .mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
      } as Response);

    await expect(fetchCaptorSeriesBatch(["id-1", "id-2"])).rejects.toThrow(
      "Failed to fetch id-2: 500 Internal Server Error",
    );
  });
});
