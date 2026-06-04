import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  ExternalLink,
  Gauge,
  Globe2,
  LineChart,
  RefreshCw,
  ShieldAlert,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";

import { TimeSeriesChart } from "../components/charts/time-series-chart";
import {
  formatDateLabel,
  formatFrequencyLabel,
  formatNumber,
  formatSignedNumber,
} from "../components/shared/format";
import { Card, PercentBar, SectionHeading, StatusPill } from "../components/shared/ui-kit";
import { hrefWithLocale } from "../lib/i18n/locale-url";
import {
  getCachedIndicatorHistory,
  getCachedIndicatorSnapshotsWithSources,
} from "../lib/db/cached-queries";
import type {
  IndicatorSnapshotWithSources,
  ObservationPoint,
} from "../lib/db/queries";
import {
  translateStateLabel,
  type Dictionary,
  type Locale,
} from "../lib/i18n/dictionary";
import { mergeConfiguredRows } from "../lib/indicators/view-model";
import { RISK_LAYER_ROUTES } from "../lib/navigation";
import { cn } from "../lib/utils";

export type ChartPoint = {
  date: string;
  [key: string]: string | number | null;
};

export const safe = async <T,>(task: () => Promise<T>, fallback: T): Promise<T> => {
  try {
    return await task();
  } catch {
    return fallback;
  }
};

export const toneForPercentile = (value: number | null | undefined) =>
  value === null || value === undefined
    ? "emerald"
    : value >= 0.8
      ? "rose"
      : value >= 0.5
        ? "amber"
        : "emerald";

const riskLayerIcons: Record<string, LucideIcon> = {
  tailRisk: Gauge,
  sentiment: TrendingUp,
  fearGreed: BarChart3,
  globalRisk: Globe2,
};

