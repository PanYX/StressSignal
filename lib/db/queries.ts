import { and, asc, eq, gt, inArray } from "drizzle-orm";

import {
  computeCompositeRiskScore,
  computeDifferenceSeries,
  computeEquityBreadthProxySeries,
  computeMomentumReturnSeries,
  computeMovingAverageSeries,
  computePctRank,
  computeRatioSeries,
  computeVixTermProxySeries,
  type NumericSeriesPoint,
} from "../indicators/compute";
import { getSnapshotStateLabel } from "../indicators/labels";
import { db } from "./client";
import {
  indicatorSources,
  indicatorSnapshots,
  indicators,
  observations,
} from "./schema";

export type IndicatorSourceMetadata = {
  provider: string;
  externalId: string;
  fetchMode: string;
  sourceUrl: string;
  isPrimary: boolean;
  licenseNote: string | null;
  active: boolean;
};

export type IndicatorSnapshotWithSources = SnapshotPayload & {
  sources: IndicatorSourceMetadata[];
};

export type HistoryWindow = "3M" | "1Y" | "5Y" | "MAX";

export type SnapshotPayload = {
  id: string;
  slug: string;
  name: string;
  category: string;
  frequency: string;
  description: string;
  unit: string;
  status: string;
  sourcePolicy: string;
  latestValue: number | null;
  latestDate: string | null;
  change1d: number | null;
  change5d: number | null;
  change20d: number | null;
  pctRank1y: number | null;
  zscore1y: number | null;
  stateLabel: string;
  updatedAt: string | null;
};

export type SummaryCard = {
  slug: string;
  name: string;
  latestValue: number | null;
  latestDate: string | null;
  change1d: number | null;
  pctRank1y: number | null;
  stateLabel: string;
};

export type HomepageSummaryPayload = {
  asOf: string | null;
  riskScore: number | null;
  riskStateLabel: string;
  topDrivers: string[];
  cards: SummaryCard[];
  headline: string;
};

export type ObservationPoint = {
  date: string;
  value: number;
};

export type HistorySeriesPoint = {
  date: string;
  value: number;
};

export type ObservationSeriesBySource = Map<string, ObservationPoint[]>;
export type ObservationSeriesByIndicator = Map<string, ObservationSeriesBySource>;

const createSourceMetadata = (input: {
  provider: string | null;
  externalId: string | null;
  fetchMode: string | null;
  sourceUrl: string | null;
  isPrimary: boolean | null;
  licenseNote: string | null;
  active: boolean | null;
}): IndicatorSourceMetadata | null => {
  if (input.provider === null || input.externalId === null) {
    return null;
  }

  return {
    provider: input.provider,
    externalId: input.externalId,
    fetchMode: input.fetchMode ?? "",
    sourceUrl: input.sourceUrl ?? "",
    isPrimary: input.isPrimary === true,
    licenseNote: input.licenseNote,
    active: input.active === true,
  };
};

const toNumberOrNull = (
  value: string | number | null | undefined,
): number | null => {
  if (value === null || value === undefined) {
    return null;
  }

  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const toDateString = (value: Date | string | null | undefined): string | null => {
  if (!value) {
    return null;
  }

  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }

  return value;
};

const getStatusActive = eq(indicators.status, "active");

const mapSnapshotState = (
  provided: string | null,
  pctRank: number | null,
): string => {
  if (provided && provided.trim().length > 0) {
    return provided;
  }

  if (pctRank === null || Number.isNaN(pctRank)) {
    return "数据不足";
  }

  return getSnapshotStateLabel(pctRank);
};

const mapSnapshotRow = (row: {
  id: string;
  slug: string;
  name: string;
  category: string;
  frequency: string;
  description: string;
  unit: string;
  status: string;
  sourcePolicy: string;
  latestValue: string | number | null;
  latestDate: Date | string | null;
  change1d: string | number | null;
  change5d: string | number | null;
  change20d: string | number | null;
  pctRank1y: string | number | null;
  zscore1y: string | number | null;
  stateLabel: string | null;
  updatedAt: Date | string | null;
}): SnapshotPayload => {
  const latestValue = toNumberOrNull(row.latestValue);
  const change1d = toNumberOrNull(row.change1d);
  const change5d = toNumberOrNull(row.change5d);
  const change20d = toNumberOrNull(row.change20d);
  const pctRank1y = toNumberOrNull(row.pctRank1y);
  const zscore1y = toNumberOrNull(row.zscore1y);

  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    category: row.category,
    frequency: row.frequency,
    description: row.description,
    unit: row.unit,
    status: row.status,
    sourcePolicy: row.sourcePolicy,
    latestValue,
    latestDate: toDateString(row.latestDate),
    change1d,
    change5d,
    change20d,
    pctRank1y,
    zscore1y,
    stateLabel: mapSnapshotState(row.stateLabel, pctRank1y),
    updatedAt: toDateString(row.updatedAt),
  };
};

