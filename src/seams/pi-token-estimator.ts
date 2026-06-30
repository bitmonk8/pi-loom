// V8e — `PiTokenEstimator` production adapter for the `TokenEstimator` seam (PIC-16).
//
// Production wiring delegates `estimate(message)` to the `estimateTokens` named
// import from `@earendil-works/pi-coding-agent`, forwarding the message and
// returning the import's result unchanged — redefining none of Pi's estimation
// algorithm. The seam is relied on as a deterministic pure function of its
// `message` argument at a fixed Pi-SDK pin.
//
// V8e-T STATUS: stub. The adapter throws so the paired V8e-T tests red for the
// intended reason — the implementation under test is absent. V8e replaces this
// body with the `estimateTokens` delegation.
//
// Spec: host-interfaces-services.md PIC-16; host-interfaces-core.md
// #estimatetokens-named-export.

import type { AgentMessage } from "@earendil-works/pi-agent-core";
import type { TokenEstimator } from "./token-estimator";

export class PiTokenEstimator implements TokenEstimator {
  estimate(_message: AgentMessage): number {
    throw new Error("V8e: PiTokenEstimator.estimate not implemented");
  }
}
