import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { TimeRangeTabs } from "../../../components/charts/time-range-tabs";
import { TimeSeriesChart } from "../../../components/charts/time-series-chart";
import { IndicatorDefinitionPanel } from "../../../components/indicators/indicator-definition";
import { DetailSkeleton } from "../../../components/shared/data-skeletons";
import { DisclaimerText, MetricMetadata } from "../../../components/shared/metric-metadata";
import { PageShell } from "../../../components/shared/page-shell";
import {
  Card,
  SectionHeading,
  StatusPill,
} from "../../../components/shared/ui-kit";
import {
  formatDateLabel,
  formatFrequencyLabel,
  formatNumber,
  formatSignedNumber,
} from "../../../components/shared/format";
import {
  getCachedIndicatorHistory,
  getCachedIndicatorSnapshotWithSourcesBySlug,
} from "../../../lib/db/cached-queries";
import type {
  HistoryWindow,
  IndicatorSnapshotWithSources,
  ObservationPoint,
} from "../../../lib/db/queries";
import {
  getCurrentLocale,
  getDictionary,
  translateStateLabel,
  type Dictionary,
  type Locale,
} from "../../../lib/i18n/dictionary";
import { hrefWithLocale } from "../../../lib/i18n/locale-url";
import { getIndicatorConfig } from "../../../lib/indicators/configs";
import { buildPageMetadata, toAbsoluteUrl } from "../../../lib/seo/page-metadata";
import { buildBreadcrumbSchema, buildDatasetSchema } from "../../../lib/seo/structured-data";

type Params = {
  slug: string;
};

type SearchParams = {
  range?: string | string[];
};

type ChartPoint = {
  date: string;
  value: number;
};

type IndicatorRange = "3M" | "1Y" | "5Y" | "MAX";

type IndicatorPageProps = {
  params: Promise<Params>;
  searchParams: Promise<SearchParams>;
};

type IndicatorDisplaySource = {
  provider: string;
  externalId: string;
  sourceUrl: string;
  isPrimary: boolean;
  licenseNote: string | null;
};

type IndicatorDisplayData = {
  name: string;
  description: string;
  frequency: string;
  sourcePolicy: string;
  sources: IndicatorDisplaySource[];
};

const safe = async <T,>(task: () => Promise<T>, fallback: T): Promise<T> => {
  try {
    return await task();
  } catch {
    return fallback;
  }
};

const normalizeRange = (input: string | undefined): IndicatorRange => {
  const normalized = (input ?? "1Y").toUpperCase();

  if (normalized === "3M" || normalized === "1Y" || normalized === "5Y" || normalized === "MAX") {
    return normalized;
  }

  return "1Y";
};

const pickPrimarySourceText = (
  input: { sources: IndicatorDisplaySource[] },
  dictionary: Dictionary,
): string => {
  const firstPrimary = input.sources.find((source) => source.isPrimary);
  if (firstPrimary) {
    return firstPrimary.externalId;
  }

  const fallback = input.sources[0];
  if (!fallback) {
    return dictionary.indicatorDetail.unconfiguredSource;
  }

  return fallback.externalId;
};

const getIndicatorLabels = (slug: string, dictionary: Dictionary) => {
  const config = getIndicatorConfig(slug);
  const localized = dictionary.indicatorCopy[slug as keyof typeof dictionary.indicatorCopy];
  return {
    name: config?.name ?? slug.toUpperCase(),
    description: localized?.description ?? config?.description,
    overview: localized?.overview ?? config?.interpretation?.overview,
    readHint: localized?.readHint ?? config?.interpretation?.readHint,
    caveat: localized?.caveat ?? config?.interpretation?.caveat,
  };
};

