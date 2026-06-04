import { strict as assert } from "node:assert";

import { describe, it } from "vitest";

import {
  commentaryResponseSchema,
  computeSnapshotsResponseSchema,
  indicatorDetailResponseSchema,
  indicatorsListResponseSchema,
  observationsResponseSchema,
  parseHistoryRange,
  parseRevalidateTagsSchema,
  revalidateResponseSchema,
  summaryResponseSchema,
} from "../../lib/api/schemas";

describe("API schemas", () => {
  it("validates summary response payload", () => {
    const payload = {
      asOf: "2026-05-28",
      riskScore: 61,
      riskStateLabel: "风险升温",
      topDrivers: ["vix", "vxn", "rvx"],
      cards: [
        {
          slug: "vix",
          name: "VIX",
          latestValue: 16.29,
          latestDate: "2026-05-28",
          change1d: -0.72,
          pctRank1y: 0.61,
          stateLabel: "观察",
        },
      ],
      headline: "权益端波动升温，系统端仍未同步。",
    };

    assert.deepStrictEqual(summaryResponseSchema.parse(payload), payload);
  });

  it("validates indicators list response payload", () => {
    const payload = {
      asOf: "2026-05-28",
      indicators: [
        {
          id: "11111111-1111-1111-8111-111111111111",
          slug: "vix",
          name: "VIX",
          category: "equity_vol",
          frequency: "daily",
          description: "sample",
          unit: "index",
          status: "active",
          sourcePolicy: "public_ok",
          latestValue: null,
          latestDate: null,
          change1d: null,
          change5d: null,
          change20d: null,
          pctRank1y: null,
          zscore1y: null,
          stateLabel: "数据不足",
          updatedAt: null,
          sources: [],
        },
      ],
    };

    assert.deepStrictEqual(indicatorsListResponseSchema.parse(payload), payload);
  });

  it("validates indicator detail response payload", () => {
    const payload = {
      asOf: "2026-05-28",
      indicator: {
        id: "11111111-1111-1111-8111-111111111111",
        slug: "vix",
        name: "VIX",
        category: "equity_vol",
        frequency: "daily",
        description: "sample",
        unit: "index",
        status: "active",
        sourcePolicy: "public_ok",
        latestValue: 16,
        latestDate: "2026-05-28",
        change1d: 1,
        change5d: 2,
        change20d: -3,
        pctRank1y: 0.5,
        zscore1y: 0.4,
        stateLabel: "风险升温",
        updatedAt: "2026-05-28T08:00:00.000Z",
        sources: [
          {
            provider: "fred",
            externalId: "VIXCLS",
            fetchMode: "api_json",
            sourceUrl: "https://example.com",
            isPrimary: true,
            licenseNote: null,
            active: true,
          },
        ],
      },
    };

    assert.deepStrictEqual(indicatorDetailResponseSchema.parse(payload), payload);
  });

  it("validates observation payload", () => {
    const payload = {
      asOf: "2026-05-28",
      slug: "vix",
      range: "5Y" as const,
      observations: [{ date: "2026-05-28", value: 20 }],
      sourceCount: 1,
    };

    assert.deepStrictEqual(observationsResponseSchema.parse(payload), payload);
  });

  it("validates commentary response payload", () => {
    const payload = {
      asOf: "2026-05-28",
      scope: "daily",
      headline: "test headline",
      summary: "test summary",
      details: ["d1"],
      branches: [],
      missing: ["vix"],
      metrics: {
        vix: { latestValue: 10, pctRank1y: null },
        vxn: null,
        rvx: null,
        stlfsi4: null,
        nfci: null,
        vixTermProxy: null,
      },
    };

    assert.deepStrictEqual(commentaryResponseSchema.parse(payload), payload);
  });

  it("validates snapshot recompute response payload", () => {
    const payload = {
      computedAt: "2026-05-28T12:34:56.000Z",
      rowsWritten: 8,
      rowsComputed: 8,
      compositeRiskScore: 61.4,
    };

    assert.deepStrictEqual(computeSnapshotsResponseSchema.parse(payload), payload);
  });

  it("validates revalidate response payload", () => {
    const payload = {
      processedAt: "2026-05-28T12:34:56.000Z",
      requestedTags: ["summary", "indicator:vix"],
      processedTags: ["summary"],
      skippedTags: ["unknown"],
      totalRequested: 2,
      totalProcessed: 1,
    };

    assert.deepStrictEqual(revalidateResponseSchema.parse(payload), payload);
  });

  it("parses history range values", () => {
    assert.equal(parseHistoryRange("3m"), "3M");
    assert.equal(parseHistoryRange("1Y"), "1Y");
    assert.equal(parseHistoryRange(null), "1Y");
  });

  it("validates revalidate tags request payload", () => {
    assert.deepStrictEqual(
      parseRevalidateTagsSchema.parse({ tags: ["summary", "indicator:vix"] }),
      { tags: ["summary", "indicator:vix"] },
    );
  });
});
