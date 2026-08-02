import { once } from "node:events";
import { createWriteStream, existsSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { loadEnvFile } from "node:process";

import { Client, type QueryResult } from "pg";

type ColumnKind =
  | "boolean"
  | "date"
  | "integer"
  | "json"
  | "number"
  | "text"
  | "timestamp";

type ColumnSpec = {
  name: string;
  kind: ColumnKind;
  nullable?: boolean;
  chunked?: boolean;
};

type TableSpec = {
  name: string;
  primaryKey: string;
  columns: ColumnSpec[];
};

const PAGE_SIZE = 2_000;
const MAX_ROWS_PER_INSERT = 20;
const MAX_STATEMENT_BYTES = 30_000;

const tables: TableSpec[] = [
  {
    name: "indicators",
    primaryKey: "id",
    columns: [
      { name: "id", kind: "text" },
      { name: "slug", kind: "text" },
      { name: "name", kind: "text" },
      { name: "category", kind: "text" },
      { name: "description", kind: "text" },
      { name: "unit", kind: "text" },
      { name: "frequency", kind: "text" },
      { name: "status", kind: "text" },
      { name: "source_policy", kind: "text" },
      { name: "created_at", kind: "timestamp" },
      { name: "updated_at", kind: "timestamp" },
    ],
  },
  {
    name: "indicator_sources",
    primaryKey: "id",
    columns: [
      { name: "id", kind: "text" },
      { name: "indicator_id", kind: "text" },
      { name: "provider", kind: "text" },
      { name: "external_id", kind: "text" },
      { name: "fetch_mode", kind: "text" },
      { name: "source_url", kind: "text" },
      { name: "is_primary", kind: "boolean" },
      { name: "license_note", kind: "text", nullable: true },
      { name: "active", kind: "boolean" },
      { name: "created_at", kind: "timestamp" },
      { name: "updated_at", kind: "timestamp" },
    ],
  },
  {
    name: "observations",
    primaryKey: "id",
    columns: [
      { name: "id", kind: "text" },
      { name: "indicator_id", kind: "text" },
      { name: "observation_date", kind: "date" },
      { name: "value", kind: "number" },
      { name: "raw_payload", kind: "json" },
      { name: "source_provider", kind: "text" },
      { name: "source_external_id", kind: "text" },
      { name: "fetched_at", kind: "timestamp" },
    ],
  },
  {
    name: "indicator_snapshots",
    primaryKey: "indicator_id",
    columns: [
      { name: "indicator_id", kind: "text" },
      { name: "latest_value", kind: "number", nullable: true },
      { name: "latest_date", kind: "date", nullable: true },
      { name: "change_1d", kind: "number", nullable: true },
      { name: "change_5d", kind: "number", nullable: true },
      { name: "change_20d", kind: "number", nullable: true },
      { name: "pct_rank_1y", kind: "number", nullable: true },
      { name: "zscore_1y", kind: "number", nullable: true },
      { name: "state_label", kind: "text", nullable: true },
      { name: "updated_at", kind: "timestamp" },
    ],
  },
  {
    name: "sync_runs",
    primaryKey: "id",
    columns: [
      { name: "id", kind: "text" },
      { name: "provider", kind: "text" },
      { name: "job_name", kind: "text" },
      { name: "status", kind: "text" },
      { name: "started_at", kind: "timestamp" },
      { name: "finished_at", kind: "timestamp", nullable: true },
      { name: "records_upserted", kind: "integer", nullable: true },
      { name: "error_message", kind: "text", nullable: true },
      { name: "meta", kind: "json", nullable: true, chunked: true },
    ],
  },
  {
    name: "daily_commentaries",
    primaryKey: "id",
    columns: [
      { name: "id", kind: "text" },
      { name: "as_of_date", kind: "date" },
      { name: "scope", kind: "text" },
      { name: "headline", kind: "text" },
      { name: "summary", kind: "text" },
      { name: "body_md", kind: "text" },
      { name: "model", kind: "text" },
      { name: "inputs_json", kind: "json" },
      { name: "created_at", kind: "timestamp" },
    ],
  },
];

const quoteIdentifier = (value: string): string => `"${value.replaceAll('"', '""')}"`;

const quoteText = (value: string): string => {
  if (value.includes("\0")) {
    throw new Error("D1 export encountered a NUL byte in a text value.");
  }

  return `'${value.replaceAll("'", "''")}'`;
};

const numericLiteral = (value: unknown, kind: "integer" | "number"): string => {
  const literal = typeof value === "number" ? String(value) : String(value ?? "");
  const pattern = kind === "integer" ? /^-?\d+$/ : /^-?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?$/i;

  if (!pattern.test(literal) || !Number.isFinite(Number(literal))) {
    throw new Error(`Invalid ${kind} value encountered during D1 export.`);
  }

  return literal;
};

const dateLiteral = (value: unknown, columnName: string): string => {
  const date =
    value instanceof Date
      ? [
          String(value.getFullYear()).padStart(4, "0"),
          String(value.getMonth() + 1).padStart(2, "0"),
          String(value.getDate()).padStart(2, "0"),
        ].join("-")
      : String(value);
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);

  if (!match) {
    throw new Error(`Invalid date encountered in ${columnName}. Expected YYYY-MM-DD.`);
  }

  const normalized = new Date(`${date}T00:00:00.000Z`);
  if (
    Number.isNaN(normalized.getTime()) ||
    normalized.toISOString().slice(0, 10) !== date
  ) {
    throw new Error(`Invalid calendar date encountered in ${columnName}.`);
  }

  return quoteText(date);
};

