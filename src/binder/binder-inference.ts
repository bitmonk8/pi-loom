// V9j / V9j-T — The pi-ai `complete()` binder inference call.
//
// This module owns the construction of the one-shot structured-output
// `complete()` call the binder pass issues per slash dispatch
// (pi-integration-contract/binder-inference.md §"Binder inference call"):
//
//   - `context.systemPrompt` is the rendered binder system prompt.
//   - `context.messages` is the fixed single-element `[user]` array whose content
//     is the canonical literal `Bind the slash-command arguments now.`.
//   - `context.tools` carries exactly one entry — the binder's structured-output
//     tool — `name` `__loom_bind_<slug>`, `description` the fixed literal, and
//     `parameters` the binder envelope schema wrapped as `Type.Unsafe<unknown>`.
//   - `options.temperature` is `0`; the provider's tool choice is forced to that
//     single tool via `options.toolChoice = { type: "tool", name }`.
//   - the fixed seed, when the resolved provider's `Api` carries a seed field, is
//     placed under that field name (per §"Provider seed-field mapping").
//   - `options.signal` is `loomAbort.signal`; `options.onResponse` is the
//     provider-response capture callback.
//
// V9j-T (tests-task) declares this seam and stubs `buildBinderCompleteCall`
// inertly (no forced tool, no temperature, no seed, no signal, no onResponse,
// no user message) so the paired envelope tests red on their own primary
// assertions. The paired V9j implementation leaf fills it in.
//
// Spec: pi-integration-contract/binder-inference.md (§Binder inference call),
// pi-integration-contract/provider-error-mapping.md (§Provider seed-field
// mapping), binder/binder-bypass-and-envelope.md (envelope schema),
// binder/determinism-cancellation-failure.md (§Determinism — temperature 0, the
// fixed user-message literal, the fixed seed).

import { Type } from "typebox";
import type {
  Api,
  Context,
  Model,
  ProviderResponse,
  ProviderStreamOptions,
  Tool,
} from "@earendil-works/pi-ai";
import type { BinderEnvelopeSchema } from "./binder-envelope";

/**
 * The per-provider binder seed-field mapping
 * (provider-error-mapping.md §"Provider seed-field mapping"), keyed on the
 * resolved binder model's `api` field. A provider whose row omits the seed
 * field maps to `undefined` and receives no seed key; a provider absent from the
 * table likewise receives none. Held as a single named constant so the
 * seed-supporting set has one source of truth to widen (a spec-versioned change).
 */
const BINDER_SEED_FIELD_BY_API: Readonly<Record<string, string | undefined>> =
  Object.freeze({
    "openai-completions": "seed",
    mistral: "random_seed",
    "anthropic-messages": undefined,
    "amazon-bedrock": undefined,
  });

/**
 * The binder user message carries no wall-clock time — the call is deterministic
 * (temperature 0, fixed literal content) — but `@earendil-works/pi-ai`'s
 * `UserMessage` type requires a `timestamp`. A fixed `0` keeps the constructed
 * message deterministic and reads no ambient timing primitive.
 */
const BINDER_MESSAGE_TIMESTAMP = 0;

// --- fixed literals ---------------------------------------------------------

/**
 * The canonical literal `user`-role message content
 * (binder-inference.md §"Binder inference call"): a fixed constant of the binder
 * call — it neither restates the variable binding context (carried by
 * `systemPrompt`) nor varies per invocation.
 */
export const BINDER_MESSAGE_CONTENT = "Bind the slash-command arguments now.";

/**
 * The binder structured-output tool's fixed `description` literal
 * (binder-inference.md §"Binder inference call").
 */
export const BINDER_TOOL_DESCRIPTION =
  "Return the binder result envelope for the slash-command argument binding.";

/**
 * The binder structured-output tool `name` (binder-inference.md): `__loom_bind_`
 * followed by the schema slug of the lowered binder envelope schema (the same
 * canonical-schema-hash recipe the typed-query `__loom_respond_<slug>` tool
 * name uses).
 */
export function binderToolName(slug: string): string {
  return `__loom_bind_${slug}`;
}

// --- the complete() call construction ---------------------------------------

/** Inputs to constructing one binder `complete()` call. */
export interface BinderCompleteCallInput {
  /** The resolved binder `Model<Api>` handle. */
  readonly model: Model<Api>;
  /** The rendered binder system prompt (`context.systemPrompt`). */
  readonly systemPrompt: string;
  /** The per-loom binder envelope schema, wrapped as `Type.Unsafe<unknown>`. */
  readonly envelopeSchema: BinderEnvelopeSchema;
  /** The schema slug of the lowered envelope schema (drives `__loom_bind_<slug>`). */
  readonly slug: string;
  /** The fixed seed value (mapped under the provider's seed field, when it has one). */
  readonly seed: number;
  /** The cancellation source — `loomAbort.signal` (always defined). */
  readonly signal: AbortSignal;
  /** The provider-response capture callback registered on every binder call. */
  readonly onResponse: (response: ProviderResponse, model: Model<Api>) => void;
}

/**
 * The constructed `complete(model, context, options)` argument triple. The
 * runtime hands this to `@earendil-works/pi-ai`'s `complete()` free function.
 */
export interface BinderCompleteCall {
  readonly model: Model<Api>;
  readonly context: Context;
  readonly options: ProviderStreamOptions;
}

/**
 * Construct the binder `complete()` call for one binder attempt
 * (binder-inference.md §"Binder inference call").
 *
 * V9j-T stub: returns an inert triple — an empty message array, no tools, and
 * empty options (no `temperature`, `toolChoice`, seed field, `signal`, or
 * `onResponse`) — so every paired envelope test reds on its own primary
 * assertion. The paired V9j implementation fills this in.
 */
export function buildBinderCompleteCall(
  input: BinderCompleteCallInput,
): BinderCompleteCall {
  const toolName = binderToolName(input.slug);

  const tool: Tool = {
    name: toolName,
    description: BINDER_TOOL_DESCRIPTION,
    parameters: Type.Unsafe<unknown>(input.envelopeSchema),
  };

  const context: Context = {
    systemPrompt: input.systemPrompt,
    messages: [
      {
        role: "user",
        content: BINDER_MESSAGE_CONTENT,
        timestamp: BINDER_MESSAGE_TIMESTAMP,
      },
    ],
    tools: [tool],
  };

  const options: ProviderStreamOptions = {
    temperature: 0,
    signal: input.signal,
    onResponse: input.onResponse,
    toolChoice: { type: "tool", name: toolName },
  };

  // Provider seed-field mapping: place the fixed seed under the provider's seed
  // field name, when its row carries one; omit it otherwise.
  const seedField = BINDER_SEED_FIELD_BY_API[input.model.api];
  if (seedField !== undefined) {
    (options as Record<string, unknown>)[seedField] = input.seed;
  }

  return { model: input.model, context, options };
}