const cutoffDateFromWindow = (window: HistoryWindow): Date | null => {
  if (window === "MAX") {
    return null;
  }

  const now = new Date();
  const offsetMonths = window === "3M" ? 3 : window === "1Y" ? 12 : 60;
  const cutoff = new Date(now);
  cutoff.setMonth(now.getMonth() - offsetMonths);
  return cutoff;
};

const toNumericPoints = (rows: {
  date: Date | string;
  value: string | number | null;
}[]): NumericSeriesPoint[] =>
  rows
    .map((row) => ({
      date: toDateString(row.date) ?? "",
      value: toNumberOrNull(row.value) ?? Number.NaN,
    }))
    .filter((point): point is NumericSeriesPoint => Number.isFinite(point.value));

const toDatePoint = (value: Date | string | null | undefined): string | null =>
  toDateString(value);

export const resolveCutoffDate = (window: HistoryWindow): string | null => {
  const cutoff = cutoffDateFromWindow(window);
  return cutoff ? cutoff.toISOString().slice(0, 10) : null;
};

const filterByCutoff = (
  points: readonly HistorySeriesPoint[],
  cutoff: string | null,
): HistorySeriesPoint[] =>
  cutoff === null ? [...points] : points.filter((point) => point.date >= cutoff);

const dedupeSortedSources = (
  sources: IndicatorSourceMetadata[],
): IndicatorSourceMetadata[] =>
  Array.from(
    sources
      .reduce((acc, source) => {
        const key = `${source.provider}|${source.externalId}`;
        if (!acc.has(key)) {
          acc.set(key, source);
        }
        return acc;
      }, new Map<string, IndicatorSourceMetadata>())
      .values(),
  );

export async function getIndicatorSnapshotsWithSources(): Promise<
  IndicatorSnapshotWithSources[]
> {
  const rows = await db
    .select({
      id: indicators.id,
      slug: indicators.slug,
      name: indicators.name,
      category: indicators.category,
      frequency: indicators.frequency,
      description: indicators.description,
      unit: indicators.unit,
      status: indicators.status,
      sourcePolicy: indicators.sourcePolicy,
      latestValue: indicatorSnapshots.latestValue,
      latestDate: indicatorSnapshots.latestDate,
      change1d: indicatorSnapshots.change1d,
      change5d: indicatorSnapshots.change5d,
      change20d: indicatorSnapshots.change20d,
      pctRank1y: indicatorSnapshots.pctRank1y,
      zscore1y: indicatorSnapshots.zscore1y,
      stateLabel: indicatorSnapshots.stateLabel,
      updatedAt: indicatorSnapshots.updatedAt,
      sourceProvider: indicatorSources.provider,
      sourceExternalId: indicatorSources.externalId,
      sourceFetchMode: indicatorSources.fetchMode,
      sourceUrl: indicatorSources.sourceUrl,
      sourceIsPrimary: indicatorSources.isPrimary,
      sourceLicenseNote: indicatorSources.licenseNote,
      sourceActive: indicatorSources.active,
    })
    .from(indicators)
    .leftJoin(indicatorSnapshots, eq(indicators.id, indicatorSnapshots.indicatorId))
    .leftJoin(
      indicatorSources,
      and(eq(indicators.id, indicatorSources.indicatorId), eq(indicatorSources.active, true)),
    )
    .where(getStatusActive)
    .orderBy(indicators.slug, indicatorSources.externalId);

  const grouped = new Map<string, IndicatorSnapshotWithSources>();

  for (const row of rows) {
    const base = mapSnapshotRow({
      id: row.id,
      slug: row.slug,
      name: row.name,
      category: row.category,
      frequency: row.frequency,
      description: row.description,
      unit: row.unit,
      status: row.status,
      sourcePolicy: row.sourcePolicy,
      latestValue: row.latestValue,
      latestDate: row.latestDate,
      change1d: row.change1d,
      change5d: row.change5d,
      change20d: row.change20d,
      pctRank1y: row.pctRank1y,
      zscore1y: row.zscore1y,
      stateLabel: row.stateLabel,
      updatedAt: row.updatedAt,
    });

    if (!grouped.has(row.slug)) {
      grouped.set(row.slug, {
        ...base,
        sources: [],
      });
    }

    const source = createSourceMetadata({
      provider: row.sourceProvider,
      externalId: row.sourceExternalId,
      fetchMode: row.sourceFetchMode,
      sourceUrl: row.sourceUrl,
      isPrimary: row.sourceIsPrimary,
      licenseNote: row.sourceLicenseNote,
      active: row.sourceActive,
    });

    if (source) {
      grouped.get(row.slug)!.sources.push(source);
    }
  }

  return Array.from(grouped.values()).map((entry) => ({
    ...entry,
    sources: dedupeSortedSources(entry.sources),
  }));
}

