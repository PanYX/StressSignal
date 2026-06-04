import Link from "next/link";
import type { ReactNode } from "react";

import type { Dictionary, Locale } from "@/lib/i18n/dictionary";
import { hrefWithLocale } from "@/lib/i18n/locale-url";

import {
  formatDateLabel,
  formatFrequencyLabel,
} from "./format";

type MetadataSource = {
  provider: string;
  externalId: string;
  sourceUrl: string;
  licenseNote: string | null;
  isPrimary: boolean;
};

type MetricMetadataProps = {
  frequency?: string | null;
  updatedAt?: string | null;
  sources?: readonly MetadataSource[];
  dictionary: Dictionary;
  locale: Locale;
};

export function MetricMetadata({
  frequency,
  updatedAt,
  sources,
  dictionary,
  locale,
}: MetricMetadataProps) {
  const normalizedSources = sources ?? [];
  const sourceNodes: ReactNode[] = normalizedSources.map((source, index) => {
    const separator = index < normalizedSources.length - 1 ? (
      <span className="mx-1 text-slate-300">/</span>
    ) : null;

    return source.sourceUrl ? (
      <span
        key={`${source.provider}-${source.externalId}-${index}`}
        className="inline-flex items-center"
      >
        <a
          href={source.sourceUrl}
          target="_blank"
          rel="noreferrer"
          className="font-medium text-emerald-700 hover:text-emerald-900"
        >
          {source.externalId}
        </a>
        {separator}
      </span>
    ) : (
      <span
        key={`${source.provider}-${source.externalId}-${index}`}
        className="inline-flex items-center text-slate-700"
      >
        {source.externalId}
        {separator}
      </span>
    );
  });

  return (
    <dl className="space-y-3 rounded-lg border border-slate-200 bg-white p-4 text-xs text-slate-600 shadow-[0_10px_28px_rgba(15,23,42,0.04)]">
      <div className="flex flex-wrap gap-x-4 gap-y-1">
        <div className="min-w-0 max-w-full">
          <dt className="inline font-semibold text-slate-500">{dictionary.metadata.series}{dictionary.common.punctuation.colon}</dt>
          <dd className="inline break-words text-slate-700">
            {normalizedSources.length > 0 ? sourceNodes : dictionary.policy.noSources}
          </dd>
        </div>
        <div>
          <dt className="inline font-semibold text-slate-500">{dictionary.metadata.frequency}{dictionary.common.punctuation.colon}</dt>
          <dd className="inline text-slate-700">{formatFrequencyLabel(frequency, dictionary)}</dd>
        </div>
        <div>
          <dt className="inline font-semibold text-slate-500">{dictionary.metadata.updated}{dictionary.common.punctuation.colon}</dt>
          <dd className="inline text-slate-700">{formatDateLabel(updatedAt ?? null, locale, dictionary)}</dd>
        </div>
      </div>
      <p className="text-xs text-slate-500">
        {dictionary.common.disclaimer}
      </p>
    </dl>
  );
}

export function DisclaimerText({ dictionary }: { dictionary: Dictionary }) {
  return (
    <p className="rounded-lg border border-amber-200 bg-amber-50/90 p-3 text-sm leading-6 text-amber-950 shadow-[0_8px_22px_rgba(217,119,6,0.06)]">
      <span className="font-semibold">{dictionary.common.disclaimer}</span>
      <span className="ml-2"> {dictionary.common.riskNotice}</span>
    </p>
  );
}

export function HowToNavigateButton({
  href,
  label,
  locale,
}: {
  href: string;
  label: string;
  locale?: Locale;
}) {
  return (
    <Link
      href={locale ? hrefWithLocale(href, locale) : href}
      className="inline-flex items-center rounded-md bg-emerald-700 px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-800"
    >
      {label}
    </Link>
  );
}
