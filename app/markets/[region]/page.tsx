import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { TrackedLink } from "../../../components/analytics/tracked-link";
import { DisclaimerText } from "../../../components/shared/metric-metadata";
import { PageShell } from "../../../components/shared/page-shell";
import { Card, MetricTile, SectionHeading } from "../../../components/shared/ui-kit";
import type { IndicatorSnapshotWithSources } from "../../../lib/db/queries";
import {
  getCurrentLocale,
  getDictionary,
} from "../../../lib/i18n/dictionary";
import { hrefWithLocale } from "../../../lib/i18n/locale-url";
import { buildPageMetadata } from "../../../lib/seo/page-metadata";
import {
  LayerChartCard,
  LayerMetricGrid,
  RiskLayerNav,
  LayerSourceNote,
  SourceList,
  getLayerChart,
  getLayerRows,
} from "../../risk-layer-components";

const REGION_CONFIG = {
  europe: { slug: "vstoxx", label: "Europe" },
  india: { slug: "india-vix", label: "India" },
  japan: { slug: "nikkei-225-vi", label: "Japan" },
  "hong-kong": { slug: "vhsi", label: "Hong Kong" },
} as const;

type RegionKey = keyof typeof REGION_CONFIG;

type MarketParams = Promise<{
  region: string;
}>;

export function generateStaticParams() {
  return Object.keys(REGION_CONFIG).map((region) => ({ region }));
}

const normalizeRegion = (value: string): RegionKey | null =>
  value in REGION_CONFIG ? (value as RegionKey) : null;

export async function generateMetadata({
  params,
}: {
  params: MarketParams;
}): Promise<Metadata> {
  const locale = await getCurrentLocale();
  const dictionary = getDictionary(locale);
  const region = normalizeRegion((await params).region);

  if (!region) {
    return buildPageMetadata({
      title: dictionary.riskLayers.globalRisk.metaTitle,
      description: dictionary.riskLayers.globalRisk.metaDescription,
      locale,
      path: "/global-risk",
    });
  }

  const regionCopy = dictionary.riskLayers.market.regions[region];

  return buildPageMetadata({
    title: `${regionCopy.title} ${dictionary.riskLayers.market.metaTitleSuffix}`,
    description: regionCopy.subtitle,
    locale,
    path: `/markets/${region}`,
  });
}

export default async function MarketRegionPage({
  params,
}: {
  params: MarketParams;
}) {
  const region = normalizeRegion((await params).region);
  if (!region) {
    notFound();
  }

  const locale = await getCurrentLocale();
  const dictionary = getDictionary(locale);
  const config = REGION_CONFIG[region];
  const regionCopy = dictionary.riskLayers.market.regions[region];
  const rowsPromise = getLayerRows([config.slug]);
  const chartPromise = getLayerChart([config.slug]);
  const [rows, chartPoints] = await Promise.all([rowsPromise, chartPromise]);
  const row = rows[0] ?? null;

  return (
    <PageShell
      title={regionCopy.title}
      subtitle={regionCopy.subtitle}
      dictionary={dictionary}
      locale={locale}
      breadcrumbs={[
        { label: dictionary.riskLayers.globalRisk.title, href: "/global-risk" },
        { label: regionCopy.title },
      ]}
    >
      <RiskLayerNav dictionary={dictionary} locale={locale} activeHref="/global-risk" />

      <TrackedLink
        href={hrefWithLocale("/global-risk", locale)}
        className="inline-flex w-fit items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-emerald-800 transition hover:border-emerald-300 hover:bg-emerald-50"
        eventName="click_cta"
        eventProps={{
          href: "/global-risk",
          source: "market_region_back",
          region,
          locale,
        }}
      >
        <ArrowLeft aria-hidden className="h-4 w-4" />
        {dictionary.riskLayers.market.back}
      </TrackedLink>

      <section className="grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
        <MetricTile
          label={row?.name ?? config.label}
          value={row?.latestValue === null || row?.latestValue === undefined ? "--" : row.latestValue.toFixed(2)}
          help={dictionary.riskLayers.market.percentileFirst}
          tone={(row?.pctRank1y ?? 0) >= 0.8 ? "rose" : (row?.pctRank1y ?? 0) >= 0.5 ? "amber" : "emerald"}
        />
        <Card className="p-5">
          <SectionHeading
            title={dictionary.riskLayers.market.relatedTitle}
            subtitle={regionCopy.body}
          />
          <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm leading-6 text-amber-900">
            {dictionary.riskLayers.market.sourceReview}
          </p>
        </Card>
      </section>

      <LayerMetricGrid rows={rows} dictionary={dictionary} locale={locale} />

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
        <LayerChartCard
          title={`${row?.name ?? config.label} ${dictionary.riskLayers.market.chartTitleSuffix}`}
          subtitle={dictionary.riskLayers.globalRisk.chartSubtitle}
          points={chartPoints}
          rows={rows}
          dictionary={dictionary}
        />
        <Card className="p-5">
          <SectionHeading title={dictionary.metadata.publicSources} />
          <div className="mt-4">
            <SourceList rows={rows as IndicatorSnapshotWithSources[]} />
          </div>
        </Card>
      </section>

      <LayerSourceNote dictionary={dictionary} />
      <DisclaimerText dictionary={dictionary} />
    </PageShell>
  );
}