export async function getIndicatorSnapshotWithSourcesBySlug(
  slug: string,
): Promise<IndicatorSnapshotWithSources | null> {
  const rows = await db
    .select({
      id: indicators.id,
      slug: indicators.slug,
      name: indicators.name,
      category: indicators.category,
      frequency: indicators.frequency,
      description: indicators.description,
      unit: indicators.unit,
      status: indicators.status,
      sourcePolicy: indicators.sourcePolicy,
      latestValue: indicatorSnapshots.latestValue,
      latestDate: indicatorSnapshots.latestDate,
      change1d: indicatorSnapshots.change1d,
      change5d: indicatorSnapshots.change5d,
      change20d: indicatorSnapshots.change20d,
      pctRank1y: indicatorSnapshots.pctRank1y,
      zscore1y: indicatorSnapshots.zscore1y,
      stateLabel: indicatorSnapshots.stateLabel,
      updatedAt: indicatorSnapshots.updatedAt,
      sourceProvider: indicatorSources.provider,
      sourceExternalId: indicatorSources.externalId,
      sourceFetchMode: indicatorSources.fetchMode,
      sourceUrl: indicatorSources.sourceUrl,
      sourceIsPrimary: indicatorSources.isPrimary,
      sourceLicenseNote: indicatorSources.licenseNote,
      sourceActive: indicatorSources.active,
    })
    .from(indicators)
    .leftJoin(indicatorSnapshots, eq(indicators.id, indicatorSnapshots.indicatorId))
    .leftJoin(
      indicatorSources,
      and(eq(indicators.id, indicatorSources.indicatorId), eq(indicatorSources.active, true)),
    )
    .where(and(eq(indicators.slug, slug), getStatusActive))
    .orderBy(indicatorSources.externalId);

  if (rows.length === 0) {
    return null;
  }

  const base = mapSnapshotRow({
    id: rows[0].id,
    slug: rows[0].slug,
    name: rows[0].name,
    category: rows[0].category,
    frequency: rows[0].frequency,
    description: rows[0].description,
    unit: rows[0].unit,
    status: rows[0].status,
    sourcePolicy: rows[0].sourcePolicy,
    latestValue: rows[0].latestValue,
    latestDate: rows[0].latestDate,
    change1d: rows[0].change1d,
    change5d: rows[0].change5d,
    change20d: rows[0].change20d,
    pctRank1y: rows[0].pctRank1y,
    zscore1y: rows[0].zscore1y,
    stateLabel: rows[0].stateLabel,
    updatedAt: rows[0].updatedAt,
  });

  const sources = rows
    .map((row) =>
      createSourceMetadata({
        provider: row.sourceProvider,
        externalId: row.sourceExternalId,
        fetchMode: row.sourceFetchMode,
        sourceUrl: row.sourceUrl,
        isPrimary: row.sourceIsPrimary,
        licenseNote: row.sourceLicenseNote,
        active: row.sourceActive,
      }),
    )
    .filter((source): source is IndicatorSourceMetadata => source !== null);

  return {
    ...base,
    sources: dedupeSortedSources(sources),
  };
}

