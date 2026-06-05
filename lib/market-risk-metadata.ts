const envSiteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();
const vercelUrl = process.env.VERCEL_URL?.trim();

const normalizeSiteUrl = (value: string): string => {
  const withProtocol = /^https?:\/\//.test(value) ? value : `https://${value}`;
  const parsed = new URL(withProtocol);

  return parsed.origin;
};

const resolveSiteUrl = (): string => {
  if (envSiteUrl && envSiteUrl.length > 0) {
    return normalizeSiteUrl(envSiteUrl);
  }

  if (vercelUrl && vercelUrl.length > 0) {
    return normalizeSiteUrl(vercelUrl);
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error("NEXT_PUBLIC_SITE_URL is required in production.");
  }

  return "http://localhost:3000";
};

export const siteMeta = {
  title: "StressSignal Market Risk Dashboard",
  description:
    "Track VIX, volatility term structure, financial stress, and cross-market risk signals with public data.",
  siteUrl: resolveSiteUrl(),
  brand: "StressSignal",
};

export const requiredPublicRoutes = [
  { label: "首页", href: "/" },
  { label: "指标", href: "/indicators" },
  { label: "怎么读", href: "/how-to-read" },
  { label: "VIX Term Structure", href: "/vix-term-structure" },
  { label: "Financial Conditions Index", href: "/financial-conditions-index" },
  { label: "风险笔记", href: "/articles" },
  { label: "数据源", href: "/data-sources" },
  { label: "关于", href: "/about" },
  { label: "隐私", href: "/privacy" },
  { label: "条款", href: "/terms" },
];
