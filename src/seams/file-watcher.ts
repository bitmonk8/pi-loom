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

export interface FileWatcher {
  /** Attaches one handler over the supplied roots; the returned `Unsubscribe` tears down the watcher (idempotent). */
  watch(roots: readonly string[], handler: (event: FileWatchEvent) => void): Unsubscribe;
}
