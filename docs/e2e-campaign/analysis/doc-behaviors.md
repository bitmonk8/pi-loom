# User-facing behaviour & example catalog

Phase-A doc analysis for the pi-loom 1.0 e2e campaign. Captures every
claim/promise the user- and host-facing documentation makes, every runnable
example and its documented expected outcome, and doc-vs-spec tensions.

Sources read in full: `README.md`, `docs/guide.md`, `docs/tutorial.md`, the seven
`docs/how-to/*.md` recipes, and the nine `docs/examples/*` files. Per-source
partials are under `docs/e2e-campaign/analysis/doc-parts/`
(`tutorial.md`, `how-to.md`, `examples.md`).

Verifiability tags:

- **offline** — checkable by static parse / typecheck / frontmatter validation /
  load-time diagnostics, no model.
- **conformance** — needs runtime dispatch / discovery-registration / transcript
  accounting / error-variant surfacing (the `test:conformance` production path),
  but no live model.
- **live** — needs a real LLM (query success, binder mapping, schema repair).
- **inspection** — doc/structural/code-reading claim, verifiable by reading files.

---

## 1. Documented behaviours / promises

### Nature of a loom (mental model)

| # | Claim | Source | Verify |
|---|-------|--------|--------|
| DOC-1 | A `.loom` file interleaves ordinary code (variables, loops, conditionals, functions) with literal text destined for the model. | `README.md:6` | inspection |
| DOC-2 | Evaluating a loom appends turns to a conversation — one turn per query, in code-issue order; this is the loom's primary effect. | `docs/guide.md:64` | conformance |
| DOC-3 | A loom is a program, not a template: it drives a conversation across as many turns as it needs; there is no single emission buffer flushed at the end. | `docs/guide.md:39`, `docs/guide.md:60` | conformance |
| DOC-4 | The query primitive is an `@`-prefixed backtick template that (1) sends its rendered text as the next user turn, (2) awaits the model response servicing any tool-call loop, (3) returns the response as a value. | `docs/guide.md:42` | live |
| DOC-5 | A query is an expression, not a statement; it returns a `Result`, and `?` unwraps `Ok` / propagates `Err`. | `docs/guide.md:50` | offline |
| DOC-6 | When the surrounding type context supplies a schema (binding annotation, function parameter, return type), the response is validated and returned as that type; otherwise it is a string. | `docs/guide.md:52` | live |
| DOC-7 | Inside a template, `${...}` splices a value into the text sent to the model; the interpoland renders by its Loom static type. | `docs/tutorial.md:88`, `docs/tutorial.md:112` | conformance |
| DOC-8 | Control flow can branch on what the model just said; a loop can issue a follow-up query only when the previous answer warrants it. | `docs/guide.md:56` | live |
| DOC-9 | When an evaluation ends, turns already appended stay in the driven conversation; the runtime performs no implicit rollback of a partially-run loom. | `docs/guide.md:66` | conformance |
| DOC-10 | The Loom language has no file-writing, network, or process-spawning primitive; every external effect flows through a query, a tool call, or a child loom invocation. | `README.md:15`, `docs/guide.md:210` | inspection |

### Execution modes (prompt vs subagent)

| # | Claim | Source | Verify |
|---|-------|--------|--------|
| DOC-11 | Every loom declares its own execution mode in a required `mode:` frontmatter field; the mode is a per-file author property, not chosen by the invoker. | `docs/guide.md:75`, `docs/tutorial.md:34` | offline |
| DOC-12 | In prompt mode each query runs as a turn in the caller's current conversation; invoked from a slash command that is the user's session and every turn is user-visible. | `docs/guide.md:80`, `docs/tutorial.md:38` | conformance |
| DOC-13 | In prompt mode the loom's final return value is not surfaced to the user as a distinct artefact; an author who wants the user to see a result issues a final query containing it. | `docs/guide.md:82` | conformance |
| DOC-14 | In prompt mode assistant tokens stream into the transcript, so a prompt-mode loom's trailing turn is visible on `pi -p` stdout. | `docs/tutorial.md:39` | live |
| DOC-15 | In subagent mode a fresh, isolated conversation is spawned; each query runs as a turn in it; the intermediate transcript is private and discarded after the loom returns. | `docs/guide.md:87`, `docs/tutorial.md:41` | conformance |
| DOC-16 | A subagent loom's final value reaches programmatic callers and propagates across the subagent boundary but is NOT printed on the `pi -p` text channel. | `docs/tutorial.md:43`, `docs/tutorial.md:45` | conformance |
| DOC-17 | A successful subagent run surfaces as exit 0 with empty stdout. | `docs/tutorial.md:46` | live |
| DOC-18 | The two modes differ in which frontmatter fields are accepted (e.g. `system:` is subagent-only) and in which Pi APIs the runtime calls. | `docs/guide.md:94` | offline |
| DOC-19 | Modes compose: a loom can `invoke(...)` another, and the callee's mode decides whether the child attaches to the caller's conversation or spawns its own. | `docs/guide.md:97` | conformance |

