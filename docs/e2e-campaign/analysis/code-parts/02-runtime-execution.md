# Code Part 02 — Runtime Execution Path

Slice: how a bound loom is driven to produce conversation turns / final values.
Corpus: `src/runtime/*.ts`, `src/render/*.ts`. All file:line citations against CWD `C:/UnitySrc/pi-loom`.

> Note on "stub" markers (see §5): every module in `src/runtime` carries a historical `V*-T (tests-task) … stubs the behaviour-bearing functions inertly` header comment. Those describe the RED test-task ancestor, not current state. The paired implementation leaves are filled in — every function body inspected on the execution path (`executeBody`, `valuesEqual`, `runUntypedQueryLoop`/`runTypedQueryLoop`, `evaluateForLoop`, `runCheckpointedForLoop`, `handlePartialTerminalOutcome`, `computeMasked`) contains real logic. Treat the header prose as archaeology.

---

## 1. Runtime dispatch model

### Top-level "execute a loom body" entry
- `executeBody(body: LoomBody, deps: ExecuteBodyDeps): Promise<BodyExecution>` — `src/runtime/statement-executor.ts:805`. This is the runtime's tree-walking driver: it walks the parsed `LoomBody` top-to-bottom, strictly sequentially, and returns the terminal outcome (`success`/`fail`/`cancel`) plus the FN-5 final value. It delegates to `executeBlock` at `src/runtime/statement-executor.ts:632`.
- `executeBody` is NOT called from within `src/runtime`. Its production callers live in `src/extension`:
  - prompt/subagent top-level dispatch: `src/extension/loom-composition-producer.ts:356` (`await executeBody(loom.body, binding.executeDeps)`).
  - invoke-child drive: `src/extension/production-loom-producer.ts:2294` and `:2333`.
  So the "drive a conversation" seam is `ExecuteBodyDeps` (`src/runtime/statement-executor.ts:107`), which bundles the lexical env, the `StatementEvalHost` effect boundary, the `Checkpoint` seam, the `loomAbort` signal, and the `CommittedConversationMutator`.

### Per-construct dispatchers (all in `statement-executor.ts`)
- Statement dispatcher: `executeStatement(stmt, env, deps)` — `src/runtime/statement-executor.ts:554`. A `switch (stmt.kind)` over `expr` / `tool-call` / `query` / `invoke` / `let` / `reassign` / `if` / `while` / `for` / `break` / `continue` / `return` / declarations.
- Block driver: `executeBlock(block, env, deps)` — `src/runtime/statement-executor.ts:632` (top-to-bottom, short-circuits on first non-`normal` `Flow`, computes FN-5 tail value).
- Expression dispatcher: `evalExpr(expr, env, deps)` — `src/runtime/statement-executor.ts:319`. Routes `try` → `evalTry` (`:464`), `match` → `evalMatch` (`:484`), a user-`fn` `call` → `evalUserFnCall` (`:237`); otherwise consults `host.checkpointFor(expr)` (`:340`) and either evaluates pure via `host.evaluatePure` (`:345`) or segments a checkpointed effect onto `runCancellableSequence` (`:359`).
- `Result`-context evaluator (operand of `?` / scrutinee of `match`): `evalAsResult` — `src/runtime/statement-executor.ts:404`.
- Control-flow statement dispatchers: `executeIf` `:660`, `executeWhile` `:715`, `executeFor` `:753` (drives `evaluateForLoop` from `control-flow.ts`).

### Effect dispatch — query / tool-call / invoke
The `StatementEvalHost` interface is declared at `src/runtime/statement-executor.ts:92`; its three members are `evaluatePure`, `checkpointFor`, `runEffect`. The concrete assembly is:
- `createEffectfulStatementHost(deps): StatementEvalHost` — `src/runtime/effectful-statement-host.ts:370`.
  - `checkpointFor` classifies `query`/`call`/`invoke` as checkpointed effects (`src/runtime/effectful-statement-host.ts:375`).
  - `runEffect` dispatches by `expr.kind` (`src/runtime/effectful-statement-host.ts:387`) to:
    - `runQueryEffect` — `src/runtime/effectful-statement-host.ts:149` (the `@`-query path).
    - `runToolCallEffect` — `src/runtime/effectful-statement-host.ts:227` (a `<name>(args)` code-tool call; also routes `.loom`-callable calls to invoke via `classifyCall`/`resolveCallAsInvoke` at `:238`).
    - `runInvokeEffect` — `src/runtime/effectful-statement-host.ts:303` (`invoke(...)` trampoline).
