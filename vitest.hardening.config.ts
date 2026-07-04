import { defineConfig } from "vitest/config";

// Opt-in hardening probe runner. Live-host: boots the shipped extension against
// a real provider/model and drives real slash invocations. Excluded from the
// default `npm test`. Invoke with: npx vitest run --config vitest.hardening.config.ts
export default defineConfig({
  test: {
    include: ["tests/hardening/**/*.test.ts"],
    environment: "node",
    testTimeout: 180000,
    hookTimeout: 180000,
    // Probes boot real sessions; keep them serial to avoid provider contention.
    fileParallelism: false,
  },
});
