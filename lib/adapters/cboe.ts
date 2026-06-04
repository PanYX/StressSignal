export type CboeObservationPoint = {
  date: string;
  value: number;
  raw: Record<string, string>;
};

export type CboeSkippedObservation = {
  raw: Record<string, string>;
  reason: "missing_or_invalid_value" | "missing_or_invalid_date";
};

export type CboeObservationsParseResult = {
  observations: CboeObservationPoint[];
  skipped: CboeSkippedObservation[];
  transport: "csv";
};

export type CboeFetchErrorCode =
  | "invalid_url"
  | "network_error"
  | "http_error"
  | "invalid_csv"
  | "invalid_response";

export class CboeAdapterError extends Error {
  constructor(
    message: string,
    public readonly code: CboeFetchErrorCode,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "CboeAdapterError";
  }
}

const DATE_COLUMN = "DATE";
const TRUSTED_CBOE_HOSTS = new Set(["cdn.cboe.com"]);

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

const normalizeDate = (value: string): string | null => {
  const trimmed = value.trim();
  const isoMatch = /^(\d{4})-(\d{2})-(\d{2})$/u.exec(trimmed);
  if (isoMatch) {
    return trimmed;
  }

  const slashMatch = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/u.exec(trimmed);
  if (!slashMatch) {
    return null;
  }

  const [, month, day, year] = slashMatch;
  return `${year}-${month!.padStart(2, "0")}-${day!.padStart(2, "0")}`;
};

const parseNumericValue = (value: string | undefined): number | null => {
  const trimmed = value?.trim() ?? "";
  if (trimmed === "" || trimmed === ".") {
    return null;
  }

  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
};

const chooseValueColumn = (headers: string[], externalId: string): string => {
  const normalizedExternalId = externalId.trim().toUpperCase();
  const exact = headers.find(
    (header) => header.trim().toUpperCase() === normalizedExternalId,
  );
  if (exact) {
    return exact;
  }

  const close = headers.find((header) => header.trim().toUpperCase() === "CLOSE");
  if (close) {
    return close;
  }

  const firstValue = headers.find(
    (header) => header.trim().toUpperCase() !== DATE_COLUMN,
  );
  if (!firstValue) {
    throw new CboeAdapterError(
      "Cboe CSV did not include a value column",
      "invalid_csv",
      { headers, externalId },
    );
  }

  return firstValue;
};

export const parseCboeDailyPricesCsv = (
  csv: string,
  externalId: string,
): CboeObservationsParseResult => {
  const lines = csv
    .replace(/^\uFEFF/u, "")
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length < 2) {
    throw new CboeAdapterError(
      "Cboe CSV did not include observations",
      "invalid_csv",
    );
  }

  const headers = parseCsvRecord(lines[0]!).map((header) => header.trim());
  const dateColumn = headers.find(
    (header) => header.toUpperCase() === DATE_COLUMN,
  );
  if (!dateColumn) {
    throw new CboeAdapterError(
      "Cboe CSV did not include a DATE column",
      "invalid_csv",
      { headers },
    );
  }

  const valueColumn = chooseValueColumn(headers, externalId);
  const dateIndex = headers.indexOf(dateColumn);
  const valueIndex = headers.indexOf(valueColumn);
  const observations: CboeObservationPoint[] = [];
  const skipped: CboeSkippedObservation[] = [];

  for (const line of lines.slice(1)) {
    const record = parseCsvRecord(line);
    const raw = Object.fromEntries(
      headers.map((header, index) => [header, record[index]?.trim() ?? ""]),
    );
    const date = normalizeDate(record[dateIndex] ?? "");
    const value = parseNumericValue(record[valueIndex]);

    if (!date) {
      skipped.push({ raw, reason: "missing_or_invalid_date" });
      continue;
    }

    if (value === null) {
      skipped.push({ raw, reason: "missing_or_invalid_value" });
      continue;
    }

    observations.push({ date, value, raw });
  }

  return { observations, skipped, transport: "csv" };
};

export const fetchCboeDailyPricesCsv = async ({
  externalId,
  sourceUrl,
}: {
  externalId: string;
  sourceUrl: string;
}): Promise<CboeObservationsParseResult> => {
  let url: URL;
  try {
    url = new URL(sourceUrl);
  } catch (error) {
    throw new CboeAdapterError("Cboe source URL is invalid", "invalid_url", {
      sourceUrl,
      cause: error,
    });
  }

  if (!TRUSTED_CBOE_HOSTS.has(url.hostname)) {
    throw new CboeAdapterError(
      "Cboe CSV source host is not allowlisted",
      "invalid_url",
      { sourceUrl, hostname: url.hostname },
    );
  }

  let response: Response;
  try {
    response = await fetch(url.toString(), {
      method: "GET",
      headers: { accept: "text/csv,application/csv,text/plain;q=0.9" },
    });
  } catch (error) {
    throw new CboeAdapterError("Network error while calling Cboe CSV", "network_error", {
      cause: error,
    });
  }

  if (!response.ok) {
    const body = await response.text();
    throw new CboeAdapterError(
      `Cboe CSV returned ${response.status} ${response.statusText}`,
      "http_error",
      { status: response.status, body: body.slice(0, 1024) },
    );
  }

  try {
    return parseCboeDailyPricesCsv(await response.text(), externalId);
  } catch (error) {
    if (error instanceof CboeAdapterError) {
      throw error;
    }

    throw new CboeAdapterError("Cboe CSV response could not be parsed", "invalid_response", {
      cause: error,
    });
  }
};
