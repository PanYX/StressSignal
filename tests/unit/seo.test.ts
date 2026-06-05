import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

import sitemap from "../../app/sitemap";
import { GET as adsTxt } from "../../app/ads.txt/route";
import manifest from "../../app/manifest";
import { proxy } from "../../proxy";
import robots from "../../app/robots";
import { hrefWithLocale } from "../../lib/i18n/locale-url";
import { siteMeta } from "../../lib/market-risk-metadata";
import {
  buildArticleMetadata,
  buildPageMetadata,
} from "../../lib/seo/page-metadata";
import {
  buildArticleSchema,
  buildBreadcrumbSchema,
  buildDatasetSchema,
  buildOrganizationSchema,
  buildWebsiteSchema,
} from "../../lib/seo/structured-data";

const siteBase = siteMeta.siteUrl.replace(/\/$/, "");

describe("seo helpers", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("requires a real site URL in production", async () => {
    vi.resetModules();
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "");
    vi.stubEnv("VERCEL_URL", "");

    await expect(import("../../lib/market-risk-metadata")).rejects.toThrow(
      "NEXT_PUBLIC_SITE_URL is required in production.",
    );

    vi.resetModules();
  });

  it("buildPageMetadata uses absolute canonical and social defaults", () => {
    const metadata = buildPageMetadata({
      title: "Test Page",
      description: "Test description.",
      path: "/about",
    });

    expect(metadata.title).toBe("Test Page");
    expect(metadata.alternates?.canonical).toBe(`${siteBase}/about`);
    expect(metadata.openGraph?.type).toBe("website");
    expect(metadata.openGraph?.url).toBe(`${siteBase}/about`);
    expect(metadata.openGraph?.images?.[0]?.url).toBe("/opengraph-image");
    expect(metadata.twitter?.images?.[0]).toBe("/twitter-image");
  });

  it("marks non-default language query variants as noindex", () => {
    const metadata = buildPageMetadata({
      title: "Test Page",
      description: "Test description.",
      locale: "zh",
      path: "/about",
    });

    expect(metadata.alternates?.canonical).toBe(`${siteBase}/about`);
    expect(metadata.robots).toMatchObject({ index: false, follow: true });
  });

  it("keeps default English internal links clean while preserving non-default locale queries", () => {
    expect(hrefWithLocale("/indicators/vix", "en")).toBe("/indicators/vix");
    expect(hrefWithLocale("/indicators?sort=latest#table", "en")).toBe(
      "/indicators?sort=latest#table",
    );
    expect(hrefWithLocale("/indicators?sort=latest#table", "zh")).toBe(
      "/indicators?sort=latest&lang=zh#table",
    );
  });

  it("buildArticleMetadata sets article-specific open graph type and timestamps", () => {
    const metadata = buildArticleMetadata({
      title: "Article Title",
      description: "Article description.",
      path: "/articles/what-is-vix",
      publishedAt: "2026-05-28",
      updatedAt: "2026-05-28",
    });

    expect(metadata.title).toBe("Article Title");
    expect(metadata.openGraph?.type).toBe("article");
    expect(metadata.openGraph?.publishedTime).toBe("2026-05-28");
    expect(metadata.openGraph?.modifiedTime).toBe("2026-05-28");
  });

  it("buildBreadcrumbSchema serializes deterministic list items", () => {
    const schema = buildBreadcrumbSchema([
      { name: "Home", path: "/" },
      { name: "Articles", path: "/articles" },
      { name: "What is VIX", path: "/articles/what-is-vix" },
    ]);

    expect(schema["@type"]).toBe("BreadcrumbList");
    expect(schema.itemListElement).toHaveLength(3);
    expect(schema.itemListElement[2].position).toBe(3);
    expect(schema.itemListElement[2].item).toBe(`${siteBase}/articles/what-is-vix`);
  });

  it("structured-data blocks stay JSON-serializable", () => {
    const dataset = buildDatasetSchema({
      name: "Market Risk Dashboard Data Sources",
      description: "Public risk dataset index.",
      dateModified: "2026-05-28T00:00:00.000Z",
      path: "/data-sources",
    });
    const article = buildArticleSchema({
      title: "Article Title",
      description: "Article description.",
      publishedAt: "2026-05-28",
      updatedAt: "2026-05-28",
      author: "StressSignal Editorial",
      path: "/articles/what-is-vix",
      tags: ["finance", "volatility"],
      canonicalUrl: "https://example.com/articles/what-is-vix",
    });
    const breadcrumb = buildBreadcrumbSchema([
      { name: "Market Risk Dashboard", path: "/" },
      { name: "Articles", path: "/articles" },
      { name: "Article Title", path: "/articles/what-is-vix" },
    ]);
    const organization = buildOrganizationSchema();

    expect(() => JSON.parse(JSON.stringify(dataset))).not.toThrow();
    expect(() => JSON.parse(JSON.stringify(article))).not.toThrow();
    expect(() => JSON.parse(JSON.stringify(breadcrumb))).not.toThrow();
    expect(() => JSON.parse(JSON.stringify(organization))).not.toThrow();
    expect(organization.logo).toMatchObject({
      "@type": "ImageObject",
      url: `${siteBase}/logo-mark.svg`,
    });
    expect(organization.inLanguage).toBe("en-US");
    expect(buildOrganizationSchema("en").inLanguage).toBe("en-US");
    expect(buildOrganizationSchema("zh").inLanguage).toBe("zh-CN");
    expect(buildWebsiteSchema("en").inLanguage).toBe("en-US");
    expect(article.publisher).toMatchObject({
      "@type": "Organization",
      logo: {
        "@type": "ImageObject",
        url: `${siteBase}/logo-mark.svg`,
      },
    });
  });

  it("website schema does not advertise an unavailable site search route", () => {
    const schema = buildWebsiteSchema();

    expect(schema["@type"]).toBe("WebSite");
    expect(schema).not.toHaveProperty("potentialAction");
  });

  it("redirects explicit default language query URLs to clean English canonicals", () => {
    const request = new NextRequest(`${siteBase}/about?utm_source=test&lang=en`);
    const response = proxy(request);

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(`${siteBase}/about?utm_source=test`);
    expect(response.headers.get("set-cookie")).toContain("stresssignal-locale=en");
  });

  it("sitemap includes indexable risk-layer and regional market pages", async () => {
    const urls = (await sitemap()).map((entry) => entry.url);

    expect(urls).toContain(`${siteBase}/tail-risk`);
    expect(urls).toContain(`${siteBase}/sentiment`);
    expect(urls).toContain(`${siteBase}/fear-greed`);
    expect(urls).toContain(`${siteBase}/global-risk`);
    expect(urls).toContain(`${siteBase}/vix-term-structure`);
    expect(urls).toContain(`${siteBase}/financial-conditions-index`);
    expect(urls).toContain(`${siteBase}/markets/europe`);
    expect(urls).toContain(`${siteBase}/markets/india`);
    expect(urls).toContain(`${siteBase}/markets/japan`);
    expect(urls).toContain(`${siteBase}/markets/hong-kong`);

    const articleUrl = urls.find((url) => url.endsWith("/articles/what-is-vix"));
    const articleEntry = (await sitemap()).find((entry) => entry.url === articleUrl);
    expect(articleEntry?.lastModified).toEqual(new Date("2026-01-02T00:00:00.000Z"));

    const homeEntry = (await sitemap()).find((entry) => entry.url === siteBase);
    expect(homeEntry?.lastModified).toEqual(new Date("2026-06-05T00:00:00.000Z"));
  });

  it("robots allows render assets while blocking internal API routes", () => {
    const policy = robots();
    const firstRule = Array.isArray(policy.rules) ? policy.rules[0] : policy.rules;

    expect(firstRule).toMatchObject({
      allow: "/",
    });
    expect(firstRule?.disallow).toContain("/api/");
    expect(firstRule?.disallow).not.toContain("/_next/");
    expect(policy.sitemap).toBe(`${siteBase}/sitemap.xml`);
  });

  it("manifest exposes install and favicon assets", () => {
    const appManifest = manifest();
    const iconSources = appManifest.icons?.map((icon) => icon.src) ?? [];

    expect(appManifest.name).toBe("StressSignal Market Risk Dashboard");
    expect(appManifest.short_name).toBe("StressSignal");
    expect(iconSources).toEqual(
      expect.arrayContaining(["/icon", "/apple-icon", "/logo-mark.svg"]),
    );
  });

  it("ads.txt is configurable without hard-coding a publisher id", async () => {
    vi.stubEnv("GOOGLE_ADSENSE_PUBLISHER_ID", "");
    let response = adsTxt();
    await expect(response.text()).resolves.toContain("Configure GOOGLE_ADSENSE_PUBLISHER_ID");

    vi.stubEnv("GOOGLE_ADSENSE_PUBLISHER_ID", "pub-1234567890123456");
    response = adsTxt();
    await expect(response.text()).resolves.toBe(
      "google.com, pub-1234567890123456, DIRECT, f08c47fec0942fa0\n",
    );
  });
});