### Final value

| # | Claim | Source | Verify |
|---|-------|--------|--------|
| DOC-20 | On the success outcome, evaluation produces a final value: the loom's tail expression, or the operand of an executed `return`. | `README.md:9`, `docs/guide.md:103` | conformance |
| DOC-21 | The final value is for programmatic consumers: an `invoke` caller reads it, and it is the payload that crosses the subagent boundary; it is distinct from the conversation. | `docs/guide.md:104` | conformance |
| DOC-22 | `invoke<Schema>(...)` gives the caller a typed, validated value; an untyped `invoke(...)` discards the child's return value (fire-and-forget orchestration). | `docs/guide.md:108` | conformance |

### Success / fail / cancelled trichotomy

| # | Claim | Source | Verify |
|---|-------|--------|--------|
| DOC-23 | Once evaluation begins it produces exactly one of three terminal outcomes: success, fail, or cancelled. | `README.md:26`, `docs/guide.md:116` | conformance |
| DOC-24 | Success = evaluation ran to the end; turns were appended and a final value is available. | `docs/guide.md:118` | conformance |
| DOC-25 | Fail = the loom returned an unhandled `Err`, panicked, or breached a query-terminating hard ceiling (e.g. per-query tool-loop bound, invoke-chain depth cap). | `docs/guide.md:121` | conformance |
| DOC-26 | Cancelled = the loom's abort signal fired and a checkpoint observed it. | `docs/guide.md:124` | conformance |
| DOC-27 | A failure is a fail outcome only if unhandled; consuming an `Err` with `match` or discarding it keeps evaluation on the success arm. | `docs/guide.md:127` | conformance |
| DOC-28 | Query and invoke failures share a single `QueryError` type, so a function mixing `?` on queries and invokes has one `Result` return type and one `match` shape. | `docs/guide.md:132` | offline |
| DOC-29 | Failures before evaluation begins (slash-arg binding failure, load error) are not evaluation outcomes and never enter the trichotomy. | `docs/guide.md:139` | conformance |
| DOC-30 | Cancellation is observed only at fixed checkpoints (before each loop iteration, each query, tool call, and invoke) and propagates downward only; a child cancelling internally surfaces to its parent as an `Err`. | `docs/guide.md:141` | conformance |
| DOC-31 | An operation that already returned `Ok` keeps its value even if the signal fires immediately after; no retroactive rewrite of a completed result into a cancellation. | `docs/guide.md:145` | conformance |

### `.loom` vs `.warp` and imports

| # | Claim | Source | Verify |
|---|-------|--------|--------|
| DOC-32 | `.loom` files are invocable — discovered as slash commands, targeted by `invoke(...)`, registrable in another loom's `tools:`; each declares a `mode:` and runs. | `docs/guide.md:154` | conformance |
| DOC-33 | `.warp` files are library modules whose top level is restricted to declaration forms (`import`, `export`, `fn`, `schema`, `enum`) with no top-level statements or queries. | `README.md:19`, `docs/guide.md:159` | offline |
| DOC-34 | A `.warp` file is never discovered as a slash command and never invoked directly; it is reached only through `import`. | `docs/guide.md:160`, `docs/how-to/import-a-warp-module.md:4` | conformance |
| DOC-35 | Every top-level declaration in a `.warp` file is implicitly exported. | `docs/how-to/import-a-warp-module.md:10` | offline |
| DOC-36 | Import paths are relative and must end in `.warp` (byte-exact lowercase); imported schemas resolve in `params:`/annotations and imported `fn`s are called directly. | `docs/guide.md:170`, `docs/how-to/import-a-warp-module.md:13` | offline |
| DOC-37 | Code inside a `.warp` `fn` uses the full language including queries; those queries execute against the calling `.loom`'s conversation. | `docs/guide.md:168`, `docs/how-to/import-a-warp-module.md:16` | live |
| DOC-38 | Name clashes resolve with `import { Name as Alias } from ...`. | `docs/how-to/import-a-warp-module.md:18` | offline |

