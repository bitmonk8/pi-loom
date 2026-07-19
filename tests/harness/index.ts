// H4a — reusable end-to-end harness.
//
// `loadExtension` loads the theta extension factory against a fresh in-process
// `SessionDouble`, supplies the in-memory theta fixtures, and fires the
// `session_start` event so the factory's per-theta `pi.registerCommand` calls
// run (the registration-timing split). The returned handle drives slash
// dispatch end-to-end against the double — the surface `M` / `M-T` reuse for
// their single-source happy-path discovery.

import {
  createThetaExtension,
  type ThetaExtensionDeps,
} from "../../src/extension/factory";
import { SessionDouble } from "./session-double";

export { SessionDouble } from "./session-double";
export {
  ResponseProgrammer,
  type AbortPoint,
  type AssistantTurnScript,
  type BinderAttempt,
  type BinderEnvelopeKind,
  type BinderFailureClass,
  type InvokeChildScript,
  type ResponseEvent,
  type ScriptedToolResult,
  type SubagentAgentEnd,
  type SubagentCalleeScript,
} from "./response-program";

export interface LoadedExtension {
  /** The in-process session double the extension was loaded against. */
  readonly double: SessionDouble;
  /** Dispatch a registered slash command end-to-end. */
  dispatch(name: string, args: string): Promise<void>;
}

/**
 * Load the theta extension against a fresh session double, supply the in-memory
 * fixtures, and fire `session_start` (so per-theta commands register). Returns a
 * handle for end-to-end slash dispatch.
 */
export function loadExtension(deps: ThetaExtensionDeps): LoadedExtension {
  const double = new SessionDouble();
  createThetaExtension(deps)(double.pi);
  double.fireSessionStart();
  return {
    double,
    dispatch: (name: string, args: string) => double.dispatch(name, args),
  };
}
