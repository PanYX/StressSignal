import { TrackedLink } from "@/components/analytics/tracked-link";
import type { Dictionary, Locale } from "@/lib/i18n/dictionary";
import { hrefWithLocale } from "@/lib/i18n/locale-url";

type BreadcrumbItem = {
  readonly label: string;
  readonly href?: string;
};

type PageShellProps = {
  readonly title: string;
  readonly subtitle?: string;
  readonly breadcrumbs?: BreadcrumbItem[];
  readonly children: React.ReactNode;
  readonly dictionary: Dictionary;
  readonly locale: Locale;
};

export function PageShell({
  title,
  subtitle,
  breadcrumbs,
  children,
  dictionary,
  locale,
}: PageShellProps) {
  return (
    <section className="space-y-5">
      <header className="max-w-5xl space-y-2">
        {breadcrumbs?.length ? (
          <nav aria-label={dictionary.common.breadcrumbLabel} className="text-xs font-medium text-slate-500">
            <ol className="flex flex-wrap items-center gap-2">
              {breadcrumbs.map((item, index) => {
                const isLast = index === breadcrumbs.length - 1;

                return (
                  <li key={`${item.label}-${index}`} className="flex items-center gap-2">
                    {item.href && !isLast ? (
                      <TrackedLink
                        href={hrefWithLocale(item.href, locale)}
                        className="text-slate-500 underline-offset-3 hover:text-emerald-800 hover:underline"
                        eventName="navigate_breadcrumb"
                        eventProps={{
                          href: item.href,
                          label: item.label,
                          locale,
                        }}
                      >
                        {item.label}
                      </TrackedLink>
                    ) : (
                      <span aria-current={isLast ? "page" : undefined} className={isLast ? "text-slate-700" : undefined}>
                        {item.label}
                      </span>
                    )}
                    {!isLast ? <span className="text-slate-300">/</span> : null}
                  </li>
                );
              })}
            </ol>
          </nav>
        ) : null}
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-700">
          {dictionary.site.eyebrow}
        </p>
        <h1 className="text-3xl font-semibold tracking-tight text-slate-950 sm:text-[2.4rem]">
          {title}
        </h1>
        {subtitle ? <p className="max-w-4xl text-base leading-7 text-slate-600">{subtitle}</p> : null}
      </header>
      {children}
    </section>
  );
}
