import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type {
  ExtensionAPI,
  ExtensionContext,
} from "@earendil-works/pi-coding-agent";
import type { LoomFixture } from "../src/extension/factory";
import { discoverAndComposeFixtures } from "../src/extension/production-composition";

// V20a-T — failing tests for the paired `V20a` "`tools:` load-time resolution
// wiring" implementation leaf.
//
// Convention: conventions.md (end-to-end harness; hardening/production-wiring
// realisation of an already-closed code-keyed area). Narrative spec references:
// frontmatter/frontmatter-fields-a.md (§`tools` callable set, FRNT-2/FRNT-3),
// invocation.md (`loom/load/callee-has-errors`). Closes no new spec REQ-ID.
//
// Bucket A — implemented-not-wired: `resolveCallableSet`
// (src/parser/callable-set.ts) exists and is exercised in isolation by
// tests/callable-set.test.ts, but it is never called on the PRODUCTION load /
// discovery path. `discoverAndComposeFixtures` (the shipped `session_start`
// composition root) parses each discovered `.loom` and composes it into a
// runnable fixture WITHOUT resolving its `tools:` callable set, so no
// `tools:`-resolution diagnostic ever fires against the shipped extension and a
// loom whose `tools:` is malformed is registered anyway.
//
// These tests drive that production load path over a real on-disk discovery
// source (the project `.pi/looms/` walk over the real `V8b` `PiFileSystem`),
// with a Pi tool registry threaded to load time (the shipped built-in tool set
// resolved against `ctx.cwd`). Each test reds today on its own primary
// assertion — the malformed-`tools:` loom is still registered (its fixture is
// returned) and its rejection diagnostic is never surfaced — NOT on a compile
// error, missing fixture, or harness throw. The paired `V20a` implementation
// wires `resolveCallableSet` into the load path and turns these green.
//
// Diagnostic *Message* strings are sourced verbatim from the diagnostics
// registry (diagnostics/code-registry-load.md) per the conventions.md
// *Diagnostic message anchors* rule; each asserting test cites its diagnostic
// code inline.

// --- Registry Message strings (diagnostics/code-registry-load.md) -----------
// The author-visible rejection message each `tools:`-resolution diagnostic
// renders. Sourced from the *Message* column so the assertions anchor on the
// exact string the shipped load path must surface.
const MSG = {
  // `loom/load/unknown-tool`
  unknownTool: "unknown Pi tool 'totally_unknown_xyz'",
  // `loom/load/prompt-mode-callable`
  promptModeCallable:
    "'tools:' entry './child.loom' points at a prompt-mode loom; only subagent-mode looms are permitted",
  // `loom/load/tool-name-collision`
  toolNameCollision:
    "tool name 'dup' collides with another 'tools:' entry, top-level fn, or import",
  // `loom/load/invalid-tool-rename`
  invalidToolRename: "'as BadName' rename target must be lowercase-first; got 'BadName'",
  // `loom/load/callee-has-errors`
  calleeHasErrors: "callee './broken.loom' has errors; see related diagnostics",
} as const;

// --- Planted discovery workspace -------------------------------------------

interface PlantedLoom {
  readonly stem: string;
  readonly text: string;
}

function loom(...lines: readonly string[]): string {
  return lines.join("\n") + "\n";
}

/**
 * The `.loom` files planted under the project discovery source. Each malformed
 * loom pairs one `tools:`-resolution rejection with a positive control that
 * MUST still register, so the test distinguishes "the wiring rejects the bad
 * loom" from "the wiring rejects everything".
 */
