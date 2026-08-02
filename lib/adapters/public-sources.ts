import { inflateRawSync } from "node:zlib";

export type PublicSourceObservationPoint = {
  date: string;
  value: number;
  raw: Record<string, unknown>;
};

export type PublicSourceSkippedObservation = {
  raw: Record<string, unknown>;
  reason: "missing_or_invalid_value" | "missing_or_invalid_date" | "unsupported_row";
};

export type PublicSourceObservationsParseResult = {
  observations: PublicSourceObservationPoint[];
  skipped: PublicSourceSkippedObservation[];
  transport: string;
};

export type PublicSourceFetchRequest = {
  provider: string;
  externalId: string;
  sourceUrl: string;
  observationStart?: string | null;
  now?: Date;
};

export type PublicSourceFetchErrorCode =
  | "unsupported_source"
  | "invalid_url"
  | "network_error"
  | "http_error"
  | "invalid_csv"
  | "invalid_json"
  | "invalid_html"
  | "invalid_xlsx"
  | "invalid_response";

export class PublicSourceAdapterError extends Error {
  constructor(
    message: string,
    public readonly code: PublicSourceFetchErrorCode,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "PublicSourceAdapterError";
  }
}

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/u;
const MS_PER_DAY = 24 * 60 * 60 * 1000;
const DEFAULT_DAILY_LOOKBACK_DAYS = 460;
const DEFAULT_WEEKLY_LOOKBACK_DAYS = 5 * 366;
const TRUSTED_CHICAGO_FED_HOSTS = new Set(["api.data.chicagofed.org"]);
const REQUEST_HEADERS = {
  "user-agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36",
} as const;

const MONTHS: Record<string, string> = {
  JAN: "01",
  FEB: "02",
  MAR: "03",
  APR: "04",
  MAY: "05",
  JUN: "06",
  JUL: "07",
  AUG: "08",
  SEP: "09",
  OCT: "10",
  NOV: "11",
  DEC: "12",
};

const toIsoDate = (date: Date): string => date.toISOString().slice(0, 10);

const addDays = (date: Date, days: number): Date => {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
};

const parseIsoDate = (value: string): Date => {
  if (!DATE_PATTERN.test(value)) {
    throw new PublicSourceAdapterError(
      `Invalid observation start '${value}'. Expected YYYY-MM-DD.`,
      "invalid_response",
    );
  }

  return new Date(`${value}T00:00:00.000Z`);
};

const getStartDate = (
  observationStart: string | null | undefined,
  now: Date,
  fallbackLookbackDays: number,
): Date => {
  if (observationStart) {
    return parseIsoDate(observationStart);
  }

  return addDays(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())), -fallbackLookbackDays);
};

const parseNumber = (value: unknown): number | null => {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value !== "string") {
    return null;
  }

  const cleaned = value.replace(/,/gu, "").trim();
  if (!cleaned || cleaned === ".") {
    return null;
  }

  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : null;
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

const parseCsv = (csv: string): string[][] =>
  csv
    .replace(/^\uFEFF/u, "")
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .filter(Boolean)
    .map(parseCsvRecord);

const extractJsonObjectAfterMarker = (payload: string, marker: string): string => {
  const markerIndex = payload.indexOf(marker);
  if (markerIndex < 0) {
    throw new PublicSourceAdapterError("Embedded JSON marker was not found", "invalid_html", {
      marker,
    });
  }

  let startIndex = markerIndex + marker.length;
  while (/\s/u.test(payload[startIndex] ?? "")) {
    startIndex += 1;
  }

  if (payload[startIndex] !== "{") {
    throw new PublicSourceAdapterError("Embedded JSON object did not start after marker", "invalid_html", {
      marker,
    });
  }

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let index = startIndex; index < payload.length; index += 1) {
    const char = payload[index];

    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (char === "\\") {
        escaped = true;
      } else if (char === "\"") {
        inString = false;
      }
      continue;
    }

    if (char === "\"") {
      inString = true;
      continue;
    }

    if (char === "{") {
      depth += 1;
      continue;
    }

    if (char === "}") {
      depth -= 1;
      if (depth === 0) {
        return payload.slice(startIndex, index + 1);
      }
    }
  }

  throw new PublicSourceAdapterError("Embedded JSON object was not closed", "invalid_html", {
    marker,
  });
};

