import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

// This config lives under config/vitest/; pin the project root to the repo root
// so the tests/** include globs resolve from the repository, not this dir.
const repoRoot = fileURLToPath(new URL("../../", import.meta.url));

// Opt-in hardening probe runner. Live-host: boots the shipped extension against
// a real provider/model and drives real slash invocations. Excluded from the
// default `npm test`. Invoke with: npx vitest run --config vitest.hardening.config.ts
export default defineConfig({
  root: repoRoot,
  test: {
    include: ["tests/hardening/**/*.test.ts"],
    environment: "node",
    testTimeout: 180000,
    hookTimeout: 180000,
    // Probes boot real sessions; keep them serial to avoid provider contention.
    fileParallelism: false,
  },
});