const LOOMS: readonly PlantedLoom[] = [
  // A control loom whose `tools:` resolves cleanly (a known built-in Pi tool):
  // registers today and after `V20a`.
  { stem: "goodtool", text: loom("---", "mode: prompt", "tools: read", "---", "@`hi`") },

  // `loom/load/unknown-tool`: a `tools:` entry naming a Pi tool absent from the
  // threaded registry.
  {
    stem: "unknowntool",
    text: loom("---", "mode: prompt", "tools: totally_unknown_xyz", "---", "@`hi`"),
  },

  // `loom/load/prompt-mode-callable`: a `.loom` callee that is prompt-mode.
  {
    stem: "promptcallee",
    text: loom("---", "mode: subagent", "tools:", "  - ./child.loom", "---", "@`hi`"),
  },
  // The prompt-mode callee `promptcallee` points at (valid on its own merits —
  // registers as `/child`).
  { stem: "child", text: loom("---", "mode: prompt", "---", "@`child`") },

  // `loom/load/tool-name-collision`: two `tools:` entries resolve to `dup`.
  {
    stem: "collision",
    text: loom("---", "mode: prompt", "tools:", "  - read as dup", "  - grep as dup", "---", "@`hi`"),
  },
  // Positive control: an `as` rename disambiguates, so the loom registers.
  {
    stem: "renameresolves",
    text: loom(
      "---",
      "mode: prompt",
      "tools:",
      "  - read as reader",
      "  - grep as searcher",
      "---",
      "@`hi`",
    ),
  },

  // `loom/load/invalid-tool-rename`: a non-loom-identifier `as` rename target.
  {
    stem: "badrename",
    text: loom("---", "mode: prompt", "tools:", "  - read as BadName", "---", "@`hi`"),
  },

  // `loom/load/callee-has-errors`: a subagent-mode `.loom` callee that itself
  // carries an error-severity load/parse diagnostic.
  {
    stem: "calleeerrors",
    text: loom("---", "mode: subagent", "tools:", "  - ./broken.loom", "---", "@`hi`"),
  },
  // The erroring callee `calleeerrors` points at: subagent-mode (so NOT
  // prompt-mode-callable) but carrying `loom/parse/unresolved-named-type`.
  {
    stem: "broken",
    text: loom("---", "mode: subagent", "params:", "  x: NoSuchType", "---", "@`broken`"),
  },
];

// --- Fake host `pi` / `ctx` for the load path ------------------------------

interface LoadOutcome {
  /** Slash names the shipped composition root registered (returned fixtures). */
  readonly registered: readonly string[];
  /** Error-severity diagnostic messages surfaced via `ctx.ui.notify`. */
  readonly notifications: readonly string[];
}

let outcome: LoadOutcome;
let workspaceDir: string;

async function runProductionLoad(cwd: string): Promise<LoadOutcome> {
  const notifications: string[] = [];
  const pi = {
    getFlag: (): undefined => undefined,
    getCommands: (): readonly unknown[] => [],
    sendMessage: (): void => {},
    sendUserMessage: (): void => {},
    getActiveTools: (): readonly string[] => [],
    setActiveTools: (): void => {},
  } as unknown as ExtensionAPI;
  const ctx = {
    cwd,
    modelRegistry: { getAvailable: (): readonly unknown[] => [] },
    ui: {
      notify: (message: string, _type: "error"): void => {
        notifications.push(message);
      },
    },
  } as unknown as ExtensionContext;

  const fixtures: readonly LoomFixture[] = await discoverAndComposeFixtures(pi, ctx);
  return { registered: fixtures.map((f) => f.slashName), notifications };
}

beforeAll(async () => {
  workspaceDir = mkdtempSync(join(tmpdir(), "loom-v20a-"));
  const projectLoomDir = join(workspaceDir, ".pi", "looms");
  mkdirSync(projectLoomDir, { recursive: true });
  for (const l of LOOMS) {
    writeFileSync(join(projectLoomDir, `${l.stem}.loom`), l.text, "utf8");
  }
  outcome = await runProductionLoad(workspaceDir);
});

afterAll(() => {
  rmSync(workspaceDir, { recursive: true, force: true });
});

// A precondition guard shared by every bullet: the discovery walk found the
// planted looms at all (so a red below is a `tools:`-resolution red, never an
// empty-walk / setup red). `goodtool`'s clean `tools: read` must always
// register.
describe("V20a-T — production load path discovered the planted workspace", () => {
  it("registers the clean control loom whose `tools:` resolves (goodtool)", () => {
    expect(
      outcome.registered,
      "the project `.pi/looms/` discovery walk did not register the clean control loom — " +
        "the setup precondition is unmet. Registered: " + JSON.stringify(outcome.registered),
    ).toContain("goodtool");
  });
});

// ===========================================================================
// Tests bullet 1 — `loom/load/unknown-tool` (cka-11 FRNT area, owned on V6c).
// A `tools:` entry naming a Pi tool absent from the threaded registry is
// rejected at PRODUCTION load time. Reds today: unwired — the loom registers
// and no diagnostic fires.
// ===========================================================================
describe("V20a-T — loom/load/unknown-tool rejected at production load time", () => {
  it("loom/load/unknown-tool: an unknown Pi tool in `tools:` un-registers the loom at load time", () => {
    expect(
      outcome.registered,
      "resolveCallableSet is not wired into the production load path: the loom whose " +
        "`tools:` names an unknown Pi tool was registered anyway. Registered: " +
        JSON.stringify(outcome.registered),
    ).not.toContain("unknowntool");
  });

  it("loom/load/unknown-tool: the load path surfaces the registry rejection message", () => {
    expect(
      outcome.notifications,
      "no loom/load/unknown-tool diagnostic surfaced — the shipped load path never resolves " +
        "the `tools:` callable set. Notified: " + JSON.stringify(outcome.notifications),
    ).toContain(MSG.unknownTool);
  });
});

