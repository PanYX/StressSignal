export const RISK_LAYER_ROUTES = [
  { key: "tailRisk", href: "/tail-risk" },
  { key: "sentiment", href: "/sentiment" },
  { key: "fearGreed", href: "/fear-greed" },
  { key: "globalRisk", href: "/global-risk" },
] as const;

export const LEARNING_ROUTES = [
  { key: "howToRead", href: "/how-to-read" },
  { key: "vixTermStructure", href: "/vix-term-structure" },
  { key: "financialConditions", href: "/financial-conditions-index" },
  { key: "articles", href: "/articles" },
] as const;

export const PRIMARY_NAVIGATION = [
  { kind: "link", key: "home", href: "/" },
  {
    kind: "group",
    key: "riskLayers",
    href: "/tail-risk",
    items: RISK_LAYER_ROUTES,
  },
  { kind: "link", key: "indicators", href: "/indicators" },
  {
    kind: "group",
    key: "learn",
    href: "/how-to-read",
    items: LEARNING_ROUTES,
  },
  { kind: "link", key: "data", href: "/data-sources" },
] as const;

export const isRouteActive = (pathname: string, href: string) => {
  if (href === "/") {
    return pathname === "/";
  }

  return pathname.startsWith(href) || (
    href === "/global-risk" && pathname.startsWith("/markets/")
  );
};
