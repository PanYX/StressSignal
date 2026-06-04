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
    title: dictionary.terms.metaTitle,
    description: dictionary.terms.metaDescription,
    locale,
    path: "/terms",
  });
}

export default async function TermsPage() {
  const locale = await getCurrentLocale();
  const dictionary = getDictionary(locale);

  return (
    <PageShell
      title={dictionary.terms.title}
      subtitle={dictionary.terms.subtitle}
      dictionary={dictionary}
      locale={locale}
    >
      <StaticContentPage
        sections={dictionary.terms.sections}
        dictionary={dictionary}
        locale={locale}
      />
      <DisclaimerText dictionary={dictionary} />
    </PageShell>
  );
}
