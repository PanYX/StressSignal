import { ZodError, z } from "zod";

export const SUPPORTED_FRED_SERIES_IDS = [
  "VIXCLS",
  "VXVCLS",
  "VXNCLS",
  "RVXCLS",
  "VXDCLS",
  "STLFSI4",
  "NFCI",
  "ANFCI",
  "BAMLH0A0HYM2",
  "SP500",
] as const;

export type SupportedFredSeriesId =
  (typeof SUPPORTED_FRED_SERIES_IDS)[number];

export type FredObservationRaw = z.infer<typeof fredObservationSchema>;
export type ObservationPoint = z.infer<typeof observationPointSchema>;

const fredObservationSchema = z.object({
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/u, {
      message: "observation date must be YYYY-MM-DD",
    }),
  value: z.string(),
}).catchall(z.unknown());

const fredSeriesObservationsResponseSchema = z.object({
  observations: z.array(fredObservationSchema),
}).passthrough();

const observationPointSchema = z.object({
  date: z.string(),
  value: z.number(),
  raw: fredObservationSchema,
});

export type FredObservationsEnvelope = z.infer<
  typeof fredSeriesObservationsResponseSchema
>;
export type FredFetchErrorCode =
  | "missing_or_empty_api_key"
  | "unsupported_series_id"
  | "network_error"
  | "http_error"
  | "invalid_json"
  | "invalid_csv"
  | "invalid_response";
export type FredFetchTransport = "api_json" | "graph_csv";

export type SkippedObservationReason = "missing_or_invalid_value";

export interface SkippedObservation {
  raw: FredObservationRaw;
  reason: SkippedObservationReason;
}

export interface FredObservationsParseResult {
  observations: ObservationPoint[];
  skipped: SkippedObservation[];
  transport: FredFetchTransport;
}

export interface FredSeriesObservationsRequest {
  seriesId: SupportedFredSeriesId | string;
  apiKey?: string | null;
  observationStart?: string | null;
  transport?: FredFetchTransport | "auto";
}

export class FredAdapterError extends Error {
  constructor(
    message: string,
    public readonly code: FredFetchErrorCode,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "FredAdapterError";
  }
}

const BASE_URL = "https://api.stlouisfed.org/fred";
const GRAPH_CSV_URL = "https://fred.stlouisfed.org/graph/fredgraph.csv";
const FILE_TYPE = "json";
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/u;

const isSupportedSeriesId = (value: string): value is SupportedFredSeriesId => {
  return (SUPPORTED_FRED_SERIES_IDS as readonly string[]).includes(value);
};

const parseNumericValue = (value: string): number | null => {
  const trimmed = value.trim();
  if (trimmed === "." || trimmed === "") {
    return null;
  }

  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
};

export const parseFredObservationsResponse = (
  payload: unknown,
): FredObservationsParseResult => {
  const validated = (() => {
    try {
      return fredSeriesObservationsResponseSchema.parse(payload);
    } catch (error) {
      if (error instanceof ZodError) {
        throw new FredAdapterError(
          "FRED response payload does not match expected schema",
          "invalid_response",
          { issues: error.issues },
        );
      }

      throw error;
    }
  })();

  const observations: ObservationPoint[] = [];
  const skipped: SkippedObservation[] = [];

  for (const item of validated.observations) {
    const value = parseNumericValue(item.value);
    if (value === null) {
      skipped.push({
        raw: item,
        reason: "missing_or_invalid_value",
      });
      continue;
    }

    observations.push(
      observationPointSchema.parse({
        date: item.date,
        value,
        raw: item,
      }),
    );
  }

  return { observations, skipped, transport: "api_json" };
};

const parseCsvRecord = (line: string): string[] => {
  const values: string[] = [];
  let current = "";
  let quoted = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];

    if (char === "\"") {
      if (quoted && next === "\"") {
        current += "\"";
        index += 1;
        continue;
      }

      quoted = !quoted;
      continue;
    }

    if (char === "," && !quoted) {
      values.push(current);
      current = "";
      continue;
    }

    current += char;
  }

  values.push(current);
  return values;
};

