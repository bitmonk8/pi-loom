// Phase 5 (DISCO-2) — step-5 watcher / hot-reload production wiring.
//
// This module is the single production caller that ties the previously-unwired
// hot-reload machinery together into the step-5 watcher subsystem
// (registration-steps.md#watcher-hot-reload-registration, package-and-settings.md
// §"Caching and reload" / §"Watcher-time reload failures"):
//
//   - `armWatcherWithTerminalRecovery` (watcher-recovery.ts) arms ONE watcher
//     over the discovery-root union + settings-file paths and surfaces the
//     PIC-55 terminal-recovery `loom/runtime/watcher-terminated` note;
//   - `ReloadDebouncer` (reload-debounce.ts) coalesces a burst of watcher
//     events into a single Clock-driven 250 ms reload and serializes rebuilds
//     across windows (PIC-49);
//   - on each debounced fire the reload re-runs discovery + compose
//     (`rediscover`), swaps the `LoomRegistry` atomically via `rebuildAndSwap`
//     (PIC-36), re-registers the surviving looms with pi (`reRegister`), emits
//     the `structuralChangeNote` when the registered loom SET changed, and
//     surfaces a swap-that-throws-before-publish as ERR-7
//     (`loom/runtime/registry-swap-failed`) on the `loom-system-note` channel;
//   - `detach()` tears the watcher down and cancels the pending debounce timer
//     for the `session_shutdown` teardown (registration-steps.md step 4).
//
// It reimplements none of the above — it only composes them against the live
// `pi` + `ctx` seams threaded from the composition root.

import type { Clock } from "../seams/clock";
import type { FileWatcher } from "../seams/file-watcher";
import { ReloadDebouncer, type RebuildOutcome } from "./reload-debounce";
import { armWatcherWithTerminalRecovery } from "./watcher-recovery";
import {
  LoomRegistry,
  rebuildAndSwap,
  structuralChangeNote,
  type ParsedLoom,
} from "./reload-wiring";
import {
  emitDiagnosticBatch,
  sendSystemNote,
  type SystemNoteChannelDeps,
} from "./system-note-channel";
import type { Diagnostic } from "../diagnostics/diagnostic";

/** Construction dependencies for the step-5 watcher / hot-reload wiring. */
export interface InstallHotReloadDeps {
  /** The injected `FileWatcher` seam armed over the roots (fake in tests). */
  readonly watcher: FileWatcher;
  /** The injected `Clock` seam the 250 ms debounce is measured against. */
  readonly clock: Clock;
  /** The discovery-root union plus the two settings-file paths to watch. */
  readonly roots: readonly string[];
  /** The live `LoomRegistry` the reload swaps atomically (PIC-36). */
  readonly registry: LoomRegistry;
  /**
   * The `loom-system-note` delivery channel. Carries the structural-change note
   * (informational) and the ERR-7 watcher-time reload failures
   * (`triggerTurn:false`, per package-and-settings.md §"Watcher-time reload
   * failures").
   */
  readonly channel: SystemNoteChannelDeps;
  /**
   * Re-run the five-source discovery walk + per-loom compose against the live
   * `ctx`, returning the freshly-composed runnable looms. Watcher-time
   * load/parse/re-merge diagnostics route onto the `loom-system-note` channel
   * as ERR-7 inside this closure (the caller wires that emit).
   */
  readonly rediscover: () => Promise<readonly ParsedLoom[]>;
  /**
   * Re-register the surviving looms with pi — the same `session_start`
   * registration step (cross-format collision pass + per-loom
   * `pi.registerCommand`). Sequenced before the atomic publish so a throw here
   * surfaces `loom/runtime/registry-swap-failed` and discards the swap (PIC-36).
   */
  readonly reRegister: (looms: readonly ParsedLoom[]) => void;
  /** The slash names registered at `session_start` (structural-change baseline). */
  readonly initialNames: Iterable<string>;
}

/** The teardown handle the `session_shutdown` handler holds. */
export interface HotReloadHandle {
  /** Tear the watcher down and cancel any pending debounce timer. */
  detach(): void;
}

