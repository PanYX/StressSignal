import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { PageShell } from "../../components/shared/page-shell";
import { DisclaimerText } from "../../components/shared/metric-metadata";
import { MetadataSkeleton, TableSkeleton } from "../../components/shared/data-skeletons";
import { Card, MetricTile, SectionHeading } from "../../components/shared/ui-kit";
import {
  formatDateLabel,
  formatFrequencyLabel,
} from "../../components/shared/format";
import { getCachedIndicatorSnapshotsWithSources } from "../../lib/db/cached-queries";
import type { IndicatorSnapshotWithSources } from "../../lib/db/queries";
import {
  getCurrentLocale,
  getDictionary,
  type Dictionary,
  type Locale,
} from "../../lib/i18n/dictionary";
import { hrefWithLocale } from "../../lib/i18n/locale-url";
import { MVP_INDICATOR_CONFIGS } from "../../lib/indicators/configs";
import { buildPageMetadata } from "../../lib/seo/page-metadata";
import { buildDatasetSchema } from "../../lib/seo/structured-data";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getCurrentLocale();
  const dictionary = getDictionary(locale);

  return buildPageMetadata({
    title: dictionary.dataSources.metaTitle,
    description: dictionary.dataSources.metaDescription,
    locale,
    path: "/data-sources",
  });
}

type DataSourceTableRow = {
  rowKey: string;
  indicator: string;
  indicatorName: string;
  sourceName: string;
  sourceUrl: string;
  frequency: string;
  asOf: string | null;
  purpose: string;
};

const safe = async <T,>(task: () => Promise<T>, fallback: T): Promise<T> => {
  try {
    return await task();
  } catch {
    return fallback;
  }
};

const sourcePurpose = ({
  slug,
  externalId,
  indicatorName,
  dictionary,
  locale,
}: {
  slug: string;
  externalId: string;
  indicatorName: string;
  dictionary: Dictionary;
  locale: Locale;
}) => {
  const purposes = dictionary.dataSources.sourcePurposes as Record<string, string>;
  const indicatorCopy = dictionary.indicatorCopy[slug as keyof typeof dictionary.indicatorCopy];
  const fallback = dictionary.dataSources.defaultPurpose.replace("{indicator}", indicatorName);

  return locale === "zh" || locale === "en"
    ? purposes[`${slug}:${externalId}`] ?? purposes[slug] ?? indicatorCopy?.readHint ?? indicatorCopy?.overview ?? fallback
    : indicatorCopy?.readHint ?? indicatorCopy?.overview ?? fallback;
};

const sourceRowKey = ({
  indicator,
  sourceName,
  sourceUrl,
}: {
  indicator: string;
  sourceName: string;
  sourceUrl: string;
}) => [indicator, sourceName, sourceUrl].join("|");

const displaySourceName = (indicatorName: string, externalId: string) =>
  externalId.endsWith("_INTERNAL") || externalId.endsWith("_COMPOSITE")
    ? indicatorName
    : externalId;

const buildFallbackSourceRows = (dictionary: Dictionary, locale: Locale): DataSourceTableRow[] => MVP_INDICATOR_CONFIGS.map((indicator) => {
  const primary = indicator.sources.find((source) => source.isPrimary) ?? indicator.sources[0];
  const sourceName = displaySourceName(indicator.name, primary?.externalId ?? indicator.slug);
  const sourceUrl = primary?.sourceUrl ?? "";

  return {
    rowKey: sourceRowKey({
      indicator: indicator.slug,
      sourceName,
      sourceUrl,
    }),
    indicator: indicator.slug,
    indicatorName: indicator.name,
    sourceName,
    sourceUrl,
    frequency: indicator.frequency,
    asOf: null,
    purpose: sourcePurpose({
      slug: indicator.slug,
      externalId: primary?.externalId ?? indicator.slug,
      indicatorName: indicator.name,
      dictionary,
      locale,
    }),
  };
});

async function getSourceRows(dictionary: Dictionary, locale: Locale): Promise<DataSourceTableRow[]> {
  const rows = await safe(() => getCachedIndicatorSnapshotsWithSources(), [] as IndicatorSnapshotWithSources[]);

  if (rows.length === 0) {
    return buildFallbackSourceRows(dictionary, locale);
  }

  const tableRows: DataSourceTableRow[] = rows.flatMap((indicator) =>
    indicator.sources.map((source) => {
      const rowKey = sourceRowKey({
        indicator: indicator.slug,
        sourceName: displaySourceName(indicator.name, source.externalId),
        sourceUrl: source.sourceUrl,
      });

      return {
        rowKey,
        indicator: indicator.slug,
        indicatorName: indicator.name,
        sourceName: displaySourceName(indicator.name, source.externalId),
        sourceUrl: source.sourceUrl,
        frequency: indicator.frequency,
        asOf: indicator.updatedAt ?? indicator.latestDate,
        purpose: sourcePurpose({
          slug: indicator.slug,
          externalId: source.externalId,
          indicatorName: indicator.name,
          dictionary,
          locale,
        }),
      };
    }),
  );

  return tableRows.sort((left, right) =>
    left.rowKey.localeCompare(right.rowKey),
  );
}

