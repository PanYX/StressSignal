import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

type RuntimeState = {
  appPid: number;
  processGroup: boolean;
  d1StatePath: string;
};

const STATE_PATH = path.resolve(process.cwd(), "tests/e2e/.e2e-runtime.json");

const killApp = (pid: number, processGroup: boolean) => {
  if (!Number.isFinite(pid) || pid <= 0) {
    return;
  }

  try {
    if (process.platform === "win32") {
      execFileSync("taskkill", ["/pid", `${pid}`, "/t", "/f"], {
        stdio: "ignore",
      });
      return;
    }

    process.kill(processGroup ? -pid : pid, "SIGTERM");
  } catch {
    // Best effort if Wrangler already exited.
  }
};

export default async function globalTeardown() {
  if (!fs.existsSync(STATE_PATH)) {
    return;
  }

  const stateText = fs.readFileSync(STATE_PATH, "utf8");
  const state = JSON.parse(stateText) as RuntimeState;

  killApp(state.appPid, state.processGroup);
  fs.rmSync(state.d1StatePath, { recursive: true, force: true });
  fs.rmSync(STATE_PATH, { force: true });
}
