import type { Metadata } from "next";

import { DEFAULT_LOCALE, type Locale } from "../i18n/locales";
import { siteMeta } from "../market-risk-metadata";

const normalizePath = (path: string): string => {
  if (!path) {
    return "/";
  }

  const normalized = path.trim();
  return normalized.startsWith("/") ? normalized : `/${normalized}`;
};

export const siteUrl = siteMeta.siteUrl.replace(/\/$/, "");

export function toAbsoluteUrl(path: string): string {
  const normalized = normalizePath(path);
  return `${siteUrl}${normalized === "/" ? "" : normalized}`;
}

type BaseMetadataOptions = {
  title: string;
  description: string;
  path: string;
  locale?: Locale;
  type?: "website" | "article";
  imageAlt?: string;
};

const openGraphLocaleByLocale: Record<Locale, string> = {
  en: "en_US",
  es: "es_ES",
  de: "de_DE",
  fr: "fr_FR",
  "pt-BR": "pt_BR",
  ja: "ja_JP",
  zh: "zh_CN",
};

export function buildPageMetadata({
  title,
  description,
  path,
  locale,
  type = "website",
  imageAlt,
}: BaseMetadataOptions): Metadata {
  const canonical = toAbsoluteUrl(path);
  const index = !locale || locale === DEFAULT_LOCALE;

  return {
    title,
    description,
    alternates: {
      canonical,
    },
    openGraph: {
      title,
      description,
      type,
      url: canonical,
      siteName: siteMeta.title,
      locale: locale ? openGraphLocaleByLocale[locale] : openGraphLocaleByLocale[DEFAULT_LOCALE],
      images: [
        {
          url: "/opengraph-image",
          width: 1200,
          height: 630,
          alt: imageAlt ?? title,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: ["/twitter-image"],
    },
    keywords: ["market risk", "volatility", "dashboard", "finance", "FRED"],
    robots: {
      index,
      follow: true,
    },
  };
}

export function buildArticleMetadata({
  title,
  description,
  path,
  publishedAt,
  updatedAt,
  authors,
  locale,
}: {
  title: string;
  description: string;
  path: string;
  publishedAt: string;
  updatedAt?: string;
  authors?: string[];
  locale?: Locale;
}): Metadata {
  const canonical = toAbsoluteUrl(path);
  return {
    ...buildPageMetadata({
      title,
      description,
      path,
      locale,
      type: "article",
    }),
    openGraph: {
      title,
      description,
      type: "article",
      url: canonical,
      siteName: siteMeta.title,
      locale: locale ? openGraphLocaleByLocale[locale] : openGraphLocaleByLocale[DEFAULT_LOCALE],
      publishedTime: publishedAt,
      modifiedTime: updatedAt ?? publishedAt,
      authors: authors ?? ["StressSignal 编辑部"],
      images: [
        {
          url: "/opengraph-image",
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: ["/twitter-image"],
    },
  };
}

export function buildPathMetadata({
  title,
  description,
  path,
}: {
  title: string;
  description: string;
  path: string;
}): Metadata {
  return buildPageMetadata({ title, description, path });
}