### Callable set / tool calls

| # | Claim | Source | Verify |
|---|-------|--------|--------|
| DOC-39 | The callable set is the entries under the `tools:` frontmatter field; if `tools:` is omitted the loom runs with an empty callable set and the host session's ambient tools are NOT inherited. | `README.md:16`, `docs/guide.md:214`, `docs/how-to/call-a-tool-from-loom-code.md:14` | conformance |
| DOC-40 | The callable set bounds what the model can reach; it is not a host-process sandbox, and any admitted tool exposes that tool's full capability. | `docs/guide.md:216` | inspection |
| DOC-41 | Deterministic loom code (not only the model) can call a tool via the bare-identifier form `<name>(args)` where `<name>` is in the callable set. | `docs/how-to/call-a-tool-from-loom-code.md:3`, `docs/tutorial.md:202` | conformance |
| DOC-42 | A code-driven tool call is not a conversation turn: it consumes no model tokens, adds no turn, and does not appear in the transcript. | `docs/how-to/call-a-tool-from-loom-code.md:8` | conformance |
| DOC-43 | A Pi tool takes a single bare object literal matching its input schema; the argument must be a literal — computed values must be bound with `let` and passed through a typed callee. | `docs/how-to/call-a-tool-from-loom-code.md:16`, `docs/how-to/call-a-tool-from-loom-code.md:17` | offline |
| DOC-44 | A Pi-tool call returns `Result<string, QueryError>`; unwrap with `?` or handle with `match`. | `docs/how-to/call-a-tool-from-loom-code.md:19` | offline |
| DOC-45 | A Pi-tool failure surfaces as `Err(CodeToolError { ... })` with a `cause` of `validation`, `execution`, `cancelled`, or `unknown_tool`. | `docs/how-to/call-a-tool-from-loom-code.md:48` | conformance |

### Tool-call loop bound

| # | Claim | Source | Verify |
|---|-------|--------|--------|
| DOC-46 | During a query the model may call tools and loop until it produces a final response; `tool_loop:` frontmatter bounds that loop. | `docs/how-to/configure-tool-loop.md:3` | live |
| DOC-47 | `tool_loop.max_rounds` defaults to 25, is a non-negative integer with no upper bound, and applies to every query in the loom. | `docs/how-to/configure-tool-loop.md:10` | offline |
| DOC-48 | `max_rounds: 0` disables model-driven tool calls entirely for the query; code's own `<name>(...)` calls are unaffected. | `docs/how-to/configure-tool-loop.md:12`, `docs/how-to/configure-tool-loop.md:13` | conformance |
| DOC-49 | On an untyped query that hits the cap without a terminating turn, `tool_loop_exhausted` fires and is handleable; on a typed query the forced respond turn is exempt from the cap so exhaustion does not fire there. | `docs/how-to/configure-tool-loop.md:15`, `docs/how-to/configure-tool-loop.md:16` | live |
| DOC-50 | The cap counts free-phase rounds only (one round = model emitting ≥1 `tool_use` block + runtime executing and feeding results back); a respond-repair follow-up gets a fresh budget. | `docs/how-to/configure-tool-loop.md:19`, `docs/how-to/configure-tool-loop.md:21` | inspection |
| DOC-51 | On the cap, the query returns `Err(QueryError { kind: "tool_loop_exhausted", rounds: <n>, ... })`. | `docs/how-to/configure-tool-loop.md:54` | live |

### Errors & `match`

| # | Claim | Source | Verify |
|---|-------|--------|--------|
| DOC-52 | A query never throws — it returns `Result<T, QueryError>`; `match` recovers from a specific failure by destructuring the `QueryError` variant (by `kind`, and `cause` where a variant partitions). | `docs/how-to/handle-a-queryerror.md:3`, `docs/how-to/handle-a-queryerror.md:13` | conformance |
| DOC-53 | `match` is opaque to schema inference, so a typed query in scrutinee position needs the explicit `@<Schema>` form. | `docs/how-to/handle-a-queryerror.md:9` | offline |
| DOC-54 | An object pattern lists only matched fields; others are ignored. Rest patterns (`..`) are not part of loom 1.0. | `docs/how-to/handle-a-queryerror.md:14`, `docs/how-to/handle-a-queryerror.md:15` | offline |
| DOC-55 | `match` exhaustiveness is not statically checked; a non-exhaustive `match` panics at runtime — end with a wildcard `Err(_)` arm. | `docs/how-to/handle-a-queryerror.md:16` | conformance |
| DOC-56 | A schema-validation failure surfaces as `Err(QueryError { kind: "validation", cause: "schema_validation", ... })`; a matching arm can supply a default instead of aborting. | `docs/how-to/handle-a-queryerror.md:53` | live |

