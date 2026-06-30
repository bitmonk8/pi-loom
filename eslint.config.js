// H2a — loom's flat ESLint config. Wires the bespoke `eslint-plugin-loom-local`
// rules over `src/**`, the single production-code root, per the conventions.md
// cross-cutting rules ("Specific exception types only", "Sequential by
// default"). Test sources (`**/*.test.ts`) are unrestricted for the
// concurrency / blocking-runtime rules, so fixtures and harness code may use
// `Promise.all` and `*Sync` calls freely.
//
// The same rule modules are exercised under `npm test` (vitest) against
// fixtures via the ESLint `Linter` API; this config is what `eslint src` runs
// in CI and what those tests import, so the linted behaviour and the asserted
// behaviour are one wiring.

import tsParser from "@typescript-eslint/parser";
import loomLocal from "eslint-plugin-loom-local";

const languageOptions = {
  parser: tsParser,
  ecmaVersion: 2022,
  sourceType: "module",
};

export default [
  {
    // Production code: all three cross-cutting rules active.
    files: ["src/**/*.ts"],
    ignores: ["src/**/*.test.ts"],
    languageOptions,
    plugins: { "loom-local": loomLocal },
    rules: {
      "loom-local/no-broad-catch": "error",
      "loom-local/no-unguarded-promise-combinator": "error",
      "loom-local/no-blocking-sync": "error",
    },
  },
];
