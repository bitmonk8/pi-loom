import { describe, expect, it } from "vitest";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import type { Diagnostic } from "../src/diagnostics/diagnostic";
import {
  createLoomExtension,
  EXTENSION_BOOTSTRAP_FAILED_CODE,
} from "../src/extension/factory";

// V9k-T — failing tests for the extension-bootstrap SDK-failure abort surfaces
// (paired V9k implementation leaf).
//
// Spec: pi-integration-contract/extension-bootstrap-and-per-loom.md
// ("Extension-bootstrap SDK failures" — the `pi.registerFlag` and `pi.on(...)`
// fatal-abort rules), diagnostics/code-registry-load.md (the
// `loom/load/extension-bootstrap-failed` registry row + its `details` payload),
// pi-integration-contract/registration-steps.md (the step ordering the abort
// truncates), diagnostics/placeholder-rendering-b.md#underlying-error-coercion
// (the `details.error` / `<error>` coercion).
//
// This is a code-keyed obligation area (PIC, no numbered REQ-IDs): each test
// cites the `loom/load/extension-bootstrap-failed` diagnostics-registry code
// inline per the conventions.md *Diagnostic message anchors* rule.
//
// The factory is driven through a recording `ExtensionAPI` double whose chosen
// host-binding call throws, so the fatal-abort granularity and the single
// diagnostic are witnessed by behaviour. The paired V9k implementation makes a
// factory-time `pi.registerFlag` / `pi.on(...)` throw fatal to the whole
// extension (the remaining steps do not execute) and emits exactly one
// diagnostic; until then these tests red on those primary assertions.

// The canonical factory-time `pi.on` subscription order (steps 1/3/4 of
// registration-steps.md): `resources_discover` (step 1, after the `--loom`
// flag), `session_start` (step 3), `session_shutdown` (step 4).
const SUBSCRIPTION_ORDER = [
  "resources_discover",
  "session_start",
  "session_shutdown",
] as const;
type PiEvent = (typeof SUBSCRIPTION_ORDER)[number];

interface RecordingPi {
  pi: ExtensionAPI;
  /** Every host-binding call attempted, in call order. */
  calls: string[];
  /** Pi events whose `pi.on` subscription actually installed (no throw), in order. */
  subscriptions: PiEvent[];
}

// A recording `ExtensionAPI` double. Each host-binding call is logged; a call
// whose key is in `throwOn` throws (the host seam faults synchronously at the
// factory boundary, the only fault mode for these synchronous-void calls).
function makeRecordingPi(throwOn: ReadonlySet<string>): RecordingPi {
  const calls: string[] = [];
  const subscriptions: PiEvent[] = [];
  const guard = (key: string): void => {
    calls.push(key);
    if (throwOn.has(key)) {
      throw new Error(`${key} host seam absent`);
    }
  };
  const pi = {
    registerFlag: (): void => guard("registerFlag"),
    registerMessageRenderer: (): void => guard("registerMessageRenderer"),
    registerCommand: (): void => guard("registerCommand"),
    on: (event: string): void => {
      const key = `on:${event}`;
      calls.push(key);
      if (throwOn.has(key)) {
        throw new Error(`${key} host seam absent`);
      }
      subscriptions.push(event as PiEvent);
    },
    getFlag: (): undefined => undefined,
    getCommands: (): unknown[] => [],
    sendUserMessage: (): void => {},
    sendMessage: (): void => {},
  };
  return { pi: pi as unknown as ExtensionAPI, calls, subscriptions };
}

// Narrow the recorded diagnostics to exactly one, failing loudly (no silent
// skip) when the factory emitted none or more than one.
function exactlyOne(diagnostics: readonly Diagnostic[]): Diagnostic {
  if (diagnostics.length !== 1) {
    expect.fail(
      `expected exactly one extension-bootstrap-failed diagnostic, got ${diagnostics.length}`,
    );
  }
  return diagnostics[0] as Diagnostic;
}

// ── `pi.registerFlag` failure — fatal to the whole extension ────────────────

