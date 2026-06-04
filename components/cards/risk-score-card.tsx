import Link from "next/link";

import type { Dictionary, Locale } from "@/lib/i18n/dictionary";
import { hrefWithLocale } from "@/lib/i18n/locale-url";
import { cn } from "@/lib/utils";

import { formatDateLabel, formatNumber } from "../shared/format";
import { Badge } from "../shared/ui-kit";

export function RiskScoreCard({
  score,
  stateLabel,
  headline,
  asOf,
  topDrivers,
  dictionary,
  locale,
}: {
  score: number | null;
  stateLabel: string;
  headline: string;
  asOf: string | null;
  topDrivers: Array<{ slug: string; label: string }>;
  dictionary: Dictionary;
  locale: Locale;
}) {
  const normalized = score === null ? 18 : Math.max(0, Math.min(100, score));
  const riskValue = score === null ? dictionary.riskCard.observing : `${formatNumber(score, { maximumFractionDigits: 1, minimumFractionDigits: 1 })}`;
  const widthPercent = `${Math.round(normalized)}%`;
  const statusText = score === null ? dictionary.riskCard.scorePending : stateLabel;
  const scoreTone =
    score === null
      ? "text-slate-950"
      : score >= 80
        ? "text-rose-600"
        : score >= 50
          ? "text-amber-600"
          : "text-emerald-700";

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-[0_10px_28px_rgba(15,23,42,0.05)]">
      <header className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-base font-semibold tracking-tight text-slate-950">
            {dictionary.riskCard.label}
          </p>
          <Badge tone={score !== null && score >= 80 ? "rose" : score !== null && score >= 50 ? "amber" : "emerald"}>
            {statusText}
          </Badge>
        </div>
        <div className="flex items-end gap-3">
          <h2 className={cn("numeric text-6xl font-semibold tracking-tight", scoreTone)}>
            {riskValue}
          </h2>
          {score !== null ? (
            <span className="pb-2 text-base font-medium text-slate-950">/ 100</span>
          ) : null}
        </div>
      </header>

      <div className="mt-4 space-y-3">
        <div className="h-2 w-full rounded-full bg-gradient-to-r from-emerald-500 via-amber-400 to-rose-600">
          <div
            className="relative h-2"
            style={{ width: widthPercent }}
          >
            <span className="absolute right-0 top-1/2 h-4 w-4 -translate-y-1/2 rounded-full border-2 border-white bg-rose-500 shadow" />
          </div>
        </div>
        <div className="grid grid-cols-5 text-xs text-slate-500">
          <span>0</span>
          <span className="text-center">25</span>
          <span className="text-center">50</span>
          <span className="text-center">75</span>
          <span className="text-right">100</span>
        </div>
        <div className="grid grid-cols-5 border-b border-slate-200 pb-3 text-xs font-medium">
          <span className="text-emerald-700">{dictionary.states.calm}</span>
          <span className="text-center text-slate-500">{dictionary.states.watch}</span>
          <span className="text-center text-amber-700">{dictionary.states.warming}</span>
          <span className="text-center text-rose-600">{dictionary.states.pressure}</span>
          <span className="text-right text-rose-700">{dictionary.states.resonance}</span>
        </div>
        <p className="text-sm font-medium leading-6 text-slate-800">{headline}</p>
        <p className="text-xs text-slate-500">
          {dictionary.riskCard.asOf}{dictionary.common.punctuation.colon}{formatDateLabel(asOf, locale, dictionary)}
        </p>
      </div>

      <div className="mt-5 space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
          {dictionary.riskCard.drivers}
        </p>
        <ul className="flex flex-wrap gap-2 text-sm">
          {topDrivers.length === 0 ? <li className="text-slate-500">{dictionary.riskCard.noDrivers}</li> : null}
          {topDrivers.map((driver, index) => (
            <li key={driver.slug}>
              <Link
                href={hrefWithLocale(`/indicators/${driver.slug}`, locale)}
                className={cn(
                  "inline-flex items-center gap-2 rounded-md border px-3 py-1.5 font-medium transition hover:-translate-y-0.5",
                  index === 0
                    ? "border-rose-200 bg-rose-50 text-rose-700"
                    : index === 1
                      ? "border-amber-200 bg-amber-50 text-amber-800"
                      : "border-emerald-200 bg-emerald-50 text-emerald-800",
                )}
              >
                <span className="numeric rounded bg-white/80 px-1.5 text-xs">{index + 1}</span>
                {driver.label}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