export async function getIndicatorSnapshots(): Promise<SnapshotPayload[]> {
  const rows = await db
    .select({
      id: indicatorSnapshots.indicatorId,
      slug: indicators.slug,
      name: indicators.name,
      category: indicators.category,
      frequency: indicators.frequency,
      description: indicators.description,
      unit: indicators.unit,
      status: indicators.status,
      sourcePolicy: indicators.sourcePolicy,
      latestValue: indicatorSnapshots.latestValue,
      latestDate: indicatorSnapshots.latestDate,
      change1d: indicatorSnapshots.change1d,
      change5d: indicatorSnapshots.change5d,
      change20d: indicatorSnapshots.change20d,
      pctRank1y: indicatorSnapshots.pctRank1y,
      zscore1y: indicatorSnapshots.zscore1y,
      stateLabel: indicatorSnapshots.stateLabel,
      updatedAt: indicatorSnapshots.updatedAt,
    })
    .from(indicatorSnapshots)
    .innerJoin(indicators, eq(indicatorSnapshots.indicatorId, indicators.id))
    .where(getStatusActive)
    .orderBy(indicators.slug);

  return rows.map(mapSnapshotRow);
}

export async function getIndicatorSnapshotBySlug(
  slug: string,
): Promise<SnapshotPayload | null> {
  const rows = await db
    .select({
      id: indicatorSnapshots.indicatorId,
      slug: indicators.slug,
      name: indicators.name,
      category: indicators.category,
      frequency: indicators.frequency,
      description: indicators.description,
      unit: indicators.unit,
      status: indicators.status,
      sourcePolicy: indicators.sourcePolicy,
      latestValue: indicatorSnapshots.latestValue,
      latestDate: indicatorSnapshots.latestDate,
      change1d: indicatorSnapshots.change1d,
      change5d: indicatorSnapshots.change5d,
      change20d: indicatorSnapshots.change20d,
      pctRank1y: indicatorSnapshots.pctRank1y,
      zscore1y: indicatorSnapshots.zscore1y,
      stateLabel: indicatorSnapshots.stateLabel,
      updatedAt: indicatorSnapshots.updatedAt,
    })
    .from(indicatorSnapshots)
    .innerJoin(indicators, eq(indicatorSnapshots.indicatorId, indicators.id))
    .where(and(eq(indicators.slug, slug), getStatusActive))
    .limit(1);

  return rows[0] ? mapSnapshotRow(rows[0]) : null;
}

export async function getIndicatorHistory(
  slug: string,
  window: HistoryWindow = "1Y",
): Promise<ObservationPoint[]> {
  const cutoff = cutoffDateFromWindow(window);
  const predicate = cutoff
    ? and(
        eq(indicators.slug, slug),
        getStatusActive,
        gt(observations.observationDate, cutoff.toISOString().slice(0, 10)),
      )
    : and(eq(indicators.slug, slug), getStatusActive);

  const rows = await db
    .select({
      date: observations.observationDate,
      value: observations.value,
      sourceExternalId: observations.sourceExternalId,
    })
    .from(observations)
    .innerJoin(indicators, eq(indicators.id, observations.indicatorId))
    .where(predicate)
    .orderBy(asc(observations.observationDate), asc(observations.sourceExternalId));

  if (slug === "vix-term-proxy") {
    const vixRows = rows.filter((row) => row.sourceExternalId === "VIXCLS");
    const vixvRows = rows.filter((row) => row.sourceExternalId === "VXVCLS");
    const vixPoints = toNumericPoints(vixRows);
    const vixvPoints = toNumericPoints(vixvRows);
    return computeVixTermProxySeries(vixPoints, vixvPoints).map((point) => ({
      date: point.date,
      value: point.value,
    }));
  }

  if (slug === "vvix-vix-ratio") {
    const vvixRows = rows.filter((row) => row.sourceExternalId === "VVIX");
    const vixRows = rows.filter((row) => row.sourceExternalId === "VIXCLS");
    const vvixPoints = toNumericPoints(vvixRows);
    const vixPoints = toNumericPoints(vixRows);
    return computeRatioSeries(vvixPoints, vixPoints).map((point) => ({
      date: point.date,
      value: point.value,
    }));
  }

  if (slug === "aaii-bull-bear-spread") {
    const bullishRows = rows.filter((row) => row.sourceExternalId === "AAII_BULLISH");
    const bearishRows = rows.filter((row) => row.sourceExternalId === "AAII_BEARISH");
    const bullishPoints = toNumericPoints(bullishRows);
    const bearishPoints = toNumericPoints(bearishRows);
    return computeDifferenceSeries(bullishPoints, bearishPoints).map((point) => ({
      date: point.date,
      value: point.value,
    }));
  }

  if (slug === "naaim-exposure-ma4") {
    const exposureRows = rows.filter((row) => row.sourceExternalId === "NAAIM_EXPOSURE");
    const exposurePoints = toNumericPoints(exposureRows);
    return computeMovingAverageSeries(exposurePoints, 4).map((point) => ({
      date: point.date,
      value: point.value,
    }));
  }

  if (slug === "momentum-proxy") {
    const sp500Rows = rows.filter((row) => row.sourceExternalId === "SP500");
    const sp500Points = toNumericPoints(sp500Rows);
    return computeMomentumReturnSeries(sp500Points, 20).map((point) => ({
      date: point.date,
      value: point.value,
    }));
  }

  const deduplicatedByDate = new Map<string, number>();
  const output: ObservationPoint[] = [];
  for (const row of rows) {
    const date = toDateString(row.date);
    const value = toNumberOrNull(row.value);

    if (date === null || value === null) {
      continue;
    }

    if (deduplicatedByDate.has(date)) {
      continue;
    }

    deduplicatedByDate.set(date, value);
    output.push({ date, value });
  }

  return output;
}