export function RiskLayerNav({
  dictionary,
  locale,
  activeHref,
}: {
  dictionary: Dictionary;
  locale: Locale;
  activeHref: string;
}) {
  return (
    <nav
      aria-label={dictionary.site.nav.riskLayers}
      className="rounded-lg border border-slate-200/90 bg-white/92 p-2 shadow-[0_10px_28px_rgba(15,23,42,0.04)]"
    >
      <div className="thin-scrollbar flex items-center gap-2 overflow-x-auto">
        {RISK_LAYER_ROUTES.map((route) => {
          const Icon = riskLayerIcons[route.key] ?? ShieldAlert;
          const active = activeHref === route.href;

          return (
            <Link
              key={route.href}
              href={hrefWithLocale(route.href, locale)}
              className={cn(
                "inline-flex h-10 shrink-0 items-center gap-2 rounded-md px-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 hover:text-slate-950 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500",
                active && "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200",
              )}
              aria-current={active ? "page" : undefined}
            >
              <Icon aria-hidden className="h-4 w-4" />
              {dictionary.site.nav[route.key]}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

export const buildMergedPoints = (
  lines: Array<{ key: string; points: readonly ObservationPoint[] }>,
): ChartPoint[] => {
  const pointMap = new Map<string, ChartPoint>();

  for (const { key, points } of lines) {
    for (const point of points) {
      const bucket = pointMap.get(point.date) ?? { date: point.date };
      bucket[key] = point.value;
      pointMap.set(point.date, bucket);
    }
  }

  return [...pointMap.values()].sort((left, right) =>
    left.date.localeCompare(right.date),
  );
};

export const getLayerRows = async (
  slugs: readonly string[],
): Promise<IndicatorSnapshotWithSources[]> => {
  const allRows = await safe(
    () => getCachedIndicatorSnapshotsWithSources(),
    [] as IndicatorSnapshotWithSources[],
  );

  return mergeConfiguredRows(allRows, slugs);
};

export const getLayerChart = async (
  slugs: readonly string[],
): Promise<ChartPoint[]> => {
  const histories = await Promise.all(
    slugs.map(async (slug) => ({
      key: slug,
      points: await safe(() => getCachedIndicatorHistory(slug, "1Y"), [] as ObservationPoint[]),
    })),
  );

  return buildMergedPoints(histories);
};

export function LayerThesis({
  title,
  body,
}: {
  title: string;
  body: string;
}) {
  return (
    <Card className="border-emerald-200 bg-emerald-50/60 p-5">
      <div className="flex items-start gap-4">
        <div className="grid h-12 w-12 shrink-0 place-items-center rounded-md border border-emerald-200 bg-white text-emerald-700">
          <ShieldAlert aria-hidden className="h-6 w-6" />
        </div>
        <SectionHeading title={title} subtitle={body} />
      </div>
    </Card>
  );
}

export function LayerMetricGrid({
  rows,
  dictionary,
  locale,
}: {
  rows: readonly IndicatorSnapshotWithSources[];
  dictionary: Dictionary;
  locale: Locale;
}) {
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      {rows.map((row) => {
        const percentileTone = toneForPercentile(row.pctRank1y);
        const hasData = row.latestValue !== null;

        return (
          <article
            key={row.slug}
            className="rounded-lg border border-slate-200 bg-white p-4 shadow-[0_10px_28px_rgba(15,23,42,0.04)]"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                  {row.slug}
                </p>
                <h2 className="mt-1 text-base font-semibold text-slate-950">
                  {row.name}
                </h2>
              </div>
              <StatusPill
                label={translateStateLabel(row.stateLabel, dictionary)}
                percentile={row.pctRank1y}
              />
            </div>

            <div className="mt-4 grid grid-cols-[1fr_150px] gap-4">
              <div>
                <p className="text-xs text-slate-500">{dictionary.riskLayers.common.latest}</p>
                <p className="numeric mt-1 text-3xl font-semibold text-slate-950">
                  {formatNumber(row.latestValue)}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {hasData
                    ? formatDateLabel(row.latestDate, locale, dictionary)
                    : dictionary.riskLayers.common.waiting}
                </p>
              </div>
              <div className="min-w-0">
                <p className="mb-2 text-xs text-slate-500">
                  {dictionary.riskLayers.common.percentile}
                </p>
                <PercentBar
                  value={row.pctRank1y}
                  tone={percentileTone}
                  label={row.pctRank1y === null ? "--" : `${Math.round(row.pctRank1y * 100)}%`}
                />
                <p className="mt-2 text-xs text-slate-500">
                  {formatFrequencyLabel(row.frequency, dictionary)}
                </p>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3 text-xs text-slate-500">
              <span className="numeric">
                {dictionary.riskLayers.common.change5d}{" "}
                {formatSignedNumber(row.change5d, { maximumFractionDigits: 2 })}
              </span>
              <span className="numeric">
                {dictionary.riskLayers.common.change20d}{" "}
                {formatSignedNumber(row.change20d, { maximumFractionDigits: 2 })}
              </span>
            </div>

            <div className="mt-3 flex justify-end">
              <Link
                href={hrefWithLocale(`/indicators/${row.slug}`, locale)}
                className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-emerald-800 underline-offset-2 hover:underline"
              >
                {dictionary.riskLayers.common.openDetail}
                <ArrowRight aria-hidden className="h-3.5 w-3.5" />
              </Link>
            </div>
          </article>
        );
      })}
    </div>
  );
}

export function LayerGuide({
  title,
  items,
  links,
  locale,
}: {
  title: string;
  items: Array<{ title: string; body: string }>;
  links?: Array<{ label: string; href: string }>;
  locale?: Locale;
}) {
  return (
    <Card className="p-5">
      <SectionHeading title={title} />
      <div className="mt-5 space-y-4">
        {items.map((item, index) => (
          <div key={item.title} className="grid grid-cols-[36px_1fr] gap-3">
            <span className="grid h-9 w-9 place-items-center rounded-md border border-slate-200 bg-slate-50 text-emerald-700">
              {index + 1}
            </span>
            <div>
              <h3 className="text-sm font-semibold text-slate-900">{item.title}</h3>
              <p className="mt-1 text-sm leading-6 text-slate-600">{item.body}</p>
            </div>
          </div>
        ))}
      </div>
      {links?.length ? (
        <div className="mt-5 flex flex-wrap gap-2">
          {links.map((link) => (
            <Link
              key={link.href}
              href={locale ? hrefWithLocale(link.href, locale) : link.href}
              className="inline-flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-emerald-800 transition hover:border-emerald-300 hover:bg-emerald-50"
            >
              {link.label}
              <ArrowRight aria-hidden className="h-4 w-4" />
            </Link>
          ))}
        </div>
      ) : null}
    </Card>
  );
}

export function LayerSourceNote({ dictionary }: { dictionary: Dictionary }) {
  return (
    <Card className="p-5">
      <div className="flex items-start gap-3">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-md border border-slate-200 bg-slate-50 text-slate-600">
          <RefreshCw aria-hidden className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-base font-semibold text-slate-950">
            {dictionary.riskLayers.common.sourceStatus}
          </h2>
          <p className="mt-1 text-sm leading-6 text-slate-600">
            {dictionary.riskLayers.common.sourceNote}
          </p>
        </div>
      </div>
    </Card>
  );
}

export function LayerChartCard({
  title,
  subtitle,
  points,
  rows,
  dictionary,
}: {
  title: string;
  subtitle: string;
  points: ChartPoint[];
  rows: readonly IndicatorSnapshotWithSources[];
  dictionary: Dictionary;
}) {
  if (points.length === 0) {
    return (
      <Card className="p-5">
        <SectionHeading title={title} subtitle={subtitle} />
        <div className="mt-5 rounded-md border border-dashed border-slate-200 bg-slate-50/70 px-4 py-6 text-sm leading-6 text-slate-500">
          {dictionary.riskLayers.common.emptyChart}
        </div>
      </Card>
    );
  }

  return (
    <TimeSeriesChart
      title={title}
      subtitle={subtitle}
      points={points}
      lines={rows.map((row, index) => ({
        key: row.slug,
        label: row.name,
        color: ["#047857", "#0f172a", "#dc2626", "#2563eb", "#d97706", "#0891b2"][index % 6]!,
        dashed: index > 3,
      }))}
      height={300}
      emptyMessage={dictionary.riskLayers.common.emptyChart}
    />
  );
}

export function SourceList({
  rows,
}: {
  rows: readonly IndicatorSnapshotWithSources[];
}) {
  const sourceMap = new Map<
    string,
    IndicatorSnapshotWithSources["sources"][number] & { slug: string }
  >();

  for (const row of rows) {
    for (const source of row.sources) {
      const key = `${source.provider}-${source.externalId}-${source.sourceUrl}`;
      if (!sourceMap.has(key)) {
        sourceMap.set(key, { slug: row.slug, ...source });
      }
    }
  }

  const sources = [...sourceMap.values()];

  return (
    <div className="grid gap-2">
      {sources.slice(0, 8).map((source) => (
        <a
          key={`${source.slug}-${source.provider}-${source.externalId}`}
          href={source.sourceUrl}
          target="_blank"
          rel="noreferrer"
          className="flex items-center justify-between gap-3 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 transition hover:border-emerald-200 hover:bg-emerald-50/60"
        >
          <span className="truncate">
            {source.externalId}
          </span>
          <ExternalLink aria-hidden className="h-4 w-4 shrink-0 text-slate-400" />
        </a>
      ))}
    </div>
  );
}

export { LineChart };
