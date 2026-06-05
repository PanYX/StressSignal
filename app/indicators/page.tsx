import type { Metadata } from "next";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  Activity,
  ArrowRight,
  BarChart3,
  CalendarClock,
  CheckCircle2,
  Gauge,
  ListChecks,
  ListFilter,
  Search,
  ShieldAlert,
  SlidersHorizontal,
  Waypoints,
  X,
} from "lucide-react";
import { Suspense } from "react";

import { TableSkeleton, MetadataSkeleton } from "../../components/shared/data-skeletons";
import { DisclaimerText, MetricMetadata } from "../../components/shared/metric-metadata";
import { PageShell } from "../../components/shared/page-shell";
import {
  Card,
  PercentBar,
  SectionHeading,
  StatusPill,
} from "../../components/shared/ui-kit";
import {
  formatDateLabel,
  formatFrequencyLabel,
  formatNumber,
  formatSignedNumber,
} from "../../components/shared/format";
import { getCachedIndicatorSnapshotsWithSources } from "../../lib/db/cached-queries";
import type { IndicatorSnapshotWithSources } from "../../lib/db/queries";
import {
  getCurrentLocale,
  getDictionary,
  translateStateLabel,
  type Dictionary,
  type Locale,
} from "../../lib/i18n/dictionary";
import { hrefWithLocale } from "../../lib/i18n/locale-url";
import { MVP_INDICATOR_CONFIGS, type IndicatorCategory } from "../../lib/indicators/configs";
import { buildPageMetadata } from "../../lib/seo/page-metadata";
import { buildDatasetSchema } from "../../lib/seo/structured-data";

type IndicatorRow = IndicatorSnapshotWithSources;
type IndicatorFilter = "all" | IndicatorCategory;
type IndicatorSort = "percentileDesc" | "latestDesc" | "nameAsc" | "updatedDesc";
type IndicatorsSearchParams = Promise<{
  category?: string | string[];
  q?: string | string[];
  sort?: string | string[];
}>;

type IndicatorControls = {
  category: IndicatorFilter;
  query: string;
  sort: IndicatorSort;
};

const FALLBACK_INDICATORS: IndicatorRow[] = [];
const FILTER_VALUES: readonly IndicatorFilter[] = [
  "all",
  "equity_vol",
  "systemic_stress",
  "composite",
  "tail_risk",
  "sentiment",
  "fear_greed",
  "global_risk",
];
const SORT_VALUES: readonly IndicatorSort[] = ["percentileDesc", "latestDesc", "nameAsc", "updatedDesc"];
const FILTER_ICONS: Record<IndicatorFilter, LucideIcon> = {
  all: ListFilter,
  equity_vol: Activity,
  systemic_stress: ShieldAlert,
  composite: Waypoints,
  tail_risk: Gauge,
  sentiment: ListChecks,
  fear_greed: SlidersHorizontal,
  global_risk: BarChart3,
};
const READER_GUIDE_ICONS = [Gauge, CheckCircle2, CalendarClock] as const;
const QUICK_GUIDE_ICONS = [BarChart3, Gauge, CalendarClock, ArrowRight] as const;

const safe = async <T,>(task: () => Promise<T>, fallback: T): Promise<T> => {
  try {
    return await task();
  } catch {
    return fallback;
  }
};

const toDisplayName = (row: IndicatorRow) => {
  const config = MVP_INDICATOR_CONFIGS.find((config) => config.slug === row.slug);
  return config?.name ?? row.slug.toUpperCase();
};

const categoryForRow = (row: IndicatorRow): IndicatorCategory =>
  MVP_INDICATOR_CONFIGS.find((config) => config.slug === row.slug)?.category ?? "composite";

const firstParam = (value: string | string[] | undefined): string | undefined =>
  Array.isArray(value) ? value[0] : value;