export async function getIndicatorHistoryBySource(
  slug: string,
  sourceExternalId: string,
  window: HistoryWindow = "1Y",
): Promise<HistorySeriesPoint[]> {
  const cutoff = resolveCutoffDate(window);
  const filters = [
    eq(indicators.slug, slug),
    getStatusActive,
    eq(observations.sourceExternalId, sourceExternalId),
  ];

  if (cutoff !== null) {
    filters.push(gt(observations.observationDate, cutoff));
  }

  const rows = await db
    .select({
      date: observations.observationDate,
      value: observations.value,
      sourceExternalId: observations.sourceExternalId,
    })
    .from(observations)
    .innerJoin(indicators, eq(indicators.id, observations.indicatorId))
    .where(and(...filters))
    .orderBy(asc(observations.observationDate));

  const out: HistorySeriesPoint[] = [];
  for (const row of rows) {
    const point: { date: string | null; value: number | null } = {
      date: toDatePoint(row.date),
      value: toNumberOrNull(row.value),
    };

    if (point.date === null || point.value === null) {
      continue;
    }

    out.push({ date: point.date, value: point.value });
  }

  return out;
}

export async function getActiveIndicatorBySlug(
  slug: string,
): Promise<{ id: string; slug: string } | null> {
  const rows = await db
    .select({ id: indicators.id, slug: indicators.slug })
    .from(indicators)
    .where(and(eq(indicators.slug, slug), getStatusActive))
    .limit(1);

  return rows[0] ?? null;
}

export async function getObservationsForCompute(
  slugs: string[],
): Promise<ObservationSeriesByIndicator> {
  if (slugs.length === 0) {
    return new Map();
  }

  const rows = await db
    .select({
      slug: indicators.slug,
      sourceExternalId: observations.sourceExternalId,
      date: observations.observationDate,
      value: observations.value,
    })
    .from(observations)
    .innerJoin(indicators, eq(observations.indicatorId, indicators.id))
    .where(and(inArray(indicators.slug, slugs), getStatusActive))
    .orderBy(
      asc(observations.indicatorId),
      asc(observations.observationDate),
      asc(observations.sourceExternalId),
    );

  const output: ObservationSeriesByIndicator = new Map();
  for (const row of rows) {
    const date = toDateString(row.date);
    const value = toNumberOrNull(row.value);
    if (date === null || value === null) {
      continue;
    }

    const sourceMap = output.get(row.slug) ?? new Map<string, ObservationPoint[]>();
    const points = sourceMap.get(row.sourceExternalId) ?? [];
    points.push({ date, value });
    sourceMap.set(row.sourceExternalId, points);
    output.set(row.slug, sourceMap);
  }

  return output;
}

const getWindowSizeForFrequency = (
  frequency: string,
  window: HistoryWindow,
): number | null => {
  if (window === "MAX") {
    return null;
  }

  if (frequency === "weekly") {
    if (window === "3M") {
      return 13;
    }
    if (window === "1Y") {
      return 52;
    }
    return 260;
  }

  if (window === "3M") {
    return 63;
  }
  if (window === "1Y") {
    return 252;
  }

  return 1260;
};

