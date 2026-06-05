import type { Metadata } from "next";
import { Suspense } from "react";

import { TrackedLink } from "../components/analytics/tracked-link";
import { IndicatorSummaryCard } from "../components/cards/indicator-summary-card";
import { RiskScoreCard } from "../components/cards/risk-score-card";
import { TimeSeriesChart } from "../components/charts/time-series-chart";
import { CommentaryPanel } from "../components/commentary/commentary-panel";
import {
  ChartGridSkeleton,
  DashboardTopSkeleton,
  MetadataSkeleton,
  TableSkeleton,
} from "../components/shared/data-skeletons";
import {
  DisclaimerText,
  HowToNavigateButton,
  MetricMetadata,
} from "../components/shared/metric-metadata";
import { PageShell } from "../components/shared/page-shell";
import {
  formatDateLabel,
  formatFrequencyLabel,
  formatNumber,
  formatSignedNumber,
} from "../components/shared/format";
import {
  Card,
  MetricTile,
  PercentBar,
  SectionHeading,
  StatusPill,
} from "../components/shared/ui-kit";
import { evaluateCommentaryBranches } from "../lib/commentary/rules";
import { renderCommentary } from "../lib/commentary/templates";
import {
  getCachedCompositeRiskScoreHistory,
  getCachedHomepageSummary,
  getCachedIndicatorHistory,
  getCachedIndicatorHistoryBySource,
  getCachedIndicatorSnapshotsWithSources,
} from "../lib/db/cached-queries";
import {
  getCurrentLocale,
  getDictionary,
  translateStateLabel,
  type Dictionary,
  type Locale,
} from "../lib/i18n/dictionary";
import { hrefWithLocale } from "../lib/i18n/locale-url";
import type {
  HomepageSummaryPayload,
  IndicatorSnapshotWithSources,
  ObservationPoint,
} from "../lib/db/queries";
import { buildPageMetadata } from "../lib/seo/page-metadata";
import { buildDatasetSchema } from "../lib/seo/structured-data";

type ChartPoint = {
  date: string;
  [key: string]: string | number | null;
};

type HomeSummaryData = {
  summary: HomepageSummaryPayload;
  indicatorRows: IndicatorSnapshotWithSources[];
  commentary: ReturnType<typeof renderCommentary>;
};

type HomeChartData = {
  vixVixvChart: ChartPoint[];
  vixComparisonChart: ChartPoint[];
  stressChart: ChartPoint[];
  compositeChart: ChartPoint[];
};

const buildFallbackSummary = (dictionary: Dictionary): HomepageSummaryPayload => ({
  asOf: null,
  riskScore: null,
  riskStateLabel: dictionary.states.waiting,
  topDrivers: [],
  cards: [],
  headline: dictionary.home.fallbackHeadline,
});

const safe = async <T,>(task: () => Promise<T>, fallback: T): Promise<T> => {
  try {
    return await task();
  } catch {
    return fallback;
  }
};

