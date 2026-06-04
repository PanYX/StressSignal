import type { Metadata } from "next";

import { PageShell } from "../../components/shared/page-shell";
import { DisclaimerText } from "../../components/shared/metric-metadata";
import { StaticContentPage } from "../../components/shared/static-content-page";
import { getCurrentLocale, getDictionary } from "../../lib/i18n/dictionary";
import { buildPageMetadata } from "../../lib/seo/page-metadata";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getCurrentLocale();
  const dictionary = getDictionary(locale);

  return buildPageMetadata({
    title: dictionary.about.metaTitle,
    description: dictionary.about.metaDescription,
    locale,
    path: "/about",
  });
}

export default async function AboutPage() {
  const locale = await getCurrentLocale();
  const dictionary = getDictionary(locale);

  return (
    <PageShell
      title={dictionary.about.title}
      subtitle={dictionary.about.subtitle}
      dictionary={dictionary}
      locale={locale}
    >
      <StaticContentPage
        sections={dictionary.about.sections}
        dictionary={dictionary}
        locale={locale}
        ctaHref="/data-sources"
        ctaLabel={dictionary.about.cta}
      />
      <DisclaimerText dictionary={dictionary} />
    </PageShell>
  );
}
