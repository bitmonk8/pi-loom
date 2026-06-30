// V8d — sequence-driven `FakeIdSource` conforming `IdSource` seam (PIC-20).
//
// V8d-T STUB: both members throw so the paired V8d-T `FakeIdSource` semantic
// tests red on their own assertions (the implementation under test is absent).
// The real fake's constructor takes the sequence of ids it should hand out;
// `newInvocationId()` and `newToolCallId()` each return the next configured id
// on each call, so a conformance test drives minted ids at known boundaries
// instead of matching nondeterministic UUIDs.
//
// Spec: host-interfaces-services.md PIC-20.

import type { IdSource } from "../../src/seams/id-source";

const UNIMPLEMENTED = "FakeIdSource not implemented (V8d-T stub)";

export class FakeIdSource implements IdSource {
  constructor(_ids: readonly string[]) {}

  newInvocationId(): string {
    throw new Error(UNIMPLEMENTED);
  }

  newToolCallId(): string {
    throw new Error(UNIMPLEMENTED);
  }
}
