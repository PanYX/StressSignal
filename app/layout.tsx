import type { Metadata } from "next";

import "./globals.css";
import { PlausibleAnalytics } from "../components/analytics/plausible-analytics";
import { SiteShell } from "../components/layout/site-shell";
import { getCurrentLocale, getDictionary } from "../lib/i18n/dictionary";
import { getLanguageOption } from "../lib/i18n/locales";
import { siteMeta } from "../lib/market-risk-metadata";
import {
  buildOrganizationSchema,
  buildWebsiteSchema,
} from "../lib/seo/structured-data";

export const metadata: Metadata = {
  metadataBase: new URL(siteMeta.siteUrl),
  title: {
    default: `${siteMeta.title} | ${siteMeta.brand}`,
    template: `%s | ${siteMeta.brand}`,
  },
  description: siteMeta.description,
  applicationName: siteMeta.brand,
  keywords: [
    "market risk dashboard",
    "VIX term structure",
    "financial stress index",
    "financial conditions index",
    "volatility signals",
    "StressSignal",
  ],
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      {
        url: "/icon",
        sizes: "32x32",
        type: "image/png",
      },
      {
        url: "/logo-mark.svg",
        sizes: "512x512",
        type: "image/svg+xml",
      },
    ],
    apple: [
      {
        url: "/apple-icon",
        sizes: "180x180",
        type: "image/png",
      },
    ],
  },
  openGraph: {
    title: `${siteMeta.title} | ${siteMeta.brand}`,
    description: siteMeta.description,
    url: siteMeta.siteUrl,
    siteName: siteMeta.title,
    locale: "en_US",
    type: "website",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: `${siteMeta.title} | ${siteMeta.brand}`,
    description: siteMeta.description,
    images: ["/twitter-image"],
  },
  robots: {
    index: true,
    follow: true,
  },
  verification: {
    google: "SgXSQ_p4quBXEBEhGbHFsHLPGtvVcLoykDmh8rU5ZCc",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getCurrentLocale();
  const dictionary = getDictionary(locale);
  const language = getLanguageOption(locale);
  const structuredData = JSON.stringify({
    "@context": "https://schema.org",
    "@graph": [buildWebsiteSchema(locale), buildOrganizationSchema(locale)],
  });

  return (
    <html lang={language.htmlLang} suppressHydrationWarning>
      <body>
        <PlausibleAnalytics />
        <SiteShell dictionary={dictionary} locale={locale}>
          {children}
        </SiteShell>
        <script
          id="global-structured-data"
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: structuredData }}
        />
      </body>
    </html>
  );
}
