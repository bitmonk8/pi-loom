// V9j / V9j-T — Provider-error → `QueryError` classification, the typed-query
// unsupported-provider load warning, and the unsupported-provider runtime
// `TransportError` synthesis.
//
// This module owns three mechanisms of
// pi-integration-contract/provider-error-mapping.md and the typed-query
// provider-compatibility clause of pi-integration-contract/conversation-drive.md:
//
//   - `classifyProviderResponse` — maps a classifier-reaching provider response
//     (HTTP status class + `AssistantMessage.stopReason` + `errorMessage`) to a
//     `QueryError` variant: overflow signatures and the `length` stop reason to
//     `ContextOverflowError` (with the deterministic token-count extraction),
//     every other classifier-reaching response to `TransportError` with the
//     `retryable` flag populated by transport-error class.
//   - `checkTypedQueryProviderSupport` — the load-time
//     `loom/load/typed-query-unsupported-provider` (W) emitter, fired when a loom
//     carries at least one typed-query expression and its resolved `model:`
//     routes through a provider outside the loom 1.0 typed-query supported set.
//   - `synthesizeUnsupportedProviderTransportError` — the runtime guard that,
//     on an unsupported provider, returns the pinned
//     `TransportError { retryable: false, http_status: null, … }`.
//
// V9j-T (tests-task) declares these seam shapes and stubs every behaviour-
// bearing function with an inert sentinel result so the failing tests compile
// and red on their own primary assertions (the classification table, the
// context-overflow extraction, the load warning, and the unsupported-provider
// synthesis are all absent). The paired V9j implementation leaf fills them in.
//
// Spec: pi-integration-contract/provider-error-mapping.md (§Provider error
// mapping, §`TransportError.retryable` population, §Overflow signatures,
// §Overflow token-count extraction, §Stop-reason classification, §Provider
// seed-field mapping), pi-integration-contract/conversation-drive.md
// (§Provider compatibility for typed queries); diagnostic code/message from
// diagnostics/code-registry-load.md.

import type { Diagnostic } from "../diagnostics/diagnostic";
import type {
  ContextOverflowError,
  QueryError,
  TransportError,
} from "../runtime/query-error";

// --- typed-query supported-provider set + load warning ----------------------

/**
 * The loom 1.0 typed-query-supported provider set
 * (conversation-drive.md §"Provider compatibility for typed queries" / the
 * `loom 1.0 seam — typed-query supported provider set`): the four `api`-shaped
 * values for which pi-ai exposes a named-tool `toolChoice` mapping. Exposed as a
 * single named constant so the set has one source of truth to widen.
 */
export const TYPED_QUERY_SUPPORTED_PROVIDER_APIS = [
  "anthropic-messages",
  "openai-completions",
  "mistral",
  "amazon-bedrock",
] as const;

/** The load-phase warning code for a typed query against an unsupported provider. */
export const TYPED_QUERY_UNSUPPORTED_PROVIDER_CODE =
  "loom/load/typed-query-unsupported-provider";

/**
 * The `loom/load/typed-query-unsupported-provider` message template
 * (diagnostics/code-registry-load.md): `<provider>` is the resolved
 * `Model<Api>.api` value, `<model>` the resolved `model:` reference. Tests source
 * the expected string from the registry per the *Diagnostic message anchors*
 * rule; this template mirrors it.
 */
export function typedQueryUnsupportedProviderMessage(
  provider: string,
  model: string,
): string {
  return `provider '${provider}' (model '${model}') is outside the loom 1.0 typed-query supported set; typed queries will fail at runtime`;
}

/** Inputs to the load-time typed-query provider-support check. */
export interface TypedQueryProviderCheckInput {
  /** The source file path, for a file-only located diagnostic. */
  readonly file: string;
  /** Whether the loom carries at least one typed-query expression. */
  readonly hasTypedQuery: boolean;
  /** The resolved `Model<Api>.api` value of the loom's `model:`. */
  readonly api: string;
  /** The resolved `model:` reference, substituted for `<model>`. */
  readonly modelReference: string;
}