const toSqlLiteral = (value: unknown, column: ColumnSpec): string => {
  if (value === null || value === undefined) {
    if (!column.nullable) {
      throw new Error(`Unexpected NULL in ${column.name}.`);
    }
    return "NULL";
  }

  switch (column.kind) {
    case "boolean":
      return value === true ? "1" : value === false ? "0" : numericLiteral(value, "integer");
    case "date":
      return dateLiteral(value, column.name);
    case "integer":
      return numericLiteral(value, "integer");
    case "number":
      return numericLiteral(value, "number");
    case "json":
      return quoteText(JSON.stringify(value));
    case "timestamp": {
      const timestamp = value instanceof Date ? value.getTime() : new Date(String(value)).getTime();
      if (!Number.isSafeInteger(timestamp)) {
        throw new Error(`Invalid timestamp encountered in ${column.name}.`);
      }
      return String(timestamp);
    }
    case "text":
      return quoteText(String(value));
  }
};

const serializeChunkedValue = (value: unknown, column: ColumnSpec): string =>
  column.kind === "json" ? JSON.stringify(value) : String(value);

const splitTextForSql = (value: string): string[] => {
  const chunks: string[] = [];
  let offset = 0;

  while (offset < value.length) {
    let end = Math.min(value.length, offset + 4_000);
    const finalCodeUnit = value.charCodeAt(end - 1);
    if (end < value.length && finalCodeUnit >= 0xd800 && finalCodeUnit <= 0xdbff) {
      end -= 1;
    }
    chunks.push(value.slice(offset, end));
    offset = end;
  }

  return chunks;
};

const writeChunk = async (
  stream: ReturnType<typeof createWriteStream>,
  chunk: string,
): Promise<void> => {
  if (!stream.write(chunk)) {
    await once(stream, "drain");
  }
};

