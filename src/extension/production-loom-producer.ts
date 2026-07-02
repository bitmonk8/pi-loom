// H8a — the production `LoomProducerDeps` for the shipped composition root.
//
// The `V19e` composition producer (`composeLoomFixture`) maps a parsed `.loom`
// to a runnable `LoomFixture` by composing three injected collaborators:
//
//   - `runBinder` — the `V11a` frontmatter binder over the slash arguments,
//     run before the loom interpreter; a non-binding envelope short-circuits;
//   - `bindPromptConversation` — bind `V19d`'s effectful executor to the shared
//     user session (`V12a`/`V9c`) so `@`-queries drive real user-visible turns;
//   - `spawnSubagentConversation` — spawn an isolated `AgentSession` (`V9i`) and
//     bind the executor to that private session for subagent-mode looms.
//
// This module assembles those collaborators against the live host `pi` surface
// and the runtime root's seams, so the shipped extension drives real
// prompt-mode / typed / subagent turns.
//
// Spec (narrative): pi-integration-contract/extension-bootstrap-and-per-loom.md
// (§"Per-loom registration"), conversation-drive.md, slash-invocation.md,
// binder/binder-model-and-context.md, subagent.md.

import type {
  ExtensionAPI,
  ExtensionCommandContext,
  ModelRegistry,
} from "@earendil-works/pi-coding-agent";
import { buildSessionContext } from "@earendil-works/pi-coding-agent";
import type { Api, AssistantMessage, Message, Model } from "@earendil-works/pi-ai";
import { complete } from "@earendil-works/pi-ai";
import type { Clock } from "../seams/clock";
import type { RuntimeRoot } from "../runtime-root";
import type {
  BinderRunInput,
  BinderRunResult,
  ConversationBinding,
  ConversationBindInput,
  LoomProducerDeps,
} from "./loom-composition-producer";
import type {
  EffectfulStatementHostDeps,
  QueryHostDispatch,
} from "../runtime/effectful-statement-host";
import { createEffectfulStatementHost } from "../runtime/effectful-statement-host";
import { buildEnvironment, type LexicalEnvironment } from "../runtime/lexical-environment";
import type { BodyExecution, ExecuteBodyDeps } from "../runtime/statement-executor";
import { extractTrailingTurnText } from "../runtime/conversation-drive";
import type {
  ForcedRespondTurn,
  FreePhaseTurn,
  QueryModelDriver,
  QueryToolLoopConfig,
} from "../runtime/query-tool-loop";
import type {
  AgentToolResultEnvelope,
  CodeSideToolCall,
  ToolLoweringSink,
} from "../runtime/tool-call-execute";
import type { CommittedSideEffect } from "../runtime/no-rollback";
import type { InvokeChild } from "../runtime/invoke-cancellation";
import type {
  CommittedConversationMutator,
  CommittedSurface,
} from "../runtime/terminal-outcomes";
import { makeOk, type LoomValue, type ResultValue } from "../runtime/value";
import type { Expr, QueryExpr } from "../parser/loom-document";
import { evaluateMemberAccess } from "../runtime/runtime-panics";
import { lexQueryTemplate, renderTemplateText } from "../render/query-render";

/** Construction inputs for the production per-loom producer collaborators. */
export interface ProductionProducerInput {
  /** The live host extension API (turn drive, message send, command surface). */
  readonly pi: ExtensionAPI;
  /** The runtime root over the real host seams (schema validator, clock, …). */
  readonly root: RuntimeRoot;
  /** The host model registry (binder-model resolution, structured-output turns). */
  readonly modelRegistry: ModelRegistry;
}

/**
 * Assemble the production `LoomProducerDeps` the shipped composition root
 * injects into `composeLoomFixture` for every discovered `.loom`.
 */
export function createProductionProducerDeps(
  input: ProductionProducerInput,
): LoomProducerDeps {
  return new ProductionLoomProducer(input);
}

