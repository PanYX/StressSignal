import { and, eq, inArray, sql } from "drizzle-orm";

import {
  computeChange1d,
  computeChange20d,
  computeChange5d,
  computeCompositeRiskScore,
  computeDifferenceSeries,
  computeEquityBreadthProxySeries,
  computeFearGreedScore,
  computeMomentumReturnSeries,
  computeMovingAverageSeries,
  computePctRank1y,
  computeRatioSeries,
  computeVixTermProxySeries,
  computeZscore1y,
  type NumericSeriesPoint,
} from "../lib/indicators/compute";
import { MVP_INDICATOR_SLUGS } from "../lib/indicators/configs";
import { getSnapshotStateLabel } from "../lib/indicators/labels";
import { getObservationsForCompute } from "../lib/db/queries";
import { db, closeDb } from "../lib/db/client";
import { indicators, indicatorSnapshots } from "../lib/db/schema";

const REQUIRED_SLUGS = MVP_INDICATOR_SLUGS;
const WEEKLY_SLUGS = new Set([
  "stlfsi4",
  "nfci",
  "anfci",
  "aaii-bullish",
  "aaii-bearish",
  "aaii-neutral",
  "aaii-bull-bear-spread",
  "naaim-exposure",
  "naaim-exposure-ma4",
]);

type ComputedSnapshot = {
  latestValue: number | null;
  latestDate: string | null;
  change1d: number | null;
  change5d: number | null;
  change20d: number | null;
  pctRank1y: number | null;
  zscore1y: number | null;
  stateLabel: string;
};

type SnapshotBySlug = Map<
  string,
  {
    rows: ComputedSnapshot;
    series: NumericSeriesPoint[];
  }
>;

const parseFloatSeries = (
  points: { date: string; value: number }[],
): number[] => points.map((point) => point.value);

const toDbNumeric = (value: number | null): string | null =>
  value === null ? null : value.toString();

const computeSeriesSnapshot = (
  points: NumericSeriesPoint[],
  useShortWindowForRank = false,
): ComputedSnapshot => {
  const values = parseFloatSeries(points);
  const latestValue = values.at(-1) ?? null;
  const latestDate = points.at(-1)?.date ?? null;

  const change1d = computeChange1d(values);
  const change5d = computeChange5d(values);
  const change20d = computeChange20d(values);
  const pctRank1y = useShortWindowForRank ? computePctRank1y(values.slice(-52)) : computePctRank1y(values);
  const zscore1y = computeZscore1y(useShortWindowForRank ? values.slice(-52) : values);
  const stateLabel = pctRank1y === null ? "数据不足" : getSnapshotStateLabel(pctRank1y);

  return {
    latestValue,
    latestDate,
    change1d,
    change5d,
    change20d,
    pctRank1y,
    zscore1y,
    stateLabel,
  };
};

const snapshotBySlugFromObservations = (
  observationsByIndicator: Awaited<
    ReturnType<typeof getObservationsForCompute>
  >,
): SnapshotBySlug => {
  const result: SnapshotBySlug = new Map();

  for (const slug of REQUIRED_SLUGS) {
    const seriesBySource = observationsByIndicator.get(slug) ?? new Map();
    const firstSeries = Array.from(seriesBySource.values())[0];

    if (slug === "vix-term-proxy") {
      const vixPoints = seriesBySource.get("VIXCLS") ?? [];
      const vixvPoints = seriesBySource.get("VXVCLS") ?? [];
      const proxy = computeVixTermProxySeries(vixPoints, vixvPoints);
      if (proxy.length === 0) {
        continue;
      }
      result.set(slug, {
        rows: computeSeriesSnapshot(proxy),
        series: proxy,
      });
      continue;
    }

    if (slug === "vvix-vix-ratio") {
      const ratio = computeRatioSeries(
        seriesBySource.get("VVIX") ?? [],
        seriesBySource.get("VIXCLS") ?? [],
      );
      if (ratio.length === 0) {
        continue;
      }
      result.set(slug, {
        rows: computeSeriesSnapshot(ratio),
        series: ratio,
      });
      continue;
    }

    if (slug === "aaii-bull-bear-spread") {
      const spread = computeDifferenceSeries(
        seriesBySource.get("AAII_BULLISH") ?? [],
        seriesBySource.get("AAII_BEARISH") ?? [],
      );
      if (spread.length === 0) {
        continue;
      }
      result.set(slug, {
        rows: computeSeriesSnapshot(spread, true),
        series: spread,
      });
      continue;
    }

    if (slug === "naaim-exposure-ma4") {
      const average = computeMovingAverageSeries(
        seriesBySource.get("NAAIM_EXPOSURE") ?? [],
        4,
      );
      if (average.length === 0) {
        continue;
      }
      result.set(slug, {
        rows: computeSeriesSnapshot(average, true),
        series: average,
      });
      continue;
    }

    if (slug === "momentum-proxy") {
      const momentum = computeMomentumReturnSeries(
        seriesBySource.get("SP500") ?? [],
        20,
      );
      if (momentum.length === 0) {
        continue;
      }
      result.set(slug, {
        rows: computeSeriesSnapshot(momentum),
        series: momentum,
      });
      continue;
    }

    if (!firstSeries || firstSeries.length === 0) {
      continue;
    }

    const isWeekly = WEEKLY_SLUGS.has(slug);
    result.set(slug, {
      rows: computeSeriesSnapshot(firstSeries, isWeekly),
      series: firstSeries,
    });
  }

  const fearGreedScore = computeFearGreedCompositeRow(result);
  if (fearGreedScore) {
    result.set("fear-greed-internal", fearGreedScore);
  }

  const globalComposite = computeGlobalVolCompositeRow(result);
  if (globalComposite) {
    result.set("global-vol-composite", globalComposite);
  }

  return result;
};

