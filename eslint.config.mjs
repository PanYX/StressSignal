import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "tests/e2e/.artifacts/**",
    "tests/e2e/.playwright-report/**",
    "tests/e2e/.e2e-runtime.json",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
