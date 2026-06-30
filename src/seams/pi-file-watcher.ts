// V8e — `PiFileWatcher` production adapter for the `FileWatcher` seam (PIC-14).
//
// Production wiring uses a chokidar watcher: `watch(roots, handler, onTerminate?)`
// attaches one handler over the supplied roots, filters chokidar's events down to
// the three load-bearing change kinds (`add`/`change`/`unlink`), and conveys a
// post-`error`/post-throw stopped-delivering observation over the terminal-signal
// channel. The returned `Unsubscribe` tears down the underlying watcher and is
// idempotent.
//
// V8e-T STATUS: stub. The adapter throws so the paired V8e-T tests red for the
// intended reason — the implementation under test is absent. V8e replaces this
// body with the chokidar wiring.
//
// Spec: host-interfaces-services.md PIC-14.

import type {
  FileWatcher,
  FileWatchEvent,
  OnWatchTerminate,
  Unsubscribe,
} from "./file-watcher";

export class PiFileWatcher implements FileWatcher {
  watch(
    _roots: readonly string[],
    _handler: (event: FileWatchEvent) => void,
    _onTerminate?: OnWatchTerminate,
  ): Unsubscribe {
    throw new Error("V8e: PiFileWatcher.watch not implemented");
  }
}