const writeRows = async (
  stream: ReturnType<typeof createWriteStream>,
  table: TableSpec,
  rows: Record<string, unknown>[],
): Promise<void> => {
  const header = `INSERT INTO ${quoteIdentifier(table.name)} (${table.columns
    .map((column) => quoteIdentifier(column.name))
    .join(", ")}) VALUES\n`;
  let batch: string[] = [];

  const flush = async () => {
    if (batch.length === 0) {
      return;
    }
    await writeChunk(stream, `${header}${batch.join(",\n")};\n`);
    batch = [];
  };

  for (const row of rows) {
    const chunkedColumns = table.columns.filter(
      (column) => column.chunked && row[column.name] !== null && row[column.name] !== undefined,
    );
    const tuple = `(${table.columns
      .map((column) =>
        chunkedColumns.includes(column)
          ? quoteText("")
          : toSqlLiteral(row[column.name], column),
      )
      .join(", ")})`;

    if (chunkedColumns.length > 0) {
      await flush();
      await writeChunk(stream, `${header}${tuple};\n`);

      const primaryKeyColumn = table.columns.find(
        (column) => column.name === table.primaryKey,
      );
      if (!primaryKeyColumn) {
        throw new Error(`Primary key metadata missing for ${table.name}.`);
      }
      const primaryKeyLiteral = toSqlLiteral(
        row[table.primaryKey],
        primaryKeyColumn,
      );

      for (const column of chunkedColumns) {
        const serialized = serializeChunkedValue(row[column.name], column);
        for (const textChunk of splitTextForSql(serialized)) {
          await writeChunk(
            stream,
            `UPDATE ${quoteIdentifier(table.name)} SET ${quoteIdentifier(column.name)} = ${quoteIdentifier(column.name)} || ${quoteText(textChunk)} WHERE ${quoteIdentifier(table.primaryKey)} = ${primaryKeyLiteral};\n`,
          );
        }
      }
      continue;
    }

    const candidate = `${header}${[...batch, tuple].join(",\n")};\n`;

    if (
      batch.length > 0 &&
      (batch.length >= MAX_ROWS_PER_INSERT ||
        Buffer.byteLength(candidate, "utf8") > MAX_STATEMENT_BYTES)
    ) {
      await flush();
    }

    batch.push(tuple);
  }

  await flush();
};

const exportTable = async (
  client: Client,
  stream: ReturnType<typeof createWriteStream>,
  table: TableSpec,
): Promise<number> => {
  const columns = table.columns.map((column) => quoteIdentifier(column.name)).join(", ");
  const quotedTable = quoteIdentifier(table.name);
  const quotedPrimaryKey = quoteIdentifier(table.primaryKey);
  let lastPrimaryKey: string | null = null;
  let exported = 0;

  while (true) {
    const result: QueryResult<Record<string, unknown>> = lastPrimaryKey
      ? await client.query<Record<string, unknown>>(
          `SELECT ${columns} FROM ${quotedTable} WHERE ${quotedPrimaryKey} > $1 ORDER BY ${quotedPrimaryKey} LIMIT $2`,
          [lastPrimaryKey, PAGE_SIZE],
        )
      : await client.query<Record<string, unknown>>(
          `SELECT ${columns} FROM ${quotedTable} ORDER BY ${quotedPrimaryKey} LIMIT $1`,
          [PAGE_SIZE],
        );

    if (result.rows.length === 0) {
      break;
    }

    await writeRows(stream, table, result.rows);
    exported += result.rows.length;
    lastPrimaryKey = String(result.rows.at(-1)?.[table.primaryKey]);

    if (result.rows.length < PAGE_SIZE) {
      break;
    }
  }

  return exported;
};

async function main() {
  const envPath = resolve(process.cwd(), ".env.local");
  if (existsSync(envPath)) {
    loadEnvFile(envPath);
  }

  const databaseUrl = process.env.DATABASE_URL?.trim();
  if (!databaseUrl) {
    throw new Error("DATABASE_URL must be available to the Neon export process.");
  }

  const outputPath = resolve(
    process.cwd(),
    process.argv[2] ?? ".d1-import/neon-data.sql",
  );
  mkdirSync(dirname(outputPath), { recursive: true });

  const client = new Client({
    connectionString: databaseUrl,
    application_name: "stresssignal-d1-export",
  });
  const stream = createWriteStream(outputPath, { encoding: "utf8" });
  const counts: Record<string, number> = {};

  try {
    await client.connect();
    await client.query("BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY");
    await writeChunk(
      stream,
      `-- StressSignal Neon to D1 data export (${new Date().toISOString()})\nPRAGMA defer_foreign_keys = on;\n`,
    );

    for (const table of tables) {
      counts[table.name] = await exportTable(client, stream, table);
    }

    await writeChunk(stream, "PRAGMA defer_foreign_keys = off;\nPRAGMA optimize;\n");
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    stream.end();
    await once(stream, "close");
    await client.end().catch(() => undefined);
  }

  console.log(JSON.stringify({ outputPath, counts }, null, 2));
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : "Unknown export error";
  console.error(`[export-neon-to-d1] ${message}`);
  process.exitCode = 1;
});
