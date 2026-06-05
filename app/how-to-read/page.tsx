import type { Metadata } from "next";

import { TrackedLink } from "../../components/analytics/tracked-link";
import { PageShell } from "../../components/shared/page-shell";
import { DisclaimerText } from "../../components/shared/metric-metadata";
import { Badge, Card, SectionHeading } from "../../components/shared/ui-kit";
import { getCurrentLocale, getDictionary } from "../../lib/i18n/dictionary";
import { getLocalizedArticleAuthor, getLocalizedArticleTags } from "../../lib/i18n/article-metadata";
import { hrefWithLocale } from "../../lib/i18n/locale-url";
import { buildPageMetadata, toAbsoluteUrl } from "../../lib/seo/page-metadata";
import { buildArticleSchema } from "../../lib/seo/structured-data";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getCurrentLocale();
  const dictionary = getDictionary(locale);

  return buildPageMetadata({
    title: dictionary.howToRead.metaTitle,
    description: dictionary.howToRead.metaDescription,
    locale,
    path: "/how-to-read",
  });
}

export default async function HowToReadPage() {
  const locale = await getCurrentLocale();
  const dictionary = getDictionary(locale);
  const structuredData = buildArticleSchema({
    title: dictionary.howToRead.title,
    description: dictionary.howToRead.subtitle,
    publishedAt: "2026-01-01",
    updatedAt: "2026-05-28",
    author: getLocalizedArticleAuthor(locale),
    path: "/how-to-read",
    tags: getLocalizedArticleTags(locale, ["市场风险", "波动率", "VIX", "VXV", "NFCI", "STLFSI4", "methodology"]),
    canonicalUrl: toAbsoluteUrl("/how-to-read"),
    locale,
  });

  return (
    <>
      <PageShell
        title={dictionary.howToRead.title}
        subtitle={dictionary.howToRead.subtitle}
        dictionary={dictionary}
        locale={locale}
      >
        <section className="grid gap-4 lg:grid-cols-[1fr_0.48fr]">
          <Card className="p-5">
            <SectionHeading title={dictionary.howToRead.flowTitle} />
            <div className="mt-5 space-y-5">
              {dictionary.howToRead.flow.map((item, index) => (
                <div key={item.title} className="grid gap-4 md:grid-cols-[180px_1fr]">
                  <div className="flex items-center gap-3">
                    <span className="grid h-9 w-9 place-items-center rounded-full bg-emerald-700 text-sm font-semibold text-white">
                      {index + 1}
                    </span>
                    <h2 className="text-lg font-semibold text-slate-950">
                      {item.title.replace(/^\d+\.\s*/, "")}
                    </h2>
                  </div>
                  <p className="text-sm leading-6 text-slate-700">{item.body}</p>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-5">
            <SectionHeading title={dictionary.howToRead.checklistTitle} subtitle={dictionary.howToRead.checklistSubtitle} />
            <ul className="mt-4 space-y-3">
              {dictionary.howToRead.checklist.map((item) => (
                <li key={item} className="flex items-center justify-between gap-3 text-sm text-slate-700">
                  <span className="flex items-center gap-2">
                    <span className="grid h-5 w-5 place-items-center rounded-full border border-emerald-300 bg-emerald-50 text-xs text-emerald-700">✓</span>
                    {item}
                  </span>
                  <span className="text-slate-300">⋮⋮</span>
                </li>
              ))}
            </ul>
          </Card>
        </section>

        <section className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
          <Card className="p-5">
            <SectionHeading title={dictionary.howToRead.spreadTitle} />
            <div className="relative mt-4 grid gap-3 md:grid-cols-2">
              <div className="rounded-lg border border-emerald-200 bg-emerald-50/60 p-4">
                <h3 className="text-center text-base font-semibold text-emerald-800">{dictionary.howToRead.localRiskTitle}</h3>
                <ul className="mt-4 space-y-3 text-sm leading-6 text-slate-700">
                  {dictionary.howToRead.localRiskBullets.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
                <p className="mt-4 rounded-md border border-emerald-200 bg-white/70 px-3 py-2 text-xs text-emerald-800">
                  {dictionary.howToRead.localRiskMeaning}
                </p>
              </div>
              <div className="rounded-lg border border-rose-200 bg-rose-50/50 p-4">
                <h3 className="text-center text-base font-semibold text-rose-700">{dictionary.howToRead.spreadingRiskTitle}</h3>
                <ul className="mt-4 space-y-3 text-sm leading-6 text-slate-700">
                  {dictionary.howToRead.spreadingRiskBullets.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
                <p className="mt-4 rounded-md border border-rose-200 bg-white/70 px-3 py-2 text-xs text-rose-700">
                  {dictionary.howToRead.spreadingRiskMeaning}
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-5">
            <SectionHeading title={dictionary.howToRead.signalTableTitle} />
            <div className="mt-4 overflow-hidden rounded-lg border border-slate-200">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50 text-left text-xs text-slate-500">
                  <tr>
                    {dictionary.howToRead.signalTableHeaders.map((header) => (
                      <th key={header} className="px-3 py-3">{header}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {dictionary.howToRead.signalTableRows.map((row) => (
                    <tr key={row[0]} className="border-t border-slate-100">
                      <td className="px-3 py-3 font-semibold text-slate-900">{row[0]}</td>
                      <td className="px-3 py-3 text-slate-700">{row[1]}</td>
                      <td className="px-3 py-3 text-emerald-700">{row[2]}</td>
                      <td className="px-3 py-3 text-amber-700">{row[3]}</td>
                      <td className="px-3 py-3 text-rose-600">{row[4]}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-3 text-xs leading-5 text-slate-500">
              {dictionary.howToRead.signalTableNote}
            </p>
          </Card>
        </section>

        <section className="space-y-3">
          <SectionHeading title={dictionary.howToRead.misreadsTitle} />
          <div className="grid gap-3 md:grid-cols-3">
            {dictionary.howToRead.misreadItems.map(({ title, body }) => (
              <Card key={title} className="p-4">
                <Badge tone="rose">{dictionary.howToRead.misreadBadge}</Badge>
                <h3 className="mt-3 text-base font-semibold text-slate-950">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{body}</p>
              </Card>
            ))}
          </div>
        </section>

        <Card className="p-4">
          <SectionHeading title={dictionary.howToRead.nextTitle} />
          <div className="mt-3 flex flex-wrap gap-2">
            <TrackedLink
              href={hrefWithLocale("/indicators/vix", locale)}
              className="inline-flex rounded-md bg-emerald-700 px-3 py-2 text-sm font-semibold text-white"
              eventName="select_indicator"
              eventProps={{
                slug: "vix",
                source: "how_to_read_next_step",
                locale,
              }}
            >
              {dictionary.howToRead.vixCta}
            </TrackedLink>
            <TrackedLink
              href={hrefWithLocale("/indicators/stlfsi4", locale)}
              className="inline-flex rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700"
              eventName="select_indicator"
              eventProps={{
                slug: "stlfsi4",
                source: "how_to_read_next_step",
                locale,
              }}
            >
              {dictionary.howToRead.stlfsiCta}
            </TrackedLink>
            <TrackedLink
              href={hrefWithLocale("/data-sources", locale)}
              className="inline-flex rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700"
              eventName="click_cta"
              eventProps={{
                href: "/data-sources",
                source: "how_to_read_next_step",
                locale,
              }}
            >
              {dictionary.howToRead.dataCta}
            </TrackedLink>
          </div>
        </Card>
        <DisclaimerText dictionary={dictionary} />
      </PageShell>
      <script
        id="how-to-read-structured-data"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
    </>
  );
}
