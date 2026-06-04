import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { execSync } from "node:child_process";

import validObservations from "../fixtures/fred/valid-observations.json";

type SyncRouteModule = typeof import("../../app/api/internal/sync/fred/route");
type ComputeRouteModule = typeof import("../../app/api/internal/compute-snapshots/route");
type SummaryRouteModule = typeof import("../../app/api/v1/summary/route");
type CommentaryRouteModule = typeof import("../../app/api/v1/commentary/route");
type DbClientModule = typeof import("../../lib/db/client");

const TEST_SECRET = "integration-secret";
const TEST_FRED_API_KEY = "fake-api-key";
const TEST_DB_PORT = 56000 + Math.floor(Math.random() * 1000);
const TEST_CONTAINER_NAME = `stresssignal-t011-integration-${Date.now()}`;
const DATABASE_URL = `postgresql://postgres:postgres@127.0.0.1:${TEST_DB_PORT}/stresssignal`;

const withTestEnv = (extra: Record<string, string> = {}) => ({
  ...process.env,
  DATABASE_URL,
  CRON_SECRET: TEST_SECRET,
  FRED_API_KEY: TEST_FRED_API_KEY,
  ...extra,
});

const runCommand = (command: string) =>
  execSync(command, {
    stdio: "pipe",
    env: withTestEnv(),
  });

const waitForDatabase = async () => {
  for (let attempt = 1; attempt <= 60; attempt += 1) {
    try {
      execSync(`docker exec ${TEST_CONTAINER_NAME} pg_isready -U postgres -d stresssignal`, {
        stdio: "pipe",
      });
      return;
    } catch {
      if (attempt >= 60) {
        throw new Error(`Timed out waiting for Postgres container ${TEST_CONTAINER_NAME}`);
      }
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }
};

const buildMockResponse = () =>
  new Response(JSON.stringify(validObservations), {
    status: 200,
    headers: { "content-type": "application/json" },
  });

const buildSyncRequest = (token?: string) =>
  new Request("http://127.0.0.1/api/internal/sync/fred", {
    method: "POST",
    headers: token
      ? {
          Authorization: `Bearer ${token}`,
        }
      : undefined,
  });

type NextRequestLike = Parameters<SyncRouteModule["POST"]>[0];
const asNextRequest = (request: Request): NextRequestLike => request as NextRequestLike;

describe("data pipeline integration", () => {
  let syncPost: SyncRouteModule["POST"];
  let computePost: ComputeRouteModule["POST"];
  let summaryGet: SummaryRouteModule["GET"];
  let commentaryGet: CommentaryRouteModule["GET"];
  let closeDb: DbClientModule["closeDb"];

  beforeAll(async () => {
    try {
      execSync(`docker rm -f ${TEST_CONTAINER_NAME}`, {
        stdio: "pipe",
      });
    } catch {
      // expected if the container does not exist yet
    }

    execSync(
      `docker run -d --name ${TEST_CONTAINER_NAME} ` +
        "-e POSTGRES_USER=postgres " +
        "-e POSTGRES_PASSWORD=postgres " +
        "-e POSTGRES_DB=stresssignal " +
        `-p ${TEST_DB_PORT}:5432 ` +
        "postgres:16-alpine",
      { stdio: "pipe" },
    );

    await waitForDatabase();

    runCommand("pnpm run db:migrate");
    runCommand("pnpm seed:indicators");

    process.env.DATABASE_URL = DATABASE_URL;
    process.env.CRON_SECRET = TEST_SECRET;
    process.env.FRED_API_KEY = TEST_FRED_API_KEY;

    const [sync, compute, summary, commentary, dbClient] = await Promise.all([
      import("../../app/api/internal/sync/fred/route"),
      import("../../app/api/internal/compute-snapshots/route"),
      import("../../app/api/v1/summary/route"),
      import("../../app/api/v1/commentary/route"),
      import("../../lib/db/client"),
    ]);

    syncPost = sync.POST;
    computePost = compute.POST;
    summaryGet = summary.GET;
    commentaryGet = commentary.GET;
    closeDb = dbClient.closeDb;
  });

  afterAll(async () => {
    if (typeof closeDb === "function") {
      await closeDb();
    }

    try {
      execSync(`docker rm -f ${TEST_CONTAINER_NAME}`, {
        stdio: "pipe",
      });
    } catch {
      // best-effort cleanup
    }
  });

  it("sync -> parse -> upsert -> compute -> summary + commentary chain works", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockImplementation(async () => buildMockResponse());

    const syncResponse = await syncPost(asNextRequest(buildSyncRequest(TEST_SECRET)));
    const syncBody = await syncResponse.json();

    expect(syncResponse.status).toBe(200);
    expect(syncBody.status).toBe("success");
    expect(syncBody.summary.hasFailures).toBe(false);
    expect(syncBody.counts.observationsUpserted).toBeGreaterThan(0);
    const fetchedFredSeries = new Set(
      syncBody.series
        .filter((item: { requestedObservations: number }) => item.requestedObservations > 0)
        .map((item: { sourceExternalId: string }) => item.sourceExternalId),
    );
    expect(fetchMock).toHaveBeenCalledTimes(fetchedFredSeries.size);

    vi.restoreAllMocks();

    const computeResponse = await computePost(
      asNextRequest(
        new Request("http://127.0.0.1/api/internal/compute-snapshots", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${TEST_SECRET}`,
          },
        }),
      ),
    );
    const computeBody = await computeResponse.json();

    expect(computeResponse.status).toBe(200);
    expect(computeBody.rowsComputed).toBeGreaterThan(0);
    expect(computeBody.rowsWritten).toBe(computeBody.rowsComputed);
    expect(computeBody.compositeRiskScore === null || typeof computeBody.compositeRiskScore === "number").toBe(true);

    const summaryResponse = await summaryGet();
    const summaryBody = await summaryResponse.json();

    expect(summaryResponse.status).toBe(200);
    expect(summaryBody.asOf).toBeTruthy();
    expect(summaryBody.riskScore === null || summaryBody.riskScore >= 0).toBe(true);
    expect(summaryBody.riskScore === null || summaryBody.riskScore <= 100).toBe(true);
    expect(summaryBody.cards.length).toBeGreaterThan(0);

    const commentaryResponse = await commentaryGet(
      new Request("http://127.0.0.1/api/v1/commentary?scope=daily"),
    );
    const commentaryBody = await commentaryResponse.json();

    expect(commentaryResponse.status).toBe(200);
    expect(commentaryBody.scope).toBe("daily");
    expect(Array.isArray(commentaryBody.branches)).toBe(true);
  });
});
