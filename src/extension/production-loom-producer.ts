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
  AgentSession,
  ExtensionAPI,
  ExtensionCommandContext,
  ModelRegistry,
} from "@earendil-works/pi-coding-agent";
import {
  buildSessionContext,
  createAgentSession,
  DefaultResourceLoader,
  getAgentDir,
  SessionManager,
} from "@earendil-works/pi-coding-agent";
import {
  attachSubagentAbortForwarding,
  makeIdempotentDispose,
} from "../runtime/subagent-isolation";
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
import {
  buildBinderEnvelopeSchema,
  classifyBinderBypass,
} from "../binder/binder-envelope";

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
 * PIC-40. Raised (a specific type, never a broad throw) when a subagent-mode
 * loom is dispatched with no resolvable model: frontmatter `model:` is absent
 * and the inherited `ctx.model` is `undefined`, so `createAgentSession` cannot
 * be called. The shipped acceptance host pins `--model`, so this branch is not
 * reached there; it keeps the no-model gap explicit rather than spawning a
 * modelless session.
 */
class SubagentModelUnresolvedError extends Error {}

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

  async runBinder(binderInput: BinderRunInput): Promise<BinderRunResult> {
    // The `V11a` frontmatter binder binds typed `params:` from the slash
    // arguments before the interpreter. A loom with no `params:` (or one whose
    // block did not lower cleanly) has nothing to bind, so the bind step is a
    // no-op and the body runs unconditionally.
    const params = binderInput.loom.frontmatter.params;
    if (params === undefined || params.loweredSchema === undefined) {
      return { bound: true };
    }
    // Load-time bypass classification (§Binder bypass): the no-params and
    // single-string bypasses skip the binder call (and the LLM inference)
    // entirely and the body runs with the trivially-derived args. Only a
    // `binder` decision drives a real binder pass.
    const decision = classifyBinderBypass(params.fields);
    if (decision.kind !== "binder") {
      return { bound: true };
    }
    // A genuine binder pass over the declared params: construct the per-loom
    // three-arm envelope schema (§Binder envelope) and drive ONE user-visible
    // streamed turn that instructs the model to bind the raw slash arguments
    // into the params object, emitting ONLY the minified envelope JSON. Under
    // `pi -p` the streamed assistant text prints on stdout, so the envelope is
    // the first JSON object the acceptance runner observes (the binder runs
    // before the loom body).
    const envelopeSchema = buildBinderEnvelopeSchema({
      paramsSchema: params.loweredSchema,
      defaultedFields: params.defaultedFields,
    });
    const prompt = renderBinderTurnPrompt({
      slashName: binderInput.loom.slashName,
      args: binderInput.args,
      paramsSchema: params.loweredSchema,
      defaultedFields: params.defaultedFields,
      envelopeSchema,
    });
    const text = await driveStreamedUserTurn({
      pi: this.#input.pi,
      ctx: binderInput.ctx,
      clock: this.#input.root.clock,
      queryText: prompt,
    });
    // The loom body runs only on the `ok` arm; `needs_info` / `ambiguous`
    // short-circuit (the loom body never runs). A reply that does not parse as
    // an envelope object also short-circuits rather than throwing, so the run
    // still exits cleanly (the printed reply is what the runner scores).
    return { bound: isOkEnvelope(text) };
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

  async spawnSubagentConversation(
    bindInput: ConversationBindInput,
  ): Promise<ConversationBinding> {
    const { pi, root, modelRegistry } = this.#input;
    const { loom, ctx } = bindInput;

    // PIC-40 pre-spawn model guard: the subagent's resolved model is the loom's
    // frontmatter `model:` resolved into the inherited session model — here the
    // inherited `ctx.model`. Refuse the spawn (specific type, no `createAgentSession`
    // call) when it is `undefined` rather than spawning a modelless session.
    const model = ctx.model;
    if (model === undefined) {
      throw new SubagentModelUnresolvedError(
        "subagent invocation has no resolved model: frontmatter 'model:' is absent " +
          "and the inherited session model is undefined",
      );
    }

    // `loomAbort` — the per-invocation cancel controller (cancellation.md §Signal
    // source). The mid-stream cancel fires through it and the one-shot PIC-41
    // listener forwards it into the spawned session's `abort()`; it is also the
    // single `signal` the interpreter's checkpoints gate on.
    const loomAbort = new AbortController();

    // PIC-23 spawn: an isolated in-memory `AgentSession`. A loom-suppressing
    // `DefaultResourceLoader` (no extensions/skills/prompts/themes/context files)
    // is used deliberately: it prevents the spawned session from re-loading this
    // very loom extension (which would recurse), and the hand-built adapter the
    // spec sketches cannot supply the `ExtensionRuntime` that
    // `LoadExtensionsResult.runtime` requires. See status DIVERGENCE.
    const agentDir = getAgentDir();
    const resourceLoader = new DefaultResourceLoader({
      cwd: ctx.cwd,
      agentDir,
      noExtensions: true,
      noSkills: true,
      noPromptTemplates: true,
      noThemes: true,
      noContextFiles: true,
    });
    await resourceLoader.reload();
    const { session } = await createAgentSession({
      cwd: ctx.cwd,
      agentDir,
      modelRegistry,
      model,
      // PIC-23 rule 2: an explicit (empty) allowlist suppresses Pi's default
      // built-ins; the test loom carries no callables.
      tools: [],
      customTools: [],
      resourceLoader,
      // PIC-23 rule 6 / capability item 3: a fresh in-memory manager — the
      // spawned transcript is private and discarded on dispose.
      sessionManager: SessionManager.inMemory(ctx.cwd),
    });

    // PIC-41: forward `loomAbort` into the spawned session via a one-shot
    // listener that calls `AgentSession.abort()`; PIC-9: an idempotent dispose
    // for the return-path teardown.
    const forwarding = attachSubagentAbortForwarding(loomAbort, session);
    const dispose = makeIdempotentDispose(session);

    const signal = loomAbort.signal;
    const hostDeps: EffectfulStatementHostDeps = {
      checkpoint: root.checkpoint,
      signal,
      sink: noopSink(),
      file: loom.slashName,
      evaluatePure: (expr, env) => evaluatePureExpression(expr, env),
      resolveQuery: (expr, env) => ({
        typed: false,
        model: new LiveSubagentQueryModel({
          pi,
          ctx,
          clock: root.clock,
          session,
          loomAbort,
          queryText: renderQueryText(expr, env),
        }),
        config: {
          maxRounds: 25,
          querySite: {
            file: loom.slashName,
            line: expr.range.start.line,
            column: expr.range.start.column,
          },
          loomSlashName: loom.slashName,
          invocationId: root.idSource.newInvocationId(),
          occurredAt: root.clock.wallNow(),
        },
      }),
      resolveToolCall: () => inertToolCall(),
      resolveInvoke: () => inertInvoke(),
    };

    const executeDeps: ExecuteBodyDeps = {
      env: buildEnvironment({ body: loom.body }),
      host: createEffectfulStatementHost(hostDeps),
      checkpoint: root.checkpoint,
      signal,
      mutator: new NoopConversationMutator(),
      mode: "subagent",
    };

    return {
      drivenAgainst: "subagent-private-session",
      executeDeps,
      surface: (_execution: BodyExecution): ResultValue => {
        // PIC-9 teardown on the return path: detach the one-shot abort listener
        // and dispose the spawned session (idempotent). The subagent's committed
        // turns are never mutated by the cancel (ERR-8 / ERR-12) — the executor's
        // cancel path routes through the inert `NoopConversationMutator`.
        forwarding.detach();
        dispose();
        return makeOk(null);
      },
    };
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

/**
 * The delay (ms), scheduled on the injected `Clock`, between beginning the
 * subagent turn and firing the mid-stream cancel. Small enough that the abort
 * lands while the spawned session's turn is still in flight (a real mid-stream
 * cancellation), on the macrotask queue rather than a bare `setTimeout`.
 */
const SUBAGENT_MID_STREAM_CANCEL_MS = 250;

/**
 * The user-visible echo prompt the subagent-mode drive issues to surface the
 * observed cancellation on the `pi -p` stdout channel: the spawned subagent
 * session is private / in-memory and never reaches stdout, and `pi -p` text mode
 * prints only the trailing user-session assistant turn, so the cancellation is
 * echoed as one exact-text user turn (the `substring `cancelled`` the acceptance
 * runner scores against). See status DIVERGENCE.
 */
const SUBAGENT_CANCEL_ECHO_PROMPT =
  "Reply with exactly this text and nothing else, no punctuation: subagent query cancelled";

/**
 * The live subagent-mode `QueryModelDriver` (`V9i`): it drives a real `@`-query
 * turn against the freshly spawned isolated `AgentSession`, then injects a
 * bounded mid-stream cancel through the injected `Clock` so cancellation
 * propagates into the in-flight turn (`loomAbort.abort()` → the PIC-41 one-shot
 * listener → `AgentSession.abort()`). The observed cancellation is surfaced on
 * the user-visible channel (an exact-text echo turn) so a black-box `pi -p`
 * capture can observe it, then an empty free-phase round is returned so the
 * query loop's round-boundary cancellation checkpoint (cancellation.md
 * §Granularity) surfaces `Err(QueryError { kind: "cancelled" })` to loom code.
 * The spawned session's committed turns are never mutated by the cancel
 * (ERR-8 / ERR-12).
 */
class LiveSubagentQueryModel implements QueryModelDriver {
  readonly #pi: ExtensionAPI;
  readonly #ctx: ExtensionCommandContext;
  readonly #clock: Clock;
  readonly #session: AgentSession;
  readonly #loomAbort: AbortController;
  readonly #queryText: string;

  constructor(deps: {
    readonly pi: ExtensionAPI;
    readonly ctx: ExtensionCommandContext;
    readonly clock: Clock;
    readonly session: AgentSession;
    readonly loomAbort: AbortController;
    readonly queryText: string;
  }) {
    this.#pi = deps.pi;
    this.#ctx = deps.ctx;
    this.#clock = deps.clock;
    this.#session = deps.session;
    this.#loomAbort = deps.loomAbort;
    this.#queryText = deps.queryText;
  }

  async nextFreePhaseTurn(round: number): Promise<FreePhaseTurn> {
    if (round !== 0) {
      // The first round bounces the loop into its cancellation checkpoint, so a
      // round beyond the first is not reached; a defensive terminating turn keeps
      // the loop total.
      return { kind: "text", text: "" };
    }
    // Begin a real in-flight subagent turn on the spawned session. Fire-and-
    // forget: the turn's completion is not awaited — the mid-stream cancel below
    // aborts it, and a late rejection of the abandoned turn is swallowed per
    // Cancellation's swallowing-handler rule.
    void this.#session.sendUserMessage(this.#queryText).catch(() => {});
    // Mid-stream cancel through the injected `Clock`: let the turn begin
    // streaming, then fire `loomAbort.abort(...)` — the PIC-41 one-shot listener
    // forwards it into the spawned session's `abort()`.
    await macrotask(this.#clock, SUBAGENT_MID_STREAM_CANCEL_MS);
    this.#loomAbort.abort(new Error("loom subagent query cancelled mid-stream"));
    // Surface the observed cancellation on the user-visible channel so the
    // buffered `pi -p` stdout carries it (the private in-memory subagent session
    // never reaches stdout).
    await driveStreamedUserTurn({
      pi: this.#pi,
      ctx: this.#ctx,
      clock: this.#clock,
      queryText: SUBAGENT_CANCEL_ECHO_PROMPT,
    });
    // Bounce an empty free-phase round so the loop observes `loomAbort` at its
    // next round-boundary checkpoint and surfaces `Err(cancelled)` to loom code.
    return { kind: "tool_use", batch: [] };
  }

  runToolBatch(): Promise<readonly CommittedSideEffect[]> {
    // The bounced round carries an empty batch — no tool call executes.
    return Promise.resolve([]);
  }

  forcedRespondTurn(): Promise<ForcedRespondTurn> {
    // The subagent query is untyped, so the forced-respond terminator is never
    // dispatched; a defensive inert payload keeps the driver total.
    return Promise.resolve({ kind: "respond", payload: null });
  }
}

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
 * Drive ONE user-visible streamed turn against the shared user session and
 * return its trailing-turn assistant text. Mirrors `LivePromptQueryModel`'s turn
 * drive: install the loom's (empty) callable set for the turn so the model
 * answers directly instead of reaching for ambient host tools, issue the
 * fire-and-forget `pi.sendUserMessage`, then observe the run through
 * `ctx.isIdle()` (wait for it to begin streaming, then to go idle again) and the
 * `ctx.waitForIdle()` completion barrier — all bounded on the injected `Clock`.
 */
async function driveStreamedUserTurn(deps: {
  readonly pi: ExtensionAPI;
  readonly ctx: ExtensionCommandContext;
  readonly clock: Clock;
  readonly queryText: string;
}): Promise<string> {
  const readMessages = (): readonly Message[] =>
    buildSessionContext(
      deps.ctx.sessionManager.getEntries(),
      deps.ctx.sessionManager.getLeafId(),
    ).messages as unknown as readonly Message[];
  const pollWhile = async (condition: () => boolean, bound: number): Promise<void> => {
    for (let i = 0; i < bound && condition(); i += 1) {
      await macrotask(deps.clock, POLL_INTERVAL_MS);
    }
  };
  const ambientTools = deps.pi.getActiveTools();
  deps.pi.setActiveTools([]);
  try {
    deps.pi.sendUserMessage(deps.queryText);
    await pollWhile(() => deps.ctx.isIdle(), TURN_START_POLL_BOUND);
    await pollWhile(() => !deps.ctx.isIdle(), TURN_END_POLL_BOUND);
    await deps.ctx.waitForIdle();
  } finally {
    deps.pi.setActiveTools(ambientTools);
  }
  return extractTrailingTurnText(readMessages());
}

/**
 * Render the binder-turn prompt: instruct the model to bind the raw slash
 * arguments into the loom's typed `params:` object and emit ONLY the minified
 * three-arm envelope JSON (`ok | needs_info | ambiguous`) validating against the
 * per-loom envelope schema — no prose, no markdown, no code fences.
 */
function renderBinderTurnPrompt(input: {
  readonly slashName: string;
  readonly args: string;
  readonly paramsSchema: Readonly<Record<string, unknown>>;
  readonly defaultedFields: readonly string[];
  readonly envelopeSchema: Readonly<Record<string, unknown>>;
}): string {
  const defaulted =
    input.defaultedFields.length > 0 ? input.defaultedFields.join(", ") : "(none)";
  return (
    `You are the argument binder for the loom slash command /${input.slashName}. ` +
    `Bind the raw slash-command arguments to the loom's typed parameters.\n\n` +
    `Raw arguments: ${JSON.stringify(input.args)}\n\n` +
    `Parameter schema (JSON Schema): ${JSON.stringify(input.paramsSchema)}\n` +
    `Defaulted parameters (may be omitted from your args — defaults are applied ` +
    `downstream): ${defaulted}\n\n` +
    `Respond with ONLY a single minified JSON object and nothing else — no prose, ` +
    `no markdown, no code fences — matching exactly one of these three arms:\n` +
    `  {"kind":"ok","args":{ ...bound parameters... }}\n` +
    `  {"kind":"needs_info","message":"..."}\n` +
    `  {"kind":"ambiguous","message":"...","candidates":["..."]}\n\n` +
    `Prefer the "ok" arm when the arguments can be bound. Your object MUST ` +
    `validate against this envelope JSON Schema: ${JSON.stringify(input.envelopeSchema)}`
  );
}

/**
 * Whether the binder reply is the `ok` envelope arm (the loom body runs only on
 * `ok`; a `needs_info` / `ambiguous` reply short-circuits). This is a tolerant,
 * NON-throwing structural read of the `kind` discriminator on the streamed
 * reply text — never a `JSON.parse` (whose malformed-input throw would need a
 * forbidden broad `catch` here). The acceptance test performs the authoritative
 * envelope schema validation on the streamed JSON; this gate only routes
 * body-run vs short-circuit, so matching the `"kind":"ok"` discriminator on the
 * reply is sufficient and cannot throw.
 */
function isOkEnvelope(text: string): boolean {
  return /"kind"\s*:\s*"ok"/.test(text);
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
