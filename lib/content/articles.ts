import type { ReactNode } from "react";
import { z } from "zod";

import { ARTICLE_DOCUMENTS } from "./article-sources.generated";
import { siteMeta } from "../market-risk-metadata";

const slugRegex = /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/;

const articleFrontmatterSchema = z.object({
  title: z.string().trim().min(1),
  description: z.string().trim().min(1),
  publishedAt: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/),
  updatedAt: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  author: z.string().trim().min(1).default("StressSignal 编辑部"),
  tags: z.array(z.string().trim().min(1)).default([]),
  summary: z.string().trim().min(1).optional(),
  canonical: z.string().trim().url().optional(),
});

export type ArticleFrontmatter = z.infer<typeof articleFrontmatterSchema>;

export type ArticleMeta = {
  slug: string;
  frontmatter: ArticleFrontmatter;
};

export type ArticleDocument = ArticleMeta & {
  content: ReactNode;
};

function normalizeSlug(slug: string): string {
  return slug.trim().toLowerCase();
}

function isValidSlug(slug: string): boolean {
  return slugRegex.test(slug);
}

function resolveArticleSource(slug: string): {
  slug: keyof typeof ARTICLE_DOCUMENTS;
  document: (typeof ARTICLE_DOCUMENTS)[keyof typeof ARTICLE_DOCUMENTS];
} | null {
  const cleanSlug = normalizeSlug(slug);
  if (!isValidSlug(cleanSlug)) {
    return null;
  }

  if (!(cleanSlug in ARTICLE_DOCUMENTS)) {
    return null;
  }

  const articleSlug = cleanSlug as keyof typeof ARTICLE_DOCUMENTS;
  return { slug: articleSlug, document: ARTICLE_DOCUMENTS[articleSlug] };
}

export async function getAllArticleSlugs(): Promise<string[]> {
  return Object.keys(ARTICLE_DOCUMENTS).sort();
}

function ensureDateString(value: string): string {
  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }
  return parsed.toISOString().slice(0, 10);
}

function parseArticleMetadata(frontmatter: unknown): ArticleFrontmatter {
  return articleFrontmatterSchema.parse(frontmatter);
}

async function loadArticleByPath(
  slug: string,
  document: (typeof ARTICLE_DOCUMENTS)[keyof typeof ARTICLE_DOCUMENTS],
  includeContent: true,
): Promise<ArticleDocument>;
async function loadArticleByPath(
  slug: string,
  document: (typeof ARTICLE_DOCUMENTS)[keyof typeof ARTICLE_DOCUMENTS],
  includeContent: false,
): Promise<ArticleMeta>;
async function loadArticleByPath(
  slug: string,
  document: (typeof ARTICLE_DOCUMENTS)[keyof typeof ARTICLE_DOCUMENTS],
  includeContent: boolean,
): Promise<ArticleMeta | ArticleDocument> {
  const parsed = parseArticleMetadata(document.frontmatter);

  const article: ArticleMeta = {
    slug,
    frontmatter: {
      ...parsed,
      publishedAt: ensureDateString(parsed.publishedAt),
      updatedAt: parsed.updatedAt ? ensureDateString(parsed.updatedAt) : undefined,
    },
  };

  if (includeContent) {
    return {
      ...article,
      content: document.body,
    };
  }

  return article;
}

export async function getArticleMetaBySlug(
  slug: string,
): Promise<ArticleMeta | null> {
  const articleSource = resolveArticleSource(slug);
  if (!articleSource) {
    return null;
  }

  return loadArticleByPath(articleSource.slug, articleSource.document, false);
}

export async function getAllArticlesMeta(): Promise<ArticleMeta[]> {
  const slugs = await getAllArticleSlugs();
  const articleList = await Promise.all(
    slugs.map((slug) => getArticleMetaBySlug(slug)),
  );
  const validArticles = articleList.filter(
    (entry): entry is ArticleMeta => entry !== null,
  );

  return validArticles.sort((left, right) => {
    const leftDate = new Date(left.frontmatter.publishedAt).getTime();
    const rightDate = new Date(right.frontmatter.publishedAt).getTime();
    return rightDate - leftDate || left.slug.localeCompare(right.slug);
  });
}

export async function getArticleBySlug(
  slug: string,
): Promise<ArticleDocument | null> {
  const articleSource = resolveArticleSource(slug);
  if (!articleSource) {
    return null;
  }

  return loadArticleByPath(articleSource.slug, articleSource.document, true);
}

export function formatArticleDate(value: string): string {
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleDateString("zh-CN", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function getArticleCanonicalUrl(slug: string): string {
  return `${siteMeta.siteUrl.replace(/\/$/, "")}/articles/${normalizeSlug(slug)}`;
}
