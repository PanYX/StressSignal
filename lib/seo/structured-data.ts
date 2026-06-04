import { siteMeta } from "../market-risk-metadata";

const normalizePath = (path: string): string => {
  if (!path) {
    return "/";
  }

  const normalized = path.trim();
  return normalized.startsWith("/") ? normalized : `/${normalized}`;
};

const toAbsolute = (path: string): string =>
  `${siteMeta.siteUrl.replace(/\/$/, "")}${normalizePath(path) === "/" ? "" : normalizePath(path)}`;

type Schema = Record<string, unknown>;

type BreadcrumbInput = {
  name: string;
  path: string;
};

export function buildWebsiteSchema(): Schema {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${siteMeta.siteUrl.replace(/\/$/, "")}/#website`,
    name: siteMeta.title,
    description: siteMeta.description,
    url: siteMeta.siteUrl,
    inLanguage: "en-US",
  };
}

export function buildOrganizationSchema(): Schema {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${siteMeta.siteUrl.replace(/\/$/, "")}/#organization`,
    name: siteMeta.brand,
    url: siteMeta.siteUrl,
    description:
      "Market-risk observability project for explainable public risk dashboards.",
  };
}

export function buildDatasetSchema({
  name,
  description,
  dateModified,
  path,
}: {
  name: string;
  description: string;
  dateModified: string | null;
  path: string;
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
    inLanguage: "en-US",
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
}: {
  title: string;
  description: string;
  publishedAt: string;
  updatedAt: string;
  author: string;
  path: string;
  tags: string[];
  canonicalUrl: string;
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
    inLanguage: "en-US",
    publisher: {
      "@type": "Organization",
      name: siteMeta.brand,
      url: siteMeta.siteUrl,
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
