import type { Dictionary } from "@/lib/i18n/dictionary";
import { cn } from "@/lib/utils";

type CommentaryPanelProps = {
  headline: string;
  summary: string;
  details: string[];
  missing?: string[];
  className?: string;
  dictionary: Dictionary;
};

export function CommentaryPanel({
  headline,
  summary,
  details,
  missing,
  className,
  dictionary,
}: CommentaryPanelProps) {
  const hasMissing = Boolean(missing && missing.length > 0);

  return (
    <section
      className={cn(
        "rounded-lg border border-slate-200 bg-white p-5 text-slate-900 shadow-[0_10px_28px_rgba(15,23,42,0.04)]",
        className,
      )}
    >
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">
        {dictionary.commentary.label}
      </p>
      <h3 className="mt-2 text-lg font-semibold tracking-tight">{headline}</h3>
      <p className="mt-2 border-l-4 border-slate-200 pl-4 text-sm leading-6 text-slate-700">
        {summary}
      </p>
      {details.length > 0 ? (
        <ul className="mt-3 grid gap-2 text-sm text-slate-700 md:grid-cols-2">
          {details.map((detail) => (
            <li key={detail} className="rounded-md border border-emerald-100 bg-emerald-50/70 px-3 py-2">
              {detail}
            </li>
          ))}
        </ul>
      ) : null}
      {hasMissing ? (
        <p className="mt-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          {dictionary.commentary.missingPrefix}
          {dictionary.common.punctuation.colon}
          {missing!.join(dictionary.common.punctuation.comma)}
          {dictionary.common.punctuation.period}
          {dictionary.commentary.missingSuffix}
        </p>
      ) : null}
    </section>
  );
}
