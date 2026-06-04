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
  title: "StressSignal 市场风险看板",
  description:
    "用公开数据观察权益波动、金融压力和风险扩散的市场风险看板。",
  siteUrl: resolveSiteUrl(),
  brand: "StressSignal",
};

export const requiredPublicRoutes = [
  { label: "首页", href: "/" },
  { label: "指标", href: "/indicators" },
  { label: "怎么读", href: "/how-to-read" },
  { label: "风险笔记", href: "/articles" },
  { label: "数据源", href: "/data-sources" },
  { label: "关于", href: "/about" },
  { label: "隐私", href: "/privacy" },
  { label: "条款", href: "/terms" },
];
