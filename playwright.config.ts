import { defineConfig } from "@playwright/test";

const APP_PORT = Number.parseInt(process.env.E2E_APP_PORT ?? "43101", 10);

export default defineConfig({
  testDir: "./tests/e2e",
  outputDir: "./tests/e2e/.artifacts",
  timeout: 60_000,
  globalSetup: "./tests/e2e/global-setup.ts",
  globalTeardown: "./tests/e2e/global-teardown.ts",
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  expect: {
    timeout: 10_000,
  },
  use: {
    baseURL: `http://127.0.0.1:${APP_PORT}`,
    trace: "retain-on-failure",
  },
  reporter: [
    ["list"],
    ["html", { outputFolder: "tests/e2e/.playwright-report", open: "never" }],
  ],
});
