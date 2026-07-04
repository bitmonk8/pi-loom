import { describe, it, expect } from "vitest";
import { requireLiveProvider, runProbe, type PlantedFile } from "./probe-harness";

// Hardening probes — DISCOVERY / CLI / SLASH-NAME VALIDITY / COLLISIONS /
// SETTINGS. Mostly zero-token: outcomes read off `registeredNames` and the
// error-severity `diagnostics` the load phase emits through `ctx.ui.notify`.
//
// NOTE ON OBSERVABILITY: the shipped composition root routes ONLY
// error-severity diagnostics to `ctx.ui.notify` (production-composition.ts
// `emitDiagnostic`); warnings (case-collision, cross-source-shadow,
// non-canonical-extension, settings-unreadable/invalid-json, unreadable) never
// reach `probe.diagnostics`. Probes therefore assert on error diagnostics and
// on `registeredNames`.
//
// Findings written to tests/hardening/findings/discovery-cli.md.

const provider = requireLiveProvider();
const FM = "---\nmode: prompt\nbind_model: claude-opus-4-8\n---\n@`say ok`\n";

function loom(source: PlantedFile["source"], path: string): PlantedFile {
  return { source, path, text: FM };
}

function msgs(probe: { diagnostics: readonly { message: string; type: string }[] }): string[] {
  return probe.diagnostics.map((d) => `${d.type}: ${d.message}`);
}

// ===========================================================================
// BASELINE — the discovery surface that behaves correctly (guards against
// regressions and frames the two bugs below).
// ===========================================================================

describe("discovery — correct behaviour (baseline guards)", () => {
  it("rejects the six invalid slash-name stems; the valid sibling registers", async () => {
    const probe = await runProbe({
      provider,
      files: [
        loom("project", "Foo.loom"),
        loom("project", "foo bar.loom"),
        loom("project", "foo!.loom"),
        loom("project", ".foo.loom"),
        loom("project", "--help.loom"),
        loom("project", "café.loom"),
        loom("project", "valid.loom"),
      ],
    });
    try {
      expect(probe.registeredNames).toEqual(["valid"]);
      const invalid = probe.diagnostics.filter((d) =>
        d.message.startsWith("slash names must be lowercase"),
      );
      expect(invalid).toHaveLength(6);
      expect(invalid.every((d) => d.type === "error")).toBe(true);
    } finally {
      await probe.dispose();
    }
  });

  it("non-recursive; .warp never a slash command; digit/underscore/hyphen stems ok", async () => {
    const probe = await runProbe({
      provider,
      files: [
        loom("project", "a.loom"),
        loom("project", "0.loom"),
        loom("project", "a-b_c9.loom"),
        loom("project", "personas.warp"),
        loom("project", "sub/nested.loom"),
      ],
    });
    try {
      expect(probe.registeredNames.sort()).toEqual(["0", "a", "a-b_c9"]);
    } finally {
      await probe.dispose();
    }
  });

  it("uppercase extension (Plan.LOOM) does not register", async () => {
    const probe = await runProbe({
      provider,
      files: [loom("project", "Plan.LOOM"), loom("project", "ok.loom")],
    });
    try {
      expect(probe.registeredNames).toEqual(["ok"]);
    } finally {
      await probe.dispose();
    }
  });

  it("CLI source outranks project for the same slash name (single registration)", async () => {
    const probe = await runProbe({
      provider,
      files: [loom("cli", "dup.loom"), loom("project", "dup.loom")],
    });
    try {
      expect(probe.registeredNames).toEqual(["dup"]);
    } finally {
      await probe.dispose();
    }
  });

  it("same-priority loom-vs-loom collision drops both (cross-format-collision error)", async () => {
    const probe = await runProbe({
      provider,
      files: [
        { source: "rel", path: ".pi/a/dup.loom", text: FM },
        { source: "rel", path: ".pi/b/dup.loom", text: FM },
      ],
      projectSettings: { loomPaths: ["a", "b"] },
    });
    try {
      expect(probe.registeredNames).toEqual([]);
      const collision = probe.diagnostics.filter((d) =>
        d.message.includes("collides at the same priority"),
      );
      expect(collision).toHaveLength(1);
      expect(collision[0]!.type).toBe("error");
      expect(collision[0]!.message).toContain("a/dup.loom");
      expect(collision[0]!.message).toContain("b/dup.loom");
    } finally {
      await probe.dispose();
    }
  });

  it("settings loomPaths: non-.loom file entry -> invalid-extension error", async () => {
    const probe = await runProbe({
      provider,
      files: [{ source: "rel", path: ".pi/extra/notes.md", text: "x" }],
      projectSettings: { loomPaths: ["extra/notes.md"] },
    });
    try {
      expect(probe.registeredNames).toEqual([]);
      expect(msgs(probe)).toEqual([
        expect.stringContaining("does not end in .loom") as unknown as string,
      ]);
      expect(probe.diagnostics[0]!.type).toBe("error");
    } finally {
      await probe.dispose();
    }
  });

  it("settings: malformed top-level shapes and scalar ranges are error diagnostics", async () => {
    const cases: { settings: unknown; needle: string }[] = [
      { settings: { loomPaths: "x" }, needle: "settings key loomPaths value is out of range" },
      { settings: { loomPaths: null, looms: null }, needle: "value is out of range; got null" },
      { settings: [1, 2, 3], needle: "settings key (root) value is out of range; got array" },
      { settings: { looms: { scanPackagesMaxFiles: 0 } }, needle: "scanPackagesMaxFiles value is out of range" },
      { settings: { looms: { scanPackagesMaxFiles: 25.5 } }, needle: "scanPackagesMaxFiles value is out of range" },
      { settings: { looms: { binderModel: "" } }, needle: "binderModel value is out of range" },
    ];
    for (const c of cases) {
      const probe = await runProbe({ provider, files: [], projectSettings: c.settings });
      try {
        expect(
          probe.diagnostics.some((d) => d.type === "error" && d.message.includes(c.needle)),
          `${JSON.stringify(c.settings)} -> ${c.needle}\nGOT ${JSON.stringify(msgs(probe))}`,
        ).toBe(true);
      } finally {
        await probe.dispose();
      }
    }
  });

  it("settings loomPaths: non-string entries -> settings-invalid-entry (per entry)", async () => {
    const probe = await runProbe({
      provider,
      files: [loom("project", "p.loom")],
      projectSettings: { loomPaths: [123, true, null, "extra"] },
    });
    try {
      const invalid = probe.diagnostics.filter((d) => d.message.includes("must be a string path"));
      expect(invalid).toHaveLength(3);
      expect(invalid.map((d) => d.type)).toEqual(["error", "error", "error"]);
    } finally {
      await probe.dispose();
    }
  });
});

