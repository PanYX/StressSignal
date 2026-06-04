import { and, eq, sql } from "drizzle-orm";

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
} from "../indicators/compute";
import { getSnapshotStateLabel } from "../indicators/labels";
import { getObservationsForCompute } from "../db/queries";
import { db } from "../db/client";
import { indicators, indicatorSnapshots } from "../db/schema";

export type RecomputedSnapshotRow = {
  indicatorId: string;
  slug: string;
  latestValue: number | null;
  latestDate: string | null;
  change1d: number | null;
  change5d: number | null;
  change20d: number | null;
  pctRank1y: number | null;
  zscore1y: number | null;
  stateLabel: string;
};

export type RecomputeSnapshotsResult = {
  computedAt: string;
  rows: RecomputedSnapshotRow[];
  compositeRiskScore: number | null;
};

type SnapshotSeries = {
  rows: RecomputedSnapshotRow;
  series: NumericSeriesPoint[];
};

type BuildResult = {
  snapshotRows: RecomputedSnapshotRow[];
  snapshotSeriesBySlug: Map<string, SnapshotSeries>;
};

const SHORT_WINDOW_SLUGS = new Set([
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
const ACTIVE_STATUS = "active";

const toDbNumeric = (value: number | null): string | null =>
  value === null ? null : value.toString();

const computeSeriesSnapshot = (
  points: NumericSeriesPoint[],
  useShortWindowForRank: boolean,
): Omit<RecomputedSnapshotRow, "indicatorId" | "slug"> => {
  const values = points.map((point) => point.value);
  const latestValue = values.at(-1) ?? null;
  const latestDate = points.at(-1)?.date ?? null;
  const change1d = computeChange1d(values);
  const change5d = computeChange5d(values);
  const change20d = computeChange20d(values);
  const rankedValues = useShortWindowForRank ? values.slice(-52) : values;
  const pctRank1y = computePctRank1y(rankedValues);
  const zscore1y = computeZscore1y(rankedValues);
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

const buildSnapshotSeries = async (): Promise<BuildResult> => {
  const activeIndicators = await db
    .select({ id: indicators.id, slug: indicators.slug })
    .from(indicators)
    .where(and(eq(indicators.status, ACTIVE_STATUS)))
    .orderBy(indicators.slug);

  const activeSlugs = activeIndicators.map((item) => item.slug);
  const observationsByIndicator = await getObservationsForCompute(activeSlugs);

  const snapshotSeriesBySlug = new Map<string, SnapshotSeries>();
  const indicatorIdBySlug = new Map(activeIndicators.map((item) => [item.slug, item.id]));

  for (const indicator of activeIndicators) {
    const sourceMap = observationsByIndicator.get(indicator.slug) ?? new Map();

    if (indicator.slug === "vix-term-proxy") {
      const vixPoints = sourceMap.get("VIXCLS") ?? [];
      const vixvPoints = sourceMap.get("VXVCLS") ?? [];
      const proxyPoints = computeVixTermProxySeries(vixPoints, vixvPoints);
      snapshotSeriesBySlug.set(indicator.slug, {
        rows: {
          indicatorId: indicator.id,
          slug: indicator.slug,
          ...computeSeriesSnapshot(proxyPoints, false),
        },
        series: proxyPoints,
      });
      continue;
    }

    if (indicator.slug === "vvix-vix-ratio") {
      const ratioPoints = computeRatioSeries(
        sourceMap.get("VVIX") ?? [],
        sourceMap.get("VIXCLS") ?? [],
      );
      snapshotSeriesBySlug.set(indicator.slug, {
        rows: {
          indicatorId: indicator.id,
          slug: indicator.slug,
          ...computeSeriesSnapshot(ratioPoints, false),
        },
        series: ratioPoints,
      });
      continue;
    }

    if (indicator.slug === "aaii-bull-bear-spread") {
      const spreadPoints = computeDifferenceSeries(
        sourceMap.get("AAII_BULLISH") ?? [],
        sourceMap.get("AAII_BEARISH") ?? [],
      );
      snapshotSeriesBySlug.set(indicator.slug, {
        rows: {
          indicatorId: indicator.id,
          slug: indicator.slug,
          ...computeSeriesSnapshot(spreadPoints, true),
        },
        series: spreadPoints,
      });
      continue;
    }

    if (indicator.slug === "naaim-exposure-ma4") {
      const averagePoints = computeMovingAverageSeries(
        sourceMap.get("NAAIM_EXPOSURE") ?? [],
        4,
      );
      snapshotSeriesBySlug.set(indicator.slug, {
        rows: {
          indicatorId: indicator.id,
          slug: indicator.slug,
          ...computeSeriesSnapshot(averagePoints, true),
        },
        series: averagePoints,
      });
      continue;
    }

    if (indicator.slug === "momentum-proxy") {
      const momentumPoints = computeMomentumReturnSeries(
        sourceMap.get("SP500") ?? [],
        20,
      );
      snapshotSeriesBySlug.set(indicator.slug, {
        rows: {
          indicatorId: indicator.id,
          slug: indicator.slug,
          ...computeSeriesSnapshot(momentumPoints, false),
        },
        series: momentumPoints,
      });
      continue;
    }

    const firstSource = Array.from(sourceMap.values())[0] ?? [];
    snapshotSeriesBySlug.set(indicator.slug, {
      rows: {
        indicatorId: indicator.id,
        slug: indicator.slug,
        ...computeSeriesSnapshot(firstSource, SHORT_WINDOW_SLUGS.has(indicator.slug)),
      },
      series: firstSource,
    });
  }

  const fearGreed = computeFearGreedSnapshot(snapshotSeriesBySlug, indicatorIdBySlug);
  if (fearGreed) {
    snapshotSeriesBySlug.set("fear-greed-internal", fearGreed);
  }

  const globalVol = computeGlobalVolSnapshot(snapshotSeriesBySlug, indicatorIdBySlug);
  if (globalVol) {
    snapshotSeriesBySlug.set("global-vol-composite", globalVol);
  }

  return {
    snapshotRows: Array.from(snapshotSeriesBySlug.values()).map((item) => item.rows),
    snapshotSeriesBySlug,
  };
};

const latestDateFromSnapshotSeries = (items: Array<SnapshotSeries | undefined>): string | null =>
  items
    .map((item) => item?.rows.latestDate)
    .filter((date): date is string => Boolean(date))
    .sort()
    .at(-1) ?? null;

const buildSinglePointSnapshot = ({
  indicatorId,
  slug,
  value,
  latestDate,
}: {
  indicatorId: string;
  slug: string;
  value: number;
  latestDate: string | null;
}): SnapshotSeries => {
  const percentile = Math.max(0, Math.min(1, value / 100));
  const series = latestDate ? [{ date: latestDate, value }] : [];

  return {
    rows: {
      indicatorId,
      slug,
      latestValue: value,
      latestDate,
      change1d: null,
      change5d: null,
      change20d: null,
      pctRank1y: percentile,
      zscore1y: null,
      stateLabel: getSnapshotStateLabel(percentile),
    },
    series,
  };
};

const computeFearGreedSnapshot = (
  snapshotSeriesBySlug: Map<string, SnapshotSeries>,
  indicatorIdBySlug: Map<string, string>,
): SnapshotSeries | null => {
  const indicatorId = indicatorIdBySlug.get("fear-greed-internal");
  if (!indicatorId) {
    return null;
  }

  const vix = snapshotSeriesBySlug.get("vix");
  const putCall = snapshotSeriesBySlug.get("put-call-ratio");
  const hyOas = snapshotSeriesBySlug.get("hy-oas");
  const momentum = snapshotSeriesBySlug.get("momentum-proxy");
  const vxn = snapshotSeriesBySlug.get("vxn");
  const rvx = snapshotSeriesBySlug.get("rvx");

  if (!vix || !putCall || !hyOas || !momentum || !vxn || !rvx) {
    return null;
  }

  const breadthSeries = computeEquityBreadthProxySeries(
    vix.series,
    vxn.series,
    rvx.series,
  );
  const breadthPctRank = computePctRank1y(breadthSeries.map((point) => point.value));
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

  return buildSinglePointSnapshot({
    indicatorId,
    slug: "fear-greed-internal",
    value: score,
    latestDate: latestDateFromSnapshotSeries([vix, putCall, hyOas, momentum]),
  });
};

const computeGlobalVolSnapshot = (
  snapshotSeriesBySlug: Map<string, SnapshotSeries>,
  indicatorIdBySlug: Map<string, string>,
): SnapshotSeries | null => {
  const indicatorId = indicatorIdBySlug.get("global-vol-composite");
  if (!indicatorId) {
    return null;
  }

  const regionalSeries = [
    snapshotSeriesBySlug.get("vstoxx"),
    snapshotSeriesBySlug.get("india-vix"),
    snapshotSeriesBySlug.get("nikkei-225-vi"),
    snapshotSeriesBySlug.get("vhsi"),
  ];
  const values = regionalSeries
    .map((item) => item?.rows.pctRank1y)
    .filter((value): value is number => Number.isFinite(value));

  if (values.length < 2) {
    return null;
  }

  return buildSinglePointSnapshot({
    indicatorId,
    slug: "global-vol-composite",
    value: (values.reduce((sum, value) => sum + value, 0) / values.length) * 100,
    latestDate: latestDateFromSnapshotSeries(regionalSeries),
  });
};

const computeComposite = (snapshotSeriesBySlug: Map<string, SnapshotSeries>): number | null => {
  const vix = snapshotSeriesBySlug.get("vix");
  const vxn = snapshotSeriesBySlug.get("vxn");
  const rvx = snapshotSeriesBySlug.get("rvx");
  const stlfsi4 = snapshotSeriesBySlug.get("stlfsi4");
  const nfci = snapshotSeriesBySlug.get("nfci");

  if (!vix || !vxn || !rvx || !stlfsi4 || !nfci) {
    return null;
  }

  const vixTermProxy = snapshotSeriesBySlug.get("vix-term-proxy")?.rows ?? {
    ...vix.rows,
    pctRank1y: null,
  };

  const vixvPoints =
    snapshotSeriesBySlug.get("vix-term-proxy")?.series ??
    (() => {
      const proxySourceRows = snapshotSeriesBySlug.get("vix")?.rows;
      return proxySourceRows ? [] : [];
    })();

  const vixVxvPctRank =
    vixTermProxy.pctRank1y ??
    computePctRank1y(
      computeVixTermProxySeries(vix.series, vixvPoints).map(
        (point) => point.value,
      ),
    );

  const equityBreadthSeries = computeEquityBreadthProxySeries(
    vix.series,
    vxn.series,
    rvx.series,
  );
  const equityBreadthPctRank = computePctRank1y(
    equityBreadthSeries.map((point) => point.value),
  );

  return computeCompositeRiskScore({
    vixPctRank: vix.rows.pctRank1y,
    vixVxvPctRank,
    equityBreadthPctRank,
    stlfsi4PctRank: stlfsi4.rows.pctRank1y,
    nfciPctRank: nfci.rows.pctRank1y,
  });
};

export async function recomputeIndicatorSnapshots(
  options: { persist: boolean } = { persist: false },
): Promise<RecomputeSnapshotsResult> {
  const computedAt = new Date();
  const { snapshotRows, snapshotSeriesBySlug } = await buildSnapshotSeries();
  const compositeRiskScore = computeComposite(snapshotSeriesBySlug);

  if (options.persist && snapshotRows.length > 0) {
    await db
      .insert(indicatorSnapshots)
      .values(
        snapshotRows.map((row) => ({
          indicatorId: row.indicatorId,
          latestValue: toDbNumeric(row.latestValue),
          latestDate: row.latestDate,
          change1d: toDbNumeric(row.change1d),
          change5d: toDbNumeric(row.change5d),
          change20d: toDbNumeric(row.change20d),
          pctRank1y: toDbNumeric(row.pctRank1y),
          zscore1y: toDbNumeric(row.zscore1y),
          stateLabel: row.stateLabel,
          updatedAt: computedAt,
        })),
      )
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
          updatedAt: sql`EXCLUDED.updated_at`,
        },
      });
  }

  return {
    computedAt: computedAt.toISOString(),
    rows: snapshotRows,
    compositeRiskScore,
  };
}