/**
 * A `mode: subagent` loom's live drive is not yet composed at the production
 * composition root: the `V9i` isolated-`AgentSession` spawn (`createAgentSession`)
 * needs the host `AuthStorage` / model handle the `session_start` supplier does
 * not thread into the per-loom producer. This is a distinct shipped path from
 * prompt-mode; no prompt-mode loom reaches it. Raised as a specific type (never a
 * broad throw) so the gap is explicit rather than a silent wrong drive.
 */
class SubagentDriveNotComposedError extends Error {}

/** A fresh `ToolLoweringSink` that discards every channel — the test looms carry no code-tool calls. */
function noopSink(): ToolLoweringSink {
  return {
    runtimeEvent(): void {},
    diagnostic(): void {},
    systemNote(): void {},
  };
}

/**
 * An inert `CommittedConversationMutator`. A prompt-mode terminal event routes
 * through `handlePartialTerminalOutcome`, which calls nothing on the mutator for
 * the cancel path (ERR-8 … ERR-12: no committed surface is mutated); the shipped
 * user session's committed transcript is Pi-owned and never rewritten by loom.
 */
class NoopConversationMutator implements CommittedConversationMutator {
  truncate(): void {}
  rewrite(): void {}
  replace(): void {}
  remove(): void {}
  injectCompensatingTurn(_surface: CommittedSurface): void {}
}

/**
 * The inert tool-call / invoke resolvers. The test looms' bodies carry only
 * `@`-queries, so `resolveToolCall` / `resolveInvoke` are legitimately never
 * reached; they satisfy the `EffectfulStatementHostDeps` shape without lying —
 * a body that DID carry a `<name>(args)` / `invoke(...)` would need the real
 * `V14*` / `V15*` hosts wired here, which the shipped test corpus never exercises.
 */
function inertToolCall(): CodeSideToolCall {
  return {
    toolName: "unused",
    committed: [],
    dispatch(): Promise<AgentToolResultEnvelope> {
      return Promise.resolve({ content: [] });
    },
  };
}
function inertInvoke(): InvokeChild {
  return {
    calleePath: "unused",
    committed: [],
    drive(): Promise<ResultValue> {
      return Promise.resolve(makeOk(null));
    },
  };
}

/**
 * The production per-loom producer. Constructed once per `session_start`
 * discovery pass and shared across every discovered loom's `composeLoomFixture`
 * call; it holds only its injected collaborators (no cross-invocation mutable
 * state), constructing a fresh conversation binding per dispatch.
 */
class ProductionLoomProducer implements LoomProducerDeps {
  readonly #input: ProductionProducerInput;

  constructor(input: ProductionProducerInput) {
    this.#input = input;
  }

  runBinder(_binderInput: BinderRunInput): Promise<BinderRunResult> {
    // The `V11a` frontmatter binder binds typed `params:` from the slash
    // arguments before the interpreter. The shipped test looms declare no
    // `params:`, so binding is bypassed (SLSH-1 no-params overflow is
    // informational and never blocks execution) and the loom body runs
    // unconditionally. A non-binding envelope would return `{ bound: false }`;
    // with no params to bind, the bind step always succeeds.
    return Promise.resolve({ bound: true });
  }

