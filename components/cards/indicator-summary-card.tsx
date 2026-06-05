import { TrackedLink } from "@/components/analytics/tracked-link";
import type { Dictionary, Locale } from "@/lib/i18n/dictionary";
import { translateStateLabel } from "@/lib/i18n/dictionary";
import { hrefWithLocale } from "@/lib/i18n/locale-url";
import { cn } from "@/lib/utils";

import {
  formatDateLabel,
  formatFrequencyLabel,
  formatNumber,
  formatSignedNumber,
  isNegative,
  isPositive,
} from "../shared/format";
import { PercentBar, StatusPill } from "../shared/ui-kit";

type SnapshotRow = {
  slug: string;
  name: string;
  latestValue: number | null;
  latestDate: string | null;
  change1d: number | null;
  change5d: number | null;
  pctRank1y: number | null;
  stateLabel: string;
  sourcePolicy?: string | null;
  sources?: {
    provider: string;
    externalId: string;
    sourceUrl: string;
    isPrimary: boolean;
    licenseNote: string | null;
  }[];
  frequency?: string;
  updatedAt?: string | null;
};

type IndicatorSummaryCardProps = {
  row: SnapshotRow;
  dictionary: Dictionary;
  locale: Locale;
};

const ChangeBlock = ({
  label,
  value,
}: {
  label: string;
  value: number | null;
}) => {
  const colorClass = isPositive(value)
    ? "text-emerald-700"
    : isNegative(value)
      ? "text-rose-700"
      : "text-slate-500";

  return (
    <div className="space-y-0.5 rounded-md bg-white px-2.5 py-2 ring-1 ring-slate-200">
      <p className="text-[11px] uppercase tracking-wide text-slate-500">{label}</p>
      <p className={`text-sm font-semibold ${colorClass}`}>
        {formatSignedNumber(value, { maximumFractionDigits: 2, minimumFractionDigits: 2 })}
      </p>
    </div>
  );
};

export function IndicatorSummaryCard({ row, dictionary, locale }: IndicatorSummaryCardProps) {
  const percentileLabel =
    row.pctRank1y === null ? dictionary.indicatorCard.sampleShort : `${(row.pctRank1y * 100).toFixed(0)}%`;

  return (
    <TrackedLink
      href={hrefWithLocale(`/indicators/${row.slug}`, locale)}
      className="group block rounded-lg border border-slate-200 bg-white p-4 shadow-[0_8px_22px_rgba(15,23,42,0.04)] transition hover:-translate-y-0.5 hover:border-emerald-200 hover:shadow-[0_12px_30px_rgba(15,23,42,0.08)]"
      eventName="select_indicator"
      eventProps={{
        slug: row.slug,
        source: "indicator_summary_card",
        locale,
        percentile_bucket:
          row.pctRank1y === null
            ? "missing"
            : row.pctRank1y >= 0.8
              ? "elevated"
              : row.pctRank1y >= 0.5
                ? "watch"
                : "calm",
      }}
    >
      <header className="mb-3 flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <span
            className={cn(
              "mt-1 h-7 w-1 rounded-full",
              row.pctRank1y === null
                ? "bg-slate-300"
                : row.pctRank1y >= 0.8
                  ? "bg-rose-500"
                  : row.pctRank1y >= 0.5
                    ? "bg-amber-500"
                    : "bg-emerald-500",
            )}
          />
          <div className="min-w-0">
          <h2 className="text-lg font-semibold text-slate-950 group-hover:text-emerald-800">
            {row.name}
          </h2>
          <p className="text-xs uppercase tracking-wide text-slate-500">{row.slug}</p>
          </div>
        </div>
        <StatusPill
          label={translateStateLabel(row.stateLabel, dictionary)}
          percentile={row.pctRank1y}
        />
      </header>

      <div className="mb-3 grid gap-2 sm:grid-cols-2">
        <div className="rounded-md bg-slate-50 p-3">
          <p className="text-xs uppercase tracking-wide text-slate-500">{dictionary.indicatorCard.latest}</p>
          <p className="text-2xl font-semibold tracking-tight text-slate-950">
            {formatNumber(row.latestValue)}
          </p>
          <p className="text-[11px] text-slate-500">{formatDateLabel(row.latestDate, locale, dictionary)}</p>
        </div>
        <div className="rounded-md bg-slate-50 p-3">
          <p className="text-xs uppercase tracking-wide text-slate-500">{dictionary.indicatorCard.percentile}</p>
          <p className="numeric text-2xl font-semibold tracking-tight text-slate-950">{percentileLabel}</p>
          <PercentBar
            value={row.pctRank1y}
            tone={row.pctRank1y !== null && row.pctRank1y >= 0.8 ? "rose" : row.pctRank1y !== null && row.pctRank1y >= 0.5 ? "amber" : "emerald"}
          />
          <p className="text-[11px] text-slate-500">{dictionary.indicatorCard.updated} {formatDateLabel(row.updatedAt ?? null, locale, dictionary)}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <ChangeBlock label="1D" value={row.change1d} />
        <ChangeBlock label="5D" value={row.change5d} />
      </div>
      <div className="mt-3 flex flex-wrap gap-x-2 gap-y-1 border-t border-slate-100 pt-3 text-[11px] text-slate-500">
        <span>{formatFrequencyLabel(row.frequency ?? "daily/weekly", dictionary)}</span>
        <span>·</span>
        <span>{dictionary.indicatorCard.updated} {formatDateLabel(row.updatedAt ?? row.latestDate ?? null, locale, dictionary)}</span>
      </div>
    </TrackedLink>
  );
}
