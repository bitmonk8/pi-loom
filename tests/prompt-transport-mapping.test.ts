// V9n-T — failing tests for the paired `V9n` prompt-mode transport-error-mapping
// leaf.
//
// Spec: pi-integration-contract/conversation-drive.md (§"Error detection":
// PIC-50 prompt-mode synchronous-throw transport mapping, PIC-51 prompt-mode
// `stopReason: "error"` transport mapping + cancellation short-circuit);
// errors-and-results/queryerror-variants.md (§TransportError.provider derivation).
//
// These tests red on their own primary assertions while `V9n` is absent,
// because the V9n-T seam stub is deliberately NON-COMPLIANT:
//   - `extractPromptModeQueryResult` always returns `Ok("")`, so it never
//     applies the cancellation short-circuit (PIC-51) nor the `stopReason:
//     "error"` transport probe (PIC-51);
//   - `mapPromptModeSyncThrow` returns a `loom/runtime/internal-error`-kinded
//     value with an un-coerced empty `message` (PIC-50).
// No test reds on a compile error, a missing fixture, or a harness throw.

import { describe, expect, it } from "vitest";
import type { AssistantMessage, Message, UserMessage } from "@earendil-works/pi-ai";
import {
  extractPromptModeQueryResult,
  mapPromptModeSyncThrow,
  PROMPT_MODE_TRANSPORT_FALLBACK_MESSAGE,
  type PromptModeQueryResult,
} from "../src/runtime/prompt-transport-mapping";
import type { TransportError } from "../src/runtime/query-error";

// ---------------------------------------------------------------------------
// pi-ai Message builders.
// ---------------------------------------------------------------------------

function userMessage(content: string): UserMessage {
  return { role: "user", content, timestamp: 0 };
}

/**
 * An assistant message carrying the given `text` and a chosen `stopReason` /
 * optional `errorMessage`. Used to build the driven turn's trailing `assistant`
 * message the post-`waitForIdle()` probe reads.
 */
function assistantMessage(opts: {
  text?: string;
  stopReason: AssistantMessage["stopReason"];
  errorMessage?: string;
}): AssistantMessage {
  const base: AssistantMessage = {
    role: "assistant",
    content: opts.text === undefined ? [] : [{ type: "text", text: opts.text }],
    api: "anthropic-messages",
    provider: "anthropic",
    model: "claude-test",
    usage: {
      input: 0,
      output: 0,
      cacheRead: 0,
      cacheWrite: 0,
      totalTokens: 0,
      cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 },
    },
    stopReason: opts.stopReason,
    timestamp: 0,
  };
  return opts.errorMessage === undefined
    ? base
    : { ...base, errorMessage: opts.errorMessage };
}

/** Narrow a `PromptModeQueryResult` to its `Err` arm, failing loudly otherwise. */
function expectErr(result: PromptModeQueryResult): Extract<
  PromptModeQueryResult,
  { ok: false }
>["error"] {
  if (result.ok) {
    // No silent skip: a stub that returned `Ok` must red here on the behavioural
    // expectation, not by silently passing.
    expect.unreachable(
      `expected an Err(QueryError) but got Ok(${JSON.stringify(result.value)})`,
    );
  }
  // `expect.unreachable` throws; the cast is unreachable at runtime on the Ok arm.
  return (result as Extract<PromptModeQueryResult, { ok: false }>).error;
}

/** A distinct error type for the synchronous-throw mapping test. */
class SendThrew extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SendThrew";
  }
}

// ===========================================================================
// PIC-51 — `stopReason: "error"` transport mapping.
// ===========================================================================

