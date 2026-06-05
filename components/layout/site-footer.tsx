import { TrackedLink } from "@/components/analytics/tracked-link";
import type { Dictionary } from "@/lib/i18n/dictionary";
import type { Locale } from "@/lib/i18n/locales";
import { hrefWithLocale } from "@/lib/i18n/locale-url";

const footerLinks = [
  { key: "about", href: "/about" },
  { key: "dataSources", href: "/data-sources" },
  { key: "privacy", href: "/privacy" },
  { key: "terms", href: "/terms" },
] as const;

export function SiteFooter({
  dictionary,
  locale,
}: {
  dictionary: Dictionary;
  locale: Locale;
}) {
  const year = String(new Date().getFullYear());
  return (
    <footer className="mt-auto border-t border-slate-200/80 bg-white/90">
      <div className="mx-auto flex w-full max-w-[1480px] flex-col gap-4 px-5 py-4 text-xs text-slate-500 sm:px-7 lg:flex-row lg:items-center lg:justify-between lg:px-8">
        <div className="space-y-1">
          <p>{dictionary.site.footerLeft.replace("{year}", year)}</p>
          <p>{dictionary.site.footerRight}</p>
        </div>
        <nav aria-label="Footer" className="flex flex-wrap items-center gap-x-4 gap-y-2">
          {footerLinks.map((link) => (
            <TrackedLink
              key={link.href}
              href={hrefWithLocale(link.href, locale)}
              className="text-slate-500 hover:text-emerald-800 hover:underline"
              eventName="navigate_footer"
              eventProps={{
                target: link.key,
                href: link.href,
                locale,
              }}
            >
              {dictionary.site.nav[link.key]}
            </TrackedLink>
          ))}
        </nav>
      </div>
    </footer>
  );
}
