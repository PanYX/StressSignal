"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

import { trackPlausibleEvent } from "@/lib/analytics";
import type { Locale } from "@/lib/i18n/locales";

type TimeRange = "3M" | "1Y" | "5Y" | "MAX";

const RANGES: Array<TimeRange> = ["3M", "1Y", "5Y", "MAX"];

const LABELS: Record<TimeRange, string> = {
  "3M": "3M",
  "1Y": "1Y",
  "5Y": "5Y",
  MAX: "MAX",
};

export function TimeRangeTabs({
  currentRange,
  basePath,
  locale,
}: {
  currentRange: TimeRange;
  basePath: string;
  locale: Locale;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const activeBase = basePath || pathname || "/";

  return (
    <div className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-slate-50 p-1">
      {RANGES.map((range) => {
        const params = new URLSearchParams(searchParams);
        params.set("lang", locale);
        params.set("range", range);
        const href = `${activeBase}?${params.toString()}`;
        const isActive = range === currentRange;

        return (
          <Link
            key={range}
            href={href}
            className={`rounded px-2 py-1 text-xs font-medium ${
              isActive
                ? "bg-white text-emerald-800 shadow-sm ring-1 ring-slate-200"
                : "text-slate-600 hover:bg-slate-100"
            }`}
            onClick={() => {
              if (!isActive) {
                trackPlausibleEvent("select_time_range", {
                  range,
                  previous_range: currentRange,
                  page_path: activeBase,
                  locale,
                });
              }
            }}
          >
            {LABELS[range]}
          </Link>
        );
      })}
    </div>
  );
}
