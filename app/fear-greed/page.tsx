import type { Metadata } from "next";
import { Suspense } from "react";

import { ChartGridSkeleton } from "../../components/shared/data-skeletons";
import { formatNumber } from "../../components/shared/format";
import { DisclaimerText } from "../../components/shared/metric-metadata";
import { PageShell } from "../../components/shared/page-shell";
import { Card, MetricTile, PercentBar, SectionHeading } from "../../components/shared/ui-kit";
import type { IndicatorSnapshotWithSources } from "../../lib/db/queries";
import {
  getCurrentLocale,
  getDictionary,
  type Dictionary,
  type Locale,
} from "../../lib/i18n/dictionary";
import { computeFearGreedScore } from "../../lib/indicators/compute";
import { buildPageMetadata } from "../../lib/seo/page-metadata";
import {
  LayerChartCard,
  LayerGuide,
  LayerMetricGrid,
  RiskLayerNav,
  LayerSourceNote,
  LayerThesis,
  getLayerChart,
  getLayerRows,
  toneForPercentile,
  type ChartPoint,
} from "../risk-layer-components";

const FEAR_GREED_SLUGS = [
  "fear-greed-internal",
  "vix",
  "put-call-ratio",
  "hy-oas",
  "vix-term-proxy",
  "momentum-proxy",
] as const;

const FACTOR_SLUGS = [
  "vix",
  "put-call-ratio",
  "hy-oas",
  "vix-term-proxy",
  "momentum-proxy",
] as const;

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getCurrentLocale();
  const dictionary = getDictionary(locale);

  return buildPageMetadata({
    title: dictionary.riskLayers.fearGreed.metaTitle,
    description: dictionary.riskLayers.fearGreed.metaDescription,
    locale,
    path: "/fear-greed",
  });
}

export default async function FearGreedPage() {
  const locale = await getCurrentLocale();
  const dictionary = getDictionary(locale);
  const rowsPromise = getLayerRows(FEAR_GREED_SLUGS);
  const chartPromise = getLayerChart(FACTOR_SLUGS);

  return (
    <PageShell
      title={dictionary.riskLayers.fearGreed.title}
      subtitle={dictionary.riskLayers.fearGreed.subtitle}
      dictionary={dictionary}
      locale={locale}
    >
      <RiskLayerNav dictionary={dictionary} locale={locale} activeHref="/fear-greed" />

      <LayerThesis
        title={dictionary.riskLayers.fearGreed.thesisTitle}
        body={dictionary.riskLayers.fearGreed.thesisBody}
      />

      <Suspense fallback={<ChartGridSkeleton />}>
        <FearGreedData
          rowsPromise={rowsPromise}
          chartPromise={chartPromise}
          dictionary={dictionary}
          locale={locale}
        />
      </Suspense>

      <DisclaimerText dictionary={dictionary} />
    </PageShell>
  );
}

const rowBySlug = (rows: readonly IndicatorSnapshotWithSources[]) =>
  new Map(rows.map((row) => [row.slug, row]));

const computeCurrentFearGreedScore = (
  rows: readonly IndicatorSnapshotWithSources[],
): number | null => {
  const rowsBySlug = rowBySlug(rows);
  const savedComposite = rowsBySlug.get("fear-greed-internal")?.latestValue;
  if (savedComposite !== null && savedComposite !== undefined) {
    return savedComposite;
  }

  return computeFearGreedScore({
    vixPctRank: rowsBySlug.get("vix")?.pctRank1y ?? null,
    putCallPctRank: rowsBySlug.get("put-call-ratio")?.pctRank1y ?? null,
    hyOasPctRank: rowsBySlug.get("hy-oas")?.pctRank1y ?? null,
    breadthPctRank: rowsBySlug.get("vix-term-proxy")?.pctRank1y ?? null,
    momentumPctRank: rowsBySlug.get("momentum-proxy")?.pctRank1y ?? null,
  });
};

async function FearGreedData({
  rowsPromise,
  chartPromise,
  dictionary,
  locale,
}: {
  rowsPromise: Promise<IndicatorSnapshotWithSources[]>;
  chartPromise: Promise<ChartPoint[]>;
  dictionary: Dictionary;
  locale: Locale;
}) {
  const [rows, chartPoints] = await Promise.all([rowsPromise, chartPromise]);
  const rowsBySlug = rowBySlug(rows);
  const factorRows = FACTOR_SLUGS
    .map((slug) => rowsBySlug.get(slug))
    .filter((row): row is IndicatorSnapshotWithSources => Boolean(row));
  const score = computeCurrentFearGreedScore(rows);

  return (
    <>
      <section className="grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
        <MetricTile
          label={dictionary.riskLayers.fearGreed.scoreTitle}
          value={score === null ? "--" : formatNumber(score, { maximumFractionDigits: 1 })}
          help={score === null ? dictionary.riskLayers.fearGreed.scorePending : dictionary.riskLayers.fearGreed.scoreScale}
          tone={score === null ? "slate" : score >= 70 ? "amber" : score <= 30 ? "rose" : "emerald"}
        />
        <Card className="p-5">
          <SectionHeading title={dictionary.riskLayers.fearGreed.factorTitle} />
          <div className="mt-4 grid gap-3 md:grid-cols-5">
            {dictionary.riskLayers.fearGreed.factors.map((factor) => {
              const row = rowsBySlug.get(factor.slug);
              const tone = toneForPercentile(row?.pctRank1y);

              return (
                <div key={factor.slug} className="rounded-lg border border-slate-200 bg-slate-50/70 p-3">
                  <p className="text-sm font-semibold text-slate-950">{factor.label}</p>
                  <p className="mt-1 min-h-10 text-xs leading-5 text-slate-500">{factor.stance}</p>
                  <div className="mt-3">
                    <PercentBar
                      value={row?.pctRank1y}
                      tone={tone}
                      label={row?.pctRank1y === null || row?.pctRank1y === undefined ? "--" : `${Math.round(row.pctRank1y * 100)}%`}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </section>

      <section className="space-y-3">
        <SectionHeading title={dictionary.riskLayers.fearGreed.factorTitle} />
        <LayerMetricGrid rows={factorRows} dictionary={dictionary} locale={locale} />
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
        <LayerChartCard
          title={dictionary.riskLayers.fearGreed.chartTitle}
          subtitle={dictionary.riskLayers.fearGreed.chartSubtitle}
          points={chartPoints}
          rows={factorRows}
          dictionary={dictionary}
        />
        <LayerGuide
          title={dictionary.riskLayers.fearGreed.thesisTitle}
          items={dictionary.riskLayers.fearGreed.factors.map((factor) => ({
            title: factor.label,
            body: factor.stance,
          }))}
          links={dictionary.riskLayers.fearGreed.nextLinks}
          locale={locale}
        />
      </section>

      <LayerSourceNote dictionary={dictionary} />
    </>
  );
}
