// e2e-campaign S5 — binder echo-note emission through the PRODUCTION producer.
//
// CAND-2 pin-down (docs/e2e-campaign/test-plan.md §5): the baseline acceptance
// run observed no `bind_echo` success note (nor a failure note) on `pi -p`
// stdout for a binder off-session pass. This is a deterministic M2 conformance
// test of the SAME production emission surface the acceptance run exercised,
// with the live provider replaced by a scripted binder model:
//
//   ProductionLoomProducer.runBinder()            (production-loom-producer.ts:437)
//     → off-session `complete()` (MOCKED here)    (:750)
//     → parse the free-text envelope → `ok`       (:709)
//     → #emitBinderEchoNote()                     (:618)
//       → pi.sendMessage({customType:"loom-system-note", "Running /…"}, {triggerTurn:false})  (:647)
//
// The existing S5 suite covers the echo RENDERER purely (argument-echo.test.ts,
// binder-system-note-determinism.test.ts) and the binder retry/model helpers,
// but NO test drives the production `runBinder()` with a scripted `ok` binder
// model and observes the actual `pi.sendMessage` delivery on the
// `loom-system-note` channel. This closes REQ-BINDER-21 (ok-arm production echo
// emission) + REQ-BINDER-36 (bind_echo:false suppression) as M2 conformance.
//
// Spec: binder/defaulting-system-note-echo.md §"Echo policy" (BND-1);
// binder/binder-bypass-and-envelope.md §binder-envelope (REQ-BINDER-21);
// binder/determinism-cancellation-failure.md §"Failure-mode templates"
// (REQ-BINDER-38 needs_info row). Method: M2 (production producer, no live model).

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// The scripted off-session binder reply. `vi.hoisted` so the `vi.mock` factory
// (hoisted above the imports) can close over a mutable holder each test sets.
const scripted = vi.hoisted(() => ({
  reply: undefined as unknown,
}));

// Replace ONLY the off-session `complete()` free function; every other pi-ai
// export (types, helpers) passes through unchanged.
vi.mock("@earendil-works/pi-ai", async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return {
    ...actual,
    complete: vi.fn(async () => scripted.reply),
  };
});

import type {
  ExtensionAPI,
  ExtensionCommandContext,
  ModelRegistry,
} from "@earendil-works/pi-coding-agent";
import { createProductionProducerDeps } from "../src/extension/production-loom-producer";
import type { LoomCompositionInput } from "../src/extension/loom-composition-producer";
import {
  parseLoomDocument,
  type ParseLoomDocumentDeps,
} from "../src/parser/loom-document";
import type { LoomSource } from "../src/lexer/lexer";
import type { RuntimeRoot } from "../src/runtime-root";
import type { ModelReferenceMatcher } from "../src/parser/frontmatter";
import type { SystemNoteChannelDeps } from "../src/extension/system-note-channel";

const SYSTEM_NOTE_CHANNEL = "loom-system-note";

/** A captured `pi.sendMessage` custom message (the loom-system-note channel). */
interface CapturedNote {
  readonly customType: string;
  readonly content: string;
  readonly display?: boolean;
}

/** An assistant reply whose text content is the given free-text envelope JSON. */
function envelopeReply(json: string): unknown {
  return {
    role: "assistant",
    content: [{ type: "text", text: json }],
    stopReason: "end_turn",
    timestamp: 0,
  };
}

function parseDeps(): ParseLoomDocumentDeps {
  const systemNote: SystemNoteChannelDeps = {
    pi: { sendMessage: (): void => {} },
    ui: { notify: (): void => {} },
    emitDiagnostic: (): void => {},
  };
  const modelMatcher: ModelReferenceMatcher = { resolve: (): "resolved" => "resolved" };
  return { systemNote, modelMatcher };
}

/** Parse `.loom` source through the production whole-file parser. */
function parse(src: string) {
  const source: LoomSource = {
    path: "code-review.loom",
    bytes: new TextEncoder().encode(src),
  };
  const doc = parseLoomDocument(source, parseDeps());
  const errors = doc.diagnostics.filter((d) => d.severity === "error").map((d) => d.code);
  expect(errors, "the binder loom must parse cleanly before it is driven").toEqual([]);
  expect(doc.frontmatter, "the binder loom must carry parseable frontmatter").not.toBeNull();
  return doc;
}

/** A runtime-root double sufficient for a binder pass with NO defaulted fields. */
function rootDouble(): RuntimeRoot {
  return {
    checkpoint: { before: (): Promise<void> => Promise.resolve() },
    idSource: { newInvocationId: (): string => "inv-1", newToolCallId: (): string => "tc-1" },
    clock: { wallNow: (): number => 0 },
  } as unknown as RuntimeRoot;
}

const BINDER_MODEL = {
  id: "binder-model",
  provider: "anthropic-messages",
  api: "anthropic-messages",
  strictCapable: true,
};

/**
 * A production producer wired with a capturing `pi.sendMessage`, a model
 * registry that resolves `binder-model`, and the root double. Returns the
 * producer deps + the captured-notes sink.
 */
function producerWithCapture(): {
  readonly deps: ReturnType<typeof createProductionProducerDeps>;
  readonly notes: CapturedNote[];
} {
  const notes: CapturedNote[] = [];
  const pi = {
    sendMessage: (message: CapturedNote): void => {
      notes.push(message);
    },
  } as unknown as ExtensionAPI;
  const modelRegistry = {
    getAvailable: (): readonly unknown[] => [BINDER_MODEL],
    getApiKeyAndHeaders: async (): Promise<{ ok: boolean }> => ({ ok: true }),
  } as unknown as ModelRegistry;
  const deps = createProductionProducerDeps({ pi, root: rootDouble(), modelRegistry });
  return { deps, notes };
}

