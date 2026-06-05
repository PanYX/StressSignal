import type { NextConfig } from "next";

const assetPrefix = (
  process.env.NEXT_PUBLIC_ASSET_PREFIX ??
  process.env.ASSET_PREFIX ??
  ""
).replace(/\/$/, "");

const nextConfig: NextConfig = {
  allowedDevOrigins: ["127.0.0.1"],
  assetPrefix: assetPrefix || undefined,
  generateBuildId: async () => process.env.NEXT_BUILD_ID || null,
  output: "standalone",
};

export default nextConfig;
