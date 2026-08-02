import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const defaultBudgetKiB = 2560;
const ansiPattern = /\u001b\[[0-9;]*m/gu;

function parseBudgetKiB(): number {
  const configured = process.env.WORKER_GZIP_BUDGET_KIB?.trim();
  if (!configured) {
    return defaultBudgetKiB;
  }

  const parsed = Number(configured);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error("WORKER_GZIP_BUDGET_KIB must be a positive number.");
  }

  return parsed;
}

function toKiB(value: number, unit: "B" | "KiB" | "MiB"): number {
  if (unit === "B") {
    return value / 1024;
  }
  if (unit === "MiB") {
    return value * 1024;
  }
  return value;
}

async function main(): Promise<void> {
  const pnpmCommand = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
  const { stdout, stderr } = await execFileAsync(
    pnpmCommand,
    ["exec", "wrangler", "deploy", "--dry-run"],
    {
      cwd: process.cwd(),
      encoding: "utf8",
      maxBuffer: 10 * 1024 * 1024,
    },
  );

  process.stdout.write(stdout);
  process.stderr.write(stderr);

  const output = `${stdout}\n${stderr}`.replace(ansiPattern, "");
  const match = output.match(/Total Upload:.*?\/ gzip:\s*([0-9.]+)\s*(B|KiB|MiB)/u);
  if (!match) {
    throw new Error("Could not read the compressed Worker size from Wrangler output.");
  }

  const gzipKiB = toKiB(Number(match[1]), match[2] as "B" | "KiB" | "MiB");
  const budgetKiB = parseBudgetKiB();
  const gzipMiB = gzipKiB / 1024;
  const budgetMiB = budgetKiB / 1024;

  if (gzipKiB > budgetKiB) {
    throw new Error(
      `Worker gzip size ${gzipMiB.toFixed(2)} MiB exceeds the ${budgetMiB.toFixed(2)} MiB project budget.`,
    );
  }

  console.log(
    `Worker gzip size ${gzipMiB.toFixed(2)} MiB is within the ${budgetMiB.toFixed(2)} MiB project budget.`,
  );
}

void main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
