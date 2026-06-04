import { closeDb } from "../lib/db/client";
import { runFredSync } from "../lib/sync/fred";

async function main() {
  const response = await runFredSync();
  console.log(JSON.stringify(response, null, 2));

  if (response.summary.hasFailures) {
    process.exitCode = 1;
  }
}

main()
  .catch((error) => {
    console.error("[sync-fred] failed:", error);
    process.exitCode = 1;
  })
  .finally(() => {
    void closeDb();
  });
