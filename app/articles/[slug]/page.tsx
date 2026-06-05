import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { TrackedLink } from "../../../components/analytics/tracked-link";
import { PageShell } from "../../../components/shared/page-shell";
import { DisclaimerText } from "../../../components/shared/metric-metadata";
import { Badge, Card, SectionHeading } from "../../../components/shared/ui-kit";
import { formatDateLabel } from "../../../components/shared/format";
import {
  getArticleCanonicalUrl,
  getArticleBySlug,
  getAllArticleSlugs,
} from "../../../lib/content/articles";
import { getCurrentLocale, getDictionary } from "../../../lib/i18n/dictionary";
import { getLocalizedArticleAuthor, getLocalizedArticleTags } from "../../../lib/i18n/article-metadata";
import { hrefWithLocale } from "../../../lib/i18n/locale-url";
import { buildArticleMetadata } from "../../../lib/seo/page-metadata";
import { buildArticleSchema, buildBreadcrumbSchema } from "../../../lib/seo/structured-data";

type ArticleParams = Promise<{
  slug: string;
}>;

export const dynamicParams = false;

export async function generateStaticParams() {
  const slugs = await getAllArticleSlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: ArticleParams;
}): Promise<Metadata> {
  const { slug } = await params;
  const article = await getArticleBySlug(slug);

  if (!article) {
    notFound();
  }

  const locale = await getCurrentLocale();
  const dictionary = getDictionary(locale);
  const articleCopy = dictionary.articleCopy[article.slug as keyof typeof dictionary.articleCopy];
  const title = articleCopy?.title ?? article.frontmatter.title;
  const description = articleCopy?.description ?? article.frontmatter.description;

  return buildArticleMetadata({
    title: `${title} | ${dictionary.site.nav.articles}`,
    description,
    locale,
    path: `/articles/${article.slug}`,
    publishedAt: article.frontmatter.publishedAt,
    updatedAt: article.frontmatter.updatedAt ?? article.frontmatter.publishedAt,
    authors: [getLocalizedArticleAuthor(locale)],
  });
}