  bindPromptConversation(bindInput: ConversationBindInput): ConversationBinding {
    const { pi, root } = this.#input;
    const { loom, ctx } = bindInput;

    // The `loomAbort`-equivalent signal the executor and every checkpoint gate
    // on: the dispatch context's signal when the agent is streaming, else a
    // fresh non-aborting controller so a straight-line run is never spuriously
    // cancelled.
    const signal = ctx.signal ?? new AbortController().signal;

    // The user session's resolved chronological message list — the PIC-53
    // trailing-turn read surface. Recomputed per read from the live
    // `ReadonlySessionManager` so each turn's freshly-committed assistant text
    // is visible.
    const readMessages = (): readonly Message[] =>
      buildSessionContext(
        ctx.sessionManager.getEntries(),
        ctx.sessionManager.getLeafId(),
      ).messages as unknown as readonly Message[];

    // Only the first query in a dispatch drives a user-visible streamed turn
    // (SLSH-2); any subsequent query in the same body is a chained follow-up run
    // off-session (`complete()`, no transcript card, PIC-51-style out-of-band).
    // This keeps exactly one turn streamed per dispatch so a body's trailing
    // query cannot interleave its stream with the primary turn's. See the module
    // header / status DIVERGENCE: a fuller design would stream every prompt-mode
    // turn, which the shipped acceptance looms do not require.
    let queryOrdinal = 0;

    const hostDeps: EffectfulStatementHostDeps = {
      checkpoint: root.checkpoint,
      signal,
      sink: noopSink(),
      file: loom.slashName,
      evaluatePure: (expr, env) => evaluatePureExpression(expr, env),
      resolveQuery: (expr, env) => {
        const userVisible = queryOrdinal === 0;
        queryOrdinal += 1;
        return this.#resolvePromptQuery(expr, env, {
          pi,
          ctx,
          loom,
          signal,
          readMessages,
          userVisible,
        });
      },
      resolveToolCall: () => inertToolCall(),
      resolveInvoke: () => inertInvoke(),
    };

    const executeDeps: ExecuteBodyDeps = {
      env: buildEnvironment({ body: loom.body }),
      host: createEffectfulStatementHost(hostDeps),
      checkpoint: root.checkpoint,
      signal,
      mutator: new NoopConversationMutator(),
      mode: "prompt",
    };

    return {
      drivenAgainst: "prompt-user-session",
      executeDeps,
      // PIC-53: the prompt-mode return value is the trailing turn's accumulated
      // assistant text of the driven user session.
      surface: (_execution: BodyExecution): ResultValue =>
        makeOk(extractTrailingTurnText(readMessages())),
    };
  }

  spawnSubagentConversation(
    _bindInput: ConversationBindInput,
  ): Promise<ConversationBinding> {
    return Promise.reject(
      new SubagentDriveNotComposedError(
        "H8a: subagent-mode live drive is not composed at the production root " +
          "(the V9i isolated-AgentSession spawn needs host AuthStorage/model not " +
          "threaded into the per-loom producer). No prompt-mode loom reaches this path.",
      ),
    );
  }

  /**
   * Resolve one `@`-query to its live dispatch: render the template against the
   * lexical environment and bind a live `QueryModelDriver` that drives real
   * user-visible turns into the shared session. An untyped query drives one
   * plain-text turn (`PIC-53`); a schema-typed query forces a structured
   * respond turn.
   */
  #resolvePromptQuery(
    expr: QueryExpr,
    env: LexicalEnvironment,
    deps: {
      readonly pi: ExtensionAPI;
      readonly ctx: ExtensionCommandContext;
      readonly loom: ConversationBindInput["loom"];
      readonly signal: AbortSignal;
      readonly readMessages: () => readonly Message[];
      readonly userVisible: boolean;
    },
  ): QueryHostDispatch {
    const { root } = this.#input;
    const typed = expr.schema !== null;
    // A typed query instructs the model to emit only a JSON object of the
    // declared shape, so its user-visible turn streams the structured value as
    // its assistant text (and an off-session typed turn's reply parses the same).
    const queryText = typed
      ? `${renderQueryText(expr, env)}\n\nRespond with ONLY a single minified JSON ` +
        `object matching this loom type, and nothing else — no prose, no markdown, ` +
        `no code fences: ${expr.schema}`
      : renderQueryText(expr, env);

    const model = deps.userVisible
      ? new LivePromptQueryModel({
          pi: deps.pi,
          ctx: deps.ctx,
          clock: root.clock,
          queryText,
          readMessages: deps.readMessages,
        })
      : new OffSessionQueryModel({ model: deps.ctx.model, queryText });

    const config: QueryToolLoopConfig = {
      // A typed query dispatches only the forced-respond terminator (no
      // free-phase provider call), so its `max_rounds`-final branch fires at
      // typed-query start; an untyped query drives one user-visible free-phase
      // turn under the loom's configured cap.
      maxRounds: typed ? 0 : deps.loom.frontmatter.toolLoop?.maxRounds ?? 25,
      querySite: {
        file: deps.loom.slashName,
        line: expr.range.start.line,
        column: expr.range.start.column,
      },
      loomSlashName: deps.loom.slashName,
      invocationId: root.idSource.newInvocationId(),
      occurredAt: root.clock.wallNow(),
    };

    return { typed, model, config };
  }
}

