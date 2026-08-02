import { seedIndicatorMetadata } from "../lib/db/seed";
import { withLocalD1, withRemoteD1 } from "./d1-runtime";

async function main() {
  const local = process.argv.includes("--local");
  const result = await (local ? withLocalD1 : withRemoteD1)(
    seedIndicatorMetadata,
  );
  console.log(
    `Seeded ${result.indicators} indicators and ${result.sources} source mappings in ${local ? "local" : "remote"} D1.`,
  );
}

main().catch((error) => {
  console.error("[seed-indicators] failed:", error);
  process.exitCode = 1;
});
