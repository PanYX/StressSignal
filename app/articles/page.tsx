import type { Metadata } from "next";

import { TrackedLink } from "../../components/analytics/tracked-link";
import { PageShell } from "../../components/shared/page-shell";
import { Badge, Card, SectionHeading } from "../../components/shared/ui-kit";
import { getAllArticlesMeta } from "../../lib/content/articles";
import { formatDateLabel } from "../../components/shared/format";
import { getCurrentLocale, getDictionary } from "../../lib/i18n/dictionary";
import { getLocalizedArticleTags } from "../../lib/i18n/article-metadata";
import { hrefWithLocale } from "../../lib/i18n/locale-url";
import { buildPageMetadata } from "../../lib/seo/page-metadata";

import type { ArticleMeta } from "../../lib/content/articles";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getCurrentLocale();
  const dictionary = getDictionary(locale);

  return buildPageMetadata({
    title: dictionary.articlesPage.metaTitle,
    description: dictionary.articlesPage.metaDescription,
    locale,
    path: "/articles",
  });
}

export default async function ArticlesPage() {
  const locale = await getCurrentLocale();
  const dictionary = getDictionary(locale);
  const articles: ArticleMeta[] = await getAllArticlesMeta();
  const readingPathLinks = [
    "/articles/what-is-vix",
    "/articles/why-not-just-vix",
    "/articles/stlfsi-vs-nfci",
  ];
  const relatedIndicators = ["VIX", "VIX / VXN / RVX", "STLFSI4 / NFCI"];

  return (
    <PageShell
      title={dictionary.articlesPage.title}
      subtitle={dictionary.articlesPage.subtitle}
      dictionary={dictionary}
      locale={locale}
    >
      <Card className="border-emerald-200 bg-emerald-50/60 p-4">
        <p className="text-sm leading-6 text-emerald-900">
          {dictionary.articlesPage.intro}
        </p>
      </Card>

      <section className="grid gap-4 lg:grid-cols-[290px_1fr_260px]">
        <Card className="p-4">
          <SectionHeading title={dictionary.articlesPage.readingPathTitle} />
          <div className="mt-4 space-y-3">
            {dictionary.articlesPage.readingPath.map((item, index) => (
              <TrackedLink
                key={item.title}
                href={hrefWithLocale(readingPathLinks[index] ?? "/articles", locale)}
                aria-label={dictionary.articlesPage.readingPathAria
                  .replace("{index}", String(index + 1))
                  .replace("{title}", item.title)}
                className="block rounded-lg border border-slate-200 bg-white p-4 transition hover:border-emerald-200 hover:bg-emerald-50/40"
                eventName="select_article"
                eventProps={{
                  slug: readingPathLinks[index]?.replace("/articles/", "") ?? "articles",
                  source: "reading_path",
                  rank: index + 1,
                  locale,
                }}
              >
                <span className="grid h-8 w-8 place-items-center rounded-full bg-emerald-700 text-sm font-semibold text-white">
                  {index + 1}
                </span>
                <h3 className="mt-3 text-base font-semibold text-slate-950">{item.title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{item.body}</p>
                <p className="mt-3 text-xs text-emerald-700">
                  {dictionary.articlesPage.relatedIndicatorPrefix}{relatedIndicators[index]}
                </p>
              </TrackedLink>
            ))}
          </div>
        </Card>

        <div className="grid gap-3 md:grid-cols-2">
          {articles.map((article, index) => {
            const { slug, frontmatter } = article;
            const copy = dictionary.articleCopy[slug as keyof typeof dictionary.articleCopy];
            const tags = getLocalizedArticleTags(locale, frontmatter.tags).slice(0, 2);
            return (
              <TrackedLink
                key={slug}
                href={hrefWithLocale(`/articles/${slug}`, locale)}
                className="group rounded-lg border border-slate-200 bg-white p-5 shadow-[0_8px_22px_rgba(15,23,42,0.04)] transition hover:-translate-y-0.5 hover:border-emerald-200 hover:shadow-[0_12px_30px_rgba(15,23,42,0.08)]"
                eventName="select_article"
                eventProps={{
                  slug,
                  source: "article_grid",
                  rank: index + 1,
                  locale,
                }}
              >
                <span className="grid h-6 w-6 place-items-center rounded-md bg-emerald-700 text-xs font-semibold text-white">
                  {index + 1}
                </span>
                <h2 className="mt-4 text-xl font-semibold tracking-tight text-slate-950 group-hover:text-emerald-800">
                  {copy?.title ?? frontmatter.title}
                </h2>
                <div className="mt-3 flex flex-wrap gap-2">
                  {tags.map((tag) => (
                    <Badge key={tag} tone={tag.toLowerCase().includes("vix") ? "emerald" : "amber"}>
                      {tag}
                    </Badge>
                  ))}
                </div>
                <p className="mt-4 min-h-[64px] text-sm leading-6 text-slate-600">
                  {copy?.description ?? frontmatter.description}
                </p>
                <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-3 text-xs text-slate-500">
                  <span>{formatDateLabel(frontmatter.publishedAt, locale, dictionary)}</span>
                  <span>{dictionary.common.read}</span>
                </div>
              </TrackedLink>
            );
          })}
        </div>

        <aside className="space-y-4">
          <Card className="p-4">
            <SectionHeading title={dictionary.articlesPage.topicFilterTitle} />
            <div className="mt-4 space-y-2">
              {dictionary.articlesPage.topics.map((topic, index) => (
                <div
                  key={topic}
                  className={`rounded-md border px-3 py-2 text-sm font-medium ${
                    index === 0
                      ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                      : "border-slate-200 bg-white text-slate-700"
                  }`}
                >
                  {topic}
                </div>
              ))}
            </div>
          </Card>
          <Card className="p-4">
            <SectionHeading title={dictionary.articlesPage.latestTitle} />
            <div className="mt-3 space-y-2 text-sm">
              {articles.slice(0, 5).map((article) => {
                const copy = dictionary.articleCopy[article.slug as keyof typeof dictionary.articleCopy];
                return (
                  <TrackedLink
                    key={article.slug}
                    href={hrefWithLocale(`/articles/${article.slug}`, locale)}
                    className="flex items-center justify-between gap-3 text-slate-600 hover:text-emerald-800"
                    eventName="select_article"
                    eventProps={{
                      slug: article.slug,
                      source: "latest_articles",
                      locale,
                    }}
                  >
                    <span className="truncate">{copy?.title ?? article.frontmatter.title}</span>
                    <span className="numeric shrink-0 text-xs text-slate-400">
                      {formatDateLabel(article.frontmatter.updatedAt ?? article.frontmatter.publishedAt, locale, dictionary)}
                    </span>
                  </TrackedLink>
                );
              })}
            </div>
          </Card>
        </aside>
      </section>

      <Card className="border-emerald-200 bg-emerald-50/70 p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-950">{dictionary.articlesPage.homeCtaTitle}</h2>
            <p className="mt-1 text-sm text-slate-600">{dictionary.articlesPage.homeCtaBody}</p>
          </div>
          <TrackedLink
            href={hrefWithLocale("/", locale)}
            className="rounded-md bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800"
            eventName="click_cta"
            eventProps={{
              href: "/",
              source: "articles_home_cta",
              locale,
            }}
          >
            {dictionary.articlesPage.homeCtaButton}
          </TrackedLink>
        </div>
      </Card>
    </PageShell>
  );
}