const getConfiguredIndicatorData = (
  slug: string,
  labels: ReturnType<typeof getIndicatorLabels>,
  dictionary: Dictionary,
): IndicatorDisplayData => {
  const config = getIndicatorConfig(slug);
  if (!config) {
    notFound();
  }

  return {
    name: labels.name,
    description: labels.description ?? config.description ?? dictionary.indicatorDetail.definitionFallback,
    frequency: config.frequency,
    sourcePolicy: config.sourcePolicy,
    sources: config.sources.map((source) => ({
      provider: source.provider,
      externalId: source.externalId,
      sourceUrl: source.sourceUrl,
      isPrimary: source.isPrimary,
      licenseNote: source.licenseNote,
    })),
  };
};

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { slug } = await params;
  const locale = await getCurrentLocale();
  const dictionary = getDictionary(locale);
  const config = getIndicatorConfig(slug);

  if (!config) {
    return buildPageMetadata({
      title: `${slug.toUpperCase()} | ${dictionary.indicatorDetail.metaSuffix}`,
      description: dictionary.indicatorDetail.missingDescription,
      locale,
      path: `/indicators/${slug}`,
    });
  }

  const labels = getIndicatorLabels(slug, dictionary);

  return buildPageMetadata({
    title: `${labels.name} | ${dictionary.indicatorDetail.metaSuffix}`,
    description: labels.description ?? config.description,
    locale,
    path: `/indicators/${slug}`,
  });
}

const labelForChange = (value: number | null): string =>
  formatSignedNumber(value, {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  });

export default async function IndicatorDetailPage({
  params,
  searchParams,
}: IndicatorPageProps) {
  const locale = await getCurrentLocale();
  const dictionary = getDictionary(locale);
  const [{ slug }, rawSearch] = await Promise.all([params, searchParams]);
  const config = getIndicatorConfig(slug);

  if (!config || config.status !== "active") {
    notFound();
  }

  const rawRange = Array.isArray(rawSearch.range)
    ? rawSearch.range[0]
    : rawSearch.range;
  const range = normalizeRange(rawRange);
  const labels = getIndicatorLabels(slug, dictionary);
  const configuredData = getConfiguredIndicatorData(slug, labels, dictionary);
  const canonicalPath = `/indicators/${slug}`;
  const pageTitle = `${configuredData.name} ${dictionary.indicatorDetail.titleSuffix}`;
  const datasetStructuredData = buildDatasetSchema({
    name: `${configuredData.name} (${slug})`,
    description: configuredData.description,
    dateModified: null,
    path: canonicalPath,
  });
  const breadcrumbStructuredData = buildBreadcrumbSchema([
    { name: dictionary.site.title, path: "/" },
    { name: dictionary.site.nav.indicators, path: "/indicators" },
    { name: configuredData.name, path: canonicalPath },
  ]);

  return (
    <>
      <PageShell
        title={pageTitle}
        subtitle={dictionary.indicatorDetail.subtitle}
        breadcrumbs={[
          { label: dictionary.site.nav.home, href: "/" },
          { label: dictionary.site.nav.indicators, href: "/indicators" },
          { label: configuredData.name },
        ]}
        dictionary={dictionary}
        locale={locale}
      >
        <Suspense fallback={<DetailSkeleton />}>
          <IndicatorDynamicContent
            slug={slug}
            range={range}
            configuredData={configuredData}
            labels={labels}
            dictionary={dictionary}
            locale={locale}
          />
        </Suspense>
        <DisclaimerText dictionary={dictionary} />
      </PageShell>
      <script
        id="indicator-detail-structured-data"
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@graph": [
              datasetStructuredData,
              breadcrumbStructuredData,
              {
                "@context": "https://schema.org",
                "@type": "WebPage",
                "@id": toAbsoluteUrl(canonicalPath),
                name: pageTitle,
              },
            ],
          }),
        }}
      />
    </>
  );
}

