// H3a — `IdSource` seam (PIC-20). Declares the seam interface's full member
// signatures, sourced from host-interfaces-services.md#idsource-interface. The
// runtime MUST mint each `invocationId` and each code-side `loom-direct:`
// `toolCallId` UUID body through this seam and MUST NOT call
// `crypto.randomUUID()` outside the production `CryptoIdSource` adapter — the
// ambient ban the H3a scan enforces. Adapters are added by the V8* leaves.
//
// Spec: host-interfaces-services.md PIC-20.

export interface IdSource {
  /** Canonical lowercase 8-4-4-4-12 hex UUID for an `invocationId`. */
  newInvocationId(): string;
  /** Canonical lowercase 8-4-4-4-12 hex UUID body for a code-side `loom-direct:` toolCallId. */
  newToolCallId(): string;
}
