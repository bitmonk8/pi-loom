// H3a — `TokenEstimator` seam (PIC-16). Declares the seam interface's full
// member signatures, sourced from host-interfaces-services.md#tokenestimator-interface.
// `AgentMessage` is the Pi-owned agent-state message type, referenced (not
// redefined) here. The `PiTokenEstimator` / `FakeTokenEstimator` adapters and
// the per-message-determinism consumption posture are added by the V8* leaves.
//
// Spec: host-interfaces-services.md PIC-16.

import type { AgentMessage } from "@earendil-works/pi-agent-core";

export interface TokenEstimator {
  /** Per-message token count consumed by the session-context truncation walk. */
  estimate(message: AgentMessage): number;
}
