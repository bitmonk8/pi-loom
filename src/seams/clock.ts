// H3a — `Clock` seam (PIC-12). Declares the seam interface's full member
// signatures, sourced from host-interfaces-services.md#clock--fakeclock-interface.
// The timing-source ban (no direct `Date.now` / `performance.now` /
// `Date.prototype.getTime` / global `setTimeout` / `clearTimeout` outside the
// `WallClock` adapter) is enforced by the H3a ambient-primitive scan; the
// `FakeClock` / `WallClock` adapters are added by the V8* leaves.
//
// Spec: host-interfaces-services.md PIC-12.

/** Opaque timer handle returned by `setTimeout` and cleared by `clearTimeout`. */
export type TimerHandle = unknown;

export interface Clock {
  /** Monotonic milliseconds; used for deadline math. MUST NOT drift (no NTP). */
  now(): number;
  /** Unix epoch milliseconds (wall-clock); stamps `RuntimeEvent.occurred_at`. */
  wallNow(): number;
  setTimeout(fn: () => void, ms: number): TimerHandle;
  clearTimeout(handle: TimerHandle): void;
}
