import { describe, expect, it } from "vitest";

import {
  MVP_INDICATOR_CONFIGS,
  MVP_INDICATOR_SLUGS,
} from "../../lib/indicators/configs";
import { getRiskBandLabel, RISK_SCORE_BANDS } from "../../lib/indicators/labels";

const expectedSlugs = [
  "vix",
  "vix-term-proxy",
  "vxn",
  "rvx",
  "vxd",
  "stlfsi4",
  "nfci",
  "anfci",
  "vvix",
  "skew",
  "vvix-vix-ratio",
  "aaii-bullish",
  "aaii-bearish",
  "aaii-neutral",
  "aaii-bull-bear-spread",
  "naaim-exposure",
  "naaim-exposure-ma4",
  "put-call-ratio",
  "hy-oas",
  "momentum-proxy",
  "fear-greed-internal",
  "vstoxx",
  "india-vix",
  "nikkei-225-vi",
  "vhsi",
  "global-vol-composite",
];

const expectedSourceIds = [
  "VIXCLS",
  "VXVCLS",
  "VXNCLS",
  "RVXCLS",
  "VXDCLS",
  "STLFSI4",
  "NFCI",
  "ANFCI",
  "VVIX",
  "SKEW",
  "AAII_BULLISH",
  "AAII_BEARISH",
  "AAII_NEUTRAL",
  "NAAIM_EXPOSURE",
  "CBOE_PUT_CALL_DAILY",
  "BAMLH0A0HYM2",
  "SP500",
  "FEAR_GREED_INTERNAL",
  "V2TX",
  "INDIA_VIX",
  "NIKKEI_225_VI",
  "VHSI",
  "GLOBAL_VOL_COMPOSITE",
];

const configuredSlugs = MVP_INDICATOR_CONFIGS.map((indicator) => indicator.slug);
const configuredSourceIds = new Set(
  MVP_INDICATOR_CONFIGS.flatMap((indicator) =>
    indicator.sources.map((source) => source.externalId),
  ),
);

describe("configs", () => {
  it("contains MVP slugs and canonical order", () => {
    expect(configuredSlugs.sort()).toEqual([...expectedSlugs].sort());
    expect(MVP_INDICATOR_SLUGS).toEqual(expectedSlugs);
  });

  it("contains required source ids", () => {
    for (const sourceId of expectedSourceIds) {
      expect(configuredSourceIds.has(sourceId)).toBe(true);
    }
  });

  it("includes complete metadata for each configured indicator", () => {
    for (const indicator of MVP_INDICATOR_CONFIGS) {
      expect(indicator.sources.length).toBeGreaterThan(0);
      expect(indicator.description.length).toBeGreaterThan(10);
      expect(indicator.interpretation?.overview.length).toBeGreaterThan(0);

      for (const source of indicator.sources) {
        expect(source.provider).toBeTruthy();
        expect(source.externalId).toBeTruthy();
      }
    }
  });

  it("maps risk bands for expected scores", () => {
    for (const score of [0, 10, 30, 50, 70, 85, 100]) {
      expect(typeof getRiskBandLabel(score)).toBe("string");
    }

    expect(RISK_SCORE_BANDS.length).toBeGreaterThanOrEqual(5);
  });
});