export default async function ArticleDetailPage({
  params,
}: {
  params: ArticleParams;
}) {
  const { slug } = await params;
  const locale = await getCurrentLocale();
  const dictionary = getDictionary(locale);
  const article = await getArticleBySlug(slug);

  if (!article) {
    notFound();
  }

  const updatedAt = article.frontmatter.updatedAt ?? article.frontmatter.publishedAt;
  const articleCopy = dictionary.articleCopy[article.slug as keyof typeof dictionary.articleCopy];
  const title = articleCopy?.title ?? article.frontmatter.title;
  const description = articleCopy?.description ?? article.frontmatter.description;
  const summary = articleCopy?.summary ?? article.frontmatter.summary;
  const canonical = article.frontmatter.canonical ?? getArticleCanonicalUrl(article.slug);
  const canonicalPath = `/articles/${article.slug}`;
  const author = getLocalizedArticleAuthor(locale);
  const tags = getLocalizedArticleTags(locale, article.frontmatter.tags);
  const structuredData = buildArticleSchema({
    title,
    description,
    publishedAt: article.frontmatter.publishedAt,
    updatedAt,
    author,
    path: canonicalPath,
    tags,
    canonicalUrl: canonical,
    locale,
  });
  const breadcrumbStructuredData = buildBreadcrumbSchema([
    { name: "StressSignal", path: "/" },
    { name: dictionary.site.nav.articles, path: "/articles" },
    { name: title, path: canonicalPath },
  ]);
  const visibleSections = (articleCopy?.sections ?? []) as Array<{
    title: string;
    body: string[];
    bullets?: string[];
  }>;

  return (
    <>
      <PageShell
        title={title}
        subtitle={summary}
        dictionary={dictionary}
        locale={locale}
      >
        <div className="flex flex-wrap gap-2">
          {tags.slice(0, 4).map((tag) => (
            <Badge key={tag} tone={tag.toLowerCase().includes("risk") || tag.includes("风险") ? "rose" : "emerald"}>
              {tag}
            </Badge>
          ))}
        </div>

        <div className="grid gap-4 lg:grid-cols-[1fr_330px]">
          <article className="space-y-5">
            <Card className="border-emerald-200 bg-emerald-50/70 p-4">
              <p className="text-base leading-7 text-slate-800">{description}</p>
              <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm text-slate-600">
                <span>{dictionary.common.publishedAt} {formatDateLabel(article.frontmatter.publishedAt, locale, dictionary)}</span>
                <span>{dictionary.common.updated} {formatDateLabel(updatedAt, locale, dictionary)}</span>
                <span>{author}</span>
              </div>
            </Card>

            {visibleSections.slice(0, 2).map((section, index) => (
              <section key={section.title} className="space-y-3">
                <h2 className="text-2xl font-semibold tracking-tight text-slate-950">
                  {index + 1}. {section.title}
                </h2>
                {section.body.map((paragraph) => (
                  <p key={paragraph} className="text-sm leading-7 text-slate-700">
                    {paragraph}
                  </p>
                ))}
                {"bullets" in section && section.bullets ? (
                  <ul className="list-disc space-y-1 pl-5 text-sm leading-7 text-slate-700">
                    {section.bullets.map((bullet) => (
                      <li key={bullet}>{bullet}</li>
                    ))}
                  </ul>
                ) : null}
              </section>
            ))}

            <Card className="p-5">
              <SectionHeading title={dictionary.articleDetail.comparisonTitle} />
              <div className="mt-4 overflow-hidden rounded-lg border border-slate-200">
                <table className="min-w-full text-sm">
                  <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-3 py-3">{dictionary.articleDetail.comparisonHeaders.indicator}</th>
                      <th className="px-3 py-3">{dictionary.articleDetail.comparisonHeaders.vixOnly}</th>
                      <th className="px-3 py-3">{dictionary.articleDetail.comparisonHeaders.crossRead}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dictionary.articleDetail.comparisonRows.map((row) => (
                      <tr key={row[0]} className="border-t border-slate-100">
                        <td className="px-3 py-3 font-semibold text-slate-900">{row[0]}</td>
                        <td className="px-3 py-3 text-slate-500">{row[1]}</td>
                        <td className="px-3 py-3 text-rose-600">{row[2]}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>

            {visibleSections.slice(2).map((section, index) => (
              <section key={section.title} className="space-y-3">
                <h2 className="text-2xl font-semibold tracking-tight text-slate-950">
                  {index + 3}. {section.title}
                </h2>
                {section.body.map((paragraph) => (
                  <p key={paragraph} className="text-sm leading-7 text-slate-700">
                    {paragraph}
                  </p>
                ))}
                {"bullets" in section && section.bullets ? (
                  <ul className="list-disc space-y-1 pl-5 text-sm leading-7 text-slate-700">
                    {section.bullets.map((bullet) => (
                      <li key={bullet}>{bullet}</li>
                    ))}
                  </ul>
                ) : null}
              </section>
            ))}

            {!articleCopy ? (
              <section className="space-y-4 border-t border-slate-200 pt-4">
                {article.content}
              </section>
            ) : null}

            <section
              data-testid="article-disclaimer-marker"
              className="rounded-lg border border-amber-200 bg-amber-50 p-3"
            >
              <DisclaimerText dictionary={dictionary} />
            </section>
          </article>

          <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
            <Card className="p-5">
              <SectionHeading title={dictionary.articleDetail.articleNavTitle} />
              <ol className="mt-4 space-y-3 border-l-2 border-emerald-600 pl-4 text-sm text-slate-700">
                {visibleSections.map((section, index) => (
                  <li key={section.title}>
                    <span className="numeric mr-2 font-semibold text-emerald-700">{index + 1}</span>
                    {section.title}
                  </li>
                ))}
              </ol>
            </Card>

            <Card className="p-5">
              <SectionHeading title={dictionary.articleDetail.relatedIndicatorsTitle} />
              <div className="mt-3 flex flex-wrap gap-2">
                {["VIX", "VIX/VXV Term Proxy", "RVX", "STLFSI4", "NFCI"].map((item) => (
                  <Badge key={item} tone="emerald">{item}</Badge>
                ))}
              </div>
            </Card>

            <Card className="p-5">
              <SectionHeading title={dictionary.articleDetail.relatedArticlesTitle} />
              <div className="mt-3 space-y-3">
                {dictionary.articleDetail.relatedArticles.map((item) => (
                  <TrackedLink
                    key={item.href}
                    href={hrefWithLocale(item.href, locale)}
                    className="block border-b border-slate-100 pb-3 text-sm text-slate-700 last:border-0 last:pb-0 hover:text-emerald-800"
                    eventName="select_article"
                    eventProps={{
                      slug: item.href.replace("/articles/", ""),
                      current_slug: article.slug,
                      source: "article_detail_related",
                      locale,
                    }}
                  >
                    <span className="font-semibold">{item.label}</span>
                    <span className="mt-1 block text-xs text-slate-500">{dictionary.articleDetail.relatedArticleCta}</span>
                  </TrackedLink>
                ))}
              </div>
            </Card>
          </aside>
        </div>
      </PageShell>
      <script
        id="article-json-ld"
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@graph": [structuredData, breadcrumbStructuredData],
          }),
        }}
      />
    </>
  );
}
