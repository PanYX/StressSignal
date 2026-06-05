import { siteMeta } from "../market-risk-metadata";
import {
  DEFAULT_LOCALE,
  getLanguageOption,
  type Locale,
} from "../i18n/locales";

const normalizePath = (path: string): string => {
  if (!path) {
    return "/";
  }

  const normalized = path.trim();
  return normalized.startsWith("/") ? normalized : `/${normalized}`;
};

const toAbsolute = (path: string): string =>
  `${siteMeta.siteUrl.replace(/\/$/, "")}${normalizePath(path) === "/" ? "" : normalizePath(path)}`;

const logoUrl = () => toAbsolute("/logo-mark.svg");

type Schema = Record<string, unknown>;

type BreadcrumbInput = {
  name: string;
  path: string;
};

const schemaLanguage = (locale: Locale = DEFAULT_LOCALE) =>
  getLanguageOption(locale).dateLocale;

export function buildWebsiteSchema(locale: Locale = DEFAULT_LOCALE): Schema {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${siteMeta.siteUrl.replace(/\/$/, "")}/#website`,
    name: siteMeta.title,
    description: siteMeta.description,
    url: siteMeta.siteUrl,
    inLanguage: schemaLanguage(locale),
  };
}

export function buildOrganizationSchema(locale: Locale = DEFAULT_LOCALE): Schema {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${siteMeta.siteUrl.replace(/\/$/, "")}/#organization`,
    name: siteMeta.brand,
    url: siteMeta.siteUrl,
    logo: {
      "@type": "ImageObject",
      url: logoUrl(),
      width: 512,
      height: 512,
    },
    description:
      "Market-risk observability project for explainable public risk dashboards.",
    inLanguage: schemaLanguage(locale),
  };
}

export function buildDatasetSchema({
  name,
  description,
  dateModified,
  path,
  locale = DEFAULT_LOCALE,
}: {
  name: string;
  description: string;
  dateModified: string | null;
  path: string;
  locale?: Locale;
}): Schema {
  const dataset: Schema = {
    "@context": "https://schema.org",
    "@type": "Dataset",
    name,
    description,
    url: toAbsolute(path),
    creator: {
      "@type": "Organization",
      name: siteMeta.brand,
      url: siteMeta.siteUrl,
    },
    isAccessibleForFree: true,
    inLanguage: schemaLanguage(locale),
  };

  if (dateModified) {
    dataset.dateModified = dateModified;
  }

  return dataset;
}

export function buildArticleSchema({
  title,
  description,
  publishedAt,
  updatedAt,
  author,
  path,
  tags,
  canonicalUrl,
  locale = DEFAULT_LOCALE,
}: {
  title: string;
  description: string;
  publishedAt: string;
  updatedAt: string;
  author: string;
  path: string;
  tags: string[];
  canonicalUrl: string;
  locale?: Locale;
}): Schema {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: title,
    description,
    datePublished: publishedAt,
    dateModified: updatedAt,
    author: {
      "@type": "Person",
      name: author,
    },
    keywords: tags.join(", "),
    inLanguage: schemaLanguage(locale),
    publisher: {
      "@type": "Organization",
      name: siteMeta.brand,
      url: siteMeta.siteUrl,
      logo: {
        "@type": "ImageObject",
        url: logoUrl(),
        width: 512,
        height: 512,
      },
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": canonicalUrl,
    },
    isPartOf: {
      "@id": toAbsolute(path),
    },
  };
}

export function buildBreadcrumbSchema(entries: BreadcrumbInput[]): Schema {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: entries.map((entry, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: entry.name,
      item: toAbsolute(entry.path),
    })),
  };
}
