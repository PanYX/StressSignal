import type { MetadataRoute } from "next";

import { requiredPublicRoutes, siteMeta } from "../lib/market-risk-metadata";
import { MVP_INDICATOR_SLUGS } from "../lib/indicators/configs";
import { getAllArticlesMeta } from "../lib/content/articles";
import { RISK_LAYER_ROUTES } from "../lib/navigation";

const STATIC_LAST_MODIFIED = new Date("2026-06-05T00:00:00.000Z");

const MARKET_REGION_ROUTES = [
  "/markets/europe",
  "/markets/india",
  "/markets/japan",
  "/markets/hong-kong",
] as const;

const toAbsolute = (path: string) =>
  `${siteMeta.siteUrl.replace(/\/$/, "")}${path === "/" ? "" : path}`;

const toDate = (value: string | undefined): Date =>
  value ? new Date(`${value}T00:00:00.000Z`) : STATIC_LAST_MODIFIED;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const articles = await getAllArticlesMeta();

  const routeSet = new Set<string>();
  for (const route of requiredPublicRoutes) {
    routeSet.add(route.href);
  }
  routeSet.add("/");
  routeSet.add("/articles");
  routeSet.add("/indicators");
  for (const route of RISK_LAYER_ROUTES) {
    routeSet.add(route.href);
  }
  for (const route of MARKET_REGION_ROUTES) {
    routeSet.add(route);
  }
  for (const indicatorSlug of MVP_INDICATOR_SLUGS) {
    routeSet.add(`/indicators/${indicatorSlug}`);
  }
  const articleEntries = articles.map((article) => ({
    path: `/articles/${article.slug}`,
    lastModified: toDate(article.frontmatter.updatedAt ?? article.frontmatter.publishedAt),
  }));
  for (const article of articleEntries) {
    routeSet.add(article.path);
  }
  const articleLastModifiedByPath = new Map(
    articleEntries.map((entry) => [entry.path, entry.lastModified]),
  );

  return [...routeSet].map((path) => ({
    url: toAbsolute(path),
    lastModified: articleLastModifiedByPath.get(path) ?? STATIC_LAST_MODIFIED,
    changeFrequency: path === "/" || path.startsWith("/indicators") ? "daily" : "weekly",
    priority: path === "/" ? 1 : path.startsWith("/articles/") ? 0.7 : 0.8,
  }));
}