const pipelineStepToneClasses = [
  "border-emerald-200 bg-emerald-50 text-emerald-700",
  "border-cyan-200 bg-cyan-50 text-cyan-700",
  "border-slate-200 bg-white text-slate-700",
  "border-teal-200 bg-teal-50 text-teal-700",
  "border-amber-200 bg-amber-50 text-amber-700",
] as const;

export default async function DataSourcesPage() {
  const locale = await getCurrentLocale();
  const dictionary = getDictionary(locale);
  const tableRowsPromise = getSourceRows(dictionary, locale);
  const structuredData = buildDatasetSchema({
    name: "Market Risk Dashboard Data Sources",
    description:
      "Data series and update-frequency notes for indicators on the risk dashboard.",
    dateModified: null,
    path: "/data-sources",
  });

  return (
    <PageShell
      title={dictionary.dataSources.title}
      subtitle={dictionary.dataSources.subtitle}
      dictionary={dictionary}
      locale={locale}
    >
      <Suspense fallback={<DataSourcesSkeleton />}>
        <DataSourcesDynamicContent
          tableRowsPromise={tableRowsPromise}
          dictionary={dictionary}
          locale={locale}
        />
      </Suspense>

      <section className="grid gap-4 lg:grid-cols-[1fr_0.55fr]">
        <Card className="p-5">
          <SectionHeading title={dictionary.dataSources.pipelineTitle} />
          <ol className="mt-5 overflow-hidden rounded-lg border border-slate-200 bg-[linear-gradient(135deg,rgba(16,185,129,0.08),rgba(255,255,255,0.92)_42%,rgba(8,145,178,0.08))] px-4 py-5 md:grid md:grid-cols-5 md:gap-0">
            {dictionary.dataSources.pipelineSteps.map((step, index) => (
              <li key={step.title} className="relative pb-6 last:pb-0 md:pb-0">
                {index < dictionary.dataSources.pipelineSteps.length - 1 ? (
                  <>
                    <span aria-hidden className="absolute bottom-0 left-5 top-10 w-px bg-slate-200 md:hidden" />
                    <span aria-hidden className="absolute left-[calc(50%+22px)] right-[-50%] top-5 hidden h-px bg-slate-200 md:block" />
                  </>
                ) : null}
                <div className="relative flex gap-3 md:block md:px-3 md:text-center">
                  <span
                    className={`${pipelineStepToneClasses[index % pipelineStepToneClasses.length]} relative z-10 grid h-10 w-10 shrink-0 place-items-center rounded-full border text-sm font-semibold shadow-[0_6px_16px_rgba(15,23,42,0.08)] md:mx-auto`}
                  >
                    {index + 1}
                  </span>
                  <div className="min-w-0 md:mt-4">
                    <p className="text-sm font-semibold leading-5 text-slate-950">{step.title}</p>
                    <p className="mt-1 text-xs leading-5 text-slate-500">
                      {step.body}
                    </p>
                  </div>
                </div>
              </li>
            ))}
          </ol>
          <p className="mt-4 border-l-2 border-emerald-500 pl-3 text-sm leading-6 text-slate-600">
            {dictionary.dataSources.pipelineNote}
          </p>
        </Card>

        <Card className="p-5">
          <SectionHeading title={dictionary.dataSources.freshnessTitle} />
          <div className="mt-4 overflow-hidden rounded-lg border border-slate-200">
            <table className="min-w-full text-sm">
              <tbody>
                {dictionary.dataSources.freshnessRows.map((row, index) => (
                  <tr
                    key={row.label}
                    className={index < dictionary.dataSources.freshnessRows.length - 1 ? "border-b border-slate-100" : undefined}
                  >
                    <td className="px-3 py-3 font-medium text-slate-900">{row.label}</td>
                    <td className="px-3 py-3 text-slate-600">{row.value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </section>

      <DisclaimerText dictionary={dictionary} />
      <script
        id="data-sources-structured-data"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
    </PageShell>
  );
}

function DataSourcesSkeleton() {
  return (
    <>
      <MetadataSkeleton />
      <TableSkeleton rows={8} />
    </>
  );
}

async function DataSourcesDynamicContent({
  tableRowsPromise,
  dictionary,
  locale,
}: {
  tableRowsPromise: Promise<DataSourceTableRow[]>;
  dictionary: Dictionary;
  locale: Locale;
}) {
  const tableRows = await tableRowsPromise;
  const asOf = tableRows.length > 0
    ? tableRows
      .map((row) => row.asOf)
      .filter((value): value is string => Boolean(value))
      .sort()
      .at(-1) ?? null
    : null;
  const uniqueIndicators = new Set(tableRows.map((row) => row.indicator));
  const dailyCount = new Set(tableRows.filter((row) => row.frequency === "daily").map((row) => row.indicator)).size;
  const weeklyCount = new Set(tableRows.filter((row) => row.frequency === "weekly").map((row) => row.indicator)).size;

  return (
    <>
      <section className="grid gap-4 md:grid-cols-4">
        <MetricTile
          label={dictionary.dataSources.metrics.publicSources.label}
          value={uniqueIndicators.size}
          help={dictionary.dataSources.metrics.publicSources.help}
          tone="emerald"
        />
        <MetricTile
          label={dictionary.dataSources.metrics.dailySeries.label}
          value={dailyCount}
          help={dictionary.dataSources.metrics.dailySeries.help}
          tone="cyan"
        />
        <MetricTile
          label={dictionary.dataSources.metrics.weeklySeries.label}
          value={weeklyCount}
          help={dictionary.dataSources.metrics.weeklySeries.help}
          tone="emerald"
        />
        <MetricTile
          label={dictionary.dataSources.metrics.latestSync.label}
          value={<span className="text-2xl">{formatDateLabel(asOf, locale, dictionary)}</span>}
          help={dictionary.dataSources.metrics.latestSync.help}
          tone="slate"
        />
      </section>

      <section className="grid gap-4 xl:grid-cols-[1fr_0.42fr]">
        <Card className="overflow-hidden">
          <div className="p-5">
            <SectionHeading title={dictionary.dataSources.sourceTableTitle} subtitle={dictionary.dataSources.trustIntro.body} />
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-3 py-3">{dictionary.dataSources.table.indicator}</th>
                  <th className="px-3 py-3">{dictionary.dataSources.table.sourceCode}</th>
                  <th className="px-3 py-3">{dictionary.dataSources.table.frequency}</th>
                  <th className="px-3 py-3">{dictionary.dataSources.table.updated}</th>
                  <th className="px-3 py-3">{dictionary.dataSources.table.notes}</th>
                </tr>
              </thead>
              <tbody>
                {tableRows.map((row) => (
                  <tr key={row.rowKey} className="border-t border-slate-100 hover:bg-slate-50/60">
                    <td className="px-3 py-3">
                      <Link href={hrefWithLocale(`/indicators/${row.indicator}`, locale)} className="font-semibold text-slate-900 hover:text-emerald-800">
                        {row.indicatorName}
                      </Link>
                    </td>
                    <td className="px-3 py-3">
                      {row.sourceUrl ? (
                        <a
                          href={row.sourceUrl}
                          className="font-medium text-emerald-700 underline-offset-2 hover:underline"
                          target="_blank"
                          rel="noreferrer"
                        >
                          {row.sourceName}
                        </a>
                      ) : (
                        row.sourceName
                      )}
                    </td>
                    <td className="px-3 py-3">{formatFrequencyLabel(row.frequency, dictionary)}</td>
                    <td className="numeric px-3 py-3">{formatDateLabel(row.asOf, locale, dictionary)}</td>
                    <td className="max-w-xs px-3 py-3 text-xs leading-5 text-slate-600">{row.purpose}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="border-t border-slate-100 px-5 py-3 text-xs text-slate-500">
            {dictionary.dataSources.sourceTableNote}
          </p>
        </Card>

        <aside className="space-y-4">
          <Card className="p-5">
            <SectionHeading title={dictionary.dataSources.verifyTitle} />
            <ul className="mt-4 space-y-3 text-sm text-slate-700">
              {dictionary.dataSources.verifyItems.map((item) => (
                <li key={item} className="flex gap-3">
                  <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-emerald-50 text-xs font-semibold text-emerald-700">✓</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </Card>

          <Card className="p-5">
            <SectionHeading title={dictionary.dataSources.displayPolicyTitle} />
            <ul className="mt-4 space-y-3 text-sm text-slate-700">
              {dictionary.dataSources.displayPolicyItems.map((item) => (
                <li key={item} className="flex items-center gap-2">
                  <span className="grid h-5 w-5 place-items-center rounded-full bg-emerald-50 text-xs text-emerald-700">✓</span>
                  {item}
                </li>
              ))}
            </ul>
          </Card>
        </aside>
      </section>
    </>
  );
}