const normalizeControls = (searchParams: Awaited<IndicatorsSearchParams>): IndicatorControls => {
  const rawCategory = firstParam(searchParams.category);
  const rawSort = firstParam(searchParams.sort);
  const rawQuery = firstParam(searchParams.q)?.trim() ?? "";

  return {
    category: FILTER_VALUES.includes(rawCategory as IndicatorFilter)
      ? (rawCategory as IndicatorFilter)
      : "all",
    query: rawQuery,
    sort: SORT_VALUES.includes(rawSort as IndicatorSort)
      ? (rawSort as IndicatorSort)
      : "percentileDesc",
  };
};

const buildIndicatorsHref = (
  controls: IndicatorControls,
  locale: Locale,
  override: Partial<IndicatorControls> = {},
) => {
  const next = { ...controls, ...override };
  const params = new URLSearchParams();

  if (next.category !== "all") {
    params.set("category", next.category);
  }
  if (next.query) {
    params.set("q", next.query);
  }
  if (next.sort !== "percentileDesc") {
    params.set("sort", next.sort);
  }

  const queryString = params.toString();
  return hrefWithLocale(queryString ? `/indicators?${queryString}` : "/indicators", locale);
};

const toneForPercentile = (value: number | null | undefined) =>
  value === null || value === undefined
    ? "emerald"
    : value >= 0.8
      ? "rose"
      : value >= 0.5
        ? "amber"
        : "emerald";

const extractUniqueSources = (
  indicators: readonly IndicatorRow[],
): {
  provider: string;
  externalId: string;
  sourceUrl: string;
  licenseNote: string | null;
  isPrimary: boolean;
}[] => {
  const sourceMap = new Map<string, IndicatorSnapshotWithSources["sources"][number]>();
  for (const item of indicators) {
    for (const source of item.sources) {
      const key = `${source.provider}|${source.externalId}`;
      if (!sourceMap.has(key)) {
        sourceMap.set(key, source);
      }
    }
  }
  return [...sourceMap.values()];
};

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getCurrentLocale();
  const dictionary = getDictionary(locale);

  return buildPageMetadata({
    title: dictionary.indicatorsPage.metaTitle,
    description: dictionary.indicatorsPage.metaDescription,
    locale,
    path: "/indicators",
  });
}

export default async function IndicatorsPage({
  searchParams,
}: {
  searchParams: IndicatorsSearchParams;
}) {
  const locale = await getCurrentLocale();
  const dictionary = getDictionary(locale);
  const controls = normalizeControls(await searchParams);
  const indicatorsPromise = safe(
    () => getCachedIndicatorSnapshotsWithSources(),
    FALLBACK_INDICATORS,
  );
  const structuredData = buildDatasetSchema({
    name: "Market Risk Dashboard - Indicators",
    description:
      "Current market-risk indicators with latest readings, percentiles, and update dates.",
    dateModified: null,
    path: "/indicators",
    locale,
  });

  return (
    <PageShell
      title={dictionary.indicatorsPage.title}
      subtitle={dictionary.indicatorsPage.subtitle}
      dictionary={dictionary}
      locale={locale}
    >
      <Card className="p-5">
        <div className="grid gap-4 lg:grid-cols-[300px_1fr]">
          <div className="flex items-center gap-4 rounded-lg border border-emerald-100 bg-emerald-50/70 p-4">
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-md border border-emerald-200 bg-white text-emerald-700">
              <ListChecks aria-hidden className="h-6 w-6" />
            </div>
            <SectionHeading title={dictionary.indicatorsPage.readerGuide.title} />
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            {dictionary.indicatorsPage.readerGuide.items.map((item, index) => {
              const Icon = READER_GUIDE_ICONS[index] ?? ListChecks;

              return (
                <article
                  key={item.title}
                  className="rounded-lg border border-slate-200 bg-white/80 p-4 shadow-[0_1px_0_rgba(15,23,42,0.03)]"
                >
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-md border border-emerald-200 bg-emerald-50 text-emerald-700">
                      <Icon aria-hidden className="h-6 w-6" />
                    </span>
                    <span className="rounded-full border border-emerald-200 bg-white px-2 py-0.5 text-[11px] font-semibold leading-5 text-emerald-700">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                  </div>
                  <h3 className="text-sm font-semibold text-slate-900">{item.title}</h3>
                  <p className="mt-1 text-sm leading-6 text-slate-600">{item.body}</p>
                </article>
              );
            })}
          </div>
        </div>
      </Card>

      <Suspense fallback={<IndicatorsDataSkeleton />}>
        <IndicatorsDataContent
          indicatorsPromise={indicatorsPromise}
          controls={controls}
          dictionary={dictionary}
          locale={locale}
        />
      </Suspense>

      <DisclaimerText dictionary={dictionary} />
      <script
        id="indicators-structured-data"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
    </PageShell>
  );
}