describe("V9k extension bootstrap — pi.registerFlag failure (loom/load/extension-bootstrap-failed)", () => {
  it("loom/load/extension-bootstrap-failed: a factory-time pi.registerFlag throw is fatal — steps 2–5 do not execute", () => {
    const rec = makeRecordingPi(new Set(["registerFlag"]));
    const diagnostics: Diagnostic[] = [];

    // The factory MUST NOT throw out of its body even when a registration call
    // faults (per-call boundary), but the registerFlag failure is fatal.
    expect(() =>
      createLoomExtension({
        fixtures: [],
        emitDiagnostic: (d) => diagnostics.push(d),
      })(rec.pi),
    ).not.toThrow();

    // Fatal: every subsequent `pi.register*` / `pi.on` call is skipped — none
    // of the three factory-time subscriptions install (steps 2–5 do not run).
    expect(rec.subscriptions).toEqual([]);
    expect(rec.calls).not.toContain("on:resources_discover");
    expect(rec.calls).not.toContain("on:session_start");
    expect(rec.calls).not.toContain("on:session_shutdown");
  });

  it("loom/load/extension-bootstrap-failed: emits a single diagnostic with details.capability = 'pi.registerFlag'", () => {
    const rec = makeRecordingPi(new Set(["registerFlag"]));
    const diagnostics: Diagnostic[] = [];
    createLoomExtension({
      fixtures: [],
      emitDiagnostic: (d) => diagnostics.push(d),
    })(rec.pi);

    const d = exactlyOne(diagnostics);
    expect(d.severity).toBe("error");
    expect(d.code).toBe(EXTENSION_BOOTSTRAP_FAILED_CODE);
    expect(d.details?.capability).toBe("pi.registerFlag");
    // The `details.error` carries the caught throw's underlying-error string
    // (placeholder-rendering-b.md#underlying-error-coercion).
    expect(d.details?.error).toBe("registerFlag host seam absent");
    // Message anchors on the byte-identical registry-template prefix; `<error>`
    // is a §8 host-derived tail so the assertion is an anchored partial match.
    expect(d.message.startsWith("extension bootstrap failed: pi.registerFlag threw ")).toBe(
      true,
    );
  });
});

// ── `pi.on(...)` subscription failure — fatal to the whole extension ────────

describe("V9k extension bootstrap — pi.on(...) subscription failure (loom/load/extension-bootstrap-failed)", () => {
  // The fatal-truncation and the single-diagnostic facets describe one
  // indivisible "fatal abort + single diagnostic" behaviour per failing event
  // and are asserted together: for the last subscription (`session_shutdown`)
  // the truncation facet is trivially satisfied, so folding the diagnostic
  // facet into the same test keeps every case reding on the absent impl.
  for (const failingEvent of SUBSCRIPTION_ORDER) {
    const failKey = `on:${failingEvent}`;
    const priorEvents = SUBSCRIPTION_ORDER.slice(
      0,
      SUBSCRIPTION_ORDER.indexOf(failingEvent),
    );

    it(`loom/load/extension-bootstrap-failed: a pi.on('${failingEvent}') throw is fatal (no subsequent register*/on call) and emits one diagnostic with details.capability='pi.on', details.event='${failingEvent}'`, () => {
      const rec = makeRecordingPi(new Set([failKey]));
      const diagnostics: Diagnostic[] = [];

      expect(() =>
        createLoomExtension({
          fixtures: [],
          emitDiagnostic: (d) => diagnostics.push(d),
        })(rec.pi),
      ).not.toThrow();

      // Only the subscriptions preceding the failing one installed; the failing
      // subscription and every later step are skipped (fatal to the extension).
      expect(rec.subscriptions).toEqual([...priorEvents]);
      // No host-binding call appears in the call log after the failing one.
      const failIndex = rec.calls.indexOf(failKey);
      expect(failIndex).toBeGreaterThanOrEqual(0);
      expect(rec.calls.slice(failIndex + 1)).toEqual([]);

      // Exactly one diagnostic, naming the failing subscription's Pi event.
      const d = exactlyOne(diagnostics);
      expect(d.severity).toBe("error");
      expect(d.code).toBe(EXTENSION_BOOTSTRAP_FAILED_CODE);
      expect(d.details?.capability).toBe("pi.on");
      expect(d.details?.event).toBe(failingEvent);
      // `details.error` carries the caught throw's underlying-error string
      // (placeholder-rendering-b.md#underlying-error-coercion).
      expect(d.details?.error).toBe(`${failKey} host seam absent`);
      // Anchored partial match on the byte-identical registry-template prefix.
      expect(
        d.message.startsWith("extension bootstrap failed: pi.on threw "),
      ).toBe(true);
    });
  }
});
