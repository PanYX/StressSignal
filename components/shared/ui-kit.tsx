import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type Tone = "neutral" | "emerald" | "amber" | "rose" | "cyan" | "slate";

const toneClasses: Record<Tone, string> = {
  neutral: "border-slate-200 bg-white text-slate-700",
  emerald: "border-emerald-200 bg-emerald-50 text-emerald-800",
  amber: "border-amber-200 bg-amber-50 text-amber-800",
  rose: "border-rose-200 bg-rose-50 text-rose-700",
  cyan: "border-cyan-200 bg-cyan-50 text-cyan-800",
  slate: "border-slate-200 bg-slate-50 text-slate-700",
};

export function Card({
  children,
  className,
}: {
  readonly children: ReactNode;
  readonly className?: string;
}) {
  return (
    <section
      className={cn(
        "rounded-lg border border-slate-200/90 bg-white shadow-[0_10px_28px_rgba(15,23,42,0.04)]",
        className,
      )}
    >
      {children}
    </section>
  );
}

export function SoftPanel({
  children,
  className,
}: {
  readonly children: ReactNode;
  readonly className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-lg border border-slate-200 bg-slate-50/70",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function Badge({
  children,
  tone = "slate",
  className,
}: {
  readonly children: ReactNode;
  readonly tone?: Tone;
  readonly className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium leading-5",
        toneClasses[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  subtitle,
  action,
  className,
}: {
  readonly eyebrow?: string;
  readonly title: string;
  readonly subtitle?: string;
  readonly action?: ReactNode;
  readonly className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap items-end justify-between gap-3", className)}>
      <div className="min-w-0">
        {eyebrow ? (
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">
            {eyebrow}
          </p>
        ) : null}
        <h2 className="text-base font-semibold tracking-tight text-slate-950">
          {title}
        </h2>
        {subtitle ? (
          <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600">
            {subtitle}
          </p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

export function PercentBar({
  value,
  tone = "emerald",
  label,
}: {
  readonly value: number | null | undefined;
  readonly tone?: "emerald" | "amber" | "rose";
  readonly label?: string;
}) {
  const normalized =
    typeof value === "number" && Number.isFinite(value)
      ? Math.max(0, Math.min(1, value))
      : 0;
  const color =
    tone === "rose"
      ? "bg-rose-500"
      : tone === "amber"
        ? "bg-amber-500"
        : "bg-emerald-500";

  return (
    <div className="flex min-w-[130px] items-center gap-2">
      <div className="h-1.5 flex-1 rounded-full bg-slate-200">
        <div
          className={cn("h-1.5 rounded-full", color)}
          style={{ width: `${Math.round(normalized * 100)}%` }}
        />
      </div>
      {label ? (
        <span className="numeric w-10 text-right text-xs font-semibold text-slate-700">
          {label}
        </span>
      ) : null}
    </div>
  );
}

export function MetricTile({
  label,
  value,
  help,
  tone = "slate",
  icon,
}: {
  readonly label: string;
  readonly value: ReactNode;
  readonly help?: string;
  readonly tone?: Tone;
  readonly icon?: ReactNode;
}) {
  return (
    <div className={cn("rounded-lg border p-4", toneClasses[tone])}>
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium">{label}</p>
        {icon ? <span className="text-lg leading-none opacity-80">{icon}</span> : null}
      </div>
      <div className="numeric mt-2 text-3xl font-semibold tracking-tight text-slate-950">
        {value}
      </div>
      {help ? <p className="mt-1 text-xs leading-5 opacity-90">{help}</p> : null}
    </div>
  );
}

export function StatusPill({
  label,
  percentile,
}: {
  readonly label: string;
  readonly percentile?: number | null;
}) {
  const tone =
    percentile === null || percentile === undefined
      ? "slate"
      : percentile >= 0.8
        ? "rose"
        : percentile >= 0.5
          ? "amber"
          : "emerald";

  return <Badge tone={tone}>{label}</Badge>;
}