- Cancellable segmentation of a single effect: `runCancellableSequence` — invoked from `evalExpr` at `src/runtime/statement-executor.ts:359` (imported from `src/runtime/cancellation-core.ts`).

### Slash dispatch
- `src/runtime/slash-dispatch.ts` owns slash-invocation surface details: `renderNoParamsOverflowNote` `:41`, `dispatchNoParamsLoom` `:80`, `driveSlashPromptTurn` `:169`, `rendersTranscriptCard` `:117`. This is the SLSH-1/SLSH-2 layer (no-params overflow note, prompt-mode streaming order), not the body executor.

---

## 2. Where the MODEL gets called

The runtime never talks to a provider directly. The abstraction is the injected **`QueryModelDriver`** interface — `src/runtime/query-tool-loop.ts:119`. Members:
- `nextFreePhaseTurn(round): Promise<FreePhaseTurn>` — `src/runtime/query-tool-loop.ts:121`.
- `runToolBatch(batch, round): Promise<readonly CommittedSideEffect[]>` — `src/runtime/query-tool-loop.ts:127`.
- `forcedRespondTurn(): Promise<ForcedRespondTurn>` — `src/runtime/query-tool-loop.ts:132`.

The two-phase tool loop consumes this driver:
- `runUntypedQueryLoop(checkpoint, signal, model, config)` — `src/runtime/query-tool-loop.ts:326`.
- `runTypedQueryLoop(checkpoint, signal, model, config, schemaValidation?)` — `src/runtime/query-tool-loop.ts:410`.
Both are called by `runQueryEffect` (`src/runtime/effectful-statement-host.ts:178`, `:203`). The typed path also takes an injected `TypedQuerySchemaValidation` seam (`src/runtime/query-tool-loop.ts:281`: `resolveDeclaredSchema`/`lower`/`convey`/`validate`/`runRespondRepair`).

### (a) To FAKE the model in a test
Provide a `QueryModelDriver` implementation (`src/runtime/query-tool-loop.ts:119`) that scripts `nextFreePhaseTurn` / `runToolBatch` / `forcedRespondTurn` deterministically, and (for typed queries) a `TypedQuerySchemaValidation` (`src/runtime/query-tool-loop.ts:281`). Thread it through `QueryHostDispatch` (`src/runtime/effectful-statement-host.ts:71`) returned by `resolveQuery`. No provider is touched — the loop consults only the driver.

### (b) To use a REAL model
The production drivers implementing `QueryModelDriver` live in `src/extension/production-loom-producer.ts`, NOT in `src/runtime`:
- `LivePromptQueryModel` — `src/extension/production-loom-producer.ts:2663`. Reaches the model via Pi's `ExtensionAPI` `pi.sendUserMessage(...)` (fire-and-forget user turn) + `pi.on(...)` / `ctx.waitForIdle()`; the assistant text is scraped from the driven user session via `extractTrailingTurnText` (`src/runtime/conversation-drive.ts:202`). Provider entry ~`:2855`.
- `OffSessionQueryModel` — `src/extension/production-loom-producer.ts:2926`. Reaches the model via pi-ai's `complete()` free function over a `Model<Api>` (`#complete()` ~`:2962`, `offSessionComplete`), no session turn / no transcript card.
- `SubagentQueryModel` — `src/extension/production-loom-producer.ts:3029` (subagent-mode isolated session).

So the real-model boundary is: runtime → `QueryModelDriver` → (`ExtensionAPI.sendUserMessage` | pi-ai `complete()`). A test substitutes at the `QueryModelDriver` seam and never needs a live `ExtensionAPI` or `Model<Api>`.

---

## 3. Value model (`value.ts`)

