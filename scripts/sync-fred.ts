import { runFredSync } from "../lib/sync/fred";
import { withRemoteD1 } from "./d1-runtime";

async function main() {
  const response = await withRemoteD1((database) =>
    runFredSync({ database }),
  );
  console.log(JSON.stringify(response, null, 2));

  if (response.summary.hasFailures) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error("[sync-fred] failed:", error);
  process.exitCode = 1;
});
