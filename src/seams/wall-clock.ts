// V8d — `WallClock` production adapter for the `Clock` seam (PIC-12).
//
// V8d-T STUB: the members throw so the paired V8d-T behavioural tests red on
// their own assertions (the implementation under test is absent). The real
// adapter delegates `now()`→`performance.now()`, `wallNow()`→`Date.now()`, and
// the timer methods to the global `setTimeout` / `clearTimeout`, each direct
// timing reference carrying its own same-line `// allow-ambient: <primitive> —
// Clock` comment (the only exempt timing site the H3a scan admits). The stub
// deliberately references NO ambient timing primitive so the standing H3a
// real-tree ambient scan stays green until V8d lands the delegations.
//
// Spec: host-interfaces-services.md PIC-12.

import type { Clock, TimerHandle } from "./clock";

const UNIMPLEMENTED = "WallClock adapter not implemented (V8d-T stub)";

export class WallClock implements Clock {
  now(): number {
    throw new Error(UNIMPLEMENTED);
  }

  wallNow(): number {
    throw new Error(UNIMPLEMENTED);
  }

  setTimeout(_fn: () => void, _ms: number): TimerHandle {
    throw new Error(UNIMPLEMENTED);
  }

  clearTimeout(_handle: TimerHandle): void {
    throw new Error(UNIMPLEMENTED);
  }
}