async function IndicatorDynamicContent({
  slug,
  range,
  configuredData,
  labels,
  dictionary,
  locale,
}: {
  slug: string;
  range: IndicatorRange;
  configuredData: IndicatorDisplayData;
  labels: ReturnType<typeof getIndicatorLabels>;
  dictionary: Dictionary;
  locale: Locale;
}) {
  const [snapshot, history] = await Promise.all([
    safe(() => getCachedIndicatorSnapshotWithSourcesBySlug(slug), null),
    safe(() => getCachedIndicatorHistory(slug, range as HistoryWindow), [] as ObservationPoint[]),
  ]);
  const displayData = toDisplayData(snapshot, configuredData);
  const chartPoints: ChartPoint[] = history.map((point) => ({
    date: point.date,
    value: point.value,
  }));
  const asOf = snapshot?.updatedAt ?? snapshot?.latestDate ?? null;
  const sentenceEnd = dictionary.common.punctuation.period;
  const percentileText = snapshot?.pctRank1y === null || snapshot?.pctRank1y === undefined
    ? "--"
    : `${(snapshot.pctRank1y * 100).toFixed(1)}%`;
  const currentSignalText = snapshot
    ? `${translateStateLabel(snapshot.stateLabel, dictionary)} · ${dictionary.indicatorDetail.percentile} ${percentileText}`
    : `${dictionary.common.noData} · ${dictionary.indicatorDetail.percentile} --`;
  const quickReadItems = [
    {
      title: dictionary.indicatorDetail.quickRead.question,
      body: displayData.description,
    },
    {
      title: dictionary.indicatorDetail.quickRead.currentSignal,
      body: currentSignalText,
    },
    {
      title: dictionary.indicatorDetail.quickRead.nextCheck,
      body: labels.readHint ?? dictionary.indicatorDetail.readHintFallback,
    },
  ];
  const relatedSlugs = [
    "vix",
    "vix-term-proxy",
    "vxn",
    "rvx",
    "vxd",
    "stlfsi4",
    "nfci",
    "anfci",
  ].filter((item) => item !== slug).slice(0, 5);

  return (
    <section className="grid gap-4 xl:grid-cols-[1fr_0.48fr]">
      <div className="space-y-4">
        <Card className="p-5">
          <SectionHeading title={dictionary.indicatorDetail.quickRead.title} />
          <div className="mt-4 grid gap-4 lg:grid-cols-3">
            {quickReadItems.map((item, index) => (
              <article key={item.title} className="border-l border-slate-200 pl-4">
                <div className="mb-3 grid h-9 w-9 place-items-center rounded-full bg-emerald-50 text-lg font-semibold text-emerald-700">
                  {index === 0 ? "?" : index === 1 ? "~" : "→"}
                </div>
                <h3 className="text-sm font-semibold text-slate-900">{item.title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{item.body}</p>
              </article>
            ))}
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <SectionHeading
              title={dictionary.indicatorDetail.history}
              subtitle={`${dictionary.indicatorDetail.currentRange}${dictionary.common.punctuation.colon}${range}${dictionary.common.punctuation.comma}${dictionary.indicatorDetail.primarySource}${dictionary.common.punctuation.colon}${pickPrimarySourceText(displayData, dictionary)}${dictionary.common.punctuation.comma}${dictionary.indicatorDefinition.frequency}${dictionary.common.punctuation.colon}${formatFrequencyLabel(displayData.frequency, dictionary)}${dictionary.common.punctuation.period}`}
            />
            <TimeRangeTabs currentRange={range} basePath={`/indicators/${slug}`} locale={locale} />
          </div>
          <div className="mt-3">
            {chartPoints.length === 0 ? (
              <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                {dictionary.indicatorDetail.noHistory}
              </p>
            ) : (
              <TimeSeriesChart
                title={`${displayData.name} ${range} ${dictionary.indicatorDetail.historySuffix}`}
                subtitle={dictionary.indicatorDetail.chartSubtitle}
                points={chartPoints}
                lines={[{ key: "value", label: displayData.name, color: "#0f9f9a" }]}
                height={310}
                emptyMessage={dictionary.common.noData}
              />
            )}
          </div>
        </Card>

        <IndicatorDefinitionPanel
          slug={slug}
          name={displayData.name}
          description={displayData.description}
          overview={labels.overview ?? dictionary.indicatorDetail.overviewFallback}
          readHint={labels.readHint ?? dictionary.indicatorDetail.readHintFallback}
          caveat={labels.caveat ?? dictionary.indicatorDetail.caveatFallback}
          frequency={displayData.frequency}
          sources={displayData.sources}
          updatedAt={asOf}
          dictionary={dictionary}
          locale={locale}
        />
      </div>

      <aside className="space-y-4">
        <Card className="p-5">
          <SectionHeading title={dictionary.indicatorDetail.snapshot} />
          <div className="mt-4 grid gap-4 md:grid-cols-[0.8fr_1fr] xl:grid-cols-1">
            <div>
              <p className="text-sm font-medium text-slate-700">{displayData.name}</p>
              <p className="numeric mt-2 text-6xl font-semibold tracking-tight text-rose-600">
                {formatNumber(snapshot?.latestValue, {
                  maximumFractionDigits: 3,
                  minimumFractionDigits: 2,
                })}
              </p>
            </div>
            <dl className="divide-y divide-slate-100 text-sm">
              <div className="flex items-center justify-between py-2">
                <dt className="text-slate-500">{dictionary.indicatorDetail.percentile}</dt>
                <dd className="numeric font-semibold text-amber-700">{percentileText}</dd>
              </div>
              <div className="flex items-center justify-between py-2">
                <dt className="text-slate-500">{dictionary.indicatorDetail.state}</dt>
                <dd>
                  <StatusPill
                    label={snapshot ? translateStateLabel(snapshot.stateLabel, dictionary) : dictionary.common.noData}
                    percentile={snapshot?.pctRank1y}
                  />
                </dd>
              </div>
              <div className="flex items-center justify-between py-2">
                <dt className="text-slate-500">{dictionary.indicatorDetail.latestDate}</dt>
                <dd className="numeric text-slate-800">{formatDateLabel(snapshot?.latestDate ?? null, locale, dictionary)}</dd>
              </div>
              <div className="flex items-center justify-between py-2">
                <dt className="text-slate-500">{dictionary.indicatorDefinition.frequency}</dt>
                <dd>{formatFrequencyLabel(displayData.frequency, dictionary)}</dd>
              </div>
              <div className="flex items-center justify-between py-2">
                <dt className="text-slate-500">{dictionary.indicatorDetail.primarySource}</dt>
                <dd>{pickPrimarySourceText(displayData, dictionary)}</dd>
              </div>
            </dl>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2">
            {[
              ["1D", snapshot?.change1d ?? null],
              ["5D", snapshot?.change5d ?? null],
              ["20D", snapshot?.change20d ?? null],
            ].map(([label, value]) => (
              <div key={label as string} className="rounded-md bg-slate-50 p-2 text-center">
                <p className="text-[11px] uppercase tracking-wide text-slate-500">{label}</p>
                <p className="numeric text-sm font-semibold text-rose-600">
                  {labelForChange(value as number | null)}
                </p>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-5">
          <SectionHeading title={dictionary.indicatorDetail.relatedJump} />
          <div className="mt-3 flex flex-wrap gap-2">
            {relatedSlugs.map((relatedSlug) => (
              <Link
                key={relatedSlug}
                href={hrefWithLocale(`/indicators/${relatedSlug}`, locale)}
                className="inline-flex rounded-md border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-800 transition hover:bg-emerald-100"
              >
                {relatedSlug.toUpperCase()}
              </Link>
            ))}
          </div>
        </Card>

        <MetricMetadata
          frequency={displayData.frequency}
          updatedAt={asOf}
          sources={displayData.sources}
          dictionary={dictionary}
          locale={locale}
        />

        <Card className="p-4">
          <h2 className="text-sm font-semibold text-slate-900">{dictionary.indicatorDetail.readingTips}</h2>
          <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm leading-6 text-slate-700">
            {dictionary.indicatorDetail.tips.map((tip) => (
              <li key={tip}>{tip}</li>
            ))}
          </ol>
          <p className="mt-3 text-sm text-slate-600">
            {dictionary.indicatorDetail.methodEntry}
            <Link href={hrefWithLocale("/how-to-read", locale)} className="font-semibold text-emerald-800 underline">
              {dictionary.indicatorDetail.methodLink}
            </Link>
            {sentenceEnd}
          </p>
          <Link
            href={hrefWithLocale("/indicators", locale)}
            className="mt-3 inline-flex rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            {dictionary.indicatorDetail.backToIndicators}
          </Link>
        </Card>
      </aside>
    </section>
  );
}

function toDisplayData(
  snapshot: IndicatorSnapshotWithSources | null,
  configuredData: IndicatorDisplayData,
): IndicatorDisplayData {
  if (!snapshot) {
    return configuredData;
  }

  return {
    name: configuredData.name,
    description: configuredData.description,
    frequency: snapshot.frequency,
    sourcePolicy: snapshot.sourcePolicy,
    sources: snapshot.sources.map((source) => ({
      provider: source.provider,
      externalId: source.externalId,
      sourceUrl: source.sourceUrl,
      isPrimary: source.isPrimary,
      licenseNote: source.licenseNote,
    })),
  };
}
