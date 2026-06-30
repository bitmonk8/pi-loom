// H3a — `FileWatcher` seam (PIC-14). Declares the seam interface's full member
// signatures, sourced from host-interfaces-services.md#filewatcher-interface.
// The debounce, build-aside-then-publish swap, structural-vs-content split, and
// terminal-signal recovery posture are runtime responsibilities layered on top
// of this seam by later leaves — the seam only delivers raw events.
//
// Spec: host-interfaces-services.md PIC-14.

export type FileWatchEventKind = "add" | "change" | "unlink";

export interface FileWatchEvent {
  /** Matches chokidar's three load-bearing event names. */
  kind: FileWatchEventKind;
  /** Absolute path of the affected file. */
  path: string;
}

export type Unsubscribe = () => void;

/**
 * Terminal-signal channel payload. Beyond the three steady-state change kinds,
 * the seam carries one further adapter→runtime path: when an error or throw
 * leaves one or more watched roots no longer delivering events, the adapter
 * conveys that terminal *stopped-delivering* condition to the runtime over this
 * channel. This is a distinct observation from the three change kinds — it is
 * not a `FileWatchEvent`. The member/API shape (an added event kind, a separate
 * terminal callback, or equivalent) is illustrative, not mandated, per GOV-18
 * arm (a); this leaf realises it as a separate `onTerminate` callback so the
 * delivery contract and the terminal channel stay structurally distinct.
 */
export interface WatchTermination {
  /** The watched roots that are no longer delivering events. */
  roots: readonly string[];
}

/** Terminal-signal callback — conveys a post-`error`/post-throw stopped-delivering observation. */
export type OnWatchTerminate = (termination: WatchTermination) => void;

export interface FileWatcher {
  /**
   * Attaches one handler over the supplied roots; the returned `Unsubscribe`
   * tears down the watcher (idempotent). The optional `onTerminate` callback is
   * the terminal-signal channel (see `WatchTermination`): the adapter invokes
   * it — and not `handler` — when one or more roots stop delivering events.
   */
  watch(
    roots: readonly string[],
    handler: (event: FileWatchEvent) => void,
    onTerminate?: OnWatchTerminate,
  ): Unsubscribe;
}