function IndicatorsDataSkeleton() {
  return (
    <>
      <TableSkeleton />
      <MetadataSkeleton />
    </>
  );
}

async function IndicatorsDataContent({
  indicatorsPromise,
  controls,
  dictionary,
  locale,
}: {
  indicatorsPromise: Promise<IndicatorRow[]>;
  controls: IndicatorControls;
  dictionary: Dictionary;
  locale: Locale;
}) {
  const indicators = await indicatorsPromise;
  const asOf = indicators.length > 0
    ? indicators
      .map((item) => item.updatedAt ?? item.latestDate)
      .filter((value): value is string => Boolean(value))
      .sort()
      .at(-1) ?? null
    : null;
  const query = controls.query.toLowerCase();
  const filtered = indicators.filter((item) => {
    const categoryMatch = controls.category === "all" || categoryForRow(item) === controls.category;
    if (!categoryMatch) {
      return false;
    }

    if (!query) {
      return true;
    }

    const searchable = [
      toDisplayName(item),
      item.slug,
      item.frequency,
      translateStateLabel(item.stateLabel, dictionary),
      ...item.sources.flatMap((source) => [source.provider, source.externalId]),
    ].join(" ").toLowerCase();

    return searchable.includes(query);
  });
  const ordered = [...filtered].sort((left, right) => {
    if (controls.sort === "latestDesc") {
      return (right.latestValue ?? -Infinity) - (left.latestValue ?? -Infinity) || left.slug.localeCompare(right.slug);
    }
    if (controls.sort === "nameAsc") {
      return toDisplayName(left).localeCompare(toDisplayName(right));
    }
    if (controls.sort === "updatedDesc") {
      return (right.updatedAt ?? right.latestDate ?? "").localeCompare(left.updatedAt ?? left.latestDate ?? "") || left.slug.localeCompare(right.slug);
    }

    return (right.pctRank1y ?? -1) - (left.pctRank1y ?? -1) || left.slug.localeCompare(right.slug);
  });
  const topSource = extractUniqueSources(indicators);
  const frequencies = [...new Set(indicators.map((item) => item.frequency).filter(Boolean))];
  const hasActiveControls = controls.category !== "all" || controls.query !== "" || controls.sort !== "percentileDesc";
  const countText = hasActiveControls
    ? dictionary.indicatorsPage.filteredItemCount
      .replace("{shown}", String(ordered.length))
      .replace("{total}", String(indicators.length))
    : dictionary.indicatorsPage.itemCount.replace("{count}", String(ordered.length));

  return (
    <>
      {indicators.length === 0 ? (
        <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          {dictionary.indicatorsPage.empty}
        </p>
      ) : null}

      <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_290px]">
        <div className="min-w-0 space-y-4">
          <Card className="p-3">
            <div className="flex flex-col gap-3">
              <nav
                aria-label={dictionary.indicatorsPage.filterAriaLabel}
                className="flex flex-wrap gap-1"
              >
                {FILTER_VALUES.map((value, index) => {
                  const label = dictionary.indicatorsPage.filters[index] ?? value;
                  const active = controls.category === value;
                  const Icon = FILTER_ICONS[value];

                  return (
                    <Link
                      key={value}
                      href={buildIndicatorsHref(controls, locale, { category: value })}
                      aria-current={active ? "page" : undefined}
                      className={`inline-flex shrink-0 items-center gap-2 rounded-md px-3 py-2 text-sm font-semibold whitespace-nowrap transition ${
                        active
                          ? "bg-emerald-700 text-white shadow-sm"
                          : "bg-slate-50 text-slate-600 hover:bg-white hover:text-slate-950"
                      }`}
                    >
                      <Icon aria-hidden className="h-4 w-4" />
                      {label}
                    </Link>
                  );
                })}
              </nav>

              <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
                <form action="/indicators" className="flex min-w-0 rounded-md border border-slate-200 bg-white shadow-sm sm:min-w-[320px]">
                  <input type="hidden" name="lang" value={locale} />
                  {controls.category !== "all" ? <input type="hidden" name="category" value={controls.category} /> : null}
                  {controls.sort !== "percentileDesc" ? <input type="hidden" name="sort" value={controls.sort} /> : null}
                  <label htmlFor="indicator-search" className="sr-only">
                    {dictionary.indicatorsPage.searchLabel}
                  </label>
                  <div className="relative min-w-0 flex-1">
                    <Search aria-hidden className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      id="indicator-search"
                      name="q"
                      type="search"
                      defaultValue={controls.query}
                      placeholder={dictionary.indicatorsPage.searchPlaceholder}
                      className="h-10 w-full rounded-l-md bg-transparent pl-9 pr-3 text-sm text-slate-800 outline-none placeholder:text-slate-500"
                    />
                  </div>
                  <button
                    type="submit"
                    aria-label={dictionary.indicatorsPage.searchSubmit}
                    className="grid h-10 w-10 shrink-0 place-items-center rounded-r-md border-l border-slate-200 text-slate-600 transition hover:bg-emerald-50 hover:text-emerald-800"
                  >
                    <Search aria-hidden className="h-4 w-4" />
                  </button>
                </form>

                <form action="/indicators" className="flex shrink-0 rounded-md border border-slate-200 bg-white shadow-sm">
                  <input type="hidden" name="lang" value={locale} />
                  {controls.category !== "all" ? <input type="hidden" name="category" value={controls.category} /> : null}
                  {controls.query ? <input type="hidden" name="q" value={controls.query} /> : null}
                  <label htmlFor="indicator-sort" className="sr-only">
                    {dictionary.indicatorsPage.sortLabel}
                  </label>
                  <div className="flex items-center gap-2 px-3 text-slate-500">
                    <SlidersHorizontal aria-hidden className="h-4 w-4" />
                  </div>
                  <select
                    id="indicator-sort"
                    name="sort"
                    defaultValue={controls.sort}
                    className="h-10 min-w-[190px] bg-white pr-2 text-sm font-medium text-slate-700 outline-none"
                  >
                    {SORT_VALUES.map((value) => (
                      <option key={value} value={value}>
                        {dictionary.indicatorsPage.sortOptions[value]}
                      </option>
                    ))}
                  </select>
                  <button
                    type="submit"
                    className="h-10 min-w-14 shrink-0 rounded-r-md border-l border-slate-200 px-3 text-sm font-semibold whitespace-nowrap text-emerald-800 transition hover:bg-emerald-50"
                  >
                    {dictionary.indicatorsPage.sortApply}
                  </button>
                </form>

                {hasActiveControls ? (
                  <Link
                    href={hrefWithLocale("/indicators", locale)}
                    className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-sm font-semibold whitespace-nowrap text-slate-600 shadow-sm transition hover:bg-slate-50 hover:text-slate-950"
                  >
                    <X aria-hidden className="h-4 w-4" />
                    {dictionary.indicatorsPage.clearFilters}
                  </Link>
                ) : null}
              </div>
            </div>
          </Card>

          {ordered.length === 0 ? (
            <Card className="p-5">
              <h2 className="text-base font-semibold text-slate-950">{dictionary.indicatorsPage.noMatchesTitle}</h2>
              <p className="mt-1 text-sm text-slate-600">{dictionary.indicatorsPage.noMatchesBody}</p>
              <Link
                href={hrefWithLocale("/indicators", locale)}
                className="mt-4 inline-flex rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold text-emerald-800 transition hover:border-emerald-300 hover:bg-emerald-50"
              >
                {dictionary.indicatorsPage.clearFilters}
              </Link>
            </Card>
          ) : (
            <>
              <div className="grid gap-3 md:hidden">
                {ordered.map((item) => (
                  <article key={item.slug} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <Link
                          href={hrefWithLocale(`/indicators/${item.slug}`, locale)}
                          className="font-semibold text-slate-950 underline-offset-3 hover:text-emerald-800 hover:underline"
                        >
                          {toDisplayName(item)}
                        </Link>
                        <p className="text-xs uppercase text-slate-500">{item.slug}</p>
                      </div>
                      <StatusPill
                        label={translateStateLabel(item.stateLabel, dictionary)}
                        percentile={item.pctRank1y}
                      />
                    </div>
                    <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
                      <div className="rounded-md bg-slate-50 p-3">
                        <p className="text-xs text-slate-500">{dictionary.indicatorsPage.table.latest}</p>
                        <p className="numeric mt-1 font-semibold text-slate-950">{formatNumber(item.latestValue)}</p>
                        <p className="text-xs text-slate-500">{formatDateLabel(item.latestDate, locale, dictionary)}</p>
                      </div>
                      <div className="rounded-md bg-slate-50 p-3">
                        <p className="text-xs text-slate-500">{dictionary.indicatorsPage.table.percentile}</p>
                        <PercentBar
                          value={item.pctRank1y}
                          label={item.pctRank1y === null ? "--" : `${(item.pctRank1y * 100).toFixed(0)}%`}
                          tone={toneForPercentile(item.pctRank1y)}
                        />
                        <p className="mt-1 text-xs text-slate-500">{formatFrequencyLabel(item.frequency, dictionary)}</p>
                      </div>
                    </div>
                  </article>
                ))}
              </div>

              <div className="hidden overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-[0_10px_28px_rgba(15,23,42,0.04)] md:block">
                <table className="min-w-full text-sm">
                  <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-3 py-3">{dictionary.indicatorsPage.table.indicator}</th>
                      <th className="px-3 py-3">{dictionary.indicatorsPage.table.latest}</th>
                      <th className="px-3 py-3">{dictionary.indicatorsPage.table.changes}</th>
                      <th className="px-3 py-3">{dictionary.indicatorsPage.table.percentile}</th>
                      <th className="px-3 py-3">{dictionary.indicatorsPage.table.state}</th>
                      <th className="px-3 py-3">{dictionary.indicatorsPage.table.frequency}</th>
                      <th className="px-3 py-3">{dictionary.indicatorsPage.table.sourceUpdated}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ordered.map((item) => {
                      const percentileTone = toneForPercentile(item.pctRank1y);
                      return (
                        <tr key={item.slug} className="border-t border-slate-100 hover:bg-slate-50/60">
                          <td className="px-3 py-3 align-top">
                            <div className="flex items-start gap-3">
                              <span
                                className={`mt-1 h-8 w-1 rounded-full ${
                                  percentileTone === "rose"
                                    ? "bg-rose-500"
                                    : percentileTone === "amber"
                                      ? "bg-amber-500"
                                      : "bg-emerald-500"
                                }`}
                              />
                              <div>
                                <Link
                                  href={hrefWithLocale(`/indicators/${item.slug}`, locale)}
                                  className="font-semibold text-slate-900 underline-offset-3 hover:text-emerald-800 hover:underline"
                                >
                                  {toDisplayName(item)}
                                </Link>
                                <p className="text-xs uppercase text-slate-500">{item.slug}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-3 py-3 text-slate-900">
                            <p className="numeric text-lg font-semibold">{formatNumber(item.latestValue)}</p>
                            <p className="text-xs text-slate-500">{formatDateLabel(item.latestDate, locale, dictionary)}</p>
                          </td>
                          <td className="numeric px-3 py-3 text-xs text-slate-600">
                            <span className="mr-2 text-rose-600">
                              1D {formatSignedNumber(item.change1d, { maximumFractionDigits: 2, minimumFractionDigits: 2 })}
                            </span>
                            <span className="mr-2 text-rose-600">
                              5D {formatSignedNumber(item.change5d, { maximumFractionDigits: 2, minimumFractionDigits: 2 })}
                            </span>
                            <span className="text-rose-600">
                              20D {formatSignedNumber(item.change20d, { maximumFractionDigits: 2, minimumFractionDigits: 2 })}
                            </span>
                          </td>
                          <td className="px-3 py-3">
                            <PercentBar
                              value={item.pctRank1y}
                              label={item.pctRank1y === null ? "--" : `${(item.pctRank1y * 100).toFixed(0)}%`}
                              tone={percentileTone}
                            />
                          </td>
                          <td className="px-3 py-3">
                            <StatusPill
                              label={translateStateLabel(item.stateLabel, dictionary)}
                              percentile={item.pctRank1y}
                            />
                          </td>
                          <td className="px-3 py-3 text-slate-700">{formatFrequencyLabel(item.frequency, dictionary)}</td>
                          <td className="px-3 py-3">
                            <p className="text-xs text-slate-500">
                              {dictionary.metadata.updated}{dictionary.common.punctuation.colon}{formatDateLabel(item.updatedAt ?? item.latestDate, locale, dictionary)}
                            </p>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                <p className="border-t border-slate-100 px-3 py-3 text-xs text-slate-500">
                  {countText}
                </p>
              </div>
            </>
          )}
        </div>

        <Card className="p-5">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-md border border-emerald-200 bg-emerald-50 text-emerald-700">
              <ListChecks aria-hidden className="h-5 w-5" />
            </div>
            <h2 className="text-base font-semibold text-slate-950">{dictionary.indicatorsPage.helpTitle}</h2>
          </div>
          <div className="mt-5 space-y-4">
            {dictionary.indicatorsPage.quickGuide.map(({ title, body }, index) => {
              const Icon = QUICK_GUIDE_ICONS[index] ?? CheckCircle2;

              return (
                <div key={title} className="grid grid-cols-[36px_1fr] gap-3">
                  <span className="grid h-9 w-9 place-items-center rounded-md border border-slate-200 bg-slate-50 text-emerald-700">
                    <Icon aria-hidden className="h-4 w-4" />
                  </span>
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
                    <p className="mt-1 text-sm leading-6 text-slate-600">{body}</p>
                  </div>
                </div>
              );
            })}
          </div>
          <Link
            href={hrefWithLocale("/how-to-read", locale)}
            className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-emerald-800 transition hover:border-emerald-300 hover:bg-emerald-50"
          >
            {dictionary.indicatorsPage.helpCta}
            <ArrowRight aria-hidden className="h-4 w-4" />
          </Link>
        </Card>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-slate-950">
          {dictionary.indicatorsPage.readerGuide.sourceTitle}
        </h2>
        <MetricMetadata
          frequency={frequencies.length > 1 ? frequencies.join(" / ") : frequencies.at(0) ?? "daily / weekly"}
          updatedAt={asOf}
          sources={topSource.map((source) => ({
            provider: source.provider,
            externalId: source.externalId,
            sourceUrl: source.sourceUrl,
            licenseNote: source.licenseNote,
            isPrimary: source.isPrimary,
          }))}
          dictionary={dictionary}
          locale={locale}
        />
      </section>
    </>
  );
}