### Subagent boundary / invoke

| # | Claim | Source | Verify |
|---|-------|--------|--------|
| DOC-57 | A parent loom can run a subagent-mode child in its own isolated conversation and get back a typed value — not a string, not the child's transcript. | `docs/how-to/return-a-typed-value-across-a-subagent-boundary.md:3` | live |
| DOC-58 | The child's final value crosses the boundary as the `Ok` payload; its conversation stays private and is discarded when the child returns. | `docs/how-to/return-a-typed-value-across-a-subagent-boundary.md:5` | conformance |
| DOC-59 | A subagent child's return type is inferred from its body — there is no `returns:` field. | `docs/how-to/return-a-typed-value-across-a-subagent-boundary.md:10` | offline |
| DOC-60 | The parent reaches the child two operationally equivalent ways: register the child path in `tools:` and call it by name, or `invoke<Schema>("./child.loom", args)?` with an inline path and explicit return schema. | `docs/how-to/return-a-typed-value-across-a-subagent-boundary.md:12`, `docs/how-to/return-a-typed-value-across-a-subagent-boundary.md:76` | conformance |
| DOC-61 | On unwrap the runtime AJV-validates the child's return value; the parent then holds a typed value it can index and branch on. | `docs/how-to/return-a-typed-value-across-a-subagent-boundary.md:17` | conformance |
| DOC-62 | On child failure the parent observes `Err(InvokeCalleeError { ... })` (child returned `Err`) or `Err(InvokeInfraError { ... })` (load/validation/panic); no value flows. | `docs/how-to/return-a-typed-value-across-a-subagent-boundary.md:72` | conformance |
| DOC-63 | Invoke arguments are positional, in `params:` declaration order. | `docs/tutorial.md:267` | conformance |

### Slash-command argument binding (binder)

| # | Claim | Source | Verify |
|---|-------|--------|--------|
| DOC-64 | The LLM-driven binder maps a free-form slash-command argument string onto typed `params:` before the loom runs, without `key=value` syntax; binding applies only to the slash-command path. | `docs/how-to/bind-slash-command-arguments.md:3`, `docs/how-to/bind-slash-command-arguments.md:8` | live |
| DOC-65 | `invoke(...)` and `.loom`-callable callers pass already-typed values and skip the binder. | `docs/how-to/bind-slash-command-arguments.md:8` | conformance |
| DOC-66 | On slash invocation the binder fills `params`, AJV-validates them, and a one-line echo note confirms the bound values; `bind_echo` defaults to `true` and `bind_echo: false` suppresses it. | `docs/how-to/bind-slash-command-arguments.md:20`, `docs/how-to/bind-slash-command-arguments.md:21`, `docs/tutorial.md:120` | conformance |
| DOC-67 | With no `bind_model:`, the binder uses the `looms.binderModel` setting; `argument-hint:` is passed to the binder as grounding, not shown in autocomplete. | `docs/how-to/bind-slash-command-arguments.md:15`, `docs/how-to/bind-slash-command-arguments.md:18` | inspection |
| DOC-68 | Two static shapes bypass the binder entirely: a loom with no `params:`, and a loom whose only parameter is a defaultless `string` (whole argument assigned verbatim). | `docs/how-to/bind-slash-command-arguments.md:24`, `docs/tutorial.md:187` | offline |
| DOC-69 | A multi-field `params:` block is not bypass-eligible and needs a resolvable binder model (`bind_model:` or `looms.binderModel`). | `docs/how-to/bind-slash-command-arguments.md:48`, `docs/tutorial.md:114` | offline |
| DOC-70 | With no resolvable binder model the loom fails to load with `loom/load/binder-model-unresolved` and its slash command is not registered. | `docs/how-to/bind-slash-command-arguments.md:50`, `docs/tutorial.md:117` | offline |
| DOC-71 | The binder runs off-session and invisibly against the resolved binder model — no user-visible turn, no transcript card; its internal `ok \| needs_info \| ambiguous` envelope never reaches the session. | `docs/how-to/bind-slash-command-arguments.md:61`, `docs/how-to/bind-slash-command-arguments.md:66` | live |
| DOC-72 | If the binder cannot resolve the arguments, the loom does not run; it surfaces a one-line failure note (`loom /<name>: argument binding needs more info — …`). | `docs/how-to/bind-slash-command-arguments.md:67`, `docs/tutorial.md:142` | conformance |
| DOC-73 | On a successful bind the observable proof is the `bind_echo` success note (e.g. `Running /arg-binding: path=README.md, audience="new hires"`); the raw envelope JSON stays runtime-internal. | `docs/tutorial.md:133`, `docs/tutorial.md:140` | live |