const normalizeDate = (value: unknown): string | null => {
  if (value instanceof Date) {
    return toIsoDate(value);
  }

  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim().replace(/^"|"$/gu, "");
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/u.exec(trimmed);
  if (iso) {
    return trimmed;
  }

  const slashYmd = /^(\d{4})\/(\d{1,2})\/(\d{1,2})$/u.exec(trimmed);
  if (slashYmd) {
    const [, year, month, day] = slashYmd;
    return `${year}-${month!.padStart(2, "0")}-${day!.padStart(2, "0")}`;
  }

  const slashMdy = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/u.exec(trimmed);
  if (slashMdy) {
    const [, month, day, year] = slashMdy;
    return `${year}-${month!.padStart(2, "0")}-${day!.padStart(2, "0")}`;
  }

  const dmy = /^(\d{1,2})-([A-Za-z]{3})-(\d{4})$/u.exec(trimmed);
  if (dmy) {
    const [, day, monthName, year] = dmy;
    const month = MONTHS[monthName!.toUpperCase()];
    if (!month) {
      return null;
    }

    return `${year}-${month}-${day!.padStart(2, "0")}`;
  }

  return null;
};

const filterByStart = (
  observations: PublicSourceObservationPoint[],
  observationStart?: string | null,
) => {
  if (!observationStart) {
    return observations;
  }

  return observations.filter((item) => item.date >= observationStart);
};

