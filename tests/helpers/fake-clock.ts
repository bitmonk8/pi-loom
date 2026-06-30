// V8d — in-memory `FakeClock` conforming `Clock` seam implementation (PIC-12).
//
// V8d-T STUB: every member throws so the paired V8d-T `FakeClock` semantic
// tests red on their own assertions (the implementation under test is absent).
// The real fake drives deterministic timing: `advance(ms)` synchronously fires
// every timer whose deadline elapsed in deadline order (equal deadlines in
// registration order; a 0-ms timer fires under `advance(0)`, the loop-iter
// macrotask-yield conformance vehicle), `clearTimeout` is a no-op for an
// already-fired handle, `now()` returns the fake's accumulated time and is not
// implicitly advanced, and `wallNow()` returns a constructor-injected epoch
// that is likewise not implicitly advanced.
//
// Spec: host-interfaces-services.md PIC-12.

import type { Clock, TimerHandle } from "../../src/seams/clock";

const UNIMPLEMENTED = "FakeClock not implemented (V8d-T stub)";

export interface FakeClockOptions {
  /** Initial monotonic time reported by `now()` (default 0). */
  readonly now?: number;
  /** Constructor-injected epoch reported by `wallNow()` (default 0). */
  readonly wallEpoch?: number;
}

export class FakeClock implements Clock {
  constructor(_options: FakeClockOptions = {}) {}

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

  /** Synchronously fire every timer whose deadline has elapsed, in deadline order. */
  advance(_ms: number): void {
    throw new Error(UNIMPLEMENTED);
  }
}
