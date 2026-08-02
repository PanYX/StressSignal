import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import validObservations from "../fixtures/fred/valid-observations.json";
import missingRequiredFields from "../fixtures/fred/missing-required-fields.json";
import invalidNumericValue from "../fixtures/fred/invalid-numeric-value.json";

import {
  fetchFredSeriesObservations,
  parseFredObservationsResponse,
  parseFredGraphCsvResponse,
  FredAdapterError,
} from "../../lib/adapters/fred";

const makeJsonResponse = (payload: unknown, status = 200) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: { "content-type": "application/json" },
  });

beforeEach(() => {
  vi.restoreAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("fred adapter", () => {
  it("parses a valid series/observations payload and filters missing values", async () => {
    const fetchMock = vi.fn().mockResolvedValue(makeJsonResponse(validObservations));
    vi.stubGlobal("fetch", fetchMock);

    const result = await fetchFredSeriesObservations({
      seriesId: "VIXCLS",
      apiKey: "test-api-key",
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const calledUrl = new URL(
      (fetchMock.mock.calls.at(0)?.[0] as string) ?? "http://localhost",
    );
    expect(calledUrl.searchParams.get("series_id")).toBe("VIXCLS");
    expect(calledUrl.searchParams.get("api_key")).toBe("test-api-key");
    expect(calledUrl.searchParams.get("file_type")).toBe("json");
    expect(result.observations).toHaveLength(2);
    expect(result.skipped).toHaveLength(1);
    expect(result.observations[0]).toMatchObject({
      date: "2026-01-01",
      value: 14.23,
    });
    expect(result.observations[1]).toMatchObject({
      date: "2026-01-03",
      value: 15.11,
    });
    expect(result.skipped[0].raw.value).toBe(".");
  });

  it("throws an explicit error for missing required fields", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      makeJsonResponse(missingRequiredFields),
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      fetchFredSeriesObservations({
        seriesId: "VXNCLS",
        apiKey: "test-api-key",
      }),
    ).rejects.toMatchObject({
      name: "FredAdapterError",
      code: "invalid_response",
    });
  });

  it("parses invalid numeric rows deterministically and reports skipped entries", () => {
    const result = parseFredObservationsResponse(invalidNumericValue);

    expect(result.observations).toHaveLength(1);
    expect(result.observations[0]).toMatchObject({
      date: "2026-01-01",
      value: 12.34,
    });
    expect(result.skipped).toHaveLength(2);
    expect(result.skipped[0].raw.value).toBe("abc");
    expect(result.skipped[1].raw.value).toBe("");
    expect(result.skipped[0].reason).toBe("missing_or_invalid_value");
  });

  it("throws FredAdapterError for non-200 responses", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response("service unavailable", {
        status: 503,
        statusText: "Service Unavailable",
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      fetchFredSeriesObservations({
        seriesId: "NFCI",
        apiKey: "test-api-key",
      }),
    ).rejects.toMatchObject({
      name: "FredAdapterError",
      code: "http_error",
      message: "FRED API returned 503 Service Unavailable",
      details: { status: 503 },
    } as FredAdapterError);
  });

  it("throws FredAdapterError for malformed JSON", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response("{this-is-not-json", {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      fetchFredSeriesObservations({
        seriesId: "ANFCI",
        apiKey: "test-api-key",
      }),
    ).rejects.toMatchObject({
      name: "FredAdapterError",
      code: "invalid_json",
    } as FredAdapterError);
  });

  it("parses FRED graph CSV rows and skips missing values", () => {
    const result = parseFredGraphCsvResponse(
      [
        "observation_date,VIXCLS",
        "2026-01-01,14.23",
        "2026-01-02,.",
        "2026-01-05,15.11",
      ].join("\n"),
      "VIXCLS",
    );

    expect(result.transport).toBe("graph_csv");
    expect(result.observations).toHaveLength(2);
    expect(result.skipped).toHaveLength(1);
    expect(result.observations[0]).toMatchObject({
      date: "2026-01-01",
      value: 14.23,
    });
    expect(result.skipped[0].raw.value).toBe(".");
  });

  it("uses public graph CSV when no API key is configured", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response("observation_date,VIXCLS\n2026-01-01,14.23\n", {
        status: 200,
        headers: { "content-type": "application/csv" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await fetchFredSeriesObservations({
      seriesId: "VIXCLS",
      observationStart: "2026-01-01",
    });

    expect(result.transport).toBe("graph_csv");
    const calledUrl = new URL(
      (fetchMock.mock.calls.at(0)?.[0] as string) ?? "http://localhost",
    );
    expect(calledUrl.origin).toBe("https://fred.stlouisfed.org");
    expect(calledUrl.pathname).toBe("/graph/fredgraph.csv");
    expect(calledUrl.searchParams.get("id")).toBe("VIXCLS");
    expect(calledUrl.searchParams.get("cosd")).toBe("2026-01-01");
    const requestInit = fetchMock.mock.calls.at(0)?.[1] as RequestInit | undefined;
    const headers = new Headers(requestInit?.headers);
    expect(headers.get("referer")).toBe(
      "https://fred.stlouisfed.org/series/VIXCLS",
    );
    expect(headers.get("user-agent")).toContain("Mozilla/5.0");
  });
});
