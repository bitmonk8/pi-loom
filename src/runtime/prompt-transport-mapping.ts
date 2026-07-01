// V9n / V9n-T — prompt-mode transport-error mapping seam.
//
// This module owns the prompt-mode driver's transport-failure synthesis. It
// consumes V9c's trailing-turn `Ok(string)` extraction seam
// (`extractTrailingTurnText`) and builds the `stopReason: "error"` probe over
// the driven turn's trailing `assistant` message, mapping each failure surface
// to its `QueryError` per pi-integration-contract/conversation-drive.md
// §"Error detection":
//
//   - PIC-51 `stopReason: "error"` transport mapping: after `waitForIdle()`
//     resolves, a driven turn whose trailing `assistant` message carries
//     `stopReason: "error"` maps to
//     `Err(QueryError { kind: "transport", message: <errorMessage>,
//      http_status: null, provider: <resolved provider>, retryable: false })`;
//     when `errorMessage` is absent, `message` is the fixed string
//     `"provider transport failure"`. The runtime never classifies it as
//     `loom/runtime/internal-error` and never extracts it as `Ok(string)`.
//   - PIC-51 cancellation short-circuit: when `loomAbort.signal.aborted` is
//     true the runtime synthesises `Err(QueryError { kind: "cancelled" })` and
//     takes precedence over both the `stopReason: "error"` probe and the
//     `Ok(string)` extraction — even when `waitForIdle()` resolved cleanly with
//     no error written to session state.
//   - PIC-50 synchronous-throw secondary mapping: a synchronous throw from
//     `pi.sendUserMessage` maps to
//     `Err(QueryError { kind: "transport", message: <coerced caught-throw>,
//      http_status: null, provider: <resolved provider>, retryable: false })`,
//     NOT to `loom/runtime/internal-error`. The `message` is derived through the
//     underlying-error coercion rule so a non-Error throw yields a deterministic
//     non-null string.
//
// The synthesised `provider` field is NOT derived here — it is supplied by the
// caller from V9j's provider-error-mapping surface (the resolved
// `Model<Api>.api` value), matching the subagent-mode transport mapping.
//
// V9n-T (tests-task) declares this seam and stubs the two behaviour-bearing
// helpers NON-COMPLIANTLY so the failing tests compile and red on their own
// primary assertions; the paired V9n implementation leaf fills in the
// cancellation short-circuit, the `stopReason: "error"` probe, the
// `"provider transport failure"` fallback, and the coerced sync-throw mapping.
//
// Spec: pi-integration-contract/conversation-drive.md (PIC-50, PIC-51);
// errors-and-results/queryerror-variants.md (§TransportError.provider);
// diagnostics/placeholder-rendering-b.md (§underlying-error coercion).

import type { Message } from "@earendil-works/pi-ai";
import type { QueryError, TransportError } from "./query-error";

/** The fixed transport `message` when a `stopReason: "error"` turn carries no `errorMessage` (PIC-51). */
export const PROMPT_MODE_TRANSPORT_FALLBACK_MESSAGE = "provider transport failure";

/** A prompt-mode untyped query's result: `Ok(string)` or `Err(QueryError)`. */
export type PromptModeQueryResult =
  | { readonly ok: true; readonly value: string }
  | { readonly ok: false; readonly error: QueryError };

/**
 * The live context the post-`waitForIdle()` probe reads its short-circuits
 * from: the `loomAbort.signal.aborted` cancellation flag and the resolved
 * `Model<Api>.api` provider string (supplied by the caller from V9j's
 * provider-error-mapping surface, per the leaf's `Adds.`).
 */
export interface PromptModeProbeCtx {
  /** `loomAbort.signal.aborted` — the PIC-51 cancellation short-circuit. */
  readonly aborted: boolean;
  /** The resolved `Model<Api>.api` provider for the transport-failure `Err`. */
  readonly provider: string;
}

/**
 * PIC-51. Extract the prompt-mode untyped query's result from the driven user
 * session's trailing turn after `waitForIdle()` resolves, applying — in this
 * fixed order — the cancellation short-circuit (`ctx.aborted` →
 * `Err(cancelled)`), then the `stopReason: "error"` transport short-circuit
 * (trailing `assistant` `stopReason: "error"` → `Err(transport)`), then the
 * trailing-turn `Ok(string)` extraction (V9c's `extractTrailingTurnText`).
 */
export function extractPromptModeQueryResult(
  messages: readonly Message[],
  ctx: PromptModeProbeCtx,
): PromptModeQueryResult {
  // V9n-T stub: deliberately NON-COMPLIANT — always `Ok("")`, ignoring the
  // cancellation short-circuit and the `stopReason: "error"` transport probe.
  // The paired V9n leaf implements the fixed-order short-circuits.
  return { ok: true, value: "" };
}

/**
 * PIC-50. Map a synchronous throw from `pi.sendUserMessage` (the only failure
 * mode the call surface itself can signal) to a `TransportError`. `message` is
 * derived from the caught thrown value through the underlying-error coercion
 * rule (object `.message` when string, else `String(v)`, else `<unreadable>`),
 * NOT a raw `.message` read. The throw is never wrapped as
 * `loom/runtime/internal-error`.
 */
export function mapPromptModeSyncThrow(
  caught: unknown,
  provider: string,
): TransportError {
  // V9n-T stub: deliberately NON-COMPLIANT — misclassifies the throw as
  // `loom/runtime/internal-error` and does not coerce the caught value. The
  // paired V9n leaf implements the coerced `kind: "transport"` mapping.
  return {
    kind: "loom/runtime/internal-error",
    message: "",
    http_status: null,
    provider,
    retryable: false,
  };
}
