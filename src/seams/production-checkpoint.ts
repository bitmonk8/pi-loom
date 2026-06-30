// V8a — `ProductionCheckpoint` production wiring for the `Checkpoint` seam (PIC-10).
//
// V8a-T STUB: `before(...)` throws so the paired V8a-T yield-semantics tests red
// on their own assertions (the implementation under test is absent). The real
// adapter constructs one `Checkpoint` per `loomAbort` (per invocation) from the
// injected `Clock` seam, and `before(kind, site)`:
//   - for `loop-iter`, releases the event loop for one macrotask turn before
//     resolving — scheduling that resolution through the injected `Clock`'s
//     `setTimeout(fn, 0)` (the PIC-12 timer surface), never a bare global
//     `setTimeout`, so a Pi-dispatched abort can land before the next
//     loop-iteration signal-check;
//   - for every other kind (`query`, `tool-call`, `invoke`, `binder-call`),
//     resolves on the microtask queue (an already-resolved promise), because
//     those checkpoints precede real async I/O that already yields.
// It adds no `before(...)` sites beyond the five enumerated `CheckpointKind`s.
//
// Spec: host-interfaces-services.md PIC-10.

import type { Clock } from "./clock";
import type { Checkpoint, CheckpointKind, CheckpointSite } from "./checkpoint";

const UNIMPLEMENTED = "ProductionCheckpoint not implemented (V8a-T stub)";

export class ProductionCheckpoint implements Checkpoint {
  readonly #clock: Clock;

  constructor(clock: Clock) {
    this.#clock = clock;
  }

  before(_kind: CheckpointKind, _site: CheckpointSite): Promise<void> {
    void this.#clock;
    throw new Error(UNIMPLEMENTED);
  }
}