/**
 * The load-time `loom/load/typed-query-unsupported-provider` (W) emitter: return
 * the warning diagnostic when the loom carries a typed query and its provider is
 * outside the supported set; return `null` otherwise (no typed query, or a
 * supported provider). The loom still loads either way.
 *
 * V9j-T stub: returns a fixed non-matching sentinel diagnostic so BOTH the
 * unsupported case (expecting the registry code/message) and the supported /
 * no-typed-query cases (expecting `null`) red on their own assertions. The
 * paired V9j implementation fills this in.
 */
export function checkTypedQueryProviderSupport(
  input: TypedQueryProviderCheckInput,
): Diagnostic | null {
  void input;
  return {
    severity: "warning",
    code: "loom/load/__v9j-unimplemented__",
    message: "",
  };
}

// --- unsupported-provider runtime TransportError synthesis ------------------

/**
 * The runtime guard's unsupported-provider `TransportError`
 * (conversation-drive.md §"Provider compatibility for typed queries"): a typed
 * query against a provider outside the supported set returns
 * `TransportError { retryable: false, http_status: null, provider, … }` — a
 * load-time capability gap, not a provider response.
 *
 * V9j-T stub: returns a wrong sentinel so the paired test reds on its own
 * assertion. The paired V9j implementation fills this in.
 */
export function synthesizeUnsupportedProviderTransportError(
  provider: string,
): TransportError {
  void provider;
  return {
    kind: "transport",
    message: "__v9j-unimplemented__",
    http_status: 0,
    provider: "",
    retryable: true,
  };
}

// --- provider-error → QueryError classifier ---------------------------------

/**
 * The classifier's input surface (provider-error-mapping.md §"Classifier input
 * surface"): loom obtains each field from a fixed `@earendil-works/pi-ai`
 * surface rather than a single typed error object the SDK does not expose.
 */
export interface ProviderClassifierInput {
  /**
   * The resolved `Model<Api>.api` value (api-shaped, e.g. `anthropic-messages`).
   * Selects the per-provider overflow signature and populates
   * `TransportError.provider` / `ContextOverflowError` provenance.
   */
  readonly api: string;
  /**
   * `ProviderResponse.status` captured through `StreamOptions.onResponse`, or
   * `null` when `onResponse` did not fire before `complete()` resolved (the
   * no-HTTP-response / network-level class).
   */
  readonly httpStatus: number | null;
  /**
   * The resolved `AssistantMessage.stopReason` (raw string; kept open for the
   * forward-compatibility "any stop reason the runtime does not recognise" arm).
   */
  readonly stopReason: string;
  /** The pi-ai-formatted `AssistantMessage.errorMessage`, when present. */
  readonly errorMessage?: string;
  /** The final malformed assistant text for `raw_response`, when available. */
  readonly rawResponse?: string | null;
}

/**
 * Classify a provider response to its `QueryError` variant
 * (provider-error-mapping.md): an overflow-signature or `length`-stop-reason
 * response to `ContextOverflowError` (with deterministic token-count
 * extraction), every other classifier-reaching response to `TransportError`
 * with `retryable` populated by transport-error class.
 *
 * V9j-T stub: returns a sentinel `CancelledError` (a valid `QueryError` variant
 * the classifier never produces) so every paired classification test reds on its
 * own `kind` / `retryable` / token-count assertion. The paired V9j
 * implementation fills this in.
 */
export function classifyProviderResponse(
  input: ProviderClassifierInput,
): QueryError {
  void input;
  return { kind: "cancelled", message: "__v9j-unimplemented__" };
}

// A type-only reference so `ContextOverflowError` stays part of this module's
// declared surface for the paired implementation (the classifier's overflow arm
// returns it). Erased at compile time.
export type ClassifiedOverflow = ContextOverflowError;
