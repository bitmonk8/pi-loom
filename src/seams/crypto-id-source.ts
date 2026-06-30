// V8d — `CryptoIdSource` production adapter for the `IdSource` seam (PIC-20).
//
// V8d-T STUB: the members throw so the paired V8d-T behavioural tests red on
// their own assertions (the implementation under test is absent). The real
// adapter is the only direct `crypto.randomUUID` site: both `newInvocationId()`
// and `newToolCallId()` delegate to `crypto.randomUUID()`, each delegating call
// carrying its own same-line `// allow-ambient: crypto.randomUUID — IdSource`
// comment (the only exempt UUID site the H3a scan admits). The stub references
// NO ambient `crypto.randomUUID` so the standing H3a real-tree ambient scan
// stays green until V8d lands the delegations.
//
// Spec: host-interfaces-services.md PIC-20.

import type { IdSource } from "./id-source";

const UNIMPLEMENTED = "CryptoIdSource adapter not implemented (V8d-T stub)";

export class CryptoIdSource implements IdSource {
  newInvocationId(): string {
    throw new Error(UNIMPLEMENTED);
  }

  newToolCallId(): string {
    throw new Error(UNIMPLEMENTED);
  }
}
