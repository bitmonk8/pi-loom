// V8e — in-memory `FakeTokenEstimator` conforming `TokenEstimator` seam test
// double (PIC-16). Drives the session-context truncation bounds at chosen
// per-message integer counts rather than coupling a test to Pi's estimation
// heuristic: the constructor takes the per-message counts it should report
// (keyed by message identity), and `estimate(message)` returns the configured
// integer for each message rather than deriving one from message content.
//
// V8e-T STATUS: stub. `estimate` throws so the paired V8e-T tests red for the
// intended reason — the implementation under test is absent. V8e replaces this
// body with the configured-count lookup.
//
// Spec: host-interfaces-services.md PIC-16.

import type { AgentMessage } from "@earendil-works/pi-agent-core";
import type { TokenEstimator } from "../../src/seams/token-estimator";

export class FakeTokenEstimator implements TokenEstimator {
  readonly #counts: ReadonlyMap<AgentMessage, number>;

  constructor(counts: ReadonlyMap<AgentMessage, number>) {
    this.#counts = counts;
  }

  estimate(_message: AgentMessage): number {
    throw new Error("V8e: FakeTokenEstimator.estimate not implemented");
  }
}