const dedupeAndSort = (
  observations: PublicSourceObservationPoint[],
): PublicSourceObservationPoint[] => {
  const byDate = new Map<string, PublicSourceObservationPoint>();

  for (const item of observations) {
    byDate.set(item.date, item);
  }

  return [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
};

const fetchText = async (
  url: string,
  options?: RequestInit,
): Promise<string> => {
  let response: Response;
  try {
    response = await fetch(url, {
      ...options,
      headers: {
        ...REQUEST_HEADERS,
        accept: "text/html,application/json,text/csv,application/csv,*/*;q=0.8",
        ...(options?.headers ?? {}),
      },
    });
  } catch (error) {
    throw new PublicSourceAdapterError("Network error while fetching public source", "network_error", {
      url,
      cause: error,
    });
  }

  if (!response.ok) {
    const body = await response.text();
    throw new PublicSourceAdapterError(
      `Public source returned ${response.status} ${response.statusText}`,
      "http_error",
      { url, status: response.status, body: body.slice(0, 1024) },
    );
  }

  return response.text();
};

const fetchArrayBuffer = async (
  url: string,
  options?: RequestInit,
): Promise<ArrayBuffer> => {
  let response: Response;
  try {
    response = await fetch(url, {
      ...options,
      headers: {
        ...REQUEST_HEADERS,
        accept:
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/octet-stream,*/*;q=0.8",
        ...(options?.headers ?? {}),
      },
    });
  } catch (error) {
    throw new PublicSourceAdapterError("Network error while fetching binary source", "network_error", {
      url,
      cause: error,
    });
  }

  if (!response.ok) {
    const body = await response.text();
    throw new PublicSourceAdapterError(
      `Binary public source returned ${response.status} ${response.statusText}`,
      "http_error",
      { url, status: response.status, body: body.slice(0, 1024) },
    );
  }

  return response.arrayBuffer();
};

const dateRange = (start: Date, end: Date): string[] => {
  const dates: string[] = [];
  for (let cursor = start; cursor.getTime() <= end.getTime(); cursor = addDays(cursor, 1)) {
    const day = cursor.getUTCDay();
    if (day !== 0 && day !== 6) {
      dates.push(toIsoDate(cursor));
    }
  }
  return dates;
};

const mapWithConcurrency = async <T, R>(
  items: readonly T[],
  concurrency: number,
  mapper: (item: T) => Promise<R>,
): Promise<R[]> => {
  const results = new Array<R>(items.length);
  let cursor = 0;

  const workers = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      results[index] = await mapper(items[index]!);
    }
  });

  await Promise.all(workers);
  return results;
};

export const parseCboePutCallPayload = (
  payload: string,
  requestedDate: string,
): PublicSourceObservationPoint | PublicSourceSkippedObservation => {
  const selectedDate =
    /"selectedDate":"(\d{4}-\d{2}-\d{2})"/u.exec(payload)?.[1] ?? requestedDate;
  const rawMatch = /\{"name":"TOTAL PUT\/CALL RATIO","value":"([^"]+)"\}/u.exec(
    payload,
  );

  if (!rawMatch) {
    return {
      raw: { requestedDate, selectedDate },
      reason: "missing_or_invalid_value",
    };
  }

  const value = parseNumber(rawMatch[1]);
  if (value === null) {
    return {
      raw: { requestedDate, selectedDate, value: rawMatch[1] },
      reason: "missing_or_invalid_value",
    };
  }

  return {
    date: selectedDate,
    value,
    raw: {
      requestedDate,
      selectedDate,
      name: "TOTAL PUT/CALL RATIO",
      value: rawMatch[1],
    },
  };
};

export const fetchCboePutCallRatio = async ({
  sourceUrl,
  observationStart,
  now = new Date(),
}: PublicSourceFetchRequest): Promise<PublicSourceObservationsParseResult> => {
  const start = getStartDate(observationStart, now, DEFAULT_DAILY_LOOKBACK_DAYS);
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const requestedDates = dateRange(start, end);
  const parsed = await mapWithConcurrency(requestedDates, 4, async (date) => {
    const url = new URL(sourceUrl);
    url.searchParams.set("dt", date);
    url.searchParams.set("_rsc", "1");

    const payload = await fetchText(url.toString(), {
      headers: {
        rsc: "1",
        referer: sourceUrl,
      },
    });

    return parseCboePutCallPayload(payload, date);
  });

  const observations: PublicSourceObservationPoint[] = [];
  const skipped: PublicSourceSkippedObservation[] = [];
  for (const item of parsed) {
    if ("date" in item) {
      observations.push(item);
    } else {
      skipped.push(item);
    }
  }

  return {
    observations: dedupeAndSort(filterByStart(observations, observationStart)),
    skipped,
    transport: "next_rsc",
  };
};

const findEndOfCentralDirectory = (buffer: Buffer): number => {
  const minOffset = Math.max(0, buffer.length - 0xffff - 22);
  for (let offset = buffer.length - 22; offset >= minOffset; offset -= 1) {
    if (buffer.readUInt32LE(offset) === 0x06054b50) {
      return offset;
    }
  }

  throw new PublicSourceAdapterError("XLSX ZIP footer was not found", "invalid_xlsx");
};

const unzipEntries = (input: ArrayBuffer): Map<string, Buffer> => {
  const buffer = Buffer.from(input);
  const footerOffset = findEndOfCentralDirectory(buffer);
  const entryCount = buffer.readUInt16LE(footerOffset + 10);
  const centralDirectoryOffset = buffer.readUInt32LE(footerOffset + 16);
  const files = new Map<string, Buffer>();
  let offset = centralDirectoryOffset;

  for (let index = 0; index < entryCount; index += 1) {
    if (buffer.readUInt32LE(offset) !== 0x02014b50) {
      throw new PublicSourceAdapterError("XLSX central directory is invalid", "invalid_xlsx");
    }

    const compression = buffer.readUInt16LE(offset + 10);
    const compressedSize = buffer.readUInt32LE(offset + 20);
    const fileNameLength = buffer.readUInt16LE(offset + 28);
    const extraLength = buffer.readUInt16LE(offset + 30);
    const commentLength = buffer.readUInt16LE(offset + 32);
    const localHeaderOffset = buffer.readUInt32LE(offset + 42);
    const fileName = buffer
      .subarray(offset + 46, offset + 46 + fileNameLength)
      .toString("utf8");

    if (buffer.readUInt32LE(localHeaderOffset) !== 0x04034b50) {
      throw new PublicSourceAdapterError("XLSX local file header is invalid", "invalid_xlsx", {
        fileName,
      });
    }

    const localFileNameLength = buffer.readUInt16LE(localHeaderOffset + 26);
    const localExtraLength = buffer.readUInt16LE(localHeaderOffset + 28);
    const dataStart = localHeaderOffset + 30 + localFileNameLength + localExtraLength;
    const compressed = buffer.subarray(dataStart, dataStart + compressedSize);
    const data =
      compression === 0
        ? compressed
        : compression === 8
          ? inflateRawSync(compressed)
          : null;

    if (!data) {
      throw new PublicSourceAdapterError("XLSX compression method is unsupported", "invalid_xlsx", {
        fileName,
        compression,
      });
    }

    files.set(fileName, data);
    offset += 46 + fileNameLength + extraLength + commentLength;
  }

  return files;
};

const decodeXml = (value: string): string =>
  value
    .replace(/&quot;/gu, "\"")
    .replace(/&apos;/gu, "'")
    .replace(/&lt;/gu, "<")
    .replace(/&gt;/gu, ">")
    .replace(/&amp;/gu, "&");

const excelSerialToIsoDate = (serial: number): string | null => {
  if (!Number.isFinite(serial)) {
    return null;
  }

  const date = new Date(Date.UTC(1899, 11, 30) + Math.round(serial) * MS_PER_DAY);
  return toIsoDate(date);
};

const parseXlsxRows = (arrayBuffer: ArrayBuffer): Array<Record<string, string>> => {
  const entries = unzipEntries(arrayBuffer);
  const sheetEntry = [...entries.keys()]
    .filter((name) => /^xl\/worksheets\/sheet\d+\.xml$/u.test(name))
    .sort()[0];

  if (!sheetEntry) {
    throw new PublicSourceAdapterError("XLSX workbook did not include worksheets", "invalid_xlsx");
  }

  const sheetXml = entries.get(sheetEntry)!.toString("utf8");
  const sharedStringsXml = entries.get("xl/sharedStrings.xml")?.toString("utf8");
  const sharedStrings = sharedStringsXml
    ? [...sharedStringsXml.matchAll(/<si[^>]*>([\s\S]*?)<\/si>/gu)].map((match) => {
        const text = [...match[1]!.matchAll(/<t[^>]*>([\s\S]*?)<\/t>/gu)]
          .map((part) => decodeXml(part[1] ?? ""))
          .join("");
        return text;
      })
    : [];

  return [...sheetXml.matchAll(/<row[^>]*>([\s\S]*?)<\/row>/gu)].map((rowMatch) => {
    const row: Record<string, string> = {};
    for (const cellMatch of rowMatch[1]!.matchAll(/<c\b([^>]*)>([\s\S]*?)<\/c>/gu)) {
      const attrs = cellMatch[1] ?? "";
      const body = cellMatch[2] ?? "";
      const ref = /\br="([A-Z]+)\d+"/u.exec(attrs)?.[1];
      if (!ref) {
        continue;
      }

      const type = /\bt="([^"]+)"/u.exec(attrs)?.[1];
      const rawValue = /<v[^>]*>([\s\S]*?)<\/v>/u.exec(body)?.[1] ?? "";
      row[ref] =
        type === "s"
          ? sharedStrings[Number(rawValue)] ?? ""
          : decodeXml(rawValue.trim());
    }

    return row;
  });
};

const extractNaaimWorkbookUrl = (html: string, sourceUrl: string): string | null => {
  const match =
    /https:\/\/naaim\.org\/wp-content\/uploads\/[^"'\s]+USE_Data-since-Inception_[^"'\s]+\.xlsx/u.exec(
      html,
    ) ??
    /\/wp-content\/uploads\/[^"'\s]+USE_Data-since-Inception_[^"'\s]+\.xlsx/u.exec(
      html,
    );

  return match ? new URL(match[0], sourceUrl).toString() : null;
};

const htmlCellText = (value: string): string =>
  decodeXml(value.replace(/<[^>]*>/gu, " ")).replace(/\s+/gu, " ").trim();

export const parseNaaimExposureTableHtml = (
  html: string,
  observationStart?: string | null,
): PublicSourceObservationsParseResult => {
  const tableBody = /<tbody\b[^>]*>([\s\S]*?)<\/tbody>/iu.exec(html)?.[1] ?? html;
  const observations: PublicSourceObservationPoint[] = [];
  const skipped: PublicSourceSkippedObservation[] = [];
  let rowCount = 0;

  for (const rowMatch of tableBody.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/giu)) {
    const cells = [...rowMatch[1]!.matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/giu)].map(
      (cell) => htmlCellText(cell[1] ?? ""),
    );
    if (cells.length === 0) {
      continue;
    }

    rowCount += 1;
    const raw = {
      date: cells[0] ?? "",
      naaimNumber: cells[1] ?? "",
      access: "delayed_public_table",
    };
    const date = normalizeDate(raw.date);
    const value = parseNumber(raw.naaimNumber);

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

  if (rowCount === 0) {
    throw new PublicSourceAdapterError(
      "NAAIM public table did not include data rows",
      "invalid_html",
    );
  }

  return {
    observations: dedupeAndSort(filterByStart(observations, observationStart)),
    skipped,
    transport: "html_table_delayed",
  };
};

export const fetchNaaimExposure = async ({
  sourceUrl,
  observationStart,
}: PublicSourceFetchRequest): Promise<PublicSourceObservationsParseResult> => {
  const page = await fetchText(sourceUrl);
  const workbookUrl = extractNaaimWorkbookUrl(page, sourceUrl);
  if (!workbookUrl) {
    const table = await fetchText("https://index.naaim.org/embeddable/table", {
      headers: { referer: sourceUrl },
    });
    return parseNaaimExposureTableHtml(table, observationStart);
  }

  const workbook = await fetchArrayBuffer(workbookUrl, {
    headers: { referer: sourceUrl },
  });
  const rows = parseXlsxRows(workbook);
  const observations: PublicSourceObservationPoint[] = [];
  const skipped: PublicSourceSkippedObservation[] = [];

  for (const row of rows.slice(1)) {
    const dateSerial = parseNumber(row.A);
    const date = dateSerial !== null ? excelSerialToIsoDate(dateSerial) : normalizeDate(row.A);
    const value = parseNumber(row.I ?? row.B);
    const raw = { ...row, workbookUrl };

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

  return {
    observations: dedupeAndSort(filterByStart(observations, observationStart)),
    skipped,
    transport: "xlsx",
  };
};

export const fetchVstoxx = async ({
  externalId,
  sourceUrl,
  observationStart,
}: PublicSourceFetchRequest): Promise<PublicSourceObservationsParseResult> => {
  if (externalId !== "V2TX") {
    throw new PublicSourceAdapterError("Unsupported STOXX external id", "unsupported_source", {
      externalId,
    });
  }

  const payload = await fetchText("https://stoxx.com/wp-admin/admin-ajax.php", {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
      "x-requested-with": "XMLHttpRequest",
      referer: sourceUrl,
    },
    body: "action=index_detail_refresh&index_id=40562&isin=DE000A0C3QF1",
  });

  let json: unknown;
  try {
    json = JSON.parse(payload);
  } catch (error) {
    throw new PublicSourceAdapterError("STOXX response was not valid JSON", "invalid_json", {
      cause: error,
    });
  }

  const data = json as {
    success?: boolean;
    data?: { chart_data?: Array<[number, number]> };
  };
  if (!data.success || !Array.isArray(data.data?.chart_data)) {
    throw new PublicSourceAdapterError("STOXX response did not include chart data", "invalid_response");
  }

  const observations = data.data.chart_data
    .map(([timestamp, value]) => ({
      date: toIsoDate(new Date(timestamp)),
      value: Number(value),
      raw: { timestamp, value },
    }))
    .filter((item) => DATE_PATTERN.test(item.date) && Number.isFinite(item.value));

  return {
    observations: dedupeAndSort(filterByStart(observations, observationStart)),
    skipped: [],
    transport: "ajax_json",
  };
};

const formatNseDate = (date: Date): string =>
  `${String(date.getUTCDate()).padStart(2, "0")}-${String(
    date.getUTCMonth() + 1,
  ).padStart(2, "0")}-${date.getUTCFullYear()}`;

export const fetchIndiaVix = async ({
  sourceUrl,
  observationStart,
  now = new Date(),
}: PublicSourceFetchRequest): Promise<PublicSourceObservationsParseResult> => {
  const start = getStartDate(observationStart, now, DEFAULT_DAILY_LOOKBACK_DAYS);
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const chunkStarts: Date[] = [];
  for (let cursor = start; cursor.getTime() <= end.getTime(); cursor = addDays(cursor, 90)) {
    chunkStarts.push(new Date(cursor));
  }

  const observations: PublicSourceObservationPoint[] = [];
  const skipped: PublicSourceSkippedObservation[] = [];
  for (const chunkStart of chunkStarts) {
    const chunkEnd = new Date(Math.min(addDays(chunkStart, 89).getTime(), end.getTime()));
    const url = new URL("https://www.nseindia.com/api/historicalOR/vixhistory");
    url.searchParams.set("from", formatNseDate(chunkStart));
    url.searchParams.set("to", formatNseDate(chunkEnd));
    const payload = await fetchText(url.toString(), {
      headers: {
        referer: sourceUrl,
      },
    });

    let json: unknown;
    try {
      json = JSON.parse(payload);
    } catch (error) {
      throw new PublicSourceAdapterError("NSE response was not valid JSON", "invalid_json", {
        cause: error,
        body: payload.slice(0, 512),
      });
    }

    const rows = (json as { data?: unknown[] }).data;
    if (!Array.isArray(rows)) {
      throw new PublicSourceAdapterError("NSE response did not include data rows", "invalid_response");
    }

    for (const raw of rows as Array<Record<string, unknown>>) {
      const date = normalizeDate(raw.EOD_TIMESTAMP);
      const value = parseNumber(raw.EOD_CLOSE_INDEX_VAL);

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
  }

  return {
    observations: dedupeAndSort(filterByStart(observations, observationStart)),
    skipped,
    transport: "nse_json",
  };
};

export const fetchNikkei225Vi = async ({
  sourceUrl,
  observationStart,
}: PublicSourceFetchRequest): Promise<PublicSourceObservationsParseResult> => {
  const csv = await fetchText(
    "https://indexes.nikkei.co.jp/nkave/historical/nikkei_stock_average_vi_daily_en.csv",
    { headers: { referer: sourceUrl } },
  );
  return parseNikkei225ViCsv(csv, observationStart);
};

export const parseNikkei225ViCsv = (
  csv: string,
  observationStart?: string | null,
): PublicSourceObservationsParseResult => {
  const rows = parseCsv(csv);
  const observations: PublicSourceObservationPoint[] = [];
  const skipped: PublicSourceSkippedObservation[] = [];

  for (const record of rows.slice(1)) {
    const raw = {
      date: record[0] ?? "",
      close: record[1] ?? "",
      open: record[2] ?? "",
      high: record[3] ?? "",
      low: record[4] ?? "",
    };
    const date = normalizeDate(raw.date);
    const value = parseNumber(raw.close);

    if (!date) {
      skipped.push({ raw, reason: "unsupported_row" });
      continue;
    }

    if (value === null) {
      skipped.push({ raw, reason: "missing_or_invalid_value" });
      continue;
    }

    observations.push({ date, value, raw });
  }

  return {
    observations: dedupeAndSort(filterByStart(observations, observationStart)),
    skipped,
    transport: "csv",
  };
};

const EDGMAP_AAII_FIELDS: Record<string, string> = {
  AAII_BULLISH: "bullish",
  AAII_BEARISH: "bearish",
  AAII_NEUTRAL: "neutral",
  AAII_BULL_BEAR_SPREAD: "bull_bear_spread",
};

export const parseEdgmapAaiiSentimentHtml = (
  html: string,
  externalId: string,
  observationStart?: string | null,
): PublicSourceObservationsParseResult => {
  const fieldName = EDGMAP_AAII_FIELDS[externalId];
  if (!fieldName) {
    throw new PublicSourceAdapterError("Unsupported EDGMAP AAII external id", "unsupported_source", {
      externalId,
    });
  }

  let payload: unknown;
  try {
    payload = JSON.parse(extractJsonObjectAfterMarker(html, "const sampleData = "));
  } catch (error) {
    if (error instanceof PublicSourceAdapterError) {
      throw error;
    }

    throw new PublicSourceAdapterError("EDGMAP embedded AAII payload was not valid JSON", "invalid_json", {
      cause: error,
    });
  }

  const data = payload as {
    latest?: Record<string, unknown>;
    historical?: Array<Record<string, unknown>>;
  };
  if (!Array.isArray(data.historical)) {
    throw new PublicSourceAdapterError("EDGMAP AAII payload did not include historical rows", "invalid_response");
  }

  const rows = [...data.historical];
  const latestDate = normalizeDate(data.latest?.date);
  if (latestDate && !rows.some((row) => normalizeDate(row.date) === latestDate)) {
    rows.push(data.latest!);
  }

  const observations: PublicSourceObservationPoint[] = [];
  const skipped: PublicSourceSkippedObservation[] = [];
  for (const row of rows) {
    const date = normalizeDate(row.date);
    const value = parseNumber(row[fieldName]);
    const raw = { ...row, sourceField: fieldName };

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

  return {
    observations: dedupeAndSort(filterByStart(observations, observationStart)),
    skipped,
    transport: "embedded_json",
  };
};

export const fetchEdgmapAaiiSentiment = async ({
  externalId,
  sourceUrl,
  observationStart,
}: PublicSourceFetchRequest): Promise<PublicSourceObservationsParseResult> => {
  const html = await fetchText(sourceUrl);
  return parseEdgmapAaiiSentimentHtml(html, externalId, observationStart);
};

export const fetchVhsi = async ({
  sourceUrl,
  observationStart,
}: PublicSourceFetchRequest): Promise<PublicSourceObservationsParseResult> => {
  const payload = await fetchText("https://www.hsi.com.hk/data/eng/indexes/01050.00/chart.json", {
    headers: { referer: sourceUrl },
  });

  let json: unknown;
  try {
    json = JSON.parse(payload);
  } catch (error) {
    throw new PublicSourceAdapterError("HSI response was not valid JSON", "invalid_json", {
      cause: error,
    });
  }

  const data = json as Record<string, unknown>;
  const levels =
    (data["indexLevels-5y"] as Array<[number, number]> | undefined) ??
    (data["indexLevels-3y"] as Array<[number, number]> | undefined) ??
    (data["indexLevels-1y"] as Array<[number, number]> | undefined);

  if (!Array.isArray(levels)) {
    throw new PublicSourceAdapterError("HSI response did not include index levels", "invalid_response");
  }

  const observations = levels
    .map(([timestamp, value]) => ({
      date: toIsoDate(new Date(timestamp)),
      value: Number(value),
      raw: { timestamp, value, indexName: data.indexName, indexCode: data.indexCode },
    }))
    .filter((item) => DATE_PATTERN.test(item.date) && Number.isFinite(item.value));

  return {
    observations: dedupeAndSort(filterByStart(observations, observationStart)),
    skipped: [],
    transport: "hsi_chart_json",
  };
};

export const parseChicagoFedNfciCsv = (
  csv: string,
  externalId: string,
  observationStart?: string | null,
): PublicSourceObservationsParseResult => {
  const normalizedExternalId = externalId.trim().toUpperCase();
  if (normalizedExternalId !== "NFCI" && normalizedExternalId !== "ANFCI") {
    throw new PublicSourceAdapterError(
      "Unsupported Chicago Fed NFCI series",
      "unsupported_source",
      { externalId },
    );
  }

  const rows = parseCsv(csv);
  if (rows.length < 2) {
    throw new PublicSourceAdapterError(
      "Chicago Fed NFCI CSV did not include observations",
      "invalid_csv",
    );
  }

  const headers = rows[0]!.map((header) => header.trim());
  const dateIndex = headers.findIndex(
    (header) => header.toLowerCase() === "friday_of_week",
  );
  const valueIndex = headers.findIndex(
    (header) => header.toUpperCase() === normalizedExternalId,
  );
  if (dateIndex < 0 || valueIndex < 0) {
    throw new PublicSourceAdapterError(
      "Chicago Fed NFCI CSV header did not match expected columns",
      "invalid_csv",
      { headers, externalId },
    );
  }

  const observations: PublicSourceObservationPoint[] = [];
  const skipped: PublicSourceSkippedObservation[] = [];
  for (const row of rows.slice(1)) {
    const raw = Object.fromEntries(
      headers.map((header, index) => [header, row[index]?.trim() ?? ""]),
    );
    const date = normalizeDate(row[dateIndex]);
    const value = parseNumber(row[valueIndex]);

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

  return {
    observations: dedupeAndSort(filterByStart(observations, observationStart)),
    skipped,
    transport: "csv",
  };
};

export const fetchChicagoFedNfci = async ({
  externalId,
  sourceUrl,
  observationStart,
  now = new Date(),
}: PublicSourceFetchRequest): Promise<PublicSourceObservationsParseResult> => {
  let url: URL;
  try {
    url = new URL(sourceUrl);
  } catch (error) {
    throw new PublicSourceAdapterError(
      "Chicago Fed source URL is invalid",
      "invalid_url",
      { sourceUrl, cause: error },
    );
  }

  if (!TRUSTED_CHICAGO_FED_HOSTS.has(url.hostname)) {
    throw new PublicSourceAdapterError(
      "Chicago Fed source host is not allowlisted",
      "invalid_url",
      { sourceUrl, hostname: url.hostname },
    );
  }

  const payload = await fetchText(url.toString(), {
    headers: {
      origin: "https://www.chicagofed.org",
      referer: "https://www.chicagofed.org/",
    },
  });

  const effectiveObservationStart =
    observationStart ??
    toIsoDate(getStartDate(null, now, DEFAULT_WEEKLY_LOOKBACK_DAYS));
  return parseChicagoFedNfciCsv(
    payload,
    externalId,
    effectiveObservationStart,
  );
};

type PublicSourceFetcher = (
  request: PublicSourceFetchRequest,
) => Promise<PublicSourceObservationsParseResult>;

const PUBLIC_SOURCE_FETCHERS = new Map<string, PublicSourceFetcher>([
  ["cboe:next_rsc", fetchCboePutCallRatio],
  ["naaim:xlsx", fetchNaaimExposure],
  ["naaim:public_table", fetchNaaimExposure],
  ["stoxx:ajax_json", fetchVstoxx],
  ["nse:json", fetchIndiaVix],
  ["nikkei:csv", fetchNikkei225Vi],
  ["hkex:json", fetchVhsi],
  ["edgmap:embedded_json", fetchEdgmapAaiiSentiment],
  ["chicagofed:csv", fetchChicagoFedNfci],
]);

export const PUBLIC_SOURCE_PROVIDER_FETCH_MODES = [...PUBLIC_SOURCE_FETCHERS.keys()].map(
  (key) => {
    const [provider, fetchMode] = key.split(":");
    return { provider: provider!, fetchMode: fetchMode! };
  },
);

export const fetchPublicSourceObservations = async (
  request: PublicSourceFetchRequest & { fetchMode: string },
): Promise<PublicSourceObservationsParseResult> => {
  const fetcher = PUBLIC_SOURCE_FETCHERS.get(`${request.provider}:${request.fetchMode}`);
  if (!fetcher) {
    throw new PublicSourceAdapterError("No public source fetcher configured", "unsupported_source", {
      provider: request.provider,
      fetchMode: request.fetchMode,
      externalId: request.externalId,
    });
  }

  return fetcher(request);
};
