import type { Metadata } from "next";

import { TrackedExternalLink } from "@/components/analytics/tracked-external-link";
import { TrackedLink } from "@/components/analytics/tracked-link";
import { TimeSeriesChart } from "@/components/charts/time-series-chart";
import { PageShell } from "@/components/shared/page-shell";
import { Badge, Card, MetricTile, SectionHeading, StatusPill } from "@/components/shared/ui-kit";
import { formatDateLabel, formatNumber, formatSignedNumber } from "@/components/shared/format";
import { getCurrentLocale, getDictionary, translateStateLabel } from "@/lib/i18n/dictionary";
import { hrefWithLocale } from "@/lib/i18n/locale-url";
import { getLanguageOption } from "@/lib/i18n/locales";
import { getIndicatorConfigBySlug, indicatorRowFromConfig } from "@/lib/indicators/view-model";
import { getIndicatorHistory, getIndicatorSnapshotWithSourcesBySlug } from "@/lib/db/queries";
import { buildArticleMetadata, toAbsoluteUrl } from "@/lib/seo/page-metadata";
import { buildArticleSchema, buildBreadcrumbSchema } from "@/lib/seo/structured-data";

const PAGE_PATH = "/vix-term-structure";
const TITLE = "VIX Term Structure Today: Contango, Backwardation and VIX/VIX3M";
const DESCRIPTION =
  "Read the VIX term structure today with a VIX/VIX3M proxy, current contango or backwardation context, chart history, data sources, and common misreads.";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getCurrentLocale();
  return buildArticleMetadata({
    title: TITLE,
    description: DESCRIPTION,
    path: PAGE_PATH,
    publishedAt: "2026-06-05",
    updatedAt: "2026-06-05",
    authors: ["StressSignal editors"],
    locale,
  });
}

const toRow = async (slug: "vix" | "vix-term-proxy") => {
  const snapshot = await getIndicatorSnapshotWithSourcesBySlug(slug);
  const config = getIndicatorConfigBySlug(slug);

  return snapshot ?? (config ? indicatorRowFromConfig(config) : null);
};

const latestDate = (...dates: Array<string | null | undefined>) =>
  dates.filter(Boolean).sort().at(-1) ?? null;

const termState = (ratio: number | null) => {
  if (!Number.isFinite(ratio as number)) {
    return {
      label: "Waiting for data",
      tone: "slate" as const,
      body: "The term-structure proxy will appear after VIX and VIX3M/VXV samples sync.",
    };
  }

  if ((ratio as number) >= 1) {
    return {
      label: "Backwardation proxy",
      tone: "rose" as const,
      body: "Short-term volatility is priced above the 3-month view. Treat this as a near-term stress signal and cross-check whether broader financial stress is also rising.",
    };
  }

  if ((ratio as number) >= 0.95) {
    return {
      label: "Near flat",
      tone: "amber" as const,
      body: "The curve is not clearly inverted, but the short end is close enough to the medium-term view that event risk deserves attention.",
    };
  }

  return {
    label: "Contango proxy",
    tone: "emerald" as const,
    body: "Short-term volatility is below the 3-month view. This is the calmer default state, but it should still be checked against the VIX level and equity-volatility breadth.",
  };
};

