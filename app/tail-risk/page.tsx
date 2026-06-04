import type { Metadata } from "next";
import { Suspense } from "react";

import { ChartGridSkeleton } from "../../components/shared/data-skeletons";
import { DisclaimerText } from "../../components/shared/metric-metadata";
import { PageShell } from "../../components/shared/page-shell";
import { Card, SectionHeading } from "../../components/shared/ui-kit";
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
import type { IndicatorSnapshotWithSources } from "../../lib/db/queries";

const TAIL_RISK_SLUGS = ["vvix", "skew", "vvix-vix-ratio"] as const;

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getCurrentLocale();
  const dictionary = getDictionary(locale);

  return buildPageMetadata({
    title: dictionary.riskLayers.tailRisk.metaTitle,
    description: dictionary.riskLayers.tailRisk.metaDescription,
    locale,
    path: "/tail-risk",
  });
}

export default async function TailRiskPage() {
  const locale = await getCurrentLocale();
  const dictionary = getDictionary(locale);
  const rowsPromise = getLayerRows(TAIL_RISK_SLUGS);
  const chartPromise = getLayerChart(TAIL_RISK_SLUGS);

  return (
    <PageShell
      title={dictionary.riskLayers.tailRisk.title}
      subtitle={dictionary.riskLayers.tailRisk.subtitle}
      dictionary={dictionary}
      locale={locale}
    >
      <RiskLayerNav dictionary={dictionary} locale={locale} activeHref="/tail-risk" />

      <LayerThesis
        title={dictionary.riskLayers.tailRisk.thesisTitle}
        body={dictionary.riskLayers.tailRisk.thesisBody}
      />

      <Suspense fallback={<ChartGridSkeleton />}>
        <TailRiskData
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

async function TailRiskData({
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
        <SectionHeading title={dictionary.riskLayers.tailRisk.metricsTitle} />
        <LayerMetricGrid rows={rows} dictionary={dictionary} locale={locale} />
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
        <LayerChartCard
          title={dictionary.riskLayers.tailRisk.chartTitle}
          subtitle={dictionary.riskLayers.tailRisk.chartSubtitle}
          points={chartPoints}
          rows={rows}
          dictionary={dictionary}
        />
        <div className="space-y-4">
          <LayerGuide
            title={dictionary.riskLayers.tailRisk.howTitle}
            items={dictionary.riskLayers.tailRisk.howItems}
            links={dictionary.riskLayers.tailRisk.nextLinks}
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
