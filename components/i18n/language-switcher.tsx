"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useState } from "react";

import { trackPlausibleEvent } from "@/lib/analytics";
import { LANGUAGE_OPTIONS, type Locale } from "@/lib/i18n/locales";

export function LanguageSwitcher({
  currentLocale,
  label,
}: {
  currentLocale: Locale;
  label: string;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname() ?? "/";
  const searchParams = useSearchParams();
  const currentLabel =
    LANGUAGE_OPTIONS.find((option) => option.code === currentLocale)?.label ?? "Language";

  const buildHref = (locale: Locale) => {
    const params = new URLSearchParams(searchParams);
    params.set("lang", locale);
    return `${pathname}?${params.toString()}`;
  };

  const closeMenu = () => {
    setOpen(false);
  };

  const trackLanguageMenu = (openNext: boolean) => {
    trackPlausibleEvent("toggle_language_menu", {
      open: openNext,
      locale: currentLocale,
      current_path: pathname,
    });
  };

  return (
    <div className="relative shrink-0">
      <button
        type="button"
        aria-label={label}
        aria-expanded={open}
        className="inline-flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
        onClick={() => {
          setOpen((value) => {
            const next = !value;
            trackLanguageMenu(next);
            return next;
          });
        }}
      >
        <span className="h-2 w-2 rounded-full bg-emerald-500" />
        <span>{currentLabel}</span>
      </button>
      {open ? (
        <div className="absolute right-0 z-20 mt-2 w-64 overflow-hidden rounded-lg border border-slate-200 bg-white p-2 shadow-lg">
          {LANGUAGE_OPTIONS.map((option) => (
            <a
              key={option.code}
              href={buildHref(option.code)}
              className={`block rounded-md px-4 py-3 text-base transition hover:bg-slate-50 ${
                option.code === currentLocale
                  ? "font-semibold text-emerald-700"
                  : "text-slate-800"
              }`}
              hrefLang={option.htmlLang}
              onClick={() => {
                trackPlausibleEvent("change_language", {
                  from_locale: currentLocale,
                  to_locale: option.code,
                  current_path: pathname,
                });
                closeMenu();
              }}
            >
              {option.label}
            </a>
          ))}
        </div>
      ) : null}
    </div>
  );
}
