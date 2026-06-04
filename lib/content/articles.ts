import { compileMDX } from "next-mdx-remote/rsc";
import type { ReactNode } from "react";
import { z } from "zod";
import fs from "node:fs/promises";
import path from "node:path";

import { siteMeta } from "../market-risk-metadata";

const articleDirectory = path.join(process.cwd(), "content", "articles");
const articleFileExt = ".mdx";
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

function resolveArticlePath(slug: string): string | null {
  const cleanSlug = normalizeSlug(slug);
  if (!isValidSlug(cleanSlug)) {
    return null;
  }

  const candidate = path.resolve(articleDirectory, `${cleanSlug}${articleFileExt}`);
  const baseDir = path.resolve(articleDirectory);
  if (!candidate.startsWith(`${baseDir}${path.sep}`)) {
    return null;
  }

  return candidate;
}

export async function getAllArticleSlugs(): Promise<string[]> {
  const directory = await fs.readdir(articleDirectory, { withFileTypes: true });

  return directory
    .filter(
      (entry) =>
        entry.isFile() &&
        entry.name.endsWith(articleFileExt) &&
        isValidSlug(entry.name.slice(0, -articleFileExt.length)),
    )
    .map((entry) => entry.name.slice(0, -articleFileExt.length))
    .sort();
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
  filePath: string,
  includeContent: true,
): Promise<ArticleDocument>;
async function loadArticleByPath(
  slug: string,
  filePath: string,
  includeContent: false,
): Promise<ArticleMeta>;
async function loadArticleByPath(
  slug: string,
  filePath: string,
  includeContent: boolean,
): Promise<ArticleMeta | ArticleDocument> {
  const source = await fs.readFile(filePath, "utf8");
  const { frontmatter, content } = await compileMDX({
    source,
    options: {
      parseFrontmatter: true,
    },
  });

  const parsed = parseArticleMetadata(frontmatter);

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
      content,
    };
  }

  return article;
}

export async function getArticleMetaBySlug(
  slug: string,
): Promise<ArticleMeta | null> {
  const filePath = resolveArticlePath(slug);
  if (!filePath) {
    return null;
  }

  try {
    return await loadArticleByPath(normalizeSlug(slug), filePath, false);
  } catch (error) {
    if (error instanceof Error && "code" in error && (error as NodeJS.ErrnoException).code === "ENOENT") {
      return null;
    }
    throw error;
  }
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
  const filePath = resolveArticlePath(slug);
  if (!filePath) {
    return null;
  }

  try {
    return await loadArticleByPath(normalizeSlug(slug), filePath, true);
  } catch (error) {
    if (error instanceof Error && "code" in error && (error as NodeJS.ErrnoException).code === "ENOENT") {
      return null;
    }
    throw error;
  }
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
