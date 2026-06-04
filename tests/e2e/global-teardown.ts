import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

type RuntimeState = {
  containerName: string;
  appPid: number;
};

const STATE_PATH = path.resolve(process.cwd(), "tests/e2e/.e2e-runtime.json");

const killApp = (pid: number) => {
  if (!Number.isFinite(pid) || pid <= 0) {
    return;
  }

  try {
    process.kill(pid, "SIGTERM");
  } catch {
    // best-effort for already exited process
  }
};

export default async function globalTeardown() {
  if (fs.existsSync(STATE_PATH)) {
    const stateText = fs.readFileSync(STATE_PATH, "utf8");
    const parsed = JSON.parse(stateText) as RuntimeState;

    killApp(parsed.appPid);

    try {
      execSync(`docker rm -f ${parsed.containerName}`, { stdio: "ignore" });
    } catch {
      // already removed or unavailable
    }

    try {
      fs.unlinkSync(STATE_PATH);
    } catch {
      // ignore cleanup failures
    }
  }
}