export async function getCompositeRiskScoreHistory(
  window: HistoryWindow = "1Y",
): Promise<ObservationPoint[]> {
  const requiredSlugs = [
    "vix",
    "vix-term-proxy",
    "vxn",
    "rvx",
    "stlfsi4",
    "nfci",
  ];

  const observationsByIndicator = await getObservationsForCompute(requiredSlugs);

  const getSeries = (
    slug: string,
    sourceExternalId?: string,
  ): HistorySeriesPoint[] => {
    const sourceMap = observationsByIndicator.get(slug);
    if (!sourceMap) {
      return [];
    }

    if (sourceExternalId) {
      return sourceMap.get(sourceExternalId) ?? [];
    }

    const [first] = sourceMap.values();
    return first ?? [];
  };

  const cutoff = resolveCutoffDate(window);
  const allWindowPoints = (points: HistorySeriesPoint[]): HistorySeriesPoint[] =>
    filterByCutoff(points, cutoff);

  const vixPoints = allWindowPoints(getSeries("vix"));
  const rawProxyVixv = allWindowPoints(getSeries("vix-term-proxy", "VXVCLS"));
  const fallbackProxyVixv = allWindowPoints(getSeries("vix", "VXVCLS"));
  const vixvPoints = rawProxyVixv.length > 0 ? rawProxyVixv : fallbackProxyVixv;
  const vxnPoints = allWindowPoints(getSeries("vxn"));
  const rvxPoints = allWindowPoints(getSeries("rvx"));
  const stlfsi4Points = allWindowPoints(getSeries("stlfsi4"));
  const nfciPoints = allWindowPoints(getSeries("nfci"));

  if (
    vixPoints.length < 2 ||
    vixvPoints.length < 2 ||
    stlfsi4Points.length < 2 ||
    nfciPoints.length < 2
  ) {
    return [];
  }

  const vixVxvPoints = computeVixTermProxySeries(vixPoints, vixvPoints).map((point) => ({
    date: point.date,
    value: point.value,
  }));

  const equityBreadthPoints = computeEquityBreadthProxySeries(
    vixPoints,
    vxnPoints,
    rvxPoints,
  );

  const allDates = new Set<string>([
    ...vixPoints.map((point) => point.date),
    ...vixvPoints.map((point) => point.date),
    ...vxnPoints.map((point) => point.date),
    ...rvxPoints.map((point) => point.date),
    ...stlfsi4Points.map((point) => point.date),
    ...nfciPoints.map((point) => point.date),
  ]);
  const dateSeries = Array.from(allDates).sort();

  const idx: Record<string, number> = {
    vix: 0,
    vixVxv: 0,
    breadth: 0,
    stl: 0,
    nfci: 0,
  };

  const windows = {
    vix: [] as number[],
    term: [] as number[],
    breadth: [] as number[],
    stl: [] as number[],
    nfci: [] as number[],
  };

  const out: ObservationPoint[] = [];

  const advance = (
    currentDate: string,
    list: readonly HistorySeriesPoint[],
    pointerKey: keyof typeof idx,
    window: number | null,
    outWindow: keyof typeof windows,
  ) => {
    while (idx[pointerKey] < list.length && list[idx[pointerKey]]!.date <= currentDate) {
      windows[outWindow].push(list[idx[pointerKey]]!.value);
      idx[pointerKey] += 1;
    }

    if (window !== null && windows[outWindow].length > window) {
      windows[outWindow] = windows[outWindow].slice(-window);
    }
  };

  const vixWindow = getWindowSizeForFrequency("daily", window);
  const breadthWindow = getWindowSizeForFrequency("daily", window);
  const stressWindow = getWindowSizeForFrequency("weekly", window);

  for (const currentDate of dateSeries) {
    advance(currentDate, vixPoints, "vix", vixWindow, "vix");
    advance(currentDate, vixVxvPoints, "vixVxv", breadthWindow, "term");
    advance(currentDate, equityBreadthPoints, "breadth", breadthWindow, "breadth");
    advance(currentDate, stlfsi4Points, "stl", stressWindow, "stl");
    advance(currentDate, nfciPoints, "nfci", stressWindow, "nfci");

    const vixPct = computePctRank(
      windows.vix,
      vixWindow ?? Number.MAX_SAFE_INTEGER,
    );
    const termPct = computePctRank(
      windows.term,
      breadthWindow ?? Number.MAX_SAFE_INTEGER,
    );
    const breadthPct = computePctRank(
      windows.breadth,
      breadthWindow ?? Number.MAX_SAFE_INTEGER,
    );
    const stlPct = computePctRank(
      windows.stl,
      stressWindow ?? Number.MAX_SAFE_INTEGER,
    );
    const nfciPct = computePctRank(
      windows.nfci,
      stressWindow ?? Number.MAX_SAFE_INTEGER,
    );

    const score = computeCompositeRiskScore({
      vixPctRank: vixPct,
      vixVxvPctRank: termPct,
      equityBreadthPctRank: breadthPct,
      stlfsi4PctRank: stlPct,
      nfciPctRank: nfciPct,
    });

    if (score !== null) {
      out.push({ date: currentDate, value: Number(score.toFixed(2)) });
    }
  }

  return out;
}