const computeCompositeRow = (snapshotBySlug: SnapshotBySlug): number | null => {
  const vix = snapshotBySlug.get("vix");
  const proxy = snapshotBySlug.get("vix-term-proxy");
  const vxn = snapshotBySlug.get("vxn");
  const rvx = snapshotBySlug.get("rvx");
  const stlfsi4 = snapshotBySlug.get("stlfsi4");
  const nfci = snapshotBySlug.get("nfci");

  if (!vix || !vxn || !rvx || !stlfsi4 || !nfci) {
    return null;
  }

  const vixVxvSeries = proxy?.series ?? [];
  const equityBreadthSeries = computeEquityBreadthProxySeries(
    vix.series,
    vxn.series,
    rvx.series,
  );

  const vixVxvPctRank =
    proxy?.rows.pctRank1y ??
    (vixVxvSeries.length > 0 ? computePctRank1y(parseFloatSeries(vixVxvSeries)) : null);
  const equityBreadthPctRank =
    equityBreadthSeries.length > 0
      ? computePctRank1y(parseFloatSeries(equityBreadthSeries))
      : null;

  return computeCompositeRiskScore({
    vixPctRank: vix.rows.pctRank1y,
    vixVxvPctRank,
    equityBreadthPctRank,
    stlfsi4PctRank: stlfsi4.rows.pctRank1y,
    nfciPctRank: nfci.rows.pctRank1y,
  });
};

const latestDateFromSnapshots = (
  entries: Array<SnapshotBySlug extends Map<string, infer V> ? V | undefined : never>,
): string | null =>
  entries
    .map((entry) => entry?.rows.latestDate)
    .filter((date): date is string => Boolean(date))
    .sort()
    .at(-1) ?? null;

const buildSinglePointSnapshot = (
  value: number,
  latestDate: string | null,
): {
  rows: ComputedSnapshot;
  series: NumericSeriesPoint[];
} => {
  const series = latestDate ? [{ date: latestDate, value }] : [];
  return {
    rows: {
      latestValue: value,
      latestDate,
      change1d: null,
      change5d: null,
      change20d: null,
      pctRank1y: Number.isFinite(value) ? Math.max(0, Math.min(1, value / 100)) : null,
      zscore1y: null,
      stateLabel:
        Number.isFinite(value) ? getSnapshotStateLabel(Math.max(0, Math.min(1, value / 100))) : "数据不足",
    },
    series,
  };
};

const computeFearGreedCompositeRow = (
  snapshotBySlug: SnapshotBySlug,
): { rows: ComputedSnapshot; series: NumericSeriesPoint[] } | null => {
  const vix = snapshotBySlug.get("vix");
  const putCall = snapshotBySlug.get("put-call-ratio");
  const hyOas = snapshotBySlug.get("hy-oas");
  const momentum = snapshotBySlug.get("momentum-proxy");
  const vxn = snapshotBySlug.get("vxn");
  const rvx = snapshotBySlug.get("rvx");

  if (!vix || !vxn || !rvx || !hyOas || !momentum || !putCall) {
    return null;
  }

  const breadthSeries = computeEquityBreadthProxySeries(
    vix.series,
    vxn.series,
    rvx.series,
  );
  const breadthPctRank =
    breadthSeries.length > 0
      ? computePctRank1y(parseFloatSeries(breadthSeries))
      : null;
  const score = computeFearGreedScore({
    vixPctRank: vix.rows.pctRank1y,
    putCallPctRank: putCall.rows.pctRank1y,
    hyOasPctRank: hyOas.rows.pctRank1y,
    breadthPctRank,
    momentumPctRank: momentum.rows.pctRank1y,
  });

  if (score === null) {
    return null;
  }

  return buildSinglePointSnapshot(score, latestDateFromSnapshots([
    vix,
    putCall,
    hyOas,
    momentum,
  ]));
};