const buildMergedPoints = (
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

const getHomeSummaryData = async (dictionary: Dictionary): Promise<HomeSummaryData> => {
  const [summary, indicatorRows] = await Promise.all([
    safe(() => getCachedHomepageSummary(), buildFallbackSummary(dictionary)),
    safe(
      () => getCachedIndicatorSnapshotsWithSources(),
      [] as IndicatorSnapshotWithSources[],
    ),
  ]);

  const snapshotBySlug = new Map(indicatorRows.map((item) => [item.slug, item]));
  const safeInputMetric = (slug: string) => {
    const item = snapshotBySlug.get(slug);
    if (!item) {
      return null;
    }

    return {
      latestValue: item.latestValue,
      pctRank1y: item.pctRank1y,
    };
  };

  const commentary = renderCommentary(
    evaluateCommentaryBranches({
      vix: safeInputMetric("vix"),
      vxn: safeInputMetric("vxn"),
      rvx: safeInputMetric("rvx"),
      stlfsi4: safeInputMetric("stlfsi4"),
      nfci: safeInputMetric("nfci"),
      vixTermProxy: safeInputMetric("vix-term-proxy"),
    }),
    dictionary,
  );

  return { summary, indicatorRows, commentary };
};

const getHomeChartData = async (): Promise<HomeChartData> => {
  const [vixPoints, vixvPoints, equityVxn, equityRvx, equityVxd, stlfsi4, nfci, compositePoints] =
    await Promise.all([
      safe(() => getCachedIndicatorHistoryBySource("vix", "VIXCLS"), [] as ObservationPoint[]),
      safe(() => getCachedIndicatorHistoryBySource("vix-term-proxy", "VXVCLS"), [] as ObservationPoint[]),
      safe(() => getCachedIndicatorHistory("vxn"), [] as ObservationPoint[]),
      safe(() => getCachedIndicatorHistory("rvx"), [] as ObservationPoint[]),
      safe(() => getCachedIndicatorHistory("vxd"), [] as ObservationPoint[]),
      safe(() => getCachedIndicatorHistory("stlfsi4"), [] as ObservationPoint[]),
      safe(() => getCachedIndicatorHistory("nfci"), [] as ObservationPoint[]),
      safe(() => getCachedCompositeRiskScoreHistory("1Y"), [] as ObservationPoint[]),
    ]);

  return {
    vixVixvChart: buildMergedPoints([
      { key: "VIX", points: vixPoints },
      { key: "VXV", points: vixvPoints },
    ]),
    vixComparisonChart: buildMergedPoints([
      { key: "VIX", points: vixPoints },
      { key: "VXN", points: equityVxn },
      { key: "RVX", points: equityRvx },
      { key: "VXD", points: equityVxd },
    ]),
    stressChart: buildMergedPoints([
      { key: "STLFSI4", points: stlfsi4 },
      { key: "NFCI", points: nfci },
    ]),
    compositeChart: compositePoints.map((point) => ({
      date: point.date,
      value: point.value,
    })),
  };
};

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getCurrentLocale();
  const dictionary = getDictionary(locale);

  return buildPageMetadata({
    title: dictionary.home.metaTitle,
    description: dictionary.home.metaDescription,
    locale,
    path: "/",
  });
}

export default async function HomePage() {
  const locale = await getCurrentLocale();
  const dictionary = getDictionary(locale);
  const summaryDataPromise = getHomeSummaryData(dictionary);
  const chartDataPromise = getHomeChartData();
  const structuredData = buildDatasetSchema({
    name: "Market Risk Dashboard Snapshot Dataset",
    description:
      "Market risk dashboard with volatility, stress indicators and deterministic composite scoring.",
    dateModified: null,
    path: "/",
    locale,
  });

  return (
    <PageShell
      title={dictionary.home.title}
      subtitle={dictionary.home.subtitle}
      dictionary={dictionary}
      locale={locale}
    >
      <HomeIntro dictionary={dictionary} locale={locale} />

      <Suspense fallback={<DashboardTopSkeleton />}>
        <HomeTopSection dataPromise={summaryDataPromise} dictionary={dictionary} locale={locale} />
      </Suspense>

      <Suspense fallback={<TableSkeleton />}>
        <HomeRiskDrivers dataPromise={summaryDataPromise} dictionary={dictionary} locale={locale} />
      </Suspense>

      <Suspense fallback={<ChartGridSkeleton />}>
        <HomeCharts dataPromise={chartDataPromise} dictionary={dictionary} />
      </Suspense>

      <Suspense fallback={<MetadataSkeleton />}>
        <HomeDataSources dataPromise={summaryDataPromise} dictionary={dictionary} locale={locale} />
      </Suspense>

      <DisclaimerText dictionary={dictionary} />
      <script
        id="homepage-structured-data"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
    </PageShell>
  );
}

