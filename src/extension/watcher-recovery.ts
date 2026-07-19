// V9q / V9q-T — watcher post-`error`/post-throw terminal recovery posture
// (PIC-55). When the chokidar `error` route fires or the watcher throws such
// that one or more watched roots stop delivering events (the
// *stopped-delivering — terminal* case), the runtime learns of the condition
// through the V8e `FileWatcher` seam's enumerated terminal-signal channel
// (`onTerminate`), leaves the watcher torn down rather than re-armed, and emits
// a single persistent `theta/runtime/watcher-terminated` `theta-system-note`
// prompting `/reload` through the V7d `theta-system-note` channel as its primary
// sink (NOT `ctx.ui.notify`). The `ThetaRegistry` stays live and dispatchable
// (subsequent slash dispatches route through arm (a) of `readDrainState`
// against the last-published snapshot) and NO `ThetaRegistry` drain-state tag is
// written from this path — a tag write here would trip the `session_shutdown`
// handler-entry short-circuit.
//
// Spec: pi-integration-contract/registration-steps.md (PIC-55),
// pi-integration-contract/host-interfaces-services.md (PIC-14 FileWatcher seam),
// diagnostics.md, diagnostics/code-registry-runtime.md
// (`theta/runtime/watcher-terminated`).
//
// V9q-T (tests-task) declares this seam and stubs the behaviour-bearing
// `armWatcherWithTerminalRecovery` function so the failing tests compile and
// red on their own primary assertions; the paired V9q implementation fills in
// the terminal-recovery body (tear-down + persistent-note emission).

import type {
  FileWatcher,
  FileWatchEvent,
  Unsubscribe,
} from "../seams/file-watcher";
import type { Diagnostic } from "../diagnostics/diagnostic";
import type { ThetaRegistry } from "./reload-wiring";
import { sendSystemNote, type SystemNoteChannelDeps } from "./system-note-channel";
import { renderDiagnosticLine } from "../diagnostics/diagnostic";

/**
 * The diagnostics-registry code the terminal recovery posture emits, per the
 * `theta/runtime/watcher-terminated` row in
 * diagnostics/code-registry-runtime.md.
 */
export const WATCHER_TERMINATED_CODE = "theta/runtime/watcher-terminated";

/**
 * The stable, location-less message the `theta/runtime/watcher-terminated`
 * diagnostic carries, sourced verbatim from the *Message* column of the runtime
 * diagnostics registry (diagnostics/code-registry-runtime.md). Tests source the
 * expected string from the registry rather than this constant, per the
 * *Diagnostic message anchors* rule.
 */
export const WATCHER_TERMINATED_MESSAGE =
  "theta watcher terminated; hot-reload halted until /reload";

/**
 * Construct the single `theta/runtime/watcher-terminated` diagnostic emitted on
 * the terminal-signal path. Location-less (a watcher-lifecycle event, not a
 * source-position defect).
 */
export function watcherTerminatedDiagnostic(): Diagnostic {
  return {
    severity: "error",
    code: WATCHER_TERMINATED_CODE,
    message: WATCHER_TERMINATED_MESSAGE,
  };
}

/** Construction dependencies for the terminal recovery wiring. */
export interface WatcherTerminalRecoveryDeps {
  /** The V8e `FileWatcher` seam to arm and, on termination, tear down. */
  readonly watcher: FileWatcher;
  /** The discovered roots to watch. */
  readonly roots: readonly string[];
  /** The steady-state change handler (add/change/unlink delivery contract). */
  readonly onChange: (event: FileWatchEvent) => void;
  /**
   * The live `ThetaRegistry` — kept live and dispatchable across the terminal
   * signal; the recovery path writes no drain-state tag against it.
   */
  readonly registry: ThetaRegistry;
  /** The V7d `theta-system-note` delivery channel dependencies. */
  readonly channel: SystemNoteChannelDeps;
}

/**
 * Arm the `FileWatcher` over `roots` with the terminal-signal recovery posture
 * wired onto its `onTerminate` channel (PIC-55). Returns the watcher's
 * `Unsubscribe`.
 *
 * On the terminal-signal (stopped-delivering) path the recovery posture: (1)
 * tears the watcher down via `unsub()` (idempotent; leaves it torn down, never
 * re-armed); (2) emits exactly one persistent
 * `theta/runtime/watcher-terminated` `theta-system-note` through the V7d channel
 * as its primary sink (never `ctx.ui.notify` on the steady-state route); (3)
 * leaves the `ThetaRegistry` untouched — no drain-state tag is written, so the
 * registry stays live and dispatchable through arm (a) of `readDrainState`.
 */
export function armWatcherWithTerminalRecovery(
  deps: WatcherTerminalRecoveryDeps,
): Unsubscribe {
  const unsub = deps.watcher.watch(deps.roots, deps.onChange, () => {
    // (1) Tear the watcher down — leave it torn down rather than re-armed. The
    // seam's `Unsubscribe` is idempotent, so this is safe on any terminal path.
    unsub();

    // (2) Emit exactly one persistent `theta/runtime/watcher-terminated`
    // `theta-system-note` through the V7d channel as its primary sink. The note
    // carries the single terminal diagnostic; its rendered content is sourced
    // from the registry *Message* column via the location-less diagnostic line.
    const diagnostic = watcherTerminatedDiagnostic();
    sendSystemNote(
      {
        content: renderDiagnosticLine(diagnostic),
        display: true,
        details: { diagnostics: [diagnostic] },
      },
      deps.channel,
    );

    // (3) The `ThetaRegistry` is deliberately untouched: no drain-state tag is
    // written from this path, keeping it live and dispatchable.
    void deps.registry;
  });
  return unsub;
}