const computeCompositeFromCurrentRows = async (): Promise<number | null> => {
  const snapshots = await getIndicatorSnapshots();
  const snapshotBySlug = new Map<string, SnapshotPayload>(
    snapshots.map((snapshot) => [snapshot.slug, snapshot]),
  );
  const requiredSlugs = [
    "vix",
    "vix-term-proxy",
    "vxn",
    "rvx",
    "stlfsi4",
    "nfci",
  ];
  const observationsByIndicator = await getObservationsForCompute(requiredSlugs);

  const getIndicatorSeries = (
    slug: string,
    sourceExternalId?: string,
  ): ObservationPoint[] => {
    const sourceMap = observationsByIndicator.get(slug);
    if (!sourceMap) {
      return [];
    }

    if (sourceExternalId) {
      return sourceMap.get(sourceExternalId) ?? [];
    }

    const [first] = sourceMap.values();
    return first ?? [];
  };

  const vixPoints = getIndicatorSeries("vix");
  const vixvPoints = (() => {
    const proxySeries = observationsByIndicator.get("vix-term-proxy");
    if (proxySeries && proxySeries.has("VXVCLS")) {
      return proxySeries.get("VXVCLS") ?? [];
    }

    return getIndicatorSeries("vix", "VXVCLS");
  })();
  const proxyRow = snapshotBySlug.get("vix-term-proxy");
  const vixVxvPctRank =
    proxyRow?.pctRank1y ??
    computePctRank(
      computeVixTermProxySeries(vixPoints, vixvPoints).map((point) => point.value),
    );

  const equityBreadthSeries = computeEquityBreadthProxySeries(
    vixPoints,
    getIndicatorSeries("vxn"),
    getIndicatorSeries("rvx"),
  );
  const equityBreadthPctRank = computePctRank(
    equityBreadthSeries.map((point) => point.value),
  );

  return computeCompositeRiskScore({
    vixPctRank: snapshotBySlug.get("vix")?.pctRank1y ?? null,
    vixVxvPctRank,
    equityBreadthPctRank,
    stlfsi4PctRank: snapshotBySlug.get("stlfsi4")?.pctRank1y ?? null,
    nfciPctRank: snapshotBySlug.get("nfci")?.pctRank1y ?? null,
  });
};

export async function getHomepageSummary(): Promise<HomepageSummaryPayload> {
  const snapshots = await getIndicatorSnapshots();
  const cards = snapshots
    .map<SummaryCard>((snapshot) => ({
      slug: snapshot.slug,
      name: snapshot.name,
      latestValue: snapshot.latestValue,
      latestDate: snapshot.latestDate,
      change1d: snapshot.change1d,
      pctRank1y: snapshot.pctRank1y,
      stateLabel: snapshot.stateLabel,
    }))
    .sort((left, right) => (right.pctRank1y ?? -1) - (left.pctRank1y ?? -1));

  const riskScore = await computeCompositeFromCurrentRows();
  const riskStateLabel = riskScore === null ? "数据不足" : getSnapshotStateLabel(riskScore / 100);
  const asOf = snapshots
    .map((snapshot) => snapshot.latestDate ?? snapshot.updatedAt)
    .filter((value): value is string => Boolean(value))
    .sort()
    .at(-1) ?? null;

  const topDrivers = cards
    .filter((card) => card.pctRank1y !== null)
    .slice(0, 3)
    .map((card) => card.slug);
  const headline =
    riskScore === null
      ? "样本不足，当前仍以单指标观察为主。"
      : `${riskStateLabel}：当前风险评分 ${riskScore.toFixed(1)}。`;

  return {
    asOf,
    riskScore,
    riskStateLabel,
    topDrivers,
    cards,
    headline,
  };
}
