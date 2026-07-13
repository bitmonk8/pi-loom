import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type {
  ExtensionAPI,
  ExtensionContext,
} from "@earendil-works/pi-coding-agent";
import { discoverAndComposeFixtures } from "../src/extension/production-composition";

// S6 (PIC) — the `makeLoadEmit` toast+stderr diagnostic router on the H8a
// `discoverAndComposeFixtures` helper path.
//
// code-surface.md §5 flags a "load-phase routing gap": full `loom-system-note`
// routing for discovery diagnostics is deferred on the `makeLoadEmit` path
// (production-composition.ts:120). It is CLOSED on the shipped default export's
// `composeExtensionInstance` path (proven by
// tests/load-phase-pre-eval-routing.test.ts). This test pins the ACTUAL
// behaviour of the OTHER path — `discoverAndComposeFixtures`, used by the H8a
// `discoverFixtures` wiring / hardening probe harness — so the gap is a
// documented, tested state rather than an unknown: a load/parse error surfaces
// via the transient `ctx.ui.notify(message,"error")` toast AND, in the no-UI
// (`-p` / CI / RPC) case, is mirrored to `process.stderr` (never the note
// channel, never stdout). The failing loom is dropped; siblings still compose.
//
// Spec: errors-and-results/error-model.md (pre-eval failure surfacing);
// REQ-PIC-11/87 surfacing surface; the FMC-1 / DISCLI-2 / IMPORTS-3 no-UI gap
// noted inline at production-composition.ts:127-141.

const GOOD_LOOM = ["---", "mode: prompt", "tools: read", "---", "@`hi`", ""].join(
  "\n",
);
// `tools:` names a Pi tool absent from the threaded registry →
// `loom/load/unknown-tool` (error-severity ERR-6). The loom is dropped.
const BAD_LOOM = [
  "---",
  "mode: prompt",
  "tools: totally_unknown_xyz",
  "---",
  "@`hi`",
  "",
].join("\n");

interface Recorder {
  readonly notifications: { message: string; type: string }[];
  readonly notes: unknown[];
}

function makePi(recorder: Recorder): ExtensionAPI {
  return {
    getFlag: (): undefined => undefined,
    getCommands: (): { name: string; source: string }[] => [],
    sendMessage: (message: unknown): void => {
      recorder.notes.push(message);
    },
    sendUserMessage: (): void => {},
    registerCommand: (): void => {},
    registerMessageRenderer: (): void => {},
    registerFlag: (): void => {},
    on: (): void => {},
  } as unknown as ExtensionAPI;
}

function makeCtx(cwd: string, hasUI: boolean, recorder: Recorder): ExtensionContext {
  return {
    cwd,
    hasUI,
    modelRegistry: { getAvailable: (): readonly unknown[] => [] },
    ui: {
      notify: (message: string, type: string): void => {
        recorder.notifications.push({ message, type });
      },
    },
  } as unknown as ExtensionContext;
}

describe("S6 — discoverAndComposeFixtures load diagnostics route to the ctx.ui.notify toast", () => {
  let workspace: string;
  let loomDir: string;

  beforeEach(() => {
    workspace = mkdtempSync(join(tmpdir(), "loom-s6-toast-"));
    loomDir = join(workspace, ".pi", "looms");
    mkdirSync(loomDir, { recursive: true });
  });

  afterEach(() => {
    rmSync(workspace, { recursive: true, force: true });
  });

  it("surfaces a load failure on the transient toast and mirrors it to stderr in the no-UI case; the failing loom is dropped, siblings compose", async () => {
    writeFileSync(join(loomDir, "goodtool.loom"), GOOD_LOOM, "utf8");
    writeFileSync(join(loomDir, "unknowntool.loom"), BAD_LOOM, "utf8");

    const recorder: Recorder = { notifications: [], notes: [] };
    const stderrSpy = vi
      .spyOn(process.stderr, "write")
      .mockImplementation((): boolean => true);

    try {
      const looms = await discoverAndComposeFixtures(
        makePi(recorder),
        makeCtx(workspace, /* hasUI */ false, recorder),
      );

      // Sibling composed; failing loom dropped.
      const names = looms.map((l) => l.slashName);
      expect(names).toContain("goodtool");
      expect(names).not.toContain("unknowntool");

      // The load failure surfaced on the transient error toast (the retained
      // routing gap on this path — NOT the loom-system-note channel).
      const errorToasts = recorder.notifications.filter((n) => n.type === "error");
      expect(errorToasts.length).toBeGreaterThanOrEqual(1);
      expect(
        errorToasts.some((n) => /unknown Pi tool|totally_unknown_xyz/.test(n.message)),
      ).toBe(true);

      // No-UI (`-p`/CI/RPC) mirror to stderr so the failure is not silent.
      const stderrText = stderrSpy.mock.calls.map((c) => String(c[0])).join("");
      expect(stderrText).toMatch(/loom\/load\/unknown-tool/);
      // stderr line is prefixed `loom: ` per production-composition.ts:139.
      expect(stderrText).toMatch(/^loom: /m);

      // This path does NOT route load diagnostics onto the note channel.
      const loadNotes = recorder.notes.filter(
        (n) => (n as { customType?: string }).customType === "loom-system-note",
      );
      expect(loadNotes).toHaveLength(0);
    } finally {
      stderrSpy.mockRestore();
    }
  });

  it("does NOT mirror to stderr when a UI is present (hasUI:true) — toast only", async () => {
    writeFileSync(join(loomDir, "unknowntool.loom"), BAD_LOOM, "utf8");

    const recorder: Recorder = { notifications: [], notes: [] };
    const stderrSpy = vi
      .spyOn(process.stderr, "write")
      .mockImplementation((): boolean => true);

    try {
      await discoverAndComposeFixtures(
        makePi(recorder),
        makeCtx(workspace, /* hasUI */ true, recorder),
      );

      // Toast fired.
      expect(recorder.notifications.filter((n) => n.type === "error").length)
        .toBeGreaterThanOrEqual(1);
      // No stderr mirror carrying a loom load line when a UI is present.
      const stderrText = stderrSpy.mock.calls.map((c) => String(c[0])).join("");
      expect(stderrText).not.toMatch(/loom\/load\/unknown-tool/);
    } finally {
      stderrSpy.mockRestore();
    }
  });

  it("a clean load produces no error toast and no stderr mirror", async () => {
    writeFileSync(join(loomDir, "goodtool.loom"), GOOD_LOOM, "utf8");

    const recorder: Recorder = { notifications: [], notes: [] };
    const stderrSpy = vi
      .spyOn(process.stderr, "write")
      .mockImplementation((): boolean => true);

    try {
      const looms = await discoverAndComposeFixtures(
        makePi(recorder),
        makeCtx(workspace, /* hasUI */ false, recorder),
      );
      expect(looms.map((l) => l.slashName)).toContain("goodtool");
      expect(recorder.notifications.filter((n) => n.type === "error")).toHaveLength(0);
      const stderrText = stderrSpy.mock.calls.map((c) => String(c[0])).join("");
      expect(stderrText).not.toMatch(/loom\//);
    } finally {
      stderrSpy.mockRestore();
    }
  });
});
