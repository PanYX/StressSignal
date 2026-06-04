import type { Dictionary, Locale } from "@/lib/i18n/dictionary";
import { getLocaleDate } from "@/lib/i18n/dictionary";

export const formatDateLabel = (
  value: string | null,
  locale: Locale = "zh",
  dictionary?: Dictionary,
): string => {
  if (!value) {
    return dictionary?.common.notUpdated ?? "Not updated";
  }

  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString(getLocaleDate(locale), {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
};

export const formatFrequencyLabel = (
  value: string | null | undefined,
  dictionary?: Dictionary,
): string => {
  if (!value) {
    return dictionary?.common.unknown ?? "Unknown";
  }

  return value
    .split("/")
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) =>
      part === "daily"
        ? dictionary?.common.daily ?? "Daily"
        : part === "weekly"
          ? dictionary?.common.weekly ?? "Weekly"
          : part,
    )
    .join(" / ");
};

export const formatProviderLabel = (value: string | null | undefined): string => {
  if (!value) {
    return "Unknown source";
  }

  const normalized = value.toLowerCase();
  if (normalized === "fred") {
    return "FRED";
  }
  if (normalized === "chicagofed") {
    return "Chicago Fed";
  }
  if (normalized === "cboe") {
    return "Cboe";
  }
  if (normalized === "ice") {
    return "ICE";
  }
  if (normalized === "aaii") {
    return "AAII";
  }
  if (normalized === "naaim") {
    return "NAAIM";
  }
  if (normalized === "edgmap") {
    return "EDGMAP";
  }
  if (normalized === "stoxx") {
    return "STOXX";
  }
  if (normalized === "nse") {
    return "NSE";
  }
  if (normalized === "nikkei") {
    return "Nikkei";
  }
  if (normalized === "hkex") {
    return "HKEX / Hang Seng";
  }
  if (normalized === "internal") {
    return "StressSignal";
  }

  return value;
};

export const formatLicenseNote = (
  value: string | null | undefined,
  dictionary?: Dictionary,
): string | null => {
  if (!value) {
    return null;
  }

  if (value.includes("Primary composite leg")) {
    return dictionary?.license.primaryLeg ?? "Primary VIX/VXV term leg from a public FRED series.";
  }
  if (value.includes("Secondary composite leg")) {
    return dictionary?.license.secondaryLeg ?? "Secondary VIX/VXV term leg from a public FRED series.";
  }
  if (value.includes("Public macro series from FRED") || value.includes("Re-distribution policy: public_ok")) {
    return dictionary?.license.publicFred ?? "Public FRED series. Source link and update date stay visible.";
  }

  return value;
};

type NumericFormatterOptions = {
  maximumFractionDigits?: number;
  minimumFractionDigits?: number;
};

const DEFAULT_FORMATTER = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 2,
  minimumFractionDigits: 0,
});

export const formatNumber = (
  value: number | null | undefined,
  options: NumericFormatterOptions = {},
): string => {
  if (!Number.isFinite(value as number)) {
    return "--";
  }

  const formatter = new Intl.NumberFormat("en-US", {
    ...DEFAULT_FORMATTER.resolvedOptions(),
    ...options,
  });

  return formatter.format(value as number);
};

export const formatPercent = (
  value: number | null | undefined,
  decimalPlaces = 1,
): string =>
  Number.isFinite(value as number)
    ? `${formatNumber(value, {
        maximumFractionDigits: decimalPlaces,
        minimumFractionDigits: decimalPlaces,
      })}%`
    : "--";

export const formatSignedNumber = (
  value: number | null | undefined,
  options: NumericFormatterOptions = {},
): string => {
  if (!Number.isFinite(value as number)) {
    return "--";
  }

  const numeric = formatNumber(value, options);
  return `${value! > 0 ? "+" : ""}${numeric}`;
};

export const isPositive = (value: number | null | undefined): boolean =>
  Number.isFinite(value as number) && (value as number) > 0;

export const isNegative = (value: number | null | undefined): boolean =>
  Number.isFinite(value as number) && (value as number) < 0;