// ===========================================================================
// DISC-1 (bug): a MISSING settings loomPaths path emits NO diagnostic — the
// DISC-2-mandated `loom/load/missing-source` (error) never fires on Windows.
// ===========================================================================

describe("DISC-1 — missing explicit settings path is swallowed (no missing-source error)", () => {
  it("absolute missing loomPaths entry: expected missing-source error, observed NOTHING", async () => {
    const probe = await runProbe({
      provider,
      files: [loom("project", "p.loom")],
      projectSettings: { loomPaths: ["/definitely/missing/xyz123/looms"] },
    });
    try {
      // Registration proceeds (good), but the mandated error is absent.
      expect(probe.registeredNames).toEqual(["p"]);
      const missing = probe.diagnostics.filter(
        (d) => d.message.includes("does not exist") || d.message.includes("unreadable"),
      );
      // BUG: DISC-2 requires a `loom/load/missing-source` ERROR here. None emitted.
      expect(
        missing.length,
        `expected a missing-source error; got diagnostics=${JSON.stringify(msgs(probe))}`,
      ).toBe(0); // documents the buggy observed state (should be >=1 error)
    } finally {
      await probe.dispose();
    }
  });

  it("relative missing loomPaths entry (parent .pi exists) also emits nothing", async () => {
    const probe = await runProbe({
      provider,
      files: [loom("project", "p.loom")],
      projectSettings: { loomPaths: ["nope-does-not-exist"] },
    });
    try {
      expect(probe.registeredNames).toEqual(["p"]);
      expect(msgs(probe)).toEqual([]); // BUG: expected a missing-source error
    } finally {
      await probe.dispose();
    }
  });
});

// ===========================================================================
// DISC-2 (bug): SLSH-1 no-params overflow note is never emitted by the shipped
// dispatch (dispatchNoParamsLoom/renderNoParamsOverflowNote are dead code — the
// production runBinder no-params bypass emits no note). Extra slash arguments
// to a no-params loom are silently swallowed. Needs one drive.
// ===========================================================================

describe("DISC-2 — SLSH-1 no-params overflow note is never emitted", () => {
  it("a no-params loom with trailing arguments runs and ignores them silently", async () => {
    const probe = await runProbe({
      provider,
      files: [
        {
          source: "project",
          path: "greet.loom",
          text: [
            "---",
            "mode: prompt",
            "bind_model: claude-opus-4-8",
            "---",
            "@`Reply with exactly the single word: READY`",
          ].join("\n"),
        },
      ],
      drives: ["/greet these are extra arguments the loom takes no params"],
    });
    try {
      expect(probe.registeredNames).toEqual(["greet"]);
      const turn = probe.turns[0]!;
      // The no-params bypass path ran the body (deterministic user-turn text).
      const allUser = turn.userTexts.join("\n");
      expect(allUser).toContain("Reply with exactly the single word: READY");
      expect(turn.error, `unexpected throw: ${turn.error}`).toBeUndefined();
      // No overflow note surfaces anywhere the harness can observe (it is not a
      // diagnostic, and the production path emits none). Documented via the
      // absence of any "ignoring extra arguments" text in observable channels.
      const observable = [...msgs(probe), allUser, turn.assistantText].join("\n");
      expect(observable.includes("ignoring extra arguments")).toBe(false);
    } finally {
      await probe.dispose();
    }
  });
});
