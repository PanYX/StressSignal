import type { MetadataRoute } from "next";

import { siteMeta } from "../lib/market-risk-metadata";

export default function robots(): MetadataRoute.Robots {
  const siteUrl = siteMeta.siteUrl.replace(/\/$/, "");

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", "/_next/"],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
