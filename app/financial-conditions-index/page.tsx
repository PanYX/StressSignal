import type { Metadata } from "next";

import { TrackedExternalLink } from "@/components/analytics/tracked-external-link";
import { TrackedLink } from "@/components/analytics/tracked-link";
import { TimeSeriesChart } from "@/components/charts/time-series-chart";
import { PageShell } from "@/components/shared/page-shell";
import { Badge, Card, MetricTile, SectionHeading, StatusPill } from "@/components/shared/ui-kit";
import { formatDateLabel, formatNumber, formatSignedNumber } from "@/components/shared/format";
import { getCurrentLocale, getDictionary, translateStateLabel } from "@/lib/i18n/dictionary";
import { hrefWithLocale } from "@/lib/i18n/locale-url";
import { getIndicatorConfigBySlug, indicatorRowFromConfig } from "@/lib/indicators/view-model";
import { getIndicatorHistory, getIndicatorSnapshotWithSourcesBySlug } from "@/lib/db/queries";
import { buildArticleMetadata, toAbsoluteUrl } from "@/lib/seo/page-metadata";
import { buildArticleSchema, buildBreadcrumbSchema } from "@/lib/seo/structured-data";

const PAGE_PATH = "/financial-conditions-index";
const TITLE = "Financial Conditions Index: NFCI, ANFCI and Financial Stress";
const DESCRIPTION =
  "Read the financial conditions index with NFCI, ANFCI and STLFSI4, including current values, chart history, interpretation, and source links.";

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

type TrackedSlug = "nfci" | "anfci" | "stlfsi4";

const toRow = async (slug: TrackedSlug) => {
  const snapshot = await getIndicatorSnapshotWithSourcesBySlug(slug);
  const config = getIndicatorConfigBySlug(slug);

  return snapshot ?? (config ? indicatorRowFromConfig(config) : null);
};

const latestDate = (...dates: Array<string | null | undefined>) =>
  dates.filter(Boolean).sort().at(-1) ?? null;

const conditionsState = (nfci: number | null) => {
  if (!Number.isFinite(nfci as number)) {
    return {
      label: "Waiting for data",
      tone: "slate" as const,
      body: "The financial-conditions read will appear after the weekly Chicago Fed series syncs.",
    };
  }

  if ((nfci as number) > 0.25) {
    return {
      label: "Tighter than average",
      tone: "rose" as const,
      body: "Positive NFCI values have historically meant tighter-than-average financial conditions. Confirm whether STLFSI4 is rising too before calling it system stress.",
    };
  }

  if ((nfci as number) < -0.25) {
    return {
      label: "Looser than average",
      tone: "emerald" as const,
      body: "Negative NFCI values have historically meant looser-than-average financial conditions. Keep watching for a turn higher, not only the current level.",
    };
  }

  return {
    label: "Near average",
    tone: "amber" as const,
    body: "NFCI is close to its long-run average. The useful signal is whether it starts moving together with STLFSI4 and volatility indicators.",
  };
};

