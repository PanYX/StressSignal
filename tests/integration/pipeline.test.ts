import { readFileSync } from "node:fs";

import {
  getPlatformProxy,
  unstable_splitSqlQuery,
  type PlatformProxy,
} from "wrangler";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { createDb } from "../../lib/db/client";
import { seedIndicatorMetadata } from "../../lib/db/seed";
import validObservations from "../fixtures/fred/valid-observations.json";

const cloudflareState = vi.hoisted(() => ({
  database: undefined as D1Database | undefined,
}));

vi.mock("@opennextjs/cloudflare", () => ({
  getCloudflareContext: (options?: { async?: boolean }) => {
    if (!cloudflareState.database) {
      throw new Error("Integration D1 binding has not been initialized.");
    }

    const context = { env: { DB: cloudflareState.database } };
    return options?.async ? Promise.resolve(context) : context;
  },
}));

type SyncRouteModule = typeof import("../../app/api/internal/sync/fred/route");
type ComputeRouteModule = typeof import("../../app/api/internal/compute-snapshots/route");
type SummaryRouteModule = typeof import("../../app/api/v1/summary/route");
type CommentaryRouteModule = typeof import("../../app/api/v1/commentary/route");

type SyncResponseBody = {
  status: string;
  summary: { hasFailures: boolean };
  counts: { observationsUpserted: number };
  series: Array<{ requestedObservations: number; sourceExternalId: string }>;
};

type ComputeResponseBody = {
  rowsComputed: number;
  rowsWritten: number;
  compositeRiskScore: number | null;
};

type SummaryResponseBody = {
  asOf: string | null;
  riskScore: number | null;
  cards: unknown[];
};

type CommentaryResponseBody = {
  scope: string;
  branches: unknown[];
};

const TEST_SECRET = "integration-secret";
const TEST_FRED_API_KEY = "fake-api-key";

const buildMockResponse = () =>
  new Response(JSON.stringify(validObservations), {
    status: 200,
    headers: { "content-type": "application/json" },
  });

const buildSyncRequest = (token?: string) =>
  new Request("http://127.0.0.1/api/internal/sync/fred", {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });

type NextRequestLike = Parameters<SyncRouteModule["POST"]>[0];
const asNextRequest = (request: Request): NextRequestLike => request as NextRequestLike;

const responseJson = async <T,>(response: Response): Promise<T> =>
  (await response.json()) as T;

describe("data pipeline integration", () => {
  let platform: PlatformProxy<{ DB: D1Database }>;
  let syncPost: SyncRouteModule["POST"];
  let computePost: ComputeRouteModule["POST"];
  let summaryGet: SummaryRouteModule["GET"];
  let commentaryGet: CommentaryRouteModule["GET"];

  beforeAll(async () => {
    platform = await getPlatformProxy<{ DB: D1Database }>({
      configPath: "wrangler.test.jsonc",
      envFiles: [],
      persist: false,
      remoteBindings: false,
    });
    cloudflareState.database = platform.env.DB;

    const migration = readFileSync(
      "drizzle/d1/0000_special_amphibian.sql",
      "utf8",
    );
    const statements = unstable_splitSqlQuery(migration).filter(
      (statement) => statement.trim().length > 0,
    );
    await platform.env.DB.batch(
      statements.map((statement) => platform.env.DB.prepare(statement)),
    );
    await seedIndicatorMetadata(createDb(platform.env.DB));

    process.env.CRON_SECRET = TEST_SECRET;
    process.env.FRED_API_KEY = TEST_FRED_API_KEY;

    const [sync, compute, summary, commentary] = await Promise.all([
      import("../../app/api/internal/sync/fred/route"),
      import("../../app/api/internal/compute-snapshots/route"),
      import("../../app/api/v1/summary/route"),
      import("../../app/api/v1/commentary/route"),
    ]);

    syncPost = sync.POST;
    computePost = compute.POST;
    summaryGet = summary.GET;
    commentaryGet = commentary.GET;
  });

  afterAll(async () => {
    cloudflareState.database = undefined;
    await platform.dispose();
  });

  it("sync -> parse -> upsert -> compute -> summary + commentary chain works", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockImplementation(async () => buildMockResponse());

    const syncResponse = await syncPost(asNextRequest(buildSyncRequest(TEST_SECRET)));
    const syncBody = await responseJson<SyncResponseBody>(syncResponse);

    expect(syncResponse.status).toBe(200);
    expect(syncBody.status).toBe("success");
    expect(syncBody.summary.hasFailures).toBe(false);
    expect(syncBody.counts.observationsUpserted).toBeGreaterThan(0);
    const fetchedFredSeries = new Set(
      syncBody.series
        .filter((item) => item.requestedObservations > 0)
        .map((item) => item.sourceExternalId),
    );
    expect(fetchMock).toHaveBeenCalledTimes(fetchedFredSeries.size);

    vi.restoreAllMocks();

    const computeResponse = await computePost(
      asNextRequest(
        new Request("http://127.0.0.1/api/internal/compute-snapshots", {
          method: "POST",
          headers: { Authorization: `Bearer ${TEST_SECRET}` },
        }),
      ),
    );
    const computeBody = await responseJson<ComputeResponseBody>(computeResponse);

    expect(computeResponse.status).toBe(200);
    expect(computeBody.rowsComputed).toBeGreaterThan(0);
    expect(computeBody.rowsWritten).toBe(computeBody.rowsComputed);
    expect(
      computeBody.compositeRiskScore === null ||
        typeof computeBody.compositeRiskScore === "number",
    ).toBe(true);

    const summaryResponse = await summaryGet();
    const summaryBody = await responseJson<SummaryResponseBody>(summaryResponse);

    expect(summaryResponse.status).toBe(200);
    expect(summaryBody.asOf).toBeTruthy();
    expect(summaryBody.riskScore === null || summaryBody.riskScore >= 0).toBe(true);
    expect(summaryBody.riskScore === null || summaryBody.riskScore <= 100).toBe(true);
    expect(summaryBody.cards.length).toBeGreaterThan(0);

    const commentaryResponse = await commentaryGet(
      new Request("http://127.0.0.1/api/v1/commentary?scope=daily"),
    );
    const commentaryBody = await responseJson<CommentaryResponseBody>(
      commentaryResponse,
    );

    expect(commentaryResponse.status).toBe(200);
    expect(commentaryBody.scope).toBe("daily");
    expect(Array.isArray(commentaryBody.branches)).toBe(true);
  });
});