### Typed queries / schemas

| # | Claim | Source | Verify |
|---|-------|--------|--------|
| DOC-74 | A loom can demand structured output conforming to a declared schema and bind the parsed result to a variable; `schema X { ... }` declares an object schema in the schema subset that Loom lowers to JSON Schema. | `docs/tutorial.md:151`, `docs/tutorial.md:173` | offline |
| DOC-75 | A type annotation (`: Sentiment`) on a `let`-bound query is a type sink supplying the schema the model response is validated against, making it a typed query. | `docs/tutorial.md:176` | conformance |
| DOC-76 | A conforming response is parsed into the variable; a non-conforming one enters the respond-repair loop and, if unrecovered, returns an `Err`. | `docs/tutorial.md:178` | live |

### Discovery / registration / CLI

| # | Claim | Source | Verify |
|---|-------|--------|--------|
| DOC-77 | Looms are discovered from five sources: global `~/.pi/agent/looms/*.loom`, project `.pi/looms/*.loom`, a package's `pi.looms` manifest (or conventional `looms/`), the `loomPaths` array in `settings.json`, and the `--loom <paths>` CLI flag. | `docs/how-to/embed-the-loom-runtime-as-a-pi-extension.md:27` | conformance |
| DOC-78 | A discovered loom is invoked as `/<filename-without-extension>`; there is no `name:` field, the filename stem is canonical. | `docs/how-to/embed-the-loom-runtime-as-a-pi-extension.md:33`, `docs/tutorial.md:21` | conformance |
| DOC-79 | `.warp` files are deliberately excluded from discovery / slash autocomplete. | `docs/how-to/embed-the-loom-runtime-as-a-pi-extension.md:33`, `docs/how-to/import-a-warp-module.md:62` | conformance |
| DOC-80 | `--loom <path>` registers every `*.loom` in the directory as a slash command for that run. | `docs/tutorial.md:29` | conformance |
| DOC-81 | Editing an existing `.loom` hot-reloads; adding or removing a file prompts a `/reload` system note. | `docs/how-to/embed-the-loom-runtime-as-a-pi-extension.md:59` | conformance |
| DOC-82 | Without a configured provider, `pi` reports `needs-provider` and no turn is sent. | `docs/tutorial.md:17` | conformance |

### Host-integrator / embedding API

| # | Claim | Source | Verify |
|---|-------|--------|--------|
| DOC-83 | Registering the loom runtime as a Pi extension turns `.loom` files into slash commands; this is the one host-integrator recipe, done once by a host. | `docs/how-to/embed-the-loom-runtime-as-a-pi-extension.md:3` | inspection |
| DOC-84 | The host must be at the pinned SDK minor `@earendil-works/pi-coding-agent ~0.75.5`; the four `@earendil-works/*` packages move together. | `docs/how-to/embed-the-loom-runtime-as-a-pi-extension.md:10` | inspection |
| DOC-85 | Ship the extension as ES modules: `"type": "module"` in `package.json` and entry declared with `"pi": { "extensions": ["./extensions"] }`. | `docs/how-to/embed-the-loom-runtime-as-a-pi-extension.md:18` | inspection |
| DOC-86 | Pi auto-discovers `extensions/index.ts`, whose default export is `default function (pi: ExtensionAPI)`. | `docs/how-to/embed-the-loom-runtime-as-a-pi-extension.md:20` | inspection |
| DOC-87 | Inside the factory the runtime registers synchronously: the `--loom` CLI flag (`pi.registerFlag`), the `loom-system-note` renderer (`pi.registerMessageRenderer`), and `resources_discover` / `session_start` / `session_shutdown` subscriptions. | `docs/how-to/embed-the-loom-runtime-as-a-pi-extension.md:22` | conformance |
| DOC-88 | `pi.registerCommand` for each discovered loom runs on `session_start`, after the cross-format collision check. | `docs/how-to/embed-the-loom-runtime-as-a-pi-extension.md:25` | conformance |
| DOC-89 | The discovery walk finds `hello.loom`, registers `/hello` as a slash command, and its `description` populates autocomplete. | `docs/how-to/embed-the-loom-runtime-as-a-pi-extension.md:56` | conformance |
| DOC-90 | Placing the same file under `~/.pi/agent/looms/` or a `loomPaths` entry registers it without the `--loom` flag. | `docs/how-to/embed-the-loom-runtime-as-a-pi-extension.md:58` | conformance |