function HomeIntro({ dictionary, locale }: { dictionary: Dictionary; locale: Locale }) {
  return (
    <Card className="border-emerald-200 bg-emerald-50/60 p-5">
      <SectionHeading
        title={dictionary.home.productIntro.title}
        subtitle={dictionary.home.productIntro.body}
        action={<HowToNavigateButton href="/how-to-read" label={dictionary.home.productIntro.secondaryCta} locale={locale} />}
      />
      <div className="mt-4 grid gap-3 md:grid-cols-3">
        {dictionary.home.productIntro.cards.map((item, index) => (
          <article key={item.title} className="rounded-lg border border-emerald-100 bg-white/70 p-4">
            <span className="grid h-7 w-7 place-items-center rounded-full bg-emerald-700 text-xs font-semibold text-white">
              {index + 1}
            </span>
            <h2 className="mt-3 text-sm font-semibold text-slate-950">{item.title}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">{item.body}</p>
          </article>
        ))}
      </div>
    </Card>
  );
}

async function HomeTopSection({
  dataPromise,
  dictionary,
  locale,
}: {
  dataPromise: Promise<HomeSummaryData>;
  dictionary: Dictionary;
  locale: Locale;
}) {
  const homeData = await dataPromise;
  const topDrivers = homeData.summary.topDrivers
    .map((slug) => {
      const row = homeData.indicatorRows.find((item) => item.slug === slug);
      return {
        slug,
        label: row?.name ?? slug.toUpperCase(),
      };
    })
    .slice(0, 3);
  const asOf = homeData.summary.asOf ?? null;
  const elevatedRows = homeData.indicatorRows.filter(
    (item) => (item.pctRank1y ?? 0) >= 0.8,
  );
  const watchRows = homeData.indicatorRows.filter(
    (item) => (item.pctRank1y ?? 0) >= 0.5 && (item.pctRank1y ?? 0) < 0.8,
  );
  const strongestRow = homeData.indicatorRows
    .slice()
    .sort((left, right) => (right.pctRank1y ?? -1) - (left.pctRank1y ?? -1))[0];
  const localizedState = translateStateLabel(homeData.summary.riskStateLabel, dictionary);
  const riskHeadline =
    homeData.summary.riskScore === null
      ? dictionary.riskCard.noHeadline
      : dictionary.home.scoreHeadlineTemplate
        .replace("{state}", localizedState)
        .replace("{score}", homeData.summary.riskScore.toFixed(1));

  return (
    <section className="grid items-stretch gap-4 xl:grid-cols-[1.05fr_0.95fr_0.75fr]">
      <RiskScoreCard
        score={homeData.summary.riskScore}
        stateLabel={localizedState}
        headline={riskHeadline}
        asOf={asOf}
        topDrivers={topDrivers}
        dictionary={dictionary}
        locale={locale}
      />
      <Card className="p-5">
        <SectionHeading title={dictionary.home.scanTitle} />
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <MetricTile
            label={dictionary.home.elevatedLabel}
            value={elevatedRows.length}
            help={dictionary.home.elevatedHelp}
            tone="rose"
          />
          <MetricTile
            label={dictionary.home.watchLabel}
            value={watchRows.length}
            help={dictionary.home.watchHelp}
            tone="amber"
          />
          <MetricTile
            label={dictionary.home.strongestLabel}
            value={strongestRow?.name ?? dictionary.home.waitingData}
            help={
              strongestRow?.pctRank1y === null || strongestRow?.pctRank1y === undefined
                ? dictionary.home.snapshotPending
                : `${(strongestRow.pctRank1y * 100).toFixed(0)}% ${dictionary.home.percentileSuffix}`
            }
            tone="emerald"
          />
        </div>
        <div className="mt-4 border-t border-slate-100 pt-4">
          <p className="text-sm leading-6 text-slate-700">
            {dictionary.home.asOfPrefix}
            {dictionary.common.punctuation.colon}
            {formatDateLabel(asOf, locale, dictionary)}
            {dictionary.common.punctuation.period}
            {dictionary.home.scanBody}
          </p>
        </div>
      </Card>
      <CommentaryPanel
        headline={homeData.commentary.headline}
        summary={homeData.commentary.summary}
        details={homeData.commentary.details}
        missing={homeData.commentary.missing}
        dictionary={dictionary}
      />
    </section>
  );
}

