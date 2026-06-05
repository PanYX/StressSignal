import type { Metadata } from "next";
import { Suspense } from "react";
import { ArrowRight } from "lucide-react";

import { TrackedLink } from "../../components/analytics/tracked-link";
import { ChartGridSkeleton } from "../../components/shared/data-skeletons";
import { formatNumber, formatSignedNumber } from "../../components/shared/format";
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
import { hrefWithLocale } from "../../lib/i18n/locale-url";
import { buildPageMetadata } from "../../lib/seo/page-metadata";
import {
  LayerChartCard,
  LayerGuide,
  RiskLayerNav,
  LayerSourceNote,
  LayerThesis,
  getLayerChart,
  getLayerRows,
  toneForPercentile,
  type ChartPoint,
} from "../risk-layer-components";

const GLOBAL_REGION_SLUGS = [
  "vstoxx",
  "india-vix",
  "nikkei-225-vi",
  "vhsi",
] as const;
const GLOBAL_SLUGS = [...GLOBAL_REGION_SLUGS, "global-vol-composite"] as const;

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getCurrentLocale();
  const dictionary = getDictionary(locale);

  return buildPageMetadata({
    title: dictionary.riskLayers.globalRisk.metaTitle,
    description: dictionary.riskLayers.globalRisk.metaDescription,
    locale,
    path: "/global-risk",
  });
}

export default async function GlobalRiskPage() {
  const locale = await getCurrentLocale();
  const dictionary = getDictionary(locale);
  const rowsPromise = getLayerRows(GLOBAL_SLUGS);
  const chartPromise = getLayerChart(GLOBAL_REGION_SLUGS);

  return (
    <PageShell
      title={dictionary.riskLayers.globalRisk.title}
      subtitle={dictionary.riskLayers.globalRisk.subtitle}
      dictionary={dictionary}
      locale={locale}
    >
      <RiskLayerNav dictionary={dictionary} locale={locale} activeHref="/global-risk" />

      <LayerThesis
        title={dictionary.riskLayers.globalRisk.thesisTitle}
        body={dictionary.riskLayers.globalRisk.thesisBody}
      />

      <Suspense fallback={<ChartGridSkeleton />}>
        <GlobalRiskData
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

const computeGlobalScore = (rows: readonly IndicatorSnapshotWithSources[]) => {
  const saved = rows.find((row) => row.slug === "global-vol-composite")?.latestValue;
  if (saved !== null && saved !== undefined) {
    return saved;
  }

  const values = rows
    .filter((row) => GLOBAL_REGION_SLUGS.includes(row.slug as (typeof GLOBAL_REGION_SLUGS)[number]))
    .map((row) => row.pctRank1y)
    .filter((value): value is number => Number.isFinite(value));

  if (values.length < 2) {
    return null;
  }

  return (values.reduce((sum, value) => sum + value, 0) / values.length) * 100;
};

async function GlobalRiskData({
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
  const regionRows = rows.filter((row) =>
    GLOBAL_REGION_SLUGS.includes(row.slug as (typeof GLOBAL_REGION_SLUGS)[number]),
  );
  const score = computeGlobalScore(rows);
  const leader = regionRows
    .filter((row) => row.change20d !== null || row.pctRank1y !== null)
    .sort(
      (left, right) =>
        (right.change20d ?? -Infinity) - (left.change20d ?? -Infinity) ||
        (right.pctRank1y ?? -1) - (left.pctRank1y ?? -1),
    )[0];

  return (
    <>
      <section className="grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
        <MetricTile
          label="Global Vol Composite"
          value={score === null ? "--" : formatNumber(score, { maximumFractionDigits: 1 })}
          help={dictionary.riskLayers.globalRisk.subtitle}
          tone={score === null ? "slate" : score >= 70 ? "rose" : score >= 50 ? "amber" : "emerald"}
        />
        <Card className="p-5">
          <SectionHeading
            title={dictionary.riskLayers.globalRisk.leaderTitle}
            subtitle={
              leader
                ? `${leader.name}: ${dictionary.riskLayers.common.change20d} ${formatSignedNumber(leader.change20d, { maximumFractionDigits: 2 })}`
                : dictionary.riskLayers.globalRisk.noLeader
            }
          />
          <div className="mt-4 grid gap-3 md:grid-cols-4">
            {dictionary.riskLayers.globalRisk.regions.map((region) => {
              const row = regionRows.find((item) => item.slug === region.slug);
              const tone = toneForPercentile(row?.pctRank1y);

              return (
                <TrackedLink
                  key={region.slug}
                  href={hrefWithLocale(region.href, locale)}
                  className="rounded-lg border border-slate-200 bg-slate-50/70 p-3 transition hover:border-emerald-200 hover:bg-emerald-50/70"
                  eventName="select_market_region"
                  eventProps={{
                    region_slug: region.slug,
                    href: region.href,
                    source: "global_risk_region_card",
                    locale,
                  }}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-semibold text-slate-950">{region.name}</p>
                    <ArrowRight aria-hidden className="h-4 w-4 text-slate-400" />
                  </div>
                  <p className="numeric mt-2 text-2xl font-semibold text-slate-950">
                    {formatNumber(row?.latestValue)}
                  </p>
                  <div className="mt-3">
                    <PercentBar
                      value={row?.pctRank1y}
                      tone={tone}
                      label={row?.pctRank1y === null || row?.pctRank1y === undefined ? "--" : `${Math.round(row.pctRank1y * 100)}%`}
                    />
                  </div>
                </TrackedLink>
              );
            })}
          </div>
        </Card>
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
        <LayerChartCard
          title={dictionary.riskLayers.globalRisk.chartTitle}
          subtitle={dictionary.riskLayers.globalRisk.chartSubtitle}
          points={chartPoints}
          rows={regionRows}
          dictionary={dictionary}
        />
        <LayerGuide
          title={dictionary.riskLayers.globalRisk.heatmapTitle}
          items={regionRows.map((row) => ({
            title: row.name,
            body:
              row.latestValue === null
                ? dictionary.riskLayers.common.dataPending
                : `${dictionary.riskLayers.common.percentile}: ${row.pctRank1y === null ? "--" : `${Math.round(row.pctRank1y * 100)}%`} / ${dictionary.riskLayers.common.change20d}: ${formatSignedNumber(row.change20d, { maximumFractionDigits: 2 })}`,
          }))}
          links={dictionary.riskLayers.globalRisk.nextLinks}
          locale={locale}
        />
      </section>

      <LayerSourceNote dictionary={dictionary} />
    </>
  );
}
