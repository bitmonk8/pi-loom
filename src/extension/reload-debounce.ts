// V10d / V10d-T — Clock-driven reload debounce and cross-window rebuild
// serialization (PIC-49).
//
// This module owns the debounce → rebuild boundary of the watcher / hot-reload
// path named in the V10d leaf:
//   - the `Clock`-driven 250 ms watcher-event reload debounce (drop-and-
//     reschedule coalescing: each fresh watcher event clears the pending timer
//     handle and reschedules, holding only the most recent handle, so a burst
//     of writes coalesces into a single reload — see
//     `discovery/package-and-settings.md#caching-and-reload`, code-keyed area
//     `cka-36`);
//   - the across-window rebuild-serialization guard (PIC-49): at most one
//     rebuild runs against the live `LoomRegistry`, AJV validator cache, and
//     prompt-mode registration cache at a time, so a debounce timer firing
//     while a prior window's rebuild is still awaiting its asynchronous steps
//     defers rather than starting a concurrent rebuild, and the in-flight guard
//     releases on the in-flight rebuild's single synchronous publish or its
//     `loom/runtime/registry-swap-failed` discard.
//
// V10d-T (tests-task) declares the seam shape and stubs the behaviour-bearing
// method so the failing tests compile and red on their own primary assertions
// (no reload ever fires, so the debounce and serialization tests red because
// the implementation under test is absent). The paired V10d implementation
// leaf fills this in.
//
// Spec: discovery/package-and-settings.md (§Caching and reload, reload-debounce
// code-keyed area `cka-36`), pi-integration-contract/registration-steps.md
// (PIC-49 cross-window rebuild serialization; PIC-36 publish/discard completion
// signal owned by V9b).

import type { Clock, TimerHandle } from "../seams/clock";

/**
 * The default debounce window in milliseconds. The `250 ms` figure is an
 * implementer tuning choice, not part of loom's observable contract
 * (registration-steps.md — the contracted behaviour is burst-coalescing under
 * the injected `Clock` seam, not the literal value); it is overridable via
 * `ReloadDebouncerDeps.windowMs`.
 */
export const RELOAD_DEBOUNCE_WINDOW_MS = 250;

/**
 * The completion outcome of one rebuild: the single synchronous publish
 * (`"published"`) or the `loom/runtime/registry-swap-failed` discard
 * (`"discarded"`), per PIC-36. The PIC-49 in-flight guard releases on either
 * outcome — both settle the in-flight rebuild's promise.
 */
export type RebuildOutcome = "published" | "discarded";

/** Construction dependencies for the reload debouncer. */
export interface ReloadDebouncerDeps {
  /** The injected `Clock` seam the debounce window is measured against (V8d). */
  readonly clock: Clock;
  /**
   * Run one rebuild against the live registry / validator cache / registration
   * cache. Resolves on the rebuild's single synchronous publish or its
   * `loom/runtime/registry-swap-failed` discard (the PIC-36 completion signal
   * V9b owns); the returned promise settling is the PIC-49 guard-release event.
   */
  readonly rebuild: () => Promise<RebuildOutcome>;
  /** Debounce window in ms (default `RELOAD_DEBOUNCE_WINDOW_MS`). */
  readonly windowMs?: number;
}

/**
 * The debounce → rebuild coordinator. Each `onWatcherEvent()` drops the pending
 * debounce timer and reschedules it through `Clock.setTimeout`; when the timer
 * fires it runs `rebuild()` under the PIC-49 across-window serialization guard.
 */
export class ReloadDebouncer {
  readonly #clock: Clock;
  readonly #rebuild: () => Promise<RebuildOutcome>;
  readonly #windowMs: number;
  /** The most-recent pending debounce timer handle (drop-and-reschedule). */
  #pending: TimerHandle | undefined;
  /** True while a rebuild is awaiting its asynchronous steps (PIC-49). */
  #inFlight = false;
  /** True when a debounce window closed while a rebuild was in flight (PIC-49). */
  #deferred = false;

  constructor(deps: ReloadDebouncerDeps) {
    this.#clock = deps.clock;
    this.#rebuild = deps.rebuild;
    this.#windowMs = deps.windowMs ?? RELOAD_DEBOUNCE_WINDOW_MS;
  }

  /**
   * A watcher event for an existing loom / `.warp` / settings file: clear the
   * pending timer and reschedule (drop-and-reschedule coalescing), then, when
   * the window closes, run the rebuild under the PIC-49 guard.
   *
   * V10d-T stub: a no-op. The paired V10d implements the drop-and-reschedule
   * coalescing and the across-window serialization guard, so the debounce and
   * serialization tests red on their own primary assertions (no reload fires).
   */
  onWatcherEvent(): void {
    // Intentionally empty in the tests-task stub; see the class doc comment.
    void this.#clock;
    void this.#rebuild;
    void this.#windowMs;
    void this.#pending;
    void this.#inFlight;
    void this.#deferred;
  }
}