- Runtime value union `LoomValue` — `src/runtime/value.ts:75`: JS `string | number | boolean | null | readonly LoomValue[] | { [key]: LoomValue } | EnumValue | ResultValue`.
- `EnumValue` — `src/runtime/value.ts:55` (opaque boxed-`String` carrying a non-enumerable `__loomEnum` declaring-enum tag; `JSON.stringify` yields bare wire string). Constructor `makeEnumValue` `:97`.
- `ResultValue` — `src/runtime/value.ts:64` (`{ ok: true, value } | { ok: false, error }`). Constructors `makeOk` `:184`, `makeErr` `:189`. Predicate `isResultValue` `:173`. `Result` never lowers to wire: `isWireLowerable` `:283`.
- Structural equality (`==`): `valuesEqual(a, b)` — `src/runtime/value.ts:203` (cross-type ⇒ false, `NaN==NaN`, `+0==-0`, element-wise arrays, keyset objects, enum tag+wire, `Result` discriminator recurse).
- Object-schema brand for outbound wire translation: `brandSchemaValue` `:136`, `schemaTagOf` `:150` (non-enumerable `__loomSchema`).

### Terminal-outcome / final-value shape
- `TerminalOutcome = "success" | "fail" | "cancel"` — `src/runtime/function-result.ts:34`.
- `FunctionResult { present: boolean; value? }` — `src/runtime/function-result.ts:42`; `functionResult(outcome, produced)` `:53` (FN-5: value present only on success). `discardForVoid` `:72` (FN-4 void ⇒ `null`).
- `BodyExecution { outcome, result, error? }` — `src/runtime/statement-executor.ts:128` — what `executeBody` returns. On `fail` (`?`-propagation ERR-18 or unhandled non-cancel effect `Err` ERR-19) it carries the terminating `Err` payload in `.error`; on `cancel` no final value flows.
- Internal control-flow signal `Flow` (`normal`/`return`/`break`/`continue`/`fail`/`propagate`/`cancel`) — `src/runtime/statement-executor.ts:167`; per-subexpr `EvalResult` — `:177`.
- Partial-append / non-mutation on mid-stream terminal event: `handlePartialTerminalOutcome(outcome, mutator)` — `src/runtime/terminal-outcomes.ts:86` (calls NOTHING on the mutator; ERR-8…ERR-12). `PartialTerminalPath` `:41`, `DrivenConversationMode` `:48`, `CommittedConversationMutator` `:57`.

---

## 4. Event channel / turn append & observation

Two distinct mechanisms:

### (a) Operator-facing runtime-event channel — `runtime-event-channel.ts`
- `RuntimeEvent` payload shape — `src/runtime/runtime-event-channel.ts:33` (`kind`, `code?`, `loom`, `invocation_id`, `query_site?`, `message`, `masked?`, `occurred_at`, …).
- Emission entry points (route through `sendSystemNote` on the `loom-system-note` channel): `emitRuntimeEvent` `:309` (group-A `details:{event}`), `emitPanic` `:325` (group-B `details:{diagnostics}`), `successSideNote` `:341` (null — success emits nothing).
- Routing / dedup: `alwaysLogGroup` `:199`, `isAlwaysLogKind` `:186`, `dedupKey` `:155` (tuple `(kind, query_site, message, occurred_at)`, `masked` excluded), `cascadeReemit` `:172`.
- PIC-1 hard-ceiling co-fire mask: `computeMasked(input)` `:124` (only reachable non-empty mask is `["ceiling#2"]`); consumed by `runTypedQueryLoop` in `src/runtime/query-tool-loop.ts` (depth-6 co-fire) and `buildValidationEvent`.
- Note builders (display/content matrix): `buildRuntimeEventNote` `:236`, `buildDiagnosticsBatchNote` `:254`, `buildPanicNote` `:265`, `buildStructuralNote`, `buildRecoveryNote`.

