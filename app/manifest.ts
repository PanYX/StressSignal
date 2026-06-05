import type { MetadataRoute } from "next";

import { siteMeta } from "../lib/market-risk-metadata";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "StressSignal Market Risk Dashboard",
    short_name: "StressSignal",
    description: siteMeta.description,
    start_url: "/",
    display: "standalone",
    background_color: "#f8fafc",
    theme_color: "#0f172a",
    icons: [
      {
        src: "/icon",
        sizes: "32x32",
        type: "image/png",
      },
      {
        src: "/apple-icon",
        sizes: "180x180",
        type: "image/png",
      },
      {
        src: "/logo-mark.svg",
        sizes: "512x512",
        type: "image/svg+xml",
        purpose: "maskable",
      },
    ],
  };
}
