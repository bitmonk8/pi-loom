import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

// This config lives under config/vitest/; pin the project root to the repo root
// so the tests/** include globs resolve from the repository, not this dir.
const repoRoot = fileURLToPath(new URL("../../", import.meta.url));

// V20g-T — dedicated runner for the OPT-IN production-path language-surface
// conformance suite.
//
// Invoked only by `npm run test:conformance`; it is the standing regression net
// that drives the full documented language surface THROUGH the production
// composition (`discoverAndComposeFixtures` — the shipped `session_start`
// composition root re-exported by `extensions/index.ts` — the production
// `ThetaProducerDeps`, and the real whole-file parser), rather than through the
// isolated per-module seams the 1539 unit tests exercised while the shipped
// dispatch was broken. It is kept OUT of the default `npm test` (which excludes
// `tests/conformance/**`), a sibling to the H8a `npm run test:live` and H9a
// `npm run test:acceptance` runners. This config includes ONLY the conformance
// suite.
export default defineConfig({
  root: repoRoot,
  test: {
    include: ["tests/conformance/**/*.test.ts"],
    environment: "node",
    // The suite plants throwaway workspaces on disk and drives the production
    // composition synchronously (no live model turns); give ample room for the
    // on-disk discovery walks without stalling CI.
    testTimeout: 60000,
    hookTimeout: 60000,
  },
});
