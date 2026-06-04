import type { ReactNode } from "react";

import type { Dictionary, Locale } from "@/lib/i18n/dictionary";

import { SiteFooter } from "./site-footer";
import { SiteHeader } from "./site-header";

type SiteShellProps = {
  readonly children: ReactNode;
  readonly dictionary: Dictionary;
  readonly locale: Locale;
};

export function SiteShell({ children, dictionary, locale }: SiteShellProps) {
  return (
    <div className="dashboard-grid min-h-screen bg-[#f6f8f7] text-slate-950">
      <SiteHeader dictionary={dictionary} locale={locale} />
      <main className="mx-auto w-full max-w-[1480px] flex-1 px-5 py-7 sm:px-7 lg:px-8">
        {children}
      </main>
      <SiteFooter dictionary={dictionary} locale={locale} />
    </div>
  );
}