describe("V9n-T — PIC-51 prompt-mode stopReason:'error' transport mapping", () => {
  it("PIC-51: a trailing assistant stopReason:'error' maps to Err(transport) with the errorMessage and the resolved provider", () => {
    const messages: Message[] = [
      userMessage("do the thing"),
      assistantMessage({
        text: "partial",
        stopReason: "error",
        errorMessage: "upstream 503 from provider",
      }),
    ];

    const error = expectErr(
      extractPromptModeQueryResult(messages, {
        aborted: false,
        provider: "anthropic-messages",
      }),
    );

    // PIC-51: the trailing `assistant` `stopReason: "error"` maps to a
    // `kind: "transport"` `QueryError` — NOT `loom/runtime/internal-error` — with
    // `message` = the turn's `errorMessage`, `http_status: null`, the resolved
    // `Model<Api>.api` provider, and `retryable: false`.
    expect(error.kind).toBe("transport");
    const transport = error as TransportError;
    expect(transport.message).toBe("upstream 503 from provider");
    expect(transport.http_status).toBeNull();
    expect(transport.provider).toBe("anthropic-messages");
    expect(transport.retryable).toBe(false);
  });

  it("PIC-51: an absent errorMessage on the stopReason:'error' turn synthesises message = 'provider transport failure'", () => {
    const messages: Message[] = [
      userMessage("do the thing"),
      assistantMessage({ text: "", stopReason: "error" }),
    ];

    const error = expectErr(
      extractPromptModeQueryResult(messages, {
        aborted: false,
        provider: "mistral",
      }),
    );

    // PIC-51: `errorMessage` is optional on `AssistantMessage`; when absent the
    // synthesised transport `message` is the fixed fallback string, anchored on
    // the exported constant so the literal has one source of truth.
    expect(error.kind).toBe("transport");
    expect((error as TransportError).message).toBe("provider transport failure");
    expect((error as TransportError).message).toBe(
      PROMPT_MODE_TRANSPORT_FALLBACK_MESSAGE,
    );
  });
});

// ===========================================================================
// PIC-50 — synchronous-throw secondary transport mapping.
// ===========================================================================

describe("V9n-T — PIC-50 prompt-mode synchronous-throw transport mapping", () => {
  it("PIC-50: a synchronous throw from pi.sendUserMessage maps to Err(transport) with message = error.message, not loom/runtime/internal-error", () => {
    const thrown = new SendThrew("mid-stream send rejected by Pi");

    const transport = mapPromptModeSyncThrow(thrown, "openai-completions");

    // PIC-50: the throw maps to a `kind: "transport"` `TransportError` — the
    // runtime MUST NOT wrap it as `loom/runtime/internal-error` — with `message`
    // derived from the caught value (its `.message`), `http_status: null`, the
    // resolved provider, and `retryable: false`.
    expect(transport.kind).toBe("transport");
    expect(transport.kind).not.toBe("loom/runtime/internal-error");
    expect(transport.message).toBe("mid-stream send rejected by Pi");
    expect(transport.http_status).toBeNull();
    expect(transport.provider).toBe("openai-completions");
    expect(transport.retryable).toBe(false);
  });

  it("PIC-50: a non-Error synchronous throw (a thrown string) yields the deterministic coerced non-null String(v) message", () => {
    // PIC-50 *Non-Error-throw boundary*: a thrown non-object must coerce to a
    // deterministic non-null string via the underlying-error coercion (`String(v)`),
    // never `undefined` (which would corrupt the always-log dedup key).
    const transport = mapPromptModeSyncThrow("bare string failure", "amazon-bedrock");

    expect(transport.kind).toBe("transport");
    expect(transport.message).toBe("bare string failure");
    expect(transport.provider).toBe("amazon-bedrock");
  });
});

// ===========================================================================
// PIC-51 — cancellation short-circuit precedence.
// ===========================================================================

describe("V9n-T — PIC-51 cancellation short-circuit precedence", () => {
  it("PIC-51: loomAbort.signal.aborted synthesises Err(cancelled), taking precedence over a stopReason:'error' probe", () => {
    const messages: Message[] = [
      userMessage("do the thing"),
      assistantMessage({
        text: "partial",
        stopReason: "error",
        errorMessage: "would-be transport failure",
      }),
    ];

    const error = expectErr(
      extractPromptModeQueryResult(messages, {
        aborted: true,
        provider: "anthropic-messages",
      }),
    );

    // PIC-51: with `loomAbort.signal.aborted` true, the cancellation
    // short-circuit runs first and synthesises `kind: "cancelled"` — it takes
    // precedence over the `stopReason: "error"` transport probe.
    expect(error.kind).toBe("cancelled");
  });

  it("PIC-51: loomAbort.signal.aborted synthesises Err(cancelled) even when waitForIdle resolved cleanly with a normal Ok-extractable turn", () => {
    const messages: Message[] = [
      userMessage("do the thing"),
      assistantMessage({ text: "clean successful answer", stopReason: "stop" }),
    ];

    const error = expectErr(
      extractPromptModeQueryResult(messages, {
        aborted: true,
        provider: "anthropic-messages",
      }),
    );

    // PIC-51: the cancellation short-circuit takes precedence over the
    // `Ok(string)` extraction too — even when the turn terminated cleanly with
    // extractable assistant text and no error written to session state.
    expect(error.kind).toBe("cancelled");
  });
});