function ctxDouble(): ExtensionCommandContext {
  return {} as unknown as ExtensionCommandContext;
}

// A two-required-string-param loom (forces a genuine binder pass — not a
// no-params or single-string bypass — with NO defaulted fields, so the
// defaults-merge short-circuits without touching the filesystem seam).
const TWO_PARAM_LOOM = [
  "---",
  "mode: prompt",
  "bind_model: binder-model",
  "params:",
  "  topic: string",
  "  audience: string",
  "---",
  "@`review ${topic} for ${audience}`",
  "",
].join("\n");

function twoParamLoom(overrides?: { readonly bindEcho?: boolean }): LoomCompositionInput {
  const doc = parse(TWO_PARAM_LOOM);
  const frontmatter =
    overrides?.bindEcho === undefined
      ? doc.frontmatter!
      : ({ ...doc.frontmatter!, bindEcho: overrides.bindEcho } as typeof doc.frontmatter);
  return {
    slashName: "code-review",
    sourcePath: "/looms/code-review.loom",
    frontmatter: frontmatter!,
    body: doc.body,
    binderModel: "binder-model",
  };
}

function noteChannelEntries(notes: readonly CapturedNote[]): CapturedNote[] {
  return notes.filter((n) => n.customType === SYSTEM_NOTE_CHANNEL);
}

beforeEach(() => {
  scripted.reply = undefined;
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("e2e-s5 CAND-2 — binder echo note emission through the production producer", () => {
  it("REQ-BINDER-21 (ok arm): a scripted `ok` binder reply emits the `Running /…` echo note on the loom-system-note channel", async () => {
    // The off-session binder returns a well-formed `ok` envelope.
    scripted.reply = envelopeReply(
      JSON.stringify({ kind: "ok", args: { topic: "async", audience: "team" } }),
    );
    const { deps, notes } = producerWithCapture();

    const result = await deps.runBinder({
      loom: twoParamLoom(),
      args: "the async module for the team",
      ctx: ctxDouble(),
    });

    // The binder bound and the loom will run.
    expect(result.bound, "an `ok` envelope binds and the loom runs").toBe(true);
    expect(result.args).toEqual({ topic: "async", audience: "team" });

    // CAND-2: the production echo note IS emitted on the loom-system-note channel.
    const channelNotes = noteChannelEntries(notes);
    expect(
      channelNotes,
      "exactly one loom-system-note (the success echo) is emitted on the `ok` arm",
    ).toHaveLength(1);
    const echo = channelNotes[0]!;
    expect(echo.customType).toBe(SYSTEM_NOTE_CHANNEL);
    expect(echo.display, "the echo note is display:true").toBe(true);
    expect(echo.content).toBe("Running /code-review: topic=async, audience=team");
  });

  it("REQ-BINDER-36: `bind_echo: false` suppresses the echo note — the binder still binds, no note is emitted", async () => {
    scripted.reply = envelopeReply(
      JSON.stringify({ kind: "ok", args: { topic: "async", audience: "team" } }),
    );
    const { deps, notes } = producerWithCapture();

    const result = await deps.runBinder({
      loom: twoParamLoom({ bindEcho: false }),
      args: "the async module for the team",
      ctx: ctxDouble(),
    });

    expect(result.bound, "the loom still binds with bind_echo:false").toBe(true);
    expect(
      noteChannelEntries(notes),
      "bind_echo:false suppresses the `Running /…` echo note entirely",
    ).toHaveLength(0);
  });

  it("REQ-BINDER-21/38 (needs_info arm): a `needs_info` envelope emits the failure note and does NOT bind", async () => {
    scripted.reply = envelopeReply(
      JSON.stringify({ kind: "needs_info", message: "which repository?" }),
    );
    const { deps, notes } = producerWithCapture();

    const result = await deps.runBinder({
      loom: twoParamLoom(),
      args: "review it",
      ctx: ctxDouble(),
    });

    expect(result.bound, "a needs_info envelope does not bind — the loom does not run").toBe(false);
    const channelNotes = noteChannelEntries(notes);
    expect(channelNotes, "exactly one failure note is emitted").toHaveLength(1);
    // determinism-cancellation-failure.md §"Failure-mode templates" — needs_info
    // row `loom /<name>: argument binding needs more info — <message>` (U+2014).
    expect(channelNotes[0]!.content).toBe(
      "loom /code-review: argument binding needs more info \u2014 which repository?",
    );
    expect(channelNotes[0]!.display).toBe(true);
  });

  it("determinism: a second identical `ok` pass emits a byte-identical echo note", async () => {
    const okReply = JSON.stringify({ kind: "ok", args: { topic: "async", audience: "team" } });

    scripted.reply = envelopeReply(okReply);
    const first = producerWithCapture();
    await first.deps.runBinder({ loom: twoParamLoom(), args: "x", ctx: ctxDouble() });

    scripted.reply = envelopeReply(okReply);
    const second = producerWithCapture();
    await second.deps.runBinder({ loom: twoParamLoom(), args: "x", ctx: ctxDouble() });

    expect(noteChannelEntries(first.notes).map((n) => n.content)).toEqual(
      noteChannelEntries(second.notes).map((n) => n.content),
    );
  });
});
