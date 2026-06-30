// V8e — in-memory `FakeFileWatcher` conforming `FileWatcher` seam test double
// (PIC-14). The conformance vehicle for the watcher delivery contract: `emit`
// synchronously invokes the attached change handler with one of the three change
// kinds, and `terminate` drives the terminal-signal channel — a stopped-delivering
// observation distinct from the three change kinds — synchronously invoking the
// attached `onTerminate` callback. `watch` returns an idempotent `Unsubscribe`.
//
// V8e-T STATUS: stub. Every member throws so the paired V8e-T tests red for the
// intended reason — the implementation under test is absent. V8e replaces these
// bodies with the in-memory dispatch.
//
// Spec: host-interfaces-services.md PIC-14.

import type {
  FileWatcher,
  FileWatchEvent,
  OnWatchTerminate,
  Unsubscribe,
  WatchTermination,
} from "../../src/seams/file-watcher";

export class FakeFileWatcher implements FileWatcher {
  watch(
    _roots: readonly string[],
    _handler: (event: FileWatchEvent) => void,
    _onTerminate?: OnWatchTerminate,
  ): Unsubscribe {
    throw new Error("V8e: FakeFileWatcher.watch not implemented");
  }

  /** Injection point: synchronously deliver one change-kind event to the attached handler. */
  emit(_event: FileWatchEvent): void {
    throw new Error("V8e: FakeFileWatcher.emit not implemented");
  }

  /** Injection point: drive the terminal-signal channel (a stopped-delivering observation). */
  terminate(_termination: WatchTermination): void {
    throw new Error("V8e: FakeFileWatcher.terminate not implemented");
  }
}