const computeGlobalVolCompositeRow = (
  snapshotBySlug: SnapshotBySlug,
): { rows: ComputedSnapshot; series: NumericSeriesPoint[] } | null => {
  const entries = [
    snapshotBySlug.get("vstoxx"),
    snapshotBySlug.get("india-vix"),
    snapshotBySlug.get("nikkei-225-vi"),
    snapshotBySlug.get("vhsi"),
  ];
  const values = entries
    .map((entry) => entry?.rows.pctRank1y)
    .filter((value): value is number => Number.isFinite(value));

  if (values.length < 2) {
    return null;
  }

  const score = (values.reduce((sum, value) => sum + value, 0) / values.length) * 100;
  return buildSinglePointSnapshot(score, latestDateFromSnapshots(entries));
};

async function buildSnapshotRows(dryRun: boolean) {
  const observationsByIndicator = await getObservationsForCompute([...REQUIRED_SLUGS]);
  const snapshotsBySlug = snapshotBySlugFromObservations(observationsByIndicator);
  const compositeScore = computeCompositeRow(snapshotsBySlug);
  const computedAt = new Date().toISOString();

  const indicatorIds = await db
    .select({ id: indicators.id, slug: indicators.slug })
    .from(indicators)
    .where(and(eq(indicators.status, "active"), inArray(indicators.slug, REQUIRED_SLUGS)));

  const rows = indicatorIds
    .map((indicator) => {
      const snapshot = snapshotsBySlug.get(indicator.slug);
      if (!snapshot) {
        return null;
      }

      return {
        indicatorId: indicator.id,
        latestValue: toDbNumeric(snapshot.rows.latestValue),
        latestDate: snapshot.rows.latestDate,
        change1d: toDbNumeric(snapshot.rows.change1d),
        change5d: toDbNumeric(snapshot.rows.change5d),
        change20d: toDbNumeric(snapshot.rows.change20d),
        pctRank1y: toDbNumeric(snapshot.rows.pctRank1y),
        zscore1y: toDbNumeric(snapshot.rows.zscore1y),
        stateLabel:
          snapshot.rows.stateLabel ?? (snapshot.rows.pctRank1y === null ? "数据不足" : getSnapshotStateLabel(snapshot.rows.pctRank1y)),
      };
    })
    .filter((row) => row !== null);

  if (!dryRun && rows.length > 0) {
    await db
      .insert(indicatorSnapshots)
      .values(rows)
      .onConflictDoUpdate({
        target: [indicatorSnapshots.indicatorId],
        set: {
          latestValue: sql`EXCLUDED.latest_value`,
          latestDate: sql`EXCLUDED.latest_date`,
          change1d: sql`EXCLUDED.change_1d`,
          change5d: sql`EXCLUDED.change_5d`,
          change20d: sql`EXCLUDED.change_20d`,
          pctRank1y: sql`EXCLUDED.pct_rank_1y`,
          zscore1y: sql`EXCLUDED.zscore_1y`,
          stateLabel: sql`EXCLUDED.state_label`,
          updatedAt: new Date(),
        },
      });
  }

  return {
    computedAt,
    rows,
    compositeRiskScore: compositeScore,
    snapshotsBySlug,
  };
}

async function main() {
  const args = new Set(process.argv.slice(2));
  const isDryRun = args.has("--dry-run") || !args.has("--write");

  const result = await buildSnapshotRows(isDryRun);

  if (isDryRun) {
    console.log(JSON.stringify({
      computedAt: result.computedAt,
      compositeRiskScore: result.compositeRiskScore,
      snapshots: Object.fromEntries(
        [...result.snapshotsBySlug.entries()].map(([slug, { rows }]) => [
          slug,
          rows,
        ]),
      ),
    }, null, 2));
    return;
  }

  console.log(
    `Recomputed and wrote ${result.rows.length} snapshot rows at ${result.computedAt}.`,
  );
  console.log(`Composite risk score: ${result.compositeRiskScore ?? "null"}`);
}

main()
  .catch((error) => {
    console.error("[recompute-snapshots] failed:", error);
    process.exitCode = 1;
  })
  .finally(() => {
    void closeDb();
  });
