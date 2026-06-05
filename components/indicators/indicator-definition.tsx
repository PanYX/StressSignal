import { TrackedExternalLink } from "@/components/analytics/tracked-external-link";
import { TrackedLink } from "@/components/analytics/tracked-link";
import type { Dictionary, Locale } from "@/lib/i18n/dictionary";
import { hrefWithLocale } from "@/lib/i18n/locale-url";

import {
  formatDateLabel,
  formatFrequencyLabel,
} from "../shared/format";

type SourceConfig = {
  provider: string;
  externalId: string;
  sourceUrl: string;
  isPrimary: boolean;
  licenseNote: string | null;
};

type IndicatorDefinitionProps = {
  slug: string;
  name: string;
  description: string;
  overview: string;
  readHint: string;
  caveat: string;
  frequency: string;
  sources: SourceConfig[];
  updatedAt: string | null;
  dictionary: Dictionary;
  locale: Locale;
};

const RelatedMap: Record<string, string[]> = {
  vix: ["vix-term-proxy", "vxn", "rvx", "vxd", "stlfsi4"],
  "vix-term-proxy": ["vix", "vxn", "rvx", "stlfsi4", "nfci"],
  vxn: ["vix", "rvx", "vxd", "stlfsi4"],
  rvx: ["vix", "vxn", "vxd", "stlfsi4"],
  vxd: ["vix", "vxn", "rvx", "nfci"],
  stlfsi4: ["nfci", "anfci", "vix"],
  nfci: ["stlfsi4", "anfci", "vix"],
  anfci: ["nfci", "stlfsi4", "vix"],
};

const ArticleMap: Record<string, string[]> = {
  vix: ["what-is-vix", "why-not-just-vix", "vix-vs-vix3m"],
  "vix-term-proxy": ["vix-vs-vix3m", "why-not-just-vix"],
  vxn: ["vix-vxn-rvx-differences", "stlfsi-vs-nfci"],
  rvx: ["vix-vxn-rvx-differences", "stlfsi-vs-nfci"],
  vxd: ["vix-vxn-rvx-differences", "stlfsi-vs-nfci"],
  stlfsi4: ["stlfsi-vs-nfci", "how-to-read-market-risk-dashboard"],
  nfci: ["stlfsi-vs-nfci", "how-to-read-market-risk-dashboard"],
  anfci: ["stlfsi-vs-nfci", "how-to-read-market-risk-dashboard"],
};

export function IndicatorDefinitionPanel({
  slug,
  name,
  description,
  overview,
  readHint,
  caveat,
  frequency,
  sources,
  updatedAt,
  dictionary,
  locale,
}: IndicatorDefinitionProps) {
  return (
    <section className="space-y-5 rounded-lg border border-slate-200 bg-white p-5 shadow-[0_10px_28px_rgba(15,23,42,0.04)]">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">{name}</h1>
          <p className="mt-1 max-w-4xl text-sm leading-6 text-slate-600">{description}</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-500">
          <p>{dictionary.indicatorDefinition.updated}{dictionary.common.punctuation.colon}{formatDateLabel(updatedAt, locale, dictionary)}</p>
          <p>{dictionary.indicatorDefinition.frequency}{dictionary.common.punctuation.colon}{formatFrequencyLabel(frequency, dictionary)}</p>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        {[
          [dictionary.indicatorDefinition.overview, overview],
          [dictionary.indicatorDefinition.howToRead, readHint],
          [dictionary.indicatorDefinition.misread, caveat],
        ].map(([title, body]) => (
          <div key={title} className="rounded-lg border border-slate-200 bg-slate-50/80 p-4">
            <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-700">{body}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-slate-800">{dictionary.indicatorDefinition.related}</h2>
          <div className="flex flex-wrap gap-2">
            {(RelatedMap[slug] ?? []).map((relatedSlug) => (
              <TrackedLink
                key={relatedSlug}
                href={hrefWithLocale(`/indicators/${relatedSlug}`, locale)}
                className="rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-800 hover:bg-emerald-100"
                eventName="select_indicator"
                eventProps={{
                  slug: relatedSlug,
                  current_slug: slug,
                  source: "indicator_definition_related",
                  locale,
                }}
              >
                {relatedSlug.toUpperCase()}
              </TrackedLink>
            ))}
          </div>
        </div>

        <div>
          <h2 className="text-sm font-semibold text-slate-800">{dictionary.indicatorDefinition.articles}</h2>
          <div className="mt-2 flex flex-wrap gap-2">
            {(ArticleMap[slug] ?? []).map((articleSlug) => (
              <TrackedLink
                key={articleSlug}
                href={hrefWithLocale(`/articles/${articleSlug}`, locale)}
                className="rounded-md border border-amber-200 bg-amber-50 px-2 py-1 text-xs font-medium text-amber-800 hover:bg-amber-100"
                eventName="select_article"
                eventProps={{
                  slug: articleSlug,
                  source: "indicator_definition_article",
                  indicator_slug: slug,
                  locale,
                }}
              >
                {dictionary.articleLabels[articleSlug as keyof typeof dictionary.articleLabels] ?? articleSlug}
              </TrackedLink>
            ))}
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <h2 className="text-sm font-semibold text-slate-800">{dictionary.indicatorDefinition.sources}</h2>
        <div className="grid gap-2 md:grid-cols-2">
          {sources.map((source) => (
            <div
              key={source.externalId}
              className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600"
            >
              {source.sourceUrl ? (
                <TrackedExternalLink
                  href={source.sourceUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="font-medium text-emerald-700 underline-offset-2 hover:underline"
                  eventName="open_data_source"
                  eventProps={{
                    provider: source.provider,
                    external_id: source.externalId,
                    indicator_slug: slug,
                    is_primary: source.isPrimary,
                    source_context: "indicator_definition",
                    locale,
                  }}
                >
                  {source.externalId}
                </TrackedExternalLink>
              ) : (
                <span className="font-medium text-slate-700">{source.externalId}</span>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
