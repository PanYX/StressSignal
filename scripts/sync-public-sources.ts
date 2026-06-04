import { closeDb } from "../lib/db/client";
import { runPublicSourcesSync } from "../lib/sync/public-sources";

async function main() {
  const response = await runPublicSourcesSync();
  console.log(JSON.stringify(response, null, 2));

  if (response.summary.hasFailures) {
    process.exitCode = 1;
  }
}

main()
  .catch((error) => {
    console.error("[sync-public-sources] failed:", error);
    process.exitCode = 1;
  })
  .finally(() => {
    void closeDb();
  });
