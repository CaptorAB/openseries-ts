/**
 * Captor Open API client for fetching timeseries data.
 *
 * API: https://api.captor.se/public/api/opentimeseries/{id}
 */

const API_BASE = "https://api.captor.se/public/api/opentimeseries";

export type CaptorSeriesResponse = {
  id: string;
  title: string | null;
  dates: string[];
  values: number[];
  currency?: string;
  [key: string]: unknown;
};

/**
 * Fetches a single timeseries from the Captor Open API.
 *
 * @param id - The timeseries ID (e.g. "638f681e0c2f4c8d28a13392")
 * @returns The timeseries data with dates and values arrays
 */
export async function fetchCaptorSeries(id: string): Promise<CaptorSeriesResponse> {
  const url = `${API_BASE}/${id}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch ${id}: ${res.status} ${res.statusText}`);
  }
  return res.json() as Promise<CaptorSeriesResponse>;
}

/**
 * Fetches multiple timeseries from the Captor Open API.
 *
 * @param ids - Array of timeseries IDs
 * @returns Array of timeseries data
 */
export async function fetchCaptorSeriesBatch(
  ids: string[],
): Promise<CaptorSeriesResponse[]> {
  return Promise.all(ids.map((id) => fetchCaptorSeries(id)));
}
