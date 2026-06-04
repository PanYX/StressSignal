import { describe, expect, it } from "vitest";

import {
  PUBLIC_SOURCE_PROVIDER_FETCH_MODES,
  fetchPublicSourceObservations,
  parseCboePutCallPayload,
  parseEdgmapAaiiSentimentHtml,
  parseNikkei225ViCsv,
} from "../../lib/adapters/public-sources";

describe("public source adapter", () => {
  it("parses Cboe Put/Call RSC payloads and keeps the selected data date", () => {
    const parsed = parseCboePutCallPayload(
      [
        '0:["$","$L1",null,{"selectedDate":"2026-05-29"}]',
        '{"name":"TOTAL PUT/CALL RATIO","value":"0.64"}',
      ].join("\n"),
      "2026-06-01",
    );

    expect(parsed).toMatchObject({
      date: "2026-05-29",
      value: 0.64,
      raw: {
        requestedDate: "2026-06-01",
        selectedDate: "2026-05-29",
        name: "TOTAL PUT/CALL RATIO",
      },
    });
  });

  it("skips Cboe Put/Call payloads when the daily ratio is not published yet", () => {
    const parsed = parseCboePutCallPayload(
      '0:["$","$L1",null,{"selectedDate":"2026-06-01"}]',
      "2026-06-01",
    );

    expect(parsed).toMatchObject({
      raw: { requestedDate: "2026-06-01", selectedDate: "2026-06-01" },
      reason: "missing_or_invalid_value",
    });
  });

  it("parses Nikkei 225 VI CSV rows and ignores the footer", () => {
    const parsed = parseNikkei225ViCsv(
      [
        "Date,Close,Open,High,Low",
        "2026/05/29,24.12,24.00,25.00,23.80",
        "Copyright (C),Nikkei Inc.",
      ].join("\n"),
    );

    expect(parsed.transport).toBe("csv");
    expect(parsed.observations).toMatchObject([
      {
        date: "2026-05-29",
        value: 24.12,
        raw: {
          date: "2026/05/29",
          close: "24.12",
          open: "24.00",
          high: "25.00",
          low: "23.80",
        },
      },
    ]);
    expect(parsed.skipped).toHaveLength(1);
    expect(parsed.skipped[0]?.reason).toBe("unsupported_row");
  });

  it("parses EDGMAP embedded AAII sentiment JSON by configured field", () => {
    const html = `
      <script>
        const sampleData = {
          "latest": {
            "date": "2026-05-28",
            "bullish": 35.556,
            "neutral": 22.5926,
            "bearish": 41.8519,
            "bull_bear_spread": -6.2959
          },
          "historical": [
            { "date": "1987-06-26", "bullish": null, "neutral": null, "bearish": null },
            { "date": "2026-05-21", "bullish": 31.7181, "neutral": 24.6696, "bearish": 43.6123 },
            { "date": "2026-05-28", "bullish": 35.556, "neutral": 22.5926, "bearish": 41.8519 }
          ]
        };
        let currentData = sampleData;
      </script>
    `;

    const parsed = parseEdgmapAaiiSentimentHtml(html, "AAII_BEARISH", "2026-05-01");

    expect(parsed.transport).toBe("embedded_json");
    expect(parsed.observations).toMatchObject([
      { date: "2026-05-21", value: 43.6123 },
      { date: "2026-05-28", value: 41.8519 },
    ]);
    expect(parsed.skipped).toHaveLength(1);
  });

  it("routes only configured public provider/fetch-mode pairs", async () => {
    for (const expected of [
      { provider: "cboe", fetchMode: "next_rsc" },
      { provider: "naaim", fetchMode: "xlsx" },
      { provider: "stoxx", fetchMode: "ajax_json" },
      { provider: "nse", fetchMode: "json" },
      { provider: "nikkei", fetchMode: "csv" },
      { provider: "hkex", fetchMode: "json" },
      { provider: "edgmap", fetchMode: "embedded_json" },
    ]) {
      expect(
        PUBLIC_SOURCE_PROVIDER_FETCH_MODES.some(
          (item) =>
            item.provider === expected.provider &&
            item.fetchMode === expected.fetchMode,
        ),
      ).toBe(true);
    }

    await expect(
      fetchPublicSourceObservations({
        provider: "unknown",
        fetchMode: "json",
        externalId: "UNKNOWN",
        sourceUrl: "https://example.com",
      }),
    ).rejects.toMatchObject({
      name: "PublicSourceAdapterError",
      code: "unsupported_source",
    });
  });
});
