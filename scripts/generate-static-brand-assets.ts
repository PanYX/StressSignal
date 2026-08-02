import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import sharp from "sharp";

const publicDirectory = path.join(process.cwd(), "public");

type GeneratedAsset = {
  filename: string;
  svg: string;
};

const socialCardSvg = `
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <rect width="1200" height="630" fill="#f8fafc"/>
  <rect x="54" y="54" width="1092" height="522" rx="32" fill="#ffffff" stroke="#cbd5e1"/>
  <rect x="54" y="446" width="1092" height="130" rx="0" fill="#0f172a"/>
  <path d="M54 544C132 537 171 502 241 513C307 523 330 558 398 549C469 540 488 500 558 504C635 509 655 558 733 550C810 543 821 512 893 517C979 523 1007 558 1146 523" fill="none" stroke="#10b981" stroke-width="8" stroke-linecap="round"/>
  <path d="M54 556C165 556 240 551 332 554C425 558 523 543 616 546C724 549 817 566 909 558C1002 550 1068 545 1146 547" fill="none" stroke="#f59e0b" stroke-width="6" stroke-linecap="round" opacity=".9"/>
  <rect x="102" y="96" width="70" height="70" rx="18" fill="#0f172a"/>
  <path d="M117 138H127L133 122L143 150L153 109L162 138H168" fill="none" stroke="#10b981" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>
  <circle cx="168" cy="138" r="4" fill="#f59e0b"/>
  <text x="190" y="127" fill="#0f172a" font-family="Arial, sans-serif" font-size="34" font-weight="800">StressSignal</text>
  <text x="190" y="157" fill="#64748b" font-family="Arial, sans-serif" font-size="20">stresssignal.app</text>
  <text x="1098" y="132" text-anchor="end" fill="#0f766e" font-family="Arial, sans-serif" font-size="22" font-weight="700">Public market risk dashboard</text>
  <text x="102" y="274" fill="#0f172a" font-family="Arial, sans-serif" font-size="67" font-weight="800">Market Risk Dashboard</text>
  <text x="102" y="339" fill="#475569" font-family="Arial, sans-serif" font-size="30">VIX, volatility term structure, financial stress and</text>
  <text x="102" y="381" fill="#475569" font-family="Arial, sans-serif" font-size="30">cross-market risk signals in one reading order.</text>
</svg>`;

const iconSvg = `
<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
  <rect width="32" height="32" rx="8" fill="#0f172a"/>
  <path d="M7 18H10L12 13L15 22L18 9L21 18H25" fill="none" stroke="#10b981" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"/>
  <circle cx="25" cy="18" r="1.8" fill="#f59e0b"/>
</svg>`;

const appleIconSvg = `
<svg xmlns="http://www.w3.org/2000/svg" width="180" height="180" viewBox="0 0 180 180">
  <rect width="180" height="180" rx="40" fill="#0f172a"/>
  <path d="M40 102H58L69 72L87 123L105 48L122 102H142" fill="none" stroke="#10b981" stroke-width="14" stroke-linecap="round" stroke-linejoin="round"/>
  <circle cx="142" cy="102" r="10" fill="#f59e0b"/>
  <path d="M40 139H142" fill="none" stroke="#e2e8f0" stroke-width="9" stroke-linecap="round" opacity=".85"/>
</svg>`;

const assets: GeneratedAsset[] = [
  { filename: "social-card.png", svg: socialCardSvg },
  { filename: "icon.png", svg: iconSvg },
  { filename: "apple-icon.png", svg: appleIconSvg },
];

function hasErrorCode(error: unknown): error is Error & { code: string } {
  return error instanceof Error && "code" in error && typeof error.code === "string";
}

async function writeAssetIfChanged(asset: GeneratedAsset): Promise<void> {
  const outputPath = path.join(publicDirectory, asset.filename);
  const output = await sharp(Buffer.from(asset.svg))
    .png({ adaptiveFiltering: true, compressionLevel: 9, palette: true })
    .toBuffer();

  let current: Buffer | undefined;
  try {
    current = await readFile(outputPath);
  } catch (error) {
    if (!hasErrorCode(error) || error.code !== "ENOENT") {
      throw error;
    }
  }

  if (!current?.equals(output)) {
    await writeFile(outputPath, output);
  }
}

async function main(): Promise<void> {
  await mkdir(publicDirectory, { recursive: true });
  await Promise.all(assets.map(writeAssetIfChanged));
}

void main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