### (b) Conversation turns — how assistant text is appended/observed
- Turns are appended by the production `QueryModelDriver`s (prompt mode: `pi.sendUserMessage` into the shared user session; subagent/off-session: provider `complete()`), all in `src/extension/production-loom-producer.ts` — not in `src/runtime`.
- Turn OBSERVATION / final-value extraction is `extractTrailingTurnText(messages)` — `src/runtime/conversation-drive.ts:202` (PIC-53: concatenate `text` parts of every `assistant` message in the final turn, `\n`-joined). Prompt-mode lifecycle subscription for cancel-forwarding only: `subscribePromptModeCancelForwarding` `:158` over the five `PromptModeLifecycleEvent`s `:114` (`tool_call`/`tool_result`/`message_update`/`turn_end`/`agent_end`). Active-set gating window around each query: `withActiveSetGating` `:84`.

---

## 5. DEFER/TODO/stub/partial markers

`grep -rn -iE 'DEFER|TODO|FIXME|not.?wired|stub|partial|unimplemented' src/runtime src/render`.

**Finding: no genuine unimplemented functions on the execution path.** Every match is one of two benign classes.

### Class A — historical `V*-T` test-task header comments ("stubs … inertly / The paired leaf fills these in")
These describe the RED ancestor, not current state. Bodies verified implemented. Representative hits:
- `src/runtime/statement-executor.ts:4` (header) — body implemented (`executeBody` `:805`).
- `src/runtime/effectful-statement-host.ts:29`, `:366` ("V19d-T stub: `runEffect` is inert") — actual `runEffect` at `:387` dispatches for real.
- `src/runtime/query-tool-loop.ts:51`, `:309`, `:321`, `:405` — `runUntypedQueryLoop`/`runTypedQueryLoop` implemented.
- `src/runtime/control-flow.ts:18`, `:49` — `evaluateForLoop` implemented (`:52`).
- `src/runtime/checkpoint-granularity.ts:27`, `:69`, `:100` — `runCheckpointedForLoop`/`runCheckpointedBinderCall` implemented (`:72`, `:103`).
- `src/runtime/expression-evaluator.ts:38`, `:87`, `:575` — evaluator/type-check bodies present.
- `src/runtime/match-result.ts:17`, `:19`, `:139` — `evaluateMatch` implemented.
- `src/runtime/value.ts:29`, `src/runtime/function-result.ts:15`, `:68`, `src/runtime/terminal-outcomes.ts` header, `src/runtime/lexical-environment.ts:33`, `:169`, `:383`, `:400`, `src/runtime/runtime-event-channel.ts:10`, `src/runtime/cancellation-core.ts:12`, `src/runtime/depth-walk.ts:32`, `src/runtime/invocation.ts:20`, `src/runtime/slash-dispatch.ts:11`, `:38`, `src/runtime/err-note-render.ts:25`, `:103`, `:172`, `src/runtime/query-*.ts` headers, `src/runtime/subagent-isolation.ts:36`, `src/runtime/active-invocation-registry.ts:27`, `src/runtime/prompt-transport-mapping.ts:35`, `src/runtime/stdlib-string.ts:27`, `src/runtime/runtime-panics.ts:30`.
- `src/render/argument-echo.ts:26`, `src/render/query-render.ts:22`, `:24` — same header pattern; render bodies present.

### Class B — the word "partial" used in its DOMAIN sense (partial-append / partial stream), not "incomplete work"
- `src/runtime/terminal-outcomes.ts` (throughout — "partial-append contract", `PartialTerminalPath`, `handlePartialTerminalOutcome`), and its callers in `statement-executor.ts:56`, `:103`, `:316`, `:370`, `:372`, `:444`, `:495`, `:498`, `:692`, `:699`, `:802`.
- `src/runtime/no-rollback.ts:25`, `src/runtime/slash-dispatch.ts:7`, `:178`, `src/runtime/query-tool-loop.ts:495`, `src/runtime/match-result.ts:165`, `:166`.

### Class C — "deferred" meaning "delegated to a downstream boundary" (design intent, not TODO)
- `src/runtime/expression-evaluator.ts:587`, `:612`, `src/runtime/stdlib-object.ts:41` — unresolvable operand deferred to the runtime safety net.
- `src/runtime/invoke-ceiling-depth.ts:27`, `:77`, `:97`, `:109` — within-cap value deferred to the downstream AJV boundary.

No `FIXME`, no `unimplemented` sentinel returns, no `not-wired` on the execution path were found in current bodies.