export default async function VixTermStructurePage() {
  const locale = await getCurrentLocale();
  const dictionary = getDictionary(locale);
  const language = getLanguageOption(locale);
  const [vix, termProxy, vixHistory, termHistory] = await Promise.all([
    toRow("vix"),
    toRow("vix-term-proxy"),
    getIndicatorHistory("vix", "1Y"),
    getIndicatorHistory("vix-term-proxy", "1Y"),
  ]);
  const state = termState(termProxy?.latestValue ?? null);
  const asOf = latestDate(termProxy?.latestDate, vix?.latestDate, termProxy?.updatedAt, vix?.updatedAt);
  const structuredData = JSON.stringify([
    buildBreadcrumbSchema([
      { name: "Home", path: "/" },
      { name: "VIX Term Structure", path: PAGE_PATH },
    ]),
    buildArticleSchema({
      title: TITLE,
      description: DESCRIPTION,
      publishedAt: "2026-06-05",
      updatedAt: "2026-06-05",
      author: "StressSignal editors",
      path: PAGE_PATH,
      tags: ["VIX term structure", "volatility term structure", "contango", "backwardation", "VIX3M"],
      canonicalUrl: toAbsoluteUrl(PAGE_PATH),
      locale,
    }),
  ]);

  return (
    <PageShell
      title="VIX Term Structure Today"
      subtitle="Use the VIX/VIX3M proxy to see whether near-term volatility is priced above medium-term volatility, then cross-check the signal before treating it as market stress."
      breadcrumbs={[
        { label: dictionary.site.nav.home, href: "/" },
        { label: "VIX Term Structure" },
      ]}
      dictionary={dictionary}
      locale={locale}
    >
      <script
        id="vix-term-structure-structured-data"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: structuredData }}
      />

      <section className="grid gap-4 lg:grid-cols-4">
        <MetricTile
          label="VIX/VIX3M proxy"
          value={formatNumber(termProxy?.latestValue, {
            maximumFractionDigits: 3,
            minimumFractionDigits: 2,
          })}
          help={`Updated ${formatDateLabel(asOf, locale, dictionary)}`}
          tone={state.tone}
        />
        <MetricTile
          label="Term state"
          value={<span className="text-2xl">{state.label}</span>}
          help="Above 1.00 points to short-end inversion."
          tone={state.tone}
        />
        <MetricTile
          label="Spot VIX"
          value={formatNumber(vix?.latestValue, {
            maximumFractionDigits: 2,
            minimumFractionDigits: 2,
          })}
          help={`1D ${formatSignedNumber(vix?.change1d, {
            maximumFractionDigits: 2,
            minimumFractionDigits: 2,
          })}`}
          tone="slate"
        />
        <MetricTile
          label="Risk state"
          value={
            <StatusPill
              label={termProxy ? translateStateLabel(termProxy.stateLabel, dictionary) : "No data"}
              percentile={termProxy?.pctRank1y}
            />
          }
          help="Percentile is based on the available 1Y sample."
          tone="neutral"
        />
      </section>

      <section className="grid gap-4 xl:grid-cols-[1fr_0.46fr]">
        <div className="space-y-4">
          <Card className="p-5">
            <SectionHeading
              eyebrow="Current read"
              title={state.label}
              subtitle={state.body}
            />
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              {[
                {
                  title: "What searchers usually want",
                  body: "They want to know whether the VIX curve is in contango or backwardation today, not just a textbook definition.",
                },
                {
                  title: "What StressSignal adds",
                  body: "This page turns the curve into a risk-reading workflow: term proxy first, VIX level second, financial stress confirmation last.",
                },
                {
                  title: "What not to infer",
                  body: "Backwardation does not automatically predict the next market direction. It says near-term volatility is expensive relative to the medium-term view.",
                },
              ].map((item) => (
                <article key={item.title} className="border-l border-slate-200 pl-4">
                  <h2 className="text-sm font-semibold text-slate-950">{item.title}</h2>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{item.body}</p>
                </article>
              ))}
            </div>
          </Card>

          <div className="grid gap-4 lg:grid-cols-2">
            <TimeSeriesChart
              title="VIX/VIX3M proxy history"
              subtitle="A value near or above 1.00 means short-term volatility is close to or above the 3-month view."
              points={termHistory.map((point) => ({ date: point.date, value: point.value }))}
              lines={[{ key: "value", label: "VIX/VIX3M proxy", color: "#0f9f9a" }]}
              height={300}
            />
            <TimeSeriesChart
              title="Spot VIX history"
              subtitle="Use the VIX level as context, not as the only stress signal."
              points={vixHistory.map((point) => ({ date: point.date, value: point.value }))}
              lines={[{ key: "value", label: "VIX", color: "#e11d48" }]}
              height={300}
            />
          </div>

          <Card className="p-5">
            <SectionHeading
              eyebrow="How to read it"
              title="Contango, backwardation and the volatility term structure"
              subtitle="The clean reading sequence is curve shape first, magnitude second, confirmation third."
            />
            <div className="mt-5 grid gap-4 md:grid-cols-3">
              {[
                {
                  label: "Contango",
                  tone: "emerald" as const,
                  body: "The short end is below longer volatility. This is the more normal state and often means the market is not paying up for immediate protection.",
                },
                {
                  label: "Near flat",
                  tone: "amber" as const,
                  body: "The curve has lost its cushion. This can happen before events, policy risk, earnings concentration, or fast index repricing.",
                },
                {
                  label: "Backwardation",
                  tone: "rose" as const,
                  body: "Short-term volatility is above the medium-term view. That is a stress flag, but it still needs confirmation from breadth and financial conditions.",
                },
              ].map((item) => (
                <div key={item.label} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                  <Badge tone={item.tone}>{item.label}</Badge>
                  <p className="mt-3 text-sm leading-6 text-slate-700">{item.body}</p>
                </div>
              ))}
            </div>
          </Card>
        </div>

        <aside className="space-y-4">
          <Card className="p-5">
            <SectionHeading title="Page brief" />
            <dl className="mt-3 space-y-3 text-sm">
              <div>
                <dt className="font-semibold text-slate-900">Primary keyword</dt>
                <dd className="text-slate-600">vix term structure</dd>
              </div>
              <div>
                <dt className="font-semibold text-slate-900">Secondary coverage</dt>
                <dd className="text-slate-600">vix futures term structure today, volatility term structure, contango, backwardation</dd>
              </div>
              <div>
                <dt className="font-semibold text-slate-900">Intent match</dt>
                <dd className="text-slate-600">Current data, curve interpretation, and practical risk-reading guidance.</dd>
              </div>
            </dl>
          </Card>

          <Card className="p-5">
            <SectionHeading title="Source trail" />
            <ul className="mt-3 space-y-2 text-sm leading-6">
              <li>
                <TrackedExternalLink
                  className="font-semibold text-emerald-800 underline"
                  href="https://www.cboe.com/tradable-products/vix/term-structure"
                  eventName="open_reference_link"
                  eventProps={{ source: "vix_term_structure_source_trail", target: "cboe_vix_term_structure", locale }}
                >
                  Cboe VIX term structure
                </TrackedExternalLink>
              </li>
              <li>
                <TrackedExternalLink
                  className="font-semibold text-emerald-800 underline"
                  href="https://www.cboe.com/tradable-products/vix/"
                  eventName="open_reference_link"
                  eventProps={{ source: "vix_term_structure_source_trail", target: "cboe_vix_overview", locale }}
                >
                  Cboe VIX overview
                </TrackedExternalLink>
              </li>
              <li>
                <TrackedExternalLink
                  className="font-semibold text-emerald-800 underline"
                  href="https://www.cboe.com/tradable_products/vix/vix_historical_data"
                  eventName="open_reference_link"
                  eventProps={{ source: "vix_term_structure_source_trail", target: "cboe_vix_history", locale }}
                >
                  Cboe VIX historical data
                </TrackedExternalLink>
              </li>
            </ul>
            <p className="mt-3 text-xs leading-5 text-slate-500">
              StressSignal uses public VIX and VIX3M/VXV series as an explainable proxy. It is not a full VIX futures quote board.
            </p>
          </Card>

          <Card className="p-5">
            <SectionHeading title="Next checks" />
            <div className="mt-3 flex flex-wrap gap-2">
              {[
                { label: "VIX indicator", href: "/indicators/vix" },
                { label: "VIX/VIX3M proxy", href: "/indicators/vix-term-proxy" },
                { label: "Financial conditions", href: "/financial-conditions-index" },
                { label: "How to read", href: "/how-to-read" },
              ].map((item) => (
                <TrackedLink
                  key={item.href}
                  href={hrefWithLocale(item.href, locale)}
                  hrefLang={language.htmlLang}
                  className="inline-flex rounded-md border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-800 hover:bg-emerald-100"
                  eventName={item.href.startsWith("/indicators/") ? "select_indicator" : "click_cta"}
                  eventProps={{
                    href: item.href,
                    label: item.label,
                    slug: item.href.startsWith("/indicators/") ? item.href.replace("/indicators/", "") : null,
                    source: "vix_term_structure_next_checks",
                    locale,
                  }}
                >
                  {item.label}
                </TrackedLink>
              ))}
            </div>
          </Card>
        </aside>
      </section>
    </PageShell>
  );
}
