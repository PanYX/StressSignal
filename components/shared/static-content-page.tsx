import { TrackedLink } from "@/components/analytics/tracked-link";
import type { Dictionary, ArticleSection, Locale } from "@/lib/i18n/dictionary";
import { hrefWithLocale } from "@/lib/i18n/locale-url";

import { Card, SectionHeading } from "./ui-kit";

type StaticContentPageProps = {
  readonly sections: ArticleSection[];
  readonly dictionary: Dictionary;
  readonly locale: Locale;
  readonly ctaHref?: string;
  readonly ctaLabel?: string;
};

const workflowToneClasses = [
  "border-emerald-200 bg-emerald-50 text-emerald-700",
  "border-cyan-200 bg-cyan-50 text-cyan-700",
  "border-slate-200 bg-white text-slate-700",
  "border-teal-200 bg-teal-50 text-teal-700",
  "border-amber-200 bg-amber-50 text-amber-700",
] as const;

export function StaticContentPage({
  sections,
  dictionary,
  locale,
  ctaHref,
  ctaLabel,
}: StaticContentPageProps) {
  return (
    <div className="space-y-5">
      <section className="grid gap-4 lg:grid-cols-[1fr_0.48fr]">
        <div className="space-y-3">
          {sections.map((section, index) => (
            <Card key={section.title} className="p-5">
              <div className="flex gap-4">
                <div className={`grid h-14 w-14 shrink-0 place-items-center rounded-full border text-2xl ${
                  index === 1
                    ? "border-rose-200 bg-rose-50 text-rose-600"
                    : index === sections.length - 1
                      ? "border-amber-200 bg-amber-50 text-amber-700"
                      : "border-emerald-200 bg-emerald-50 text-emerald-700"
                }`}
                >
                  {index === 1 ? "×" : index === sections.length - 1 ? "!" : "✓"}
                </div>
                <div>
                  <h2 className="text-xl font-semibold tracking-tight text-slate-950">{section.title}</h2>
                  {section.body.map((paragraph) => (
                    <p key={paragraph} className="mt-2 text-sm leading-7 text-slate-600">
                      {paragraph}
                    </p>
                  ))}
                </div>
              </div>
            </Card>
          ))}
        </div>

        <aside>
          <Card className="p-5">
            <SectionHeading title={dictionary.staticContent.principlesTitle} />
            <div className="mt-5 divide-y divide-slate-100">
              {dictionary.staticContent.principleCards.map(({ title, body }, index) => (
                <article key={title} className="flex gap-3 py-4 first:pt-0 last:pb-0">
                  <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full border border-emerald-200 bg-emerald-50 text-xs font-semibold text-emerald-700">
                    {index + 1}
                  </span>
                  <div className="min-w-0">
                    <h3 className="text-base font-semibold leading-6 text-slate-950">{title}</h3>
                    <p className="mt-1 text-sm leading-6 text-slate-600">{body}</p>
                  </div>
                </article>
              ))}
            </div>
          </Card>
        </aside>
      </section>

      <Card className="p-5">
        <SectionHeading title={dictionary.staticContent.workflowTitle} />
        <ol className="mt-4 overflow-hidden rounded-lg border border-slate-200 bg-[linear-gradient(135deg,rgba(16,185,129,0.08),rgba(255,255,255,0.94)_45%,rgba(8,145,178,0.08))] px-4 py-5 md:grid md:grid-cols-5 md:gap-0">
          {dictionary.staticContent.workflowSteps.map((step, index) => (
            <li key={step.title} className="relative pb-6 last:pb-0 md:pb-0">
              {index < dictionary.staticContent.workflowSteps.length - 1 ? (
                <>
                  <span aria-hidden className="absolute bottom-0 left-5 top-10 w-px bg-slate-200 md:hidden" />
                  <span aria-hidden className="absolute left-[calc(50%+22px)] right-[-50%] top-5 hidden h-px bg-slate-200 md:block" />
                </>
              ) : null}
              <div className="relative flex gap-3 md:block md:px-3 md:text-center">
                <span
                  className={`${workflowToneClasses[index % workflowToneClasses.length]} relative z-10 grid h-10 w-10 shrink-0 place-items-center rounded-full border text-sm font-semibold shadow-[0_6px_16px_rgba(15,23,42,0.08)] md:mx-auto`}
                >
                  {index + 1}
                </span>
                <div className="min-w-0 md:mt-4">
                  <p className="text-sm font-semibold leading-5 text-slate-950">{step.title}</p>
                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    {step.body}
                  </p>
                </div>
              </div>
            </li>
          ))}
        </ol>
      </Card>

      <Card className="p-4">
        <div className="flex flex-wrap items-center gap-4 text-sm">
          <span className="font-semibold text-slate-950">{dictionary.staticContent.relatedLinksTitle}</span>
          <TrackedLink
            href={hrefWithLocale("/privacy", locale)}
            className="text-slate-600 hover:text-emerald-800"
            eventName="click_cta"
            eventProps={{ href: "/privacy", source: "static_related_links", locale }}
          >
            {dictionary.site.nav.privacy} →
          </TrackedLink>
          <TrackedLink
            href={hrefWithLocale("/terms", locale)}
            className="text-slate-600 hover:text-emerald-800"
            eventName="click_cta"
            eventProps={{ href: "/terms", source: "static_related_links", locale }}
          >
            {dictionary.site.nav.terms} →
          </TrackedLink>
          <TrackedLink
            href={hrefWithLocale("/data-sources", locale)}
            className="text-slate-600 hover:text-emerald-800"
            eventName="click_cta"
            eventProps={{ href: "/data-sources", source: "static_related_links", locale }}
          >
            {dictionary.site.nav.dataSources} →
          </TrackedLink>
          <TrackedLink
            href={hrefWithLocale("/how-to-read", locale)}
            className="text-slate-600 hover:text-emerald-800"
            eventName="click_cta"
            eventProps={{ href: "/how-to-read", source: "static_related_links", locale }}
          >
            {dictionary.site.nav.howToRead} →
          </TrackedLink>
          {ctaHref && ctaLabel ? (
            <TrackedLink
              href={hrefWithLocale(ctaHref, locale)}
              className="ml-auto rounded-md bg-emerald-700 px-3 py-2 font-semibold text-white hover:bg-emerald-800"
              eventName="click_cta"
              eventProps={{
                href: ctaHref,
                label: ctaLabel,
                source: "static_content_cta",
                locale,
              }}
            >
              {ctaLabel}
            </TrackedLink>
          ) : null}
        </div>
      </Card>
    </div>
  );
}
