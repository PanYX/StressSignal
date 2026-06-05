import Script from "next/script";

const analyticsDisabled =
  process.env.NEXT_PUBLIC_DISABLE_ANALYTICS === "1" ||
  process.env.NEXT_PUBLIC_DISABLE_ANALYTICS === "true" ||
  process.env.NEXT_PUBLIC_LHCI === "1" ||
  process.env.NEXT_PUBLIC_LHCI === "true";

const plausibleDomain =
  process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN || "stresssignal.app";

const plausibleScriptSrc =
  process.env.NEXT_PUBLIC_PLAUSIBLE_SCRIPT_SRC ||
  "https://ev.adlude.com/js/script.file-downloads.hash.outbound-links.pageview-props.revenue.tagged-events.js";

export function PlausibleAnalytics() {
  if (analyticsDisabled) {
    return null;
  }

  return (
    <>
      <Script
        id="plausible-init"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html:
            "window.plausible = window.plausible || function() { (window.plausible.q = window.plausible.q || []).push(arguments) }",
        }}
      />
      <Script
        defer
        data-domain={plausibleDomain}
        src={plausibleScriptSrc}
        strategy="afterInteractive"
      />
    </>
  );
}
