import type { MetadataRoute } from "next";

import { requiredPublicRoutes, siteMeta } from "../lib/market-risk-metadata";
import { MVP_INDICATOR_SLUGS } from "../lib/indicators/configs";
import { getAllArticleSlugs } from "../lib/content/articles";
import { RISK_LAYER_ROUTES } from "../lib/navigation";

const MARKET_REGION_ROUTES = [
  "/markets/europe",
  "/markets/india",
  "/markets/japan",
  "/markets/hong-kong",
] as const;

const toAbsolute = (path: string) =>
  `${siteMeta.siteUrl.replace(/\/$/, "")}${path === "/" ? "" : path}`;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const articleSlugs = await getAllArticleSlugs();

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
  for (const slug of articleSlugs) {
    routeSet.add(`/articles/${slug}`);
  }

  return [...routeSet].map((path) => ({
    url: toAbsolute(path),
    lastModified: now,
    changeFrequency: path === "/" ? "daily" : "daily",
    priority: path === "/" ? 1 : 0.8,
  }));
}
