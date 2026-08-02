import type { NextConfig } from "next";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

const assetPrefix = (
  process.env.NEXT_PUBLIC_ASSET_PREFIX ??
  process.env.ASSET_PREFIX ??
  ""
).replace(/\/$/, "");

const localWranglerConfig = process.env.STRESSSIGNAL_WRANGLER_CONFIG?.trim();
const localD1PersistPath = process.env.STRESSSIGNAL_D1_PERSIST_PATH?.trim();

const nextConfig: NextConfig = {
  allowedDevOrigins: ["127.0.0.1"],
  assetPrefix: assetPrefix || undefined,
  generateBuildId: async () => process.env.NEXT_BUILD_ID || null,
  output: "standalone",
};

export default nextConfig;

initOpenNextCloudflareForDev({
  configPath: localWranglerConfig || undefined,
  persist: localD1PersistPath ? { path: localD1PersistPath } : true,
  remoteBindings: process.env.STRESSSIGNAL_D1_REMOTE === "true",
});
