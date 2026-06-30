// H3a — `Checkpoint` seam (PIC-10). Declares the seam interface's full member
// signatures, sourced from host-interfaces-services.md#checkpoint-seam. The V8*
// leaves implement against this shape; behaviour (the cancellation race rules,
// the per-`loop-iter` macrotask yield) is added there, not here.
//
// Spec: host-interfaces-services.md PIC-10.

export type CheckpointKind =
  | "loop-iter"
  | "query"
  | "tool-call"
  | "invoke"
  | "binder-call";

export interface CheckpointSite {
  file: string;
  line: number;
  column: number;
}

export interface Checkpoint {
  /** Awaited immediately before each cancellation checkpoint's signal read. */
  before(kind: CheckpointKind, site: CheckpointSite): Promise<void>;
}