export const parseFredGraphCsvResponse = (
  csv: string,
  seriesId: SupportedFredSeriesId | string,
): FredObservationsParseResult => {
  if (!isSupportedSeriesId(seriesId)) {
    throw new FredAdapterError(
      `Series ID '${seriesId}' is not supported by this adapter`,
      "unsupported_series_id",
    );
  }

  const lines = csv
    .replace(/^\uFEFF/u, "")
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  if (lines.length < 2) {
    throw new FredAdapterError("FRED graph CSV did not include observations", "invalid_csv");
  }

  const header = parseCsvRecord(lines[0]);
  const dateIndex = header.findIndex(
    (name) => name.trim().toLowerCase() === "observation_date",
  );
  const valueIndex = header.findIndex((name) => name.trim() === seriesId);

  if (dateIndex === -1 || valueIndex === -1) {
    throw new FredAdapterError(
      "FRED graph CSV header does not match expected columns",
      "invalid_csv",
      { header, seriesId },
    );
  }

  const observations: ObservationPoint[] = [];
  const skipped: SkippedObservation[] = [];

  for (const line of lines.slice(1)) {
    const record = parseCsvRecord(line);
    const raw = {
      date: record[dateIndex]?.trim() ?? "",
      value: record[valueIndex]?.trim() ?? "",
    };

    if (!DATE_PATTERN.test(raw.date)) {
      throw new FredAdapterError(
        "FRED graph CSV contains an invalid observation date",
        "invalid_csv",
        { raw },
      );
    }

    const value = parseNumericValue(raw.value);
    if (value === null) {
      skipped.push({
        raw,
        reason: "missing_or_invalid_value",
      });
      continue;
    }

    observations.push(
      observationPointSchema.parse({
        date: raw.date,
        value,
        raw,
      }),
    );
  }

  return { observations, skipped, transport: "graph_csv" };
};

const setOptionalObservationStart = (url: URL, observationStart?: string | null) => {
  const trimmed = observationStart?.trim();
  if (!trimmed) {
    return;
  }

  if (!DATE_PATTERN.test(trimmed)) {
    throw new FredAdapterError(
      "observationStart must be YYYY-MM-DD when provided",
      "invalid_response",
      { observationStart },
    );
  }

  url.searchParams.set("observation_start", trimmed);
};

const fetchFredApiSeriesObservations = async ({
  seriesId,
  apiKey,
  observationStart,
}: FredSeriesObservationsRequest): Promise<FredObservationsParseResult> => {
  if (!apiKey || !apiKey.trim()) {
    throw new FredAdapterError("FRED API key must be provided", "missing_or_empty_api_key");
  }

  if (!isSupportedSeriesId(seriesId)) {
    throw new FredAdapterError(
      `Series ID '${seriesId}' is not supported by this adapter`,
      "unsupported_series_id",
    );
  }

  const url = new URL(`${BASE_URL}/series/observations`);
  url.searchParams.set("series_id", seriesId);
  url.searchParams.set("api_key", apiKey);
  url.searchParams.set("file_type", FILE_TYPE);
  setOptionalObservationStart(url, observationStart);

  let response: Response;
  try {
    response = await fetch(url.toString(), {
      method: "GET",
      headers: { accept: "application/json" },
    });
  } catch (error) {
    throw new FredAdapterError("Network error while calling FRED API", "network_error", {
      cause: error,
    });
  }

  if (!response.ok) {
    const responseBody = await response.text();
    throw new FredAdapterError(
      `FRED API returned ${response.status} ${response.statusText}`,
      "http_error",
      {
        status: response.status,
        body: responseBody.slice(0, 1024),
      },
    );
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch (error) {
    throw new FredAdapterError("FRED response is not valid JSON", "invalid_json", {
      cause: error,
    });
  }

  return parseFredObservationsResponse(payload);
};

const fetchFredGraphCsvObservations = async ({
  seriesId,
  observationStart,
}: FredSeriesObservationsRequest): Promise<FredObservationsParseResult> => {
  if (!isSupportedSeriesId(seriesId)) {
    throw new FredAdapterError(
      `Series ID '${seriesId}' is not supported by this adapter`,
      "unsupported_series_id",
    );
  }

  const url = new URL(GRAPH_CSV_URL);
  url.searchParams.set("id", seriesId);
  const trimmedStart = observationStart?.trim();
  if (trimmedStart) {
    if (!DATE_PATTERN.test(trimmedStart)) {
      throw new FredAdapterError(
        "observationStart must be YYYY-MM-DD when provided",
        "invalid_response",
        { observationStart },
      );
    }
    url.searchParams.set("cosd", trimmedStart);
  }

  let response: Response;
  try {
    response = await fetch(url.toString(), {
      method: "GET",
      headers: { accept: "text/csv,application/csv,text/plain;q=0.9" },
    });
  } catch (error) {
    throw new FredAdapterError(
      "Network error while calling FRED graph CSV",
      "network_error",
      {
        cause: error,
      },
    );
  }

  if (!response.ok) {
    const responseBody = await response.text();
    throw new FredAdapterError(
      `FRED graph CSV returned ${response.status} ${response.statusText}`,
      "http_error",
      {
        status: response.status,
        body: responseBody.slice(0, 1024),
      },
    );
  }

  return parseFredGraphCsvResponse(await response.text(), seriesId);
};

export const fetchFredSeriesObservations = async (
  request: FredSeriesObservationsRequest,
): Promise<FredObservationsParseResult> => {
  const transport = request.transport ?? "auto";

  if (transport === "api_json") {
    return fetchFredApiSeriesObservations(request);
  }

  if (transport === "graph_csv") {
    return fetchFredGraphCsvObservations(request);
  }

  if (request.apiKey?.trim()) {
    return fetchFredApiSeriesObservations(request);
  }

  return fetchFredGraphCsvObservations(request);
};
