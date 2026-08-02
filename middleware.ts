import { NextResponse, type NextRequest } from "next/server";

import {
  DEFAULT_LOCALE,
  LOCALE_COOKIE,
  LOCALE_HEADER,
  isLocale,
} from "./lib/i18n/locales";

export function middleware(request: NextRequest) {
  const queryLocale = request.nextUrl.searchParams.get("lang");
  const cookieLocale = request.cookies.get(LOCALE_COOKIE)?.value;
  const locale = isLocale(queryLocale)
    ? queryLocale
    : isLocale(cookieLocale)
      ? cookieLocale
      : DEFAULT_LOCALE;

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set(LOCALE_HEADER, locale);

  if (queryLocale === DEFAULT_LOCALE) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.searchParams.delete("lang");

    const response = NextResponse.redirect(redirectUrl);
    response.cookies.set(LOCALE_COOKIE, DEFAULT_LOCALE, {
      maxAge: 60 * 60 * 24 * 365,
      path: "/",
      sameSite: "lax",
    });

    return response;
  }

  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  if (isLocale(queryLocale)) {
    response.cookies.set(LOCALE_COOKIE, queryLocale, {
      maxAge: 60 * 60 * 24 * 365,
      path: "/",
      sameSite: "lax",
    });
  }

  return response;
}

export const config = {
  matcher: ["/((?!api|_next|.*\\..*).*)"],
};