### Status / known gaps (1.0)

| # | Claim | Source | Verify |
|---|-------|--------|--------|
| DOC-91 | pi-loom is at 1.0 (first release); the core language surface (binder, typed queries w/ schema validation, code-driven tool calls, invoke/subagent value passing, `match`/`?`, enums, user functions) is implemented and exercised end-to-end. | `README.md:32` | inspection |
| DOC-92 | Some specified behaviour is not yet fully wired into the shipped runtime, so the specification is not yet fully implemented. | `README.md:40` | inspection |
| DOC-93 | Known gap: type-layer diagnostics that require type inference are partial (non-boolean `if` condition, indexing a `string`, non-array `for` iterand). | `README.md:44` | offline |
| DOC-94 | Known gap: nested control forms — a nested `match` or an effectful expression nested deeper inside a wholesale-evaluated pure expression (object-literal field, array element) may still not evaluate in every position. | `README.md:47` | conformance |
| DOC-95 | A production-path conformance suite drives the full documented language surface through the shipped composition; it runs under the opt-in `npm run test:conformance`, outside the default `npm test`. | `README.md:55` | inspection |
| DOC-96 | Report issues against the behaviour the Reference defines. | `README.md:60` | inspection |

---

## 2. Runnable examples catalog

All examples live under `docs/examples/`. None declares a `name:` field — the
slash-command name is always the filename stem. Cross-references cite the
tutorial Step (T) and how-to guide (H) that use each file.

