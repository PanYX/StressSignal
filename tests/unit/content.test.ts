import { describe, expect, it } from "vitest";

import {
  getAllArticleSlugs,
  getAllArticlesMeta,
  getArticleBySlug,
} from "../../lib/content/articles";

const requiredSlugs = [
  "what-is-vix",
  "why-not-just-vix",
  "how-to-read-market-risk-dashboard",
  "vix-vs-vix3m",
  "vix-vxn-rvx-differences",
  "stlfsi-vs-nfci",
];

describe("content articles", () => {
  it("contains all required seeded slugs", async () => {
    const slugs = await getAllArticleSlugs();
    for (const required of requiredSlugs) {
      expect(slugs.includes(required)).toBe(true);
    }
  });

  it("parses article metadata and content for all seeded posts", async () => {
    const articles = await getAllArticlesMeta();

    expect(articles.length >= requiredSlugs.length).toBe(true);

    for (const article of articles) {
      expect(article.slug).toBeTruthy();
      expect(article.frontmatter.title).toBeTruthy();
      expect(article.frontmatter.description).toBeTruthy();
      expect(article.frontmatter.publishedAt.length).toBeGreaterThan(0);
      if (article.frontmatter.updatedAt) {
        expect(article.frontmatter.updatedAt.length).toBeGreaterThan(0);
      }
      expect(Array.isArray(article.frontmatter.tags)).toBe(true);
      const detail = await getArticleBySlug(article.slug);
      expect(detail !== null).toBe(true);
      expect(detail?.content).toBeTruthy();
    }
  });

  it("returns null for missing slugs", async () => {
    const missing = await getArticleBySlug("not-a-real-article");
    expect(missing === null).toBe(true);
  });
});
