import { describe, it, expect } from "vitest";
import { requireLiveProvider, runProbe } from "./probe-harness";

describe("hardening harness smoke", () => {
  const provider = requireLiveProvider();

  it("registers a project loom and captures the deterministic user turn text", async () => {
    const probe = await runProbe({
      provider,
      files: [
        {
          source: "project",
          path: "smoke.loom",
          text: [
            "---",
            "description: smoke",
            "mode: prompt",
            "---",
            "let x = 2 + 3",
            "@`COMPUTED=${x} say ok`",
          ].join("\n"),
        },
      ],
      drives: ["/smoke"],
    });
    try {
      expect(probe.registeredNames).toContain("smoke");
      // Deterministic: the user-turn text the loom code computed.
      const allUser = probe.turns[0].userTexts.join("\n");
      expect(allUser).toContain("COMPUTED=5");
    } finally {
      await probe.dispose();
    }
  });
});