| File | Mode | Registers as | Inputs / params | What it does | Documented expected outcome |
|------|------|--------------|-----------------|--------------|-----------------------------|
| `hello.loom` | prompt (`:3`) | `/hello` | none | Single query `Say hello and confirm the loom extension is wired up.` (`:5`) | Success, exit 0; prompt mode streams the assistant turn (greeting + short confirming line) onto stdout; wording model-generated/non-deterministic. Final value = the greeting text. |
| `arg-binding.loom` | subagent (`:4`) | `/arg-binding` | required `path: string`, `audience: string` (`:7-9`) | Binder maps free-form arg string → the two typed params; single query `Summarise the file at ${path} for an audience of: ${audience}.` (`:11`) | Success, exit 0; observable proof is the bind-echo note `Running /arg-binding: path=README.md, audience="new hires"`; subagent trailing query not on stdout. Final value = summary text (not printed). Frontmatter also carries `bind_model: claude-haiku` (`:5`), `bind_echo: true` (`:6`), `argument-hint` (`:3`). No `?`/`match`, so a query failure would fail the run. |
| `sentiment.loom` | subagent (`:3`) | `/sentiment` (also called as tool `sentiment` by `typed-return.loom`) | required `text: string` (`:4-5`) | Declares `schema Sentiment { label: "positive"\|"neutral"\|"negative", confidence: number }` (`:7-10`); typed query `let result: Sentiment = @\`Classify the sentiment of: ${text}\`?` (`:12`); tail `result` (`:13`) | Success, exit 0; subagent → empty stdout; final value = typed `Sentiment` record, propagated across the boundary, not printed. `?` propagates a validation/query error → fail. Single defaultless `string` param → binder bypass. |
| `call-tool.loom` | subagent (`:3`) | `/call-tool` | none (`tools: grep`, `:4`) | `let hits = grep({ pattern: "TODO", path: "src" })?` (`:6`), then query `How many TODO markers appear in this grep output? ${hits}` (`:7`) | Success, exit 0; subagent → empty stdout. Final value = model's count answer. `?` on the grep would fail the run on tool error. |
| `configure-tool-loop.loom` | subagent (`:3`) | `/configure-tool-loop` | none (`tools: grep` `:4`, `tool_loop.max_rounds: 4` `:5-6`) | `match` over query `Find where configuration is loaded. Use grep as needed.` with ≤4 tool rounds (`:8`); `Ok(text)=>text`, `Err(tool_loop_exhausted)=>"search stopped after the round budget"`, `Err(_)=>"search failed"` (`:9-12`); tail query `Report: ${answer}` (`:14`) | Success in all branches (errors caught by `match`), exit 0; subagent → empty stdout. Final value = the `Report:` response. Demonstrates `Err(QueryError { kind: "tool_loop_exhausted", rounds: 4 })` fallback. |
| `handle-error.loom` | subagent (`:3`) | `/handle-error` | required `message: string` (`:4-5`) | Declares `schema Triage { category: "bug"\|"feature"\|"question", urgent: boolean }` (`:7-10`); `match` over typed query `@<Triage> Triage this message: ${message}` (`:12`); `Ok(t)=>t`, `Err(validation/schema_validation)=>Triage{category:"question",urgent:false}`, `Err(_)=>` same default (`:13-16`); tail query `Handling as ${outcome.category} (urgent: ${outcome.urgent}).` (`:18`) | Success in all branches (all errors recovered by `match`), exit 0; subagent → empty stdout. Final value = the `Handling as …` response. Demonstrates recovery from `schema_validation`. |
| `import-warp.loom` | subagent (`:3`) | `/import-warp` | required `reviewer: Author` (imported schema) (`:4-5`) | `import { Author, rate_strictness } from "./personas.warp"` (`:7`); `let strictness = rate_strictness(reviewer)?` (`:9`); tail query `Produce a review checklist calibrated to strictness level ${strictness}/5.` (`:10`) | Success, exit 0; subagent → empty stdout. Final value = checklist text. A `QueryError` inside `rate_strictness` propagates via `?` → fail. |
| `personas.warp` | warp module (not invocable, no frontmatter) | — (never a slash command; imported only) | n/a; `rate_strictness` takes `a: Author` | Exports `schema Author { name: string, role: string, experience_years: integer }` (`:1-5`) and `fn rate_strictness(a: Author): Result<integer, QueryError>` whose integer-typed query `@<integer>` rates strictness 1–5 (`:7-9`) | Not run standalone; consumed via import. `rate_strictness` yields integer 1–5 or a `QueryError`; its query runs against the *importing* loom's conversation. |
| `typed-return.loom` | subagent (`:3`) | `/typed-return` | required `text: string` (`:6-7`); depends on `./sentiment.loom` as tool `sentiment` (`:4-5`) | `let s = sentiment(text)?` (`:9`); `if s.confidence < 0.5 { clarifying query ${s.label} ? }` (`:10-12`); tail query `Acknowledge the ${s.label} sentiment in one line.` (`:13`) | Success, exit 0; the callee's typed `Sentiment` crosses the subagent boundary and drives the `if` branch in code; subagent → own final value not printed, empty stdout. Either `?`-propagated query (line 9 or 11) can fail the run. |

### Cross-references (tutorial / how-to usage)

- `hello.loom` — T Step 1 (`docs/tutorial.md:57`, run `docs/tutorial.md:76`); H `embed-the-loom-runtime-as-a-pi-extension.md:38`.
- `arg-binding.loom` — T Step 2 (`docs/tutorial.md:91`, run `docs/tutorial.md:127`); H `bind-slash-command-arguments.md:31`.
- `sentiment.loom` — T Step 3 (`docs/tutorial.md:153`, run `docs/tutorial.md:191`); also child in T Step 5; H `return-a-typed-value-across-a-subagent-boundary.md:22` (child).
- `call-tool.loom` — T Step 4 (`docs/tutorial.md:205`, run `docs/tutorial.md:231`); H `call-a-tool-from-loom-code.md:24`.
- `configure-tool-loop.loom` — H `configure-tool-loop.md:25` (run line in that guide). Not used in the tutorial.
- `handle-error.loom` — H `handle-a-queryerror.md:21`. Not used in the tutorial (tutorial forward-points to QueryError recovery at `docs/tutorial.md:296`).
- `import-warp.loom` + `personas.warp` — H `import-a-warp-module.md:22`/`:37`. Tutorial only forward-points to the `.warp` how-to at `docs/tutorial.md:297`.
- `typed-return.loom` — T Step 5 (`docs/tutorial.md:242`, run `docs/tutorial.md:280`); H `return-a-typed-value-across-a-subagent-boundary.md:41` (parent).

### Notes on run commands

