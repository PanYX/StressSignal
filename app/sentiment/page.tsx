import type { Metadata } from "next";
import { Suspense } from "react";

import { ChartGridSkeleton } from "../../components/shared/data-skeletons";
import { DisclaimerText } from "../../components/shared/metric-metadata";
import { PageShell } from "../../components/shared/page-shell";
import { Card, SectionHeading } from "../../components/shared/ui-kit";
import type { IndicatorSnapshotWithSources } from "../../lib/db/queries";
import {
  getCurrentLocale,
  getDictionary,
  type Dictionary,
  type Locale,
} from "../../lib/i18n/dictionary";
import { buildPageMetadata } from "../../lib/seo/page-metadata";
import {
  LayerChartCard,
  LayerGuide,
  LayerMetricGrid,
  RiskLayerNav,
  LayerSourceNote,
  LayerThesis,
  SourceList,
  getLayerChart,
  getLayerRows,
  type ChartPoint,
} from "../risk-layer-components";

const SENTIMENT_SLUGS = [
  "aaii-bullish",
  "aaii-bearish",
  "aaii-neutral",
  "aaii-bull-bear-spread",
  "naaim-exposure",
  "naaim-exposure-ma4",
] as const;

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getCurrentLocale();
  const dictionary = getDictionary(locale);

  return buildPageMetadata({
    title: dictionary.riskLayers.sentiment.metaTitle,
    description: dictionary.riskLayers.sentiment.metaDescription,
    locale,
    path: "/sentiment",
  });
}

export default async function SentimentPage() {
  const locale = await getCurrentLocale();
  const dictionary = getDictionary(locale);
  const rowsPromise = getLayerRows(SENTIMENT_SLUGS);
  const chartPromise = getLayerChart(SENTIMENT_SLUGS);

  return (
    <PageShell
      title={dictionary.riskLayers.sentiment.title}
      subtitle={dictionary.riskLayers.sentiment.subtitle}
      dictionary={dictionary}
      locale={locale}
    >
      <RiskLayerNav dictionary={dictionary} locale={locale} activeHref="/sentiment" />

      <LayerThesis
        title={dictionary.riskLayers.sentiment.thesisTitle}
        body={dictionary.riskLayers.sentiment.thesisBody}
      />

      <Suspense fallback={<ChartGridSkeleton />}>
        <SentimentData
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

async function SentimentData({
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

  return (
    <>
      <section className="space-y-3">
        <SectionHeading title={dictionary.riskLayers.sentiment.metricsTitle} />
        <LayerMetricGrid rows={rows} dictionary={dictionary} locale={locale} />
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
        <LayerChartCard
          title={dictionary.riskLayers.sentiment.chartTitle}
          subtitle={dictionary.riskLayers.sentiment.chartSubtitle}
          points={chartPoints}
          rows={rows}
          dictionary={dictionary}
        />
        <div className="space-y-4">
          <LayerGuide
            title={dictionary.riskLayers.sentiment.howTitle}
            items={dictionary.riskLayers.sentiment.howItems}
            links={dictionary.riskLayers.sentiment.nextLinks}
            locale={locale}
          />
          <Card className="p-5">
            <SectionHeading title={dictionary.metadata.publicSources} />
            <div className="mt-4">
              <SourceList rows={rows} />
            </div>
          </Card>
        </div>
      </section>

      <LayerSourceNote dictionary={dictionary} />
    </>
  );
}