/**
 * Arm the step-5 watcher over the discovery-root union + settings-file paths,
 * wire a debounced reload onto its change stream, and return the teardown
 * handle. A synthetic changed-path label identifies the reload in the
 * registry-swap-failed diagnostic (the watcher coalesces a whole burst, so no
 * single path is authoritative).
 */
export function installHotReload(deps: InstallHotReloadDeps): HotReloadHandle {
  const RELOAD_CHANGED_PATH = "loom watcher";

  // The set of currently-registered slash names, updated after each successful
  // reload so the next window's structural-change decision compares against the
  // live registered set.
  let currentNames = new Set<string>(deps.initialNames);

  // ERR-7 emit: a watcher-time rebuild failure routes onto the
  // `loom-system-note` channel (`triggerTurn:false`) rather than a toast, per
  // package-and-settings.md §"Watcher-time reload failures".
  const emitErr7 = (diagnostic: Diagnostic): void => {
    emitDiagnosticBatch([diagnostic], deps.channel);
  };

  const runReload = async (): Promise<RebuildOutcome> => {
    // Re-run discovery + compose (the "hot-reload re-runs the computation" of
    // discovery-sources.md §"Discovery roots"). A throw out of the re-parse /
    // re-merge / re-compose pass (a `pi.registerTool` step, an AJV recompile,
    // an invalid settings re-merge, …) is captured and re-thrown from inside the
    // staged build below, so it surfaces uniformly as the ERR-7
    // `loom/runtime/registry-swap-failed` (PIC-36) rather than an unhandled
    // rejection.
    let looms: readonly ParsedLoom[] | undefined;
    let discoverError: unknown;
    try {
      looms = await deps.rediscover();
    } catch (rediscoverError: unknown) { // allow-broad-catch: loom/runtime/registry-swap-failed — package-and-settings.md
      discoverError = rediscoverError;
    }

    // Build-aside-then-publish (PIC-36): re-register with pi (the
    // `pi.registerTool`-equivalent step, sequenced before publish) inside the
    // staged build, then hand `rebuildAndSwap` the staged map. A captured
    // rediscover throw, or a throw out of re-registration, discards the swap and
    // surfaces ERR-7 (`loom/runtime/registry-swap-failed`); the prior registry
    // stays live.
    const published = rebuildAndSwap(
      RELOAD_CHANGED_PATH,
      () => {
        if (discoverError !== undefined) {
          throw discoverError;
        }
        const staged = looms as readonly ParsedLoom[];
        deps.reRegister(staged);
        return new Map(staged.map((loom) => [loom.slashName, loom] as const));
      },
      { registry: deps.registry, emitDiagnostic: emitErr7 },
    );
    if (!published) {
      // Discarded swap: no structural note, no baseline update — the registered
      // set is unchanged. The PIC-49 guard releases on this discard outcome.
      return "discarded";
    }

    // Structural-change note (PIC-37/38): emit only when the registered loom
    // SET changed (files added or removed), comparing against the last
    // successfully-registered set. Content edits that leave the set unchanged
    // produce an empty added/removed pair and no note.
    const nextNames = new Set(
      (looms as readonly ParsedLoom[]).map((loom) => loom.slashName),
    );
    const added = [...nextNames].filter((name) => !currentNames.has(name));
    const removed = [...currentNames].filter((name) => !nextNames.has(name));
    const note = structuralChangeNote(added, removed);
    if (note !== undefined) {
      sendSystemNote(note, deps.channel);
    }
    currentNames = nextNames;
    return "published";
  };

  const debouncer = new ReloadDebouncer({ clock: deps.clock, rebuild: runReload });

  // Arm ONE watcher over the union of discovery roots + settings-file paths.
  // Each change feeds the debouncer (drop-and-reschedule coalescing); the
  // terminal-recovery posture is wired onto the seam's `onTerminate` channel.
  const unsub = armWatcherWithTerminalRecovery({
    watcher: deps.watcher,
    roots: deps.roots,
    onChange: () => debouncer.onWatcherEvent(),
    registry: deps.registry,
    channel: deps.channel,
  });

  return {
    detach(): void {
      // Sub-step-4 teardown order: tear the watcher down, then cancel the
      // pending debounce timer so a window that closed during teardown does not
      // run a rebuild against the about-to-be-invalidated runtime.
      unsub();
      debouncer.cancel();
    },
  };
}
