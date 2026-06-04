import type { Locale } from "./locales";

export function hrefWithLocale(href: string, locale: Locale): string {
  if (!href.startsWith("/") || href.startsWith("//")) {
    return href;
  }

  const [pathAndQuery, hash] = href.split("#", 2);
  const [pathname, queryString] = pathAndQuery.split("?", 2);
  const params = new URLSearchParams(queryString);
  params.set("lang", locale);

  const nextQuery = params.toString();
  const nextHash = hash ? `#${hash}` : "";

  return `${pathname}${nextQuery ? `?${nextQuery}` : ""}${nextHash}`;
}
