"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  BarChart3,
  BookOpen,
  ChevronDown,
  Database,
  Home,
  Layers3,
  LibraryBig,
  type LucideIcon,
} from "lucide-react";

import { LanguageSwitcher } from "@/components/i18n/language-switcher";
import type { Dictionary, Locale } from "@/lib/i18n/dictionary";
import { hrefWithLocale } from "@/lib/i18n/locale-url";
import { siteMeta } from "@/lib/market-risk-metadata";
import { PRIMARY_NAVIGATION, isRouteActive } from "@/lib/navigation";
import { cn } from "@/lib/utils";

const primaryIcons: Record<string, LucideIcon> = {
  home: Home,
  riskLayers: Layers3,
  indicators: LibraryBig,
  learn: BookOpen,
  data: Database,
};

const menuIcons: Record<string, LucideIcon> = {
  tailRisk: Layers3,
  sentiment: BarChart3,
  fearGreed: BarChart3,
  globalRisk: BarChart3,
  howToRead: BookOpen,
  articles: LibraryBig,
};

export function SiteHeader({
  dictionary,
  locale,
}: {
  dictionary: Dictionary;
  locale: Locale;
}) {
  const pathname = usePathname() || "/";
  const isActive = (href: string) => isRouteActive(pathname, href);
  const [openMenuKey, setOpenMenuKey] = useState<string | null>(null);
  const closeMenuTimer = useRef<number | null>(null);

  const clearCloseMenuTimer = () => {
    if (closeMenuTimer.current !== null) {
      window.clearTimeout(closeMenuTimer.current);
      closeMenuTimer.current = null;
    }
  };

  const openMenu = (key: string) => {
    clearCloseMenuTimer();
    setOpenMenuKey(key);
  };

  const scheduleCloseMenu = () => {
    clearCloseMenuTimer();
    closeMenuTimer.current = window.setTimeout(() => {
      setOpenMenuKey(null);
      closeMenuTimer.current = null;
    }, 220);
  };

  useEffect(() => {
    return () => {
      if (closeMenuTimer.current !== null) {
        window.clearTimeout(closeMenuTimer.current);
      }
    };
  }, []);

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/92 backdrop-blur-md">
      <div className="mx-auto flex w-full max-w-[1480px] flex-col gap-3 px-5 py-3 sm:px-7 lg:flex-row lg:items-center lg:justify-between lg:px-8">
        <Link
          href={hrefWithLocale("/", locale)}
          className="flex items-center gap-2 text-xl font-semibold tracking-tight text-slate-950 hover:text-slate-700"
        >
          <Image
            src="/logo-mark.svg"
            alt=""
            width={24}
            height={24}
            className="h-6 w-6 rounded-md"
          />
          {siteMeta.brand}
        </Link>
        <div className="flex min-w-0 w-full flex-wrap items-center gap-3 lg:w-auto lg:justify-end">
          <nav className="flex min-w-0 flex-1 flex-wrap items-center gap-1 text-sm font-medium lg:flex-none">
            {PRIMARY_NAVIGATION.map((route) => {
              const Icon = primaryIcons[route.key] ?? Home;

              if (route.kind === "group") {
                const active = route.items.some((item) => isActive(item.href));
                const menuOpen = openMenuKey === route.key;

                return (
                  <div
                    key={route.key}
                    className="group relative shrink-0"
                    onFocus={() => openMenu(route.key)}
                    onBlur={scheduleCloseMenu}
                    onMouseEnter={() => openMenu(route.key)}
                    onMouseLeave={scheduleCloseMenu}
                  >
                    <Link
                      href={hrefWithLocale(route.href, locale)}
                      className={cn(
                        "relative inline-flex h-9 items-center gap-1.5 rounded-md px-3 text-slate-600 transition hover:bg-slate-100 hover:text-slate-950 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500",
                        active && "bg-emerald-50 text-emerald-800",
                        menuOpen && "bg-slate-100 text-slate-950",
                      )}
                      aria-haspopup="menu"
                      aria-expanded={menuOpen}
                    >
                      <Icon aria-hidden className="h-4 w-4" />
                      {dictionary.site.nav[route.key]}
                      <ChevronDown
                        aria-hidden
                        className={cn(
                          "h-3.5 w-3.5 text-slate-400 transition",
                          (menuOpen || active) && "text-emerald-700",
                        )}
                      />
                      {active ? (
                        <span className="absolute inset-x-3 bottom-0 h-0.5 rounded-full bg-emerald-600" />
                      ) : null}
                    </Link>
                    <div
                      className={cn(
                        "invisible absolute left-0 top-full z-50 w-64 pt-2 opacity-0 transition duration-150 group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100",
                        menuOpen && "visible opacity-100",
                      )}
                    >
                      <div
                        className={cn(
                          "translate-y-1 rounded-lg border border-slate-200 bg-white p-2 shadow-[0_18px_50px_rgba(15,23,42,0.14)] transition duration-150 group-hover:translate-y-0 group-focus-within:translate-y-0",
                          menuOpen && "translate-y-0",
                        )}
                      >
                        {route.items.map((item) => {
                          const ItemIcon = menuIcons[item.key] ?? BarChart3;
                          const itemActive = isActive(item.href);

                          return (
                            <Link
                              key={item.href}
                              href={hrefWithLocale(item.href, locale)}
                              className={cn(
                                "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm text-slate-600 transition hover:bg-slate-50 hover:text-slate-950 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500",
                                itemActive && "bg-emerald-50 text-emerald-800",
                              )}
                            >
                              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-md border border-slate-200 bg-slate-50 text-slate-500">
                                <ItemIcon aria-hidden className="h-4 w-4" />
                              </span>
                              <span className="font-semibold">
                                {dictionary.site.nav[item.key]}
                              </span>
                            </Link>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                );
              }

              const active = isActive(route.href);
              return (
                <Link
                  key={route.href}
                  href={hrefWithLocale(route.href, locale)}
                  className={cn(
                    "relative inline-flex h-9 shrink-0 items-center gap-1.5 rounded-md px-3 text-slate-600 transition hover:bg-slate-100 hover:text-slate-950 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500",
                    active && "bg-emerald-50 text-emerald-800",
                  )}
                >
                  <Icon aria-hidden className="h-4 w-4" />
                  {dictionary.site.nav[route.key]}
                  {active ? (
                    <span className="absolute inset-x-3 bottom-0 h-0.5 rounded-full bg-emerald-600" />
                  ) : null}
                </Link>
              );
            })}
          </nav>
          <div className="shrink-0">
            <LanguageSwitcher
              currentLocale={locale}
              label={dictionary.site.languageLabel}
            />
          </div>
        </div>
      </div>
    </header>
  );
}