async function HomeRiskDrivers({
  dataPromise,
  dictionary,
  locale,
}: {
  dataPromise: Promise<HomeSummaryData>;
  dictionary: Dictionary;
  locale: Locale;
}) {
  const homeData = await dataPromise;
  const indicatorCards = homeData.indicatorRows
    .slice()
    .sort((left, right) => (right.pctRank1y ?? -1) - (left.pctRank1y ?? -1))
    .map((item) => (
      <IndicatorSummaryCard
        key={item.slug}
        dictionary={dictionary}
        locale={locale}
        row={{
          ...item,
          sources: item.sources,
          frequency: item.frequency,
          sourcePolicy: item.sourcePolicy,
          updatedAt: item.updatedAt,
        }}
      />
    ));

  return (
    <section id="risk-drivers" className="scroll-mt-24 space-y-3">
      <SectionHeading
        title={dictionary.home.driversTitle}
        subtitle={dictionary.home.driversSubtitle}
        action={<HowToNavigateButton href="/indicators" label={dictionary.home.viewAllIndicators} locale={locale} />}
      />
      <div className="hidden overflow-hidden rounded-lg border border-slate-200 bg-white shadow-[0_10px_28px_rgba(15,23,42,0.04)] lg:block">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-3 py-3">{dictionary.home.driverTable.indicator}</th>
              <th className="px-3 py-3">{dictionary.home.driverTable.latest}</th>
              <th className="px-3 py-3">{dictionary.home.driverTable.percentile}</th>
              <th className="px-3 py-3">{dictionary.home.driverTable.change1d}</th>
              <th className="px-3 py-3">{dictionary.home.driverTable.change5d}</th>
              <th className="px-3 py-3">{dictionary.home.driverTable.state}</th>
              <th className="px-3 py-3">{dictionary.home.driverTable.read}</th>
            </tr>
          </thead>
          <tbody>
            {homeData.indicatorRows
              .slice()
              .sort((left, right) => (right.pctRank1y ?? -1) - (left.pctRank1y ?? -1))
              .slice(0, 6)
              .map((item, index) => (
                <tr key={item.slug} className="border-t border-slate-100 hover:bg-slate-50/60">
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-3">
                      <span
                        className={`h-7 w-1 rounded-full ${
                          (item.pctRank1y ?? 0) >= 0.8
                            ? "bg-rose-500"
                            : (item.pctRank1y ?? 0) >= 0.5
                              ? "bg-amber-500"
                              : "bg-emerald-500"
                        }`}
                      />
                      <div>
                        <TrackedLink
                          href={hrefWithLocale(`/indicators/${item.slug}`, locale)}
                          className="font-semibold text-slate-950 underline-offset-3 hover:text-emerald-800 hover:underline"
                          eventName="select_indicator"
                          eventProps={{
                            slug: item.slug,
                            source: "home_driver_table",
                            rank: index + 1,
                            locale,
                          }}
                        >
                          {item.name}
                        </TrackedLink>
                        <p className="text-xs uppercase text-slate-500">{item.slug}</p>
                      </div>
                    </div>
                  </td>
                  <td className="numeric px-3 py-3 font-semibold text-slate-900">
                    {formatNumber(item.latestValue)}
                  </td>
                  <td className="px-3 py-3">
                    <PercentBar
                      value={item.pctRank1y}
                      label={item.pctRank1y === null ? "--" : `${(item.pctRank1y * 100).toFixed(0)}%`}
                      tone={(item.pctRank1y ?? 0) >= 0.8 ? "rose" : (item.pctRank1y ?? 0) >= 0.5 ? "amber" : "emerald"}
                    />
                  </td>
                  <td className="numeric px-3 py-3 text-rose-600">
                    {formatSignedNumber(item.change1d, { maximumFractionDigits: 2, minimumFractionDigits: 2 })}
                  </td>
                  <td className="numeric px-3 py-3 text-rose-600">
                    {formatSignedNumber(item.change5d, { maximumFractionDigits: 2, minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-3 py-3">
                    <StatusPill
                      label={translateStateLabel(item.stateLabel, dictionary)}
                      percentile={item.pctRank1y}
                    />
                  </td>
                  <td className="max-w-sm px-3 py-3 text-xs leading-5 text-slate-600">
                    {formatFrequencyLabel(item.frequency, dictionary)}
                    <span className="mx-2 text-slate-300">·</span>
                    {formatDateLabel(item.updatedAt ?? item.latestDate, locale, dictionary)}
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
      <div className="grid gap-3 lg:hidden sm:grid-cols-2">{indicatorCards}</div>
    </section>
  );
}

async function HomeCharts({
  dataPromise,
  dictionary,
}: {
  dataPromise: Promise<HomeChartData>;
  dictionary: Dictionary;
}) {
  const homeData = await dataPromise;

  return (
    <section className="grid gap-4 lg:grid-cols-2">
      <TimeSeriesChart
        title={dictionary.home.chartTermTitle}
        subtitle={dictionary.home.chartTermSubtitle}
        emptyMessage={dictionary.common.noData}
        points={homeData.vixVixvChart}
        lines={[
          { key: "VIX", label: "VIX", color: "#0f9f9a" },
          { key: "VXV", label: "VXV", color: "#2563eb" },
        ]}
      />
      <TimeSeriesChart
        title="VIX / VXN / RVX / VXD"
        subtitle={dictionary.home.chartEquitySubtitle}
        emptyMessage={dictionary.common.noData}
        points={homeData.vixComparisonChart}
        lines={[
          { key: "VIX", label: "VIX", color: "#0f766e" },
          { key: "VXN", label: "VXN", color: "#0284c7" },
          { key: "RVX", label: "RVX", color: "#f59e0b" },
          { key: "VXD", label: "VXD", color: "#e11d48" },
        ]}
      />
      <TimeSeriesChart
        title={dictionary.home.chartStressTitle}
        subtitle={dictionary.home.chartStressSubtitle}
        emptyMessage={dictionary.common.noData}
        points={homeData.stressChart}
        lines={[
          { key: "STLFSI4", label: "STLFSI4", color: "#0d9488" },
          { key: "NFCI", label: "NFCI", color: "#ef4444" },
        ]}
      />
      <TimeSeriesChart
        title={dictionary.home.chartCompositeTitle}
        subtitle={dictionary.home.chartCompositeSubtitle}
        emptyMessage={dictionary.common.noData}
        points={homeData.compositeChart}
        lines={[
          { key: "value", label: "Composite Score", color: "#111827" },
        ]}
      />
    </section>
  );
}

async function HomeDataSources({
  dataPromise,
  dictionary,
  locale,
}: {
  dataPromise: Promise<HomeSummaryData>;
  dictionary: Dictionary;
  locale: Locale;
}) {
  const homeData = await dataPromise;
  const asOf = homeData.summary.asOf ?? null;
  const driverSourceRows = homeData.indicatorRows
    .filter((item) => homeData.summary.topDrivers.includes(item.slug))
    .flatMap((item) => item.sources)
    .map((source) => ({
      provider: source.provider,
      externalId: source.externalId,
      sourceUrl: source.sourceUrl,
      isPrimary: source.isPrimary,
      licenseNote: source.licenseNote,
    }));

  return (
    <Card className="p-5">
      <SectionHeading title={dictionary.home.dataTitle} subtitle={dictionary.home.useBody} />
      <div className="mt-4">
        <MetricMetadata
          frequency="daily / weekly"
          updatedAt={asOf}
          sources={driverSourceRows.map((source) => ({
            provider: source.provider,
            externalId: source.externalId,
            sourceUrl: source.sourceUrl,
            isPrimary: source.isPrimary,
            licenseNote: source.licenseNote,
          }))}
          dictionary={dictionary}
          locale={locale}
        />
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <HowToNavigateButton href="/how-to-read" label={dictionary.home.howToCta} locale={locale} />
        <HowToNavigateButton href="/data-sources" label={dictionary.home.dataSourcesCta} locale={locale} />
        <HowToNavigateButton href="/indicators" label={dictionary.home.indicatorsCta} locale={locale} />
      </div>
    </Card>
  );
}