- Reader-facing form throughout tutorial/how-to: `pi --loom docs/examples -p "/<stem> <args>"`.
- Actual campaign-of-record validation command in the tutorial provenance adds
  flags: `pi -ne -e ./extensions --loom docs/examples -p "/<stem> ..."`
  (`docs/tutorial.md:305-307`), provider `unity-messages` / model
  `claude-haiku-4-5`. Confirm the plain form reproduces without `-ne -e ./extensions`.

---

## 3. Doc vs spec tension (flagged, not resolved)

**TENSION-1 — README enumerates known gaps that its own cited decision forbids.**
README `Status` (`README.md:40`) states "the specification is not yet fully
implemented" and enumerates two specific known gaps (`README.md:44` type-layer
diagnostics; `README.md:47` nested control forms). But the README provenance
(`README.md:83`) cites `docs/documentation-plan.md` §1 and decision D-6, and D-6
(`docs/documentation-plan.md:184-187`) says the README does **not** enumerate
specific rough edges and posture per §1, while §1
(`docs/documentation-plan.md:11-12`) asserts the spec "is **fully implemented**."
So the shipped README both (a) contradicts the documentation-plan's
"fully implemented" posture and (b) violates D-6's "no enumerated rough edges"
instruction it claims to follow. Flag for the campaign — this is the single
largest doc-vs-doc-plan divergence and directly shapes what "conformant" means.

**TENSION-2 — Tutorial inline `arg-binding.loom` snippet omits `bind_model:`.**
The fenced code block at `docs/tutorial.md:94-102` shows the frontmatter with
`bind_echo: true` but no `bind_model:` line, yet the prose bullet at
`docs/tutorial.md:114` and the checked-in file (`docs/examples/arg-binding.loom:5`,
`bind_model: claude-haiku`) both have it. Doc-internal inconsistency (not a
spec divergence): the tutorial's shown snippet is stale relative to the real
example and its own prose. A reader who copies the snippet verbatim would get a
two-field-params loom with no `bind_model:`, which per DOC-70 fails to load with
`loom/load/binder-model-unresolved` unless `looms.binderModel` is set.

**TENSION-3 — "panics at runtime" vs spec's `MatchError` wording.**
`docs/how-to/handle-a-queryerror.md:16` says a non-exhaustive `match` "panics at
runtime." The spec (`docs/spec_topics/expressions.md:176`) says it "raises a
`MatchError` (`loom/runtime/match-error`)." These are reconcilable only if a
`MatchError` is classified as a panic that reaches the fail arm (per guide
trichotomy `docs/guide.md:121`). Flag to confirm the runtime surfaces
`loom/runtime/match-error` as a fail outcome and that "panic" is the intended
user-facing framing.

**TENSION-4 — Docs cite Reference anchors/pages the campaign must confirm exist.**
Guide and README link normative detail into `docs/reference/` targets such as
`errors-and-results.md#final-value-fn-5`, `frontmatter.md#tools-callable-set`,
`grammar.md#-operator`, `discovery-cli.md#invoke-invocation`,
`type-system.md#effects` (`docs/guide.md:53`, `:110`, `:99`, `:217`;
`README.md:9`, `:16`). Not a behaviour divergence, but these anchors are
promises to the reader; broken/renamed anchors are a doc defect the campaign
should check. (Cross-checked items — five discovery sources
`docs/spec_topics/discovery.md:3`; `bind_echo` default `true`
`docs/spec_topics/frontmatter/frontmatter-fields-a.md:42`; `max_rounds` default
25 `docs/reference/frontmatter.md:27`; SDK pin `~0.75.5`
`docs/spec_topics/pi-integration-contract/host-prerequisites.md:5` and
`package.json:44-60`; literal-only tool args
`docs/spec_topics/tool-calls.md:14`; `match` non-exhaustiveness
`docs/spec_topics/expressions.md:176` — all AGREE with the docs; no tension.)

**No spec divergence found for**: the success/fail/cancelled trichotomy,
prompt/subagent transcript & final-value visibility (spec
`docs/spec_topics/pi-integration-contract/runtime-event-channel.md:63`),
callable-set-is-not-a-sandbox, `.warp` non-discoverability, binder bypass shapes,
and the `QueryError` single-type model. These doc claims match the spec as cited
above and in the per-source partials.

---

*Partials: `doc-parts/tutorial.md` (98 numbered claims + example refs),
`doc-parts/how-to.md` (7 guides), `doc-parts/examples.md` (9 files).*
