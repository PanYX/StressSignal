import { recomputeIndicatorSnapshots } from "../lib/api/compute-snapshots";
import { withRemoteD1 } from "./d1-runtime";

async function main() {
  const args = new Set(process.argv.slice(2));
  const persist = args.has("--write") && !args.has("--dry-run");

  const result = await withRemoteD1((database) =>
    recomputeIndicatorSnapshots({ persist, database }),
  );

  if (!persist) {
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  console.log(
    `Recomputed and wrote ${result.rows.length} snapshot rows at ${result.computedAt}.`,
  );
  console.log(`Composite risk score: ${result.compositeRiskScore ?? "null"}`);
}

main().catch((error) => {
  console.error("[recompute-snapshots] failed:", error);
  process.exitCode = 1;
});