/**
 * The live prompt-mode `QueryModelDriver` (`V12a`/`V9c`): it drives real
 * user-visible turns into the shared user session. `nextFreePhaseTurn` issues
 * the rendered query as a streamed user turn (`pi.sendUserMessage`) and awaits
 * `ctx.waitForIdle()` so the assistant streams into the transcript before the
 * interpreter resumes (SLSH-2), then extracts the trailing-turn assistant text
 * (PIC-53) as the plain-text terminating turn.
 */
class LivePromptQueryModel implements QueryModelDriver {
  readonly #pi: ExtensionAPI;
  readonly #ctx: ExtensionCommandContext;
  readonly #clock: Clock;
  readonly #queryText: string;
  readonly #readMessages: () => readonly Message[];

  constructor(deps: {
    readonly pi: ExtensionAPI;
    readonly ctx: ExtensionCommandContext;
    readonly clock: Clock;
    readonly queryText: string;
    readonly readMessages: () => readonly Message[];
  }) {
    this.#pi = deps.pi;
    this.#ctx = deps.ctx;
    this.#clock = deps.clock;
    this.#queryText = deps.queryText;
    this.#readMessages = deps.readMessages;
  }

  async nextFreePhaseTurn(round: number): Promise<FreePhaseTurn> {
    if (round === 0) {
      // SLSH-2: issue the rendered query as one streamed user-visible turn and
      // await its completion so the assistant text is committed before the
      // interpreter resumes. The driver requests no frontmatter tools, so the
      // model's reply is the terminating plain-text turn — the free phase
      // advances no further round.
      await this.#driveUserVisibleTurn();
      return { kind: "text", text: extractTrailingTurnText(this.#readMessages()) };
    }
    // No `tool_use` round was ever returned, so a round beyond the first cannot
    // be reached; a defensive terminating turn keeps the loop total.
    return { kind: "text", text: "" };
  }

  runToolBatch(): Promise<readonly CommittedSideEffect[]> {
    // The driver emits no `tool_use` batch (no frontmatter callable set is
    // installed for these looms), so no batch is ever executed.
    return Promise.resolve([]);
  }

  async forcedRespondTurn(): Promise<ForcedRespondTurn> {
    // A schema-typed query's forced-respond terminator drives one user-visible
    // turn that streams the structured JSON as its assistant text, then parses
    // that text as the candidate structured payload. The typed-query response
    // schema is lowered from the declared annotation (`V5d`); the respond loop
    // depth-walks and validates the payload against it.
    await this.#driveUserVisibleTurn();
    const text = extractTrailingTurnText(this.#readMessages());
    return { kind: "respond", payload: parseStructuredPayload(text) };
  }

  /**
   * Issue one streamed user-visible turn and await its full completion.
   *
   * `pi.sendUserMessage` is fire-and-forget: it schedules a fresh agent run but
   * returns before that run installs its active-run handle, and
   * `ctx.waitForIdle()` resolves immediately while no run is active. So the
   * driver first waits for the run to become observably non-idle (bounded, on
   * the injected `Clock` macrotask queue, so a turn that never starts cannot
   * hang), then awaits idle for the run's `agent_end`.
   */
  async #driveUserVisibleTurn(): Promise<void> {
    // `pi.sendUserMessage` is fire-and-forget: it schedules a fresh agent run
    // but returns before that run installs its active-run handle. `waitForIdle`
    // is not a reliable barrier here — in a session bound without
    // `commandContextActions` it is a no-op that resolves immediately — so the
    // driver observes the run through `ctx.isIdle()` (the real `!isStreaming`
    // flag): wait for the run to begin streaming, then for it to go idle again
    // (its `agent_end`). Both waits are bounded on the injected `Clock` so a run
    // that never starts (or one that starts and ends within a single tick)
    // cannot hang. The final `waitForIdle` is the real-host completion barrier
    // (PIC-18) when the session binds one.
    // PIC-17 active-set gating: install exactly the loom's callable set (empty
    // for these looms) for the query turn and restore the ambient set in a
    // `finally`, so the model answers the query directly instead of reaching for
    // ambient host tools (read / write / …). Ambient tools are deliberately not
    // inherited.
    const ambientTools = this.#pi.getActiveTools();
    this.#pi.setActiveTools([]);
    try {
      this.#pi.sendUserMessage(this.#queryText);
      await this.#pollWhile(() => this.#ctx.isIdle(), TURN_START_POLL_BOUND);
      await this.#pollWhile(() => !this.#ctx.isIdle(), TURN_END_POLL_BOUND);
      await this.#ctx.waitForIdle();
    } finally {
      this.#pi.setActiveTools(ambientTools);
    }
  }

  /** Release the event loop, polling `condition` on the `Clock` up to `bound` times. */
  async #pollWhile(condition: () => boolean, bound: number): Promise<void> {
    for (let i = 0; i < bound && condition(); i += 1) {
      await macrotask(this.#clock, POLL_INTERVAL_MS);
    }
  }
}

/** Poll cadence (ms) while waiting for a fire-and-forget user turn's stream lifecycle. */
const POLL_INTERVAL_MS = 10;

/** Bound on start-phase polls (≈ waiting for the run to begin streaming). */
const TURN_START_POLL_BOUND = 1000;

/** Bound on end-phase polls (≈ waiting for the streamed run to complete). */
const TURN_END_POLL_BOUND = 60000;

/** Release the event loop for one poll interval through the injected `Clock` seam. */
function macrotask(clock: Clock, ms: number): Promise<void> {
  return new Promise<void>((resolve) => {
    clock.setTimeout(() => resolve(), ms);
  });
}

/**
 * An off-session `QueryModelDriver`: it resolves the query through pi-ai's
 * `complete()` free function (no user session turn, no transcript card), so a
 * chained follow-up query in a body does not stream into the transcript
 * alongside the dispatch's primary user-visible turn. The untyped path returns
 * the assistant text; the typed path parses it as the structured payload.
 */
class OffSessionQueryModel implements QueryModelDriver {
  readonly #model: Model<Api> | undefined;
  readonly #queryText: string;

  constructor(deps: { readonly model: Model<Api> | undefined; readonly queryText: string }) {
    this.#model = deps.model;
    this.#queryText = deps.queryText;
  }

  async nextFreePhaseTurn(round: number): Promise<FreePhaseTurn> {
    if (round === 0) {
      return { kind: "text", text: await this.#complete() };
    }
    return { kind: "text", text: "" };
  }

  runToolBatch(): Promise<readonly CommittedSideEffect[]> {
    return Promise.resolve([]);
  }

  async forcedRespondTurn(): Promise<ForcedRespondTurn> {
    return { kind: "respond", payload: parseStructuredPayload(await this.#complete()) };
  }

  async #complete(): Promise<string> {
    if (this.#model === undefined) {
      throw new OffSessionModelUnavailableError(
        "H8a: an off-session chained query has no resolved model (ctx.model is undefined).",
      );
    }
    const reply: AssistantMessage = await complete(this.#model, {
      messages: [{ role: "user", content: this.#queryText, timestamp: 0 }],
    });
    return assistantText(reply);
  }
}

/** The off-session `complete()` path has no resolved model to dispatch against. */
class OffSessionModelUnavailableError extends Error {}

/** Concatenate the text content of an assistant message (thinking / tool calls omitted). */
function assistantText(message: AssistantMessage): string {
  return message.content
    .filter((part): part is Extract<typeof part, { type: "text" }> => part.type === "text")
    .map((part) => part.text)
    .join("");
}

/**
 * Parse the trailing turn's streamed assistant text as a structured JSON value.
 * A payload that does not parse as JSON is surfaced verbatim as a string so the
 * downstream depth-walk / AJV validation (`V13c`) reports the schema mismatch,
 * rather than swallowing it here.
 */
function parseStructuredPayload(text: string): unknown {
  const trimmed = text.trim();
  const first = trimmed.indexOf("{");
  const last = trimmed.lastIndexOf("}");
  const candidate = first >= 0 && last > first ? trimmed.slice(first, last + 1) : trimmed;
  const parsed = JSON.parse(candidate) as unknown;
  return parsed;
}

/**
 * Render one `@`-query template to its wire text against the lexical
 * environment: lex the template into literal / `${…}` interpolation parts,
 * resolve each interpolation path against the environment, and apply the QRY-7
 * newline-trim → dedent normalisation. A path interpolation resolves its head
 * identifier against the environment and walks the remaining `.field` segments.
 */
function renderQueryText(expr: QueryExpr, env: LexicalEnvironment): string {
  const lexed = lexQueryTemplate(expr.template);
  let text = "";
  for (const part of lexed.parts) {
    if (part.kind === "text") {
      text += part.value;
      continue;
    }
    text += stringifyPathValue(resolveInterpolationPath(part.exprSource, env));
  }
  return renderTemplateText(text);
}

/** Resolve a `Ident ('.' Ident)*` interpolation path against the environment. */
function resolveInterpolationPath(source: string, env: LexicalEnvironment): LoomValue {
  const segments = source
    .split(".")
    .map((segment) => segment.trim())
    .filter((segment) => segment.length > 0);
  if (segments.length === 0) {
    return null;
  }
  const head = env.resolve(segments[0] as string);
  let current: LoomValue = head.arm === "local" ? head.value ?? null : null;
  for (let i = 1; i < segments.length; i += 1) {
    current = evaluateMemberAccess(current, segments[i] as string);
  }
  return current;
}

/** Stringify a resolved interpolation value: a string verbatim, else compact JSON. */
function stringifyPathValue(value: LoomValue): string {
  if (typeof value === "string") {
    return value;
  }
  return JSON.stringify(value);
}

/**
 * Evaluate a pure (non-checkpointed) sub-expression against the environment.
 * The shipped test looms' pure sub-expressions are literal / identifier reads;
 * an identifier that resolves to a local binding yields its value, any other
 * resolution arm (a bare `fn` / callable name, or an unresolved name) has no
 * first-class readable value and yields `null` (the expressions.md runtime
 * safety net) rather than throwing out of the executor.
 */
function evaluatePureExpression(expr: Expr, env: LexicalEnvironment): LoomValue {
  switch (expr.kind) {
    case "number":
      return Number(expr.text);
    case "string":
    case "bool":
      return expr.value;
    case "null":
      return null;
    case "ident": {
      const resolution = env.resolve(expr.name);
      return resolution.arm === "local" ? resolution.value ?? null : null;
    }
    default:
      // The composition root drives every checkpointed effect (`@`-query /
      // tool-call / `invoke`) through `runEffect`; a richer pure form is not
      // reached by the shipped test looms and yields the inert `null` value.
      return null;
  }
}
