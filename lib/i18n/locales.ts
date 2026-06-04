export const DEFAULT_LOCALE = "zh" as const;
export const LOCALE_COOKIE = "stresssignal-locale";
export const LOCALE_HEADER = "x-stresssignal-locale";

export const SUPPORTED_LOCALES = [
  "en",
  "es",
  "de",
  "fr",
  "pt-BR",
  "ja",
  "zh",
] as const;

export type Locale = (typeof SUPPORTED_LOCALES)[number];

export const LANGUAGE_OPTIONS: Array<{
  code: Locale;
  label: string;
  htmlLang: string;
  dateLocale: string;
}> = [
  { code: "en", label: "English", htmlLang: "en", dateLocale: "en-US" },
  { code: "es", label: "Español", htmlLang: "es", dateLocale: "es-ES" },
  { code: "de", label: "Deutsch", htmlLang: "de", dateLocale: "de-DE" },
  { code: "fr", label: "Français", htmlLang: "fr", dateLocale: "fr-FR" },
  { code: "pt-BR", label: "Português (Brasil)", htmlLang: "pt-BR", dateLocale: "pt-BR" },
  { code: "ja", label: "日本語", htmlLang: "ja", dateLocale: "ja-JP" },
  { code: "zh", label: "中文", htmlLang: "zh-CN", dateLocale: "zh-CN" },
];

export function isLocale(value: string | null | undefined): value is Locale {
  return SUPPORTED_LOCALES.includes(value as Locale);
}

export function normalizeLocale(value: string | null | undefined): Locale {
  return isLocale(value) ? value : DEFAULT_LOCALE;
}

export function getLanguageOption(locale: Locale) {
  return LANGUAGE_OPTIONS.find((option) => option.code === locale) ?? LANGUAGE_OPTIONS.at(-1)!;
}