// ===========================================================================
// Tests bullet 2 — `loom/load/prompt-mode-callable` (owned on V6c). A
// prompt-mode `.loom` callee in `tools:` is rejected at production load time.
// ===========================================================================
describe("V20a-T — loom/load/prompt-mode-callable rejected at production load time", () => {
  it("loom/load/prompt-mode-callable: a prompt-mode `.loom` callee in `tools:` un-registers the parent", () => {
    expect(
      outcome.registered,
      "the parent loom naming a prompt-mode `.loom` callee in `tools:` was registered anyway — " +
        "resolveCallableSet is unwired on the load path. Registered: " +
        JSON.stringify(outcome.registered),
    ).not.toContain("promptcallee");
  });

  it("loom/load/prompt-mode-callable: the load path surfaces the registry rejection message", () => {
    expect(
      outcome.notifications,
      "no loom/load/prompt-mode-callable diagnostic surfaced. Notified: " +
        JSON.stringify(outcome.notifications),
    ).toContain(MSG.promptModeCallable);
  });
});

// ===========================================================================
// Tests bullet 3 — `loom/load/tool-name-collision` (owned on V6c). A `tools:`
// name collision fires at production load time; an `as` rename resolves.
// ===========================================================================
describe("V20a-T — loom/load/tool-name-collision fires at production load time", () => {
  it("loom/load/tool-name-collision: two `tools:` entries resolving to one name un-register the loom", () => {
    expect(
      outcome.registered,
      "the loom whose two `tools:` entries collide on one name was registered anyway. Registered: " +
        JSON.stringify(outcome.registered),
    ).not.toContain("collision");
  });

  it("loom/load/tool-name-collision: the load path surfaces the registry rejection message", () => {
    expect(
      outcome.notifications,
      "no loom/load/tool-name-collision diagnostic surfaced. Notified: " +
        JSON.stringify(outcome.notifications),
    ).toContain(MSG.toolNameCollision);
  });

  it("loom/load/tool-name-collision: an `as` rename resolves the collision — the loom registers", () => {
    // Green today (nothing rejects it) and after V20a (a clean callable set): the
    // positive control proves V20a rejects the collision case specifically, not
    // every `as`-renamed `tools:` loom.
    expect(
      outcome.registered,
      "the `as`-disambiguated loom must still register. Registered: " +
        JSON.stringify(outcome.registered),
    ).toContain("renameresolves");
  });
});

// ===========================================================================
// Tests bullet 4 — `loom/load/invalid-tool-rename` (owned on V6c). A
// non-loom-identifier `as` rename target is rejected at production load time.
// ===========================================================================
describe("V20a-T — loom/load/invalid-tool-rename rejected at production load time", () => {
  it("loom/load/invalid-tool-rename: a non-identifier `as` target un-registers the loom", () => {
    expect(
      outcome.registered,
      "the loom whose `as` rename target is not loom-identifier-shaped was registered anyway. " +
        "Registered: " + JSON.stringify(outcome.registered),
    ).not.toContain("badrename");
  });

  it("loom/load/invalid-tool-rename: the load path surfaces the registry rejection message", () => {
    expect(
      outcome.notifications,
      "no loom/load/invalid-tool-rename diagnostic surfaced. Notified: " +
        JSON.stringify(outcome.notifications),
    ).toContain(MSG.invalidToolRename);
  });
});

// ===========================================================================
// Tests bullet 5 — `loom/load/callee-has-errors` (cka-14 INV area, owned on
// V15f). A `tools:` `.loom` callee that itself carries error-severity
// load/parse diagnostics is rejected at production load time (E severity — the
// callable cannot be created and the parent does not register).
// ===========================================================================
describe("V20a-T — loom/load/callee-has-errors rejected at production load time", () => {
  it("loom/load/callee-has-errors: an erroring `.loom` callee in `tools:` un-registers the parent", () => {
    expect(
      outcome.registered,
      "the parent loom naming an erroring `.loom` callee in `tools:` was registered anyway — " +
        "the `tools:` static-resolution pass is unwired on the load path. Registered: " +
        JSON.stringify(outcome.registered),
    ).not.toContain("calleeerrors");
  });

  it("loom/load/callee-has-errors: the load path surfaces the registry rejection message", () => {
    expect(
      outcome.notifications,
      "no loom/load/callee-has-errors diagnostic surfaced. Notified: " +
        JSON.stringify(outcome.notifications),
    ).toContain(MSG.calleeHasErrors);
  });
});