export default async function FinancialConditionsIndexPage() {
  const locale = await getCurrentLocale();
  const dictionary = getDictionary(locale);
  const [nfci, anfci, stlfsi4, nfciHistory, anfciHistory, stlfsiHistory] = await Promise.all([
    toRow("nfci"),
    toRow("anfci"),
    toRow("stlfsi4"),
    getIndicatorHistory("nfci", "5Y"),
    getIndicatorHistory("anfci", "5Y"),
    getIndicatorHistory("stlfsi4", "5Y"),
  ]);
  const state = conditionsState(nfci?.latestValue ?? null);
  const asOf = latestDate(
    nfci?.latestDate,
    anfci?.latestDate,
    stlfsi4?.latestDate,
    nfci?.updatedAt,
    stlfsi4?.updatedAt,
  );
  const historyByDate = new Map<string, { date: string; nfci?: number; anfci?: number; stlfsi4?: number }>();
  for (const point of nfciHistory) {
    historyByDate.set(point.date, { ...(historyByDate.get(point.date) ?? { date: point.date }), nfci: point.value });
  }
  for (const point of anfciHistory) {
    historyByDate.set(point.date, { ...(historyByDate.get(point.date) ?? { date: point.date }), anfci: point.value });
  }
  for (const point of stlfsiHistory) {
    historyByDate.set(point.date, { ...(historyByDate.get(point.date) ?? { date: point.date }), stlfsi4: point.value });
  }
  const chartPoints = [...historyByDate.values()].sort((a, b) => a.date.localeCompare(b.date));
  const structuredData = JSON.stringify([
    buildBreadcrumbSchema([
      { name: "Home", path: "/" },
      { name: "Financial Conditions Index", path: PAGE_PATH },
    ]),
    buildArticleSchema({
      title: TITLE,
      description: DESCRIPTION,
      publishedAt: "2026-06-05",
      updatedAt: "2026-06-05",
      author: "StressSignal editors",
      path: PAGE_PATH,
      tags: ["financial conditions index", "NFCI", "ANFCI", "financial stress index", "STLFSI4"],
      canonicalUrl: toAbsoluteUrl(PAGE_PATH),
      locale,
    }),
  ]);

  return (
    <PageShell
      title="Financial Conditions Index"
      subtitle="Read NFCI, ANFCI and STLFSI4 together to separate ordinary market volatility from broader financial pressure."
      breadcrumbs={[
        { label: dictionary.site.nav.home, href: "/" },
        { label: "Financial Conditions Index" },
      ]}
      dictionary={dictionary}
      locale={locale}
    >
      <script
        id="financial-conditions-index-structured-data"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: structuredData }}
      />

      <section className="grid gap-4 lg:grid-cols-4">
        <MetricTile
          label="NFCI"
          value={formatNumber(nfci?.latestValue, { maximumFractionDigits: 3, minimumFractionDigits: 2 })}
          help={`Updated ${formatDateLabel(nfci?.latestDate ?? asOf, locale, dictionary)}`}
          tone={state.tone}
        />
        <MetricTile
          label="ANFCI"
          value={formatNumber(anfci?.latestValue, { maximumFractionDigits: 3, minimumFractionDigits: 2 })}
          help="Adjusted for macro conditions"
          tone="slate"
        />
        <MetricTile
          label="STLFSI4"
          value={formatNumber(stlfsi4?.latestValue, { maximumFractionDigits: 3, minimumFractionDigits: 2 })}
          help={`1W ${formatSignedNumber(stlfsi4?.change5d, { maximumFractionDigits: 2, minimumFractionDigits: 2 })}`}
          tone="slate"
        />
        <MetricTile
          label="Current read"
          value={<span className="text-2xl">{state.label}</span>}
          help="Positive NFCI usually means tighter conditions."
          tone={state.tone}
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
                  title: "NFCI",
                  body: "A broad Chicago Fed index of U.S. financial conditions across money markets, debt and equity markets, and banking systems.",
                  row: nfci,
                },
                {
                  title: "ANFCI",
                  body: "The adjusted index removes the part of financial conditions explained by economic activity and inflation.",
                  row: anfci,
                },
                {
                  title: "STLFSI4",
                  body: "A St. Louis Fed financial stress index that helps confirm whether pressure is showing up beyond equity volatility.",
                  row: stlfsi4,
                },
              ].map((item) => (
                <article key={item.title} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <h2 className="text-sm font-semibold text-slate-950">{item.title}</h2>
                    <StatusPill
                      label={item.row ? translateStateLabel(item.row.stateLabel, dictionary) : "No data"}
                      percentile={item.row?.pctRank1y}
                    />
                  </div>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{item.body}</p>
                </article>
              ))}
            </div>
          </Card>

          <TimeSeriesChart
            title="Financial conditions and stress history"
            subtitle="Use direction and confirmation across series; weekly indexes are slower but better for system-pressure context."
            points={chartPoints}
            lines={[
              { key: "nfci", label: "NFCI", color: "#0f9f9a" },
              { key: "anfci", label: "ANFCI", color: "#0284c7", dashed: true },
              { key: "stlfsi4", label: "STLFSI4", color: "#e11d48" },
            ]}
            height={340}
          />

          <Card className="p-5">
            <SectionHeading
              eyebrow="How to read it"
              title="Financial conditions are not the same as one-day market fear"
              subtitle="The main SEO mistake in this topic is treating every index as the same thing. This page separates conditions, adjusted conditions, and stress confirmation."
            />
            <div className="mt-5 space-y-4">
              {[
                {
                  label: "Positive vs negative NFCI",
                  body: "The Chicago Fed frames positive NFCI values as tighter-than-average financial conditions and negative values as looser-than-average conditions. The direction of change matters as much as the level.",
                },
                {
                  label: "NFCI vs ANFCI",
                  body: "NFCI describes broad conditions. ANFCI asks whether financial conditions are tighter or looser than the macro backdrop would normally imply.",
                },
                {
                  label: "NFCI vs financial stress",
                  body: "A financial conditions index can tighten before a crisis. A stress index helps confirm whether the tightening is becoming disorderly enough to matter for risk management.",
                },
              ].map((item) => (
                <section key={item.label} className="border-l border-slate-200 pl-4">
                  <h2 className="text-sm font-semibold text-slate-950">{item.label}</h2>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{item.body}</p>
                </section>
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
                <dd className="text-slate-600">financial conditions index</dd>
              </div>
              <div>
                <dt className="font-semibold text-slate-900">Secondary coverage</dt>
                <dd className="text-slate-600">national financial conditions index, NFCI, ANFCI, financial stress index, STLFSI4</dd>
              </div>
              <div>
                <dt className="font-semibold text-slate-900">Intent match</dt>
                <dd className="text-slate-600">Definition, current read, positive/negative interpretation, and cross-index confirmation.</dd>
              </div>
            </dl>
          </Card>

          <Card className="p-5">
            <SectionHeading title="Source trail" />
            <ul className="mt-3 space-y-2 text-sm leading-6">
              <li>
                <TrackedExternalLink
                  className="font-semibold text-emerald-800 underline"
                  href="https://www.chicagofed.org/research/data/nfci/about?trigger=true"
                  eventName="open_reference_link"
                  eventProps={{ source: "financial_conditions_source_trail", target: "chicago_fed_nfci_methodology", locale }}
                >
                  Chicago Fed NFCI methodology
                </TrackedExternalLink>
              </li>
              <li>
                <TrackedExternalLink
                  className="font-semibold text-emerald-800 underline"
                  href="https://www.chicagofed.org/research/data/nfci/current-data?trigger=true"
                  eventName="open_reference_link"
                  eventProps={{ source: "financial_conditions_source_trail", target: "chicago_fed_current_nfci_data", locale }}
                >
                  Chicago Fed current NFCI data
                </TrackedExternalLink>
              </li>
              <li>
                <TrackedExternalLink
                  className="font-semibold text-emerald-800 underline"
                  href="https://www.stlouisfed.org/publications/regional-economist/2023/mar/what-do-financial-conditions-indexes-tell-us"
                  eventName="open_reference_link"
                  eventProps={{ source: "financial_conditions_source_trail", target: "stlouis_fed_conditions_explainer", locale }}
                >
                  St. Louis Fed on financial conditions indexes
                </TrackedExternalLink>
              </li>
            </ul>
          </Card>

          <Card className="p-5">
            <SectionHeading title="Next checks" />
            <div className="mt-3 flex flex-wrap gap-2">
              {[
                { label: "NFCI indicator", href: "/indicators/nfci" },
                { label: "ANFCI indicator", href: "/indicators/anfci" },
                { label: "STLFSI4 indicator", href: "/indicators/stlfsi4" },
                { label: "VIX term structure", href: "/vix-term-structure" },
              ].map((item) => (
                <TrackedLink
                  key={item.href}
                  href={hrefWithLocale(item.href, locale)}
                  className="inline-flex rounded-md border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-800 hover:bg-emerald-100"
                  eventName={item.href.startsWith("/indicators/") ? "select_indicator" : "click_cta"}
                  eventProps={{
                    href: item.href,
                    label: item.label,
                    slug: item.href.startsWith("/indicators/") ? item.href.replace("/indicators/", "") : null,
                    source: "financial_conditions_next_checks",
                    locale,
                  }}
                >
                  {item.label}
                </TrackedLink>
              ))}
            </div>
          </Card>

          <Card className="p-5">
            <SectionHeading title="Editorial stance" />
            <div className="mt-3 space-y-2 text-sm leading-6 text-slate-600">
              <p>
                This page is written for English SEO as a data interpretation asset, not as a trading system.
              </p>
              <p>
                The useful answer is whether financial pressure is broadening, not whether one weekly index moved by a small amount.
              </p>
            </div>
            <Badge tone="slate" className="mt-3">
              Not investment advice
            </Badge>
          </Card>
        </aside>
      </section>
    </PageShell>
  );
}
