# How-to guides — user-facing claim inventory

Extraction of every user-facing behaviour/claim/promise, documented step + expected
outcome, referenced example file(s), and documented run-result for the seven
`docs/how-to/*.md` guides. Verifiability tags: `offline` (static parse/typecheck, no
model), `conformance` (runtime dispatch/conformance suite, no live model), `live`
(needs a real LLM), `inspection` (doc/structural/code-reading claim).

---

## bind-slash-command-arguments.md

Example file(s) referenced: `docs/examples/arg-binding.loom` (present).
Documented run command: `pi --loom docs/examples -p "/arg-binding README.md for new hires"`.
Documented expected outcome: binder maps `README.md for new hires` → `{ path: "README.md", audience: "new hires" }`, AJV-validates merged args, emits echo system note `Running /arg-binding: path=README.md, audience="new hires"` before the loom query runs.

1. The runtime's LLM-driven *binder* maps a free-form slash-command argument string onto typed `params:` before the loom runs, without `key=value` syntax. `docs/how-to/bind-slash-command-arguments.md:3` — live
2. Binding applies **only** to the slash-command path. `docs/how-to/bind-slash-command-arguments.md:8` — inspection
3. `invoke(...)` and `.loom`-callable callers pass already-typed values and skip the binder. `docs/how-to/bind-slash-command-arguments.md:8` — conformance
4. Each `params:` field is a type expression. `docs/how-to/bind-slash-command-arguments.md:13` — offline
5. With no `bind_model:`, the binder uses the `looms.binderModel` setting. `docs/how-to/bind-slash-command-arguments.md:15` — inspection
6. `bind_model:`, `bind_context:`, `bind_echo:` have defaults that need not be overridden. `docs/how-to/bind-slash-command-arguments.md:15` — offline
7. `argument-hint:` is passed to the binder as grounding, not shown in autocomplete. `docs/how-to/bind-slash-command-arguments.md:18` — inspection
8. On slash invocation the binder fills `params`, AJV validates them, and a one-line echo note confirms the bound values. `docs/how-to/bind-slash-command-arguments.md:20` — live
9. `bind_echo: false` suppresses the echo note. `docs/how-to/bind-slash-command-arguments.md:21` — conformance
10. Two static shapes bypass the binder entirely: a loom with no `params:`, and a loom whose only parameter is a defaultless `string` (whole argument assigned verbatim). `docs/how-to/bind-slash-command-arguments.md:24` — offline
11. The example loom declares two string params (`path`, `audience`) and echoes bound values before running. `docs/how-to/bind-slash-command-arguments.md:31` — offline
12. A two-field `params:` block is not bypass-eligible and needs a resolvable binder model (`bind_model:` or `looms.binderModel`). `docs/how-to/bind-slash-command-arguments.md:48` — offline
13. With no resolvable binder model the loom fails to load with `loom/load/binder-model-unresolved` and does not register. `docs/how-to/bind-slash-command-arguments.md:50` — offline
14. The binder runs off-session and invisibly against the resolved binder model — no user-visible turn, no transcript card. `docs/how-to/bind-slash-command-arguments.md:61` — live
15. The binder's internal `ok | needs_info | ambiguous` envelope never reaches the session. `docs/how-to/bind-slash-command-arguments.md:66` — inspection
16. Binding that cannot resolve the arguments does not run the loom; it surfaces a one-line failure note (`loom /arg-binding: argument binding needs more info — …`). `docs/how-to/bind-slash-command-arguments.md:67` — live

---

## call-a-tool-from-loom-code.md

Example file(s) referenced: `docs/examples/call-tool.loom` (present).
Documented run command: `pi --loom docs/examples -p "/call-tool"`.
Documented expected outcome: `grep(...)` runs against Pi's tool runtime, returns output as a string, `?` unwraps `Ok`; grep output interpolated into query with no tool-call card and no extra model turn for the grep.

1. Deterministic loom code (not the model) can run a tool via the bare-identifier form `<name>(args)`, where `<name>` is in the loom's callable set. `docs/how-to/call-a-tool-from-loom-code.md:3` — conformance
2. A tool call is not a conversation turn: consumes no model tokens, adds no turn, does not appear in the transcript. `docs/how-to/call-a-tool-from-loom-code.md:8` — conformance
3. The callable set is empty by default and the host session's ambient tools are not inherited; tools must be listed in `tools:`. `docs/how-to/call-a-tool-from-loom-code.md:14` — offline
4. A Pi tool takes a single bare object literal matching its input schema. `docs/how-to/call-a-tool-from-loom-code.md:16` — offline
5. The tool-call argument must be a literal; computed values must be bound with `let` and passed through a typed callee instead. `docs/how-to/call-a-tool-from-loom-code.md:17` — offline
6. A Pi-tool call returns `Result<string, QueryError>` — unwrap with `?` or handle with `match`. `docs/how-to/call-a-tool-from-loom-code.md:19` — offline
7. The example loom greps the tree from code then feeds the result into a query (`tools: grep`). `docs/how-to/call-a-tool-from-loom-code.md:24` — offline
8. `grep(...)` runs against Pi's tool runtime and returns its output as a `string`. `docs/how-to/call-a-tool-from-loom-code.md:45` — conformance
9. `?` unwraps `Ok` or early-returns `Err`. `docs/how-to/call-a-tool-from-loom-code.md:46` — conformance
10. The grep output is interpolated into the query — no tool-call card and no extra model turn spent on the grep itself. `docs/how-to/call-a-tool-from-loom-code.md:46` — conformance
11. A Pi-tool failure surfaces as `Err(CodeToolError { ... })` with a `cause` of `validation`, `execution`, `cancelled`, or `unknown_tool`. `docs/how-to/call-a-tool-from-loom-code.md:48` — conformance

---

## configure-tool-loop.md

Example file(s) referenced: `docs/examples/configure-tool-loop.loom` (present).
Documented run command: `pi --loom docs/examples -p "/configure-tool-loop"`.
Documented expected outcome: model may run up to four grep rounds; a final text turn within budget binds `Ok(text)`, otherwise the query returns `Err(QueryError { kind: "tool_loop_exhausted", rounds: 4, ... })` and the loom falls back to a fixed string.

1. The model may call tools during a query and loop until it produces a final response; `tool_loop:` frontmatter bounds that loop. `docs/how-to/configure-tool-loop.md:3` — live
2. `tool_loop.max_rounds` defaults to `25`; a non-negative integer with no upper bound; applies to every query in the loom. `docs/how-to/configure-tool-loop.md:10` — offline
3. `max_rounds: 0` disables model-driven tool calls entirely for the query — the model cannot touch any `tools:` entry. `docs/how-to/configure-tool-loop.md:12` — conformance
4. Code's own `<name>(...)` calls are unaffected by `max_rounds: 0`. `docs/how-to/configure-tool-loop.md:13` — conformance
5. On an untyped query that hits the cap without a terminating turn, the `tool_loop_exhausted` failure fires (and is handleable). `docs/how-to/configure-tool-loop.md:15` — live
6. On a typed query the forced respond turn is exempt from the cap, so exhaustion does not fire there. `docs/how-to/configure-tool-loop.md:16` — live
7. The cap counts free-phase rounds only; one round = model emitting one or more `tool_use` blocks plus runtime executing them and feeding results back. `docs/how-to/configure-tool-loop.md:19` — inspection
8. A respond-repair follow-up gets a fresh budget. `docs/how-to/configure-tool-loop.md:21` — live
9. The example loom caps the loop at four rounds and handles exhaustion (`tool_loop.max_rounds: 4`, `tools: grep`). `docs/how-to/configure-tool-loop.md:25` — offline
10. Within the budget a final text turn binds `Ok(text)`. `docs/how-to/configure-tool-loop.md:53` — live
11. On hitting the cap the query returns `Err(QueryError { kind: "tool_loop_exhausted", rounds: 4, ... })` and the loom falls back to a fixed string instead of aborting. `docs/how-to/configure-tool-loop.md:54` — live

---

## embed-the-loom-runtime-as-a-pi-extension.md  (host-integrator / embedding API)

Example file(s) referenced: `docs/examples/hello.loom` (present).
Documented run command: `pi --loom docs/examples -p "/hello"`.
Documented expected outcome: discovery walk finds `hello.loom`, registers `/hello` as a slash command (description populates autocomplete), and dispatching drives the query into the session.

1. Registering the loom runtime as a Pi extension turns `.loom` files into slash commands in a Pi session; this is the one host-integrator recipe, done once by a host. `docs/how-to/embed-the-loom-runtime-as-a-pi-extension.md:3` — inspection
2. **[host API]** Host must be at pinned SDK minor `@earendil-works/pi-coding-agent ~0.75.5`; the four `@earendil-works/*` packages move together. `docs/how-to/embed-the-loom-runtime-as-a-pi-extension.md:10` — inspection
3. Non-bypass looms need a binder model resolvable via `looms.binderModel` (or per-loom `bind_model:`). `docs/how-to/embed-the-loom-runtime-as-a-pi-extension.md:13` — offline
4. **[host API]** Ship the extension as ES modules: `"type": "module"` in `package.json` and entry declared with `"pi": { "extensions": ["./extensions"] }`. `docs/how-to/embed-the-loom-runtime-as-a-pi-extension.md:18` — inspection
5. **[host API]** Pi auto-discovers `extensions/index.ts`, whose default export is `default function (pi: ExtensionAPI)`. `docs/how-to/embed-the-loom-runtime-as-a-pi-extension.md:20` — inspection
6. **[host API]** Inside the factory the runtime registers surfaces synchronously: the `--loom` CLI flag (`pi.registerFlag`), the `loom-system-note` renderer (`pi.registerMessageRenderer`), and `resources_discover` / `session_start` / `session_shutdown` subscriptions. `docs/how-to/embed-the-loom-runtime-as-a-pi-extension.md:22` — conformance
7. **[host API]** `pi.registerCommand` for each discovered loom runs on `session_start`, after the cross-format collision check. `docs/how-to/embed-the-loom-runtime-as-a-pi-extension.md:25` — conformance
8. Looms can live in any of five discovery sources: global `~/.pi/agent/looms/*.loom`, project `.pi/looms/*.loom`, a package's `pi.looms` manifest entry (or conventional `looms/`), the `loomPaths` array in `settings.json`, and the `--loom <paths>` CLI flag. `docs/how-to/embed-the-loom-runtime-as-a-pi-extension.md:27` — conformance
9. A discovered loom is invoked as `/<filename-without-extension>`. `docs/how-to/embed-the-loom-runtime-as-a-pi-extension.md:33` — conformance
10. `.warp` files are deliberately excluded from discovery. `docs/how-to/embed-the-loom-runtime-as-a-pi-extension.md:33` — conformance
11. The example `hello.loom` is a minimal discovered loom (`mode: prompt`). `docs/how-to/embed-the-loom-runtime-as-a-pi-extension.md:38` — offline
12. The discovery walk finds `hello.loom`, registers `/hello` as a slash command, and its `description` populates autocomplete. `docs/how-to/embed-the-loom-runtime-as-a-pi-extension.md:56` — conformance
13. Dispatching `/hello` drives the query into the session. `docs/how-to/embed-the-loom-runtime-as-a-pi-extension.md:57` — live
14. Placing the same file under `~/.pi/agent/looms/` or a `loomPaths` entry registers it without the `--loom` flag. `docs/how-to/embed-the-loom-runtime-as-a-pi-extension.md:58` — conformance
15. Editing an existing `.loom` hot-reloads; adding or removing a file prompts a `/reload` system note. `docs/how-to/embed-the-loom-runtime-as-a-pi-extension.md:59` — conformance

---

## handle-a-queryerror.md

Example file(s) referenced: `docs/examples/handle-error.loom` (present).
Documented run command: `pi --loom docs/examples -p "/handle-error the export button does nothing"`.
Documented expected outcome: on success the arm binds the validated `Triage`; if the response cannot be repaired to schema the query returns `Err(QueryError { kind: "validation", cause: "schema_validation", ... })` and the matching arm supplies a default instead of aborting.

1. A query never throws — it returns `Result<T, QueryError>`. `docs/how-to/handle-a-queryerror.md:3` — conformance
2. `match` recovers from a specific failure by destructuring the `QueryError` variant. `docs/how-to/handle-a-queryerror.md:3` — offline
3. `match` is opaque to schema inference, so a typed query in scrutinee position needs the explicit `@<Schema>` form. `docs/how-to/handle-a-queryerror.md:9` — offline
4. Write an `Ok(v)` arm for success and one or more `Err(...)` arms for handled failures. `docs/how-to/handle-a-queryerror.md:11` — offline
5. Destructure the variant by `kind` (and `cause`, where a variant partitions). `docs/how-to/handle-a-queryerror.md:13` — offline
6. An object pattern lists only matched fields; others are ignored. `docs/how-to/handle-a-queryerror.md:14` — offline
7. Rest patterns (`..`) are not part of loom 1.0. `docs/how-to/handle-a-queryerror.md:15` — offline
8. `match` exhaustiveness is not statically checked, and a non-exhaustive `match` panics at runtime; end with a wildcard `Err(_)` arm. `docs/how-to/handle-a-queryerror.md:16` — conformance
9. The example loom recovers from a schema-validation failure with a safe default (`schema Triage`, `params: message: string`). `docs/how-to/handle-a-queryerror.md:21` — offline
10. On success the arm binds the validated `Triage`. `docs/how-to/handle-a-queryerror.md:53` — live
11. If the model's response cannot be repaired to the schema, the query returns `Err(QueryError { kind: "validation", cause: "schema_validation", ... })` and the matching arm supplies a default instead of aborting the loom. `docs/how-to/handle-a-queryerror.md:53` — live
12. The wildcard arm keeps the `match` total against transport, cancellation, tool-loop, and every other variant. `docs/how-to/handle-a-queryerror.md:56` — offline
13. Match `cause` for arm-specific recovery; match `QueryError { kind: "validation" }` alone for arm-uniform handling. `docs/how-to/handle-a-queryerror.md:57` — conformance

---

## import-a-warp-module.md

Example file(s) referenced: `docs/examples/personas.warp` (present) + `docs/examples/import-warp.loom` (present).
Documented run command: `pi --loom docs/examples -p "/import-warp Ada Lovelace, senior engineer, 12 years"`.
Documented expected outcome: `Author` resolves in `params:` from the import; `rate_strictness(reviewer)?` runs the imported helper whose query executes against `import-warp.loom`'s own conversation; the `.warp` file never appears in slash autocomplete.

1. A `.warp` library file can share a schema, enum, or helper `fn` across looms via `import`. `docs/how-to/import-a-warp-module.md:3` — offline
2. `.warp` files hold only declarations, are never slash-discovered, and are never invoked directly — exercised only through a `.loom` that imports them. `docs/how-to/import-a-warp-module.md:4` — conformance
3. A `.warp` file contains top-level `schema`, `enum`, and/or `fn` declarations, and every top-level declaration is implicitly exported. `docs/how-to/import-a-warp-module.md:10` — offline
4. Import with `import { Name, other } from "./path.warp"` at the top of the `.loom` body. `docs/how-to/import-a-warp-module.md:12` — offline
5. Paths are relative and must end in `.warp` (byte-exact lowercase). `docs/how-to/import-a-warp-module.md:13` — offline
6. An imported `schema` resolves in `params:` and type annotations; an imported `fn` is called directly. `docs/how-to/import-a-warp-module.md:14` — offline
7. A query inside an imported `fn` runs against the *calling* loom's conversation. `docs/how-to/import-a-warp-module.md:16` — live
8. Name clashes resolve with `import { Name as Alias } from ...`. `docs/how-to/import-a-warp-module.md:18` — offline
9. The library `personas.warp` exports a schema `Author` and a helper `fn rate_strictness(a: Author): Result<integer, QueryError>`. `docs/how-to/import-a-warp-module.md:22` — offline
10. The loom `import-warp.loom` imports both and uses `Author` in `params: reviewer: Author`. `docs/how-to/import-a-warp-module.md:37` — offline
11. `Author` resolves in `params:` from the import. `docs/how-to/import-a-warp-module.md:60` — offline
12. `rate_strictness(reviewer)?` runs the imported helper; its query executes against `import-warp.loom`'s own conversation. `docs/how-to/import-a-warp-module.md:60` — live
13. The `.warp` file never appears in slash autocomplete. `docs/how-to/import-a-warp-module.md:62` — conformance

---

## return-a-typed-value-across-a-subagent-boundary.md

Example file(s) referenced: `docs/examples/sentiment.loom` (present, child) + `docs/examples/typed-return.loom` (present, parent).
Documented run command: `pi --loom docs/examples -p "/typed-return I love this, it works perfectly"`.
Documented expected outcome: `sentiment(text)?` spawns a fresh isolated conversation for the child, validates its return value against inferred `Sentiment`, and binds a typed `s`; child intermediate turns never reach the parent transcript; only `s` crosses back.

1. A parent loom can run a subagent-mode child in its own isolated conversation and get a typed value back — not a string, not the child's transcript. `docs/how-to/return-a-typed-value-across-a-subagent-boundary.md:3` — live
2. The child's final value crosses the boundary as the `Ok` payload; its conversation stays private and is discarded when the child returns. `docs/how-to/return-a-typed-value-across-a-subagent-boundary.md:5` — conformance
3. The child is a `mode: subagent` loom whose final value has the wanted type; its return type is inferred from its body — there is no `returns:` field. `docs/how-to/return-a-typed-value-across-a-subagent-boundary.md:10` — offline
4. The parent reaches the child two operationally equivalent ways: register the child path in `tools:` and call it by name (inferred return type flows into the call site), or call `invoke<Schema>("./child.loom", args)?` with an inline path and explicit return schema. `docs/how-to/return-a-typed-value-across-a-subagent-boundary.md:12` — conformance
5. Unwrap with `?`; the runtime AJV-validates the child's return value; the parent then holds a typed value it can index and branch on. `docs/how-to/return-a-typed-value-across-a-subagent-boundary.md:17` — conformance
6. The child `sentiment.loom` returns a typed `Sentiment` (`schema Sentiment { label, confidence }`, `params: text: string`). `docs/how-to/return-a-typed-value-across-a-subagent-boundary.md:22` — offline
7. The parent `typed-return.loom` calls the child as a `.loom` callable (`tools: - ./sentiment.loom`) and branches on the typed result. `docs/how-to/return-a-typed-value-across-a-subagent-boundary.md:41` — offline
8. `sentiment(text)?` spawns a fresh isolated conversation for the child, validates its return value against the inferred `Sentiment` shape, and binds a typed `s`. `docs/how-to/return-a-typed-value-across-a-subagent-boundary.md:69` — live
9. The child's intermediate turns never reach the parent's transcript; only `s` crosses back. `docs/how-to/return-a-typed-value-across-a-subagent-boundary.md:71` — conformance
10. On child failure the parent observes `Err(InvokeCalleeError { ... })` (child returned `Err`) or `Err(InvokeInfraError { ... })` (load / validation / panic) — no value flows. `docs/how-to/return-a-typed-value-across-a-subagent-boundary.md:72` — conformance
11. The inline-path form `let s: Sentiment = invoke<Sentiment>("./sentiment.loom", text)?` is equivalent; use it for one-off calls and `tools:` for repeated or model-exposed callees. `docs/how-to/return-a-typed-value-across-a-subagent-boundary.md:76` — conformance

---

## Cross-guide notes

- All nine cited example files exist under `docs/examples/`: `arg-binding.loom`, `call-tool.loom`, `configure-tool-loop.loom`, `hello.loom`, `handle-error.loom`, `import-warp.loom`, `personas.warp`, `sentiment.loom`, `typed-return.loom` (verified by directory listing).
- Every guide follows the same skeleton: an intro promise, `## Steps`, `## Working example` (with an embedded fenced `loom` block and a `pi --loom docs/examples -p "…"` run line), `## Result`, `## Reference`, `## Provenance`. Each guide's Provenance section states the example was "requested from `loom-docs-example-runner`."
- Host-integrator / embedding API claims are confined to `embed-the-loom-runtime-as-a-pi-extension.md` (items 2, 4–8, 12, 14–15 above; tagged `[host API]` where they assert an ExtensionAPI/SDK surface).
- Tag rationale: claims about grammar/typecheck/frontmatter validity and load-time diagnostics → `offline`; claims about non-model runtime dispatch, tool-call side-effect semantics, discovery/registration, transcript/turn accounting, and error-variant surfacing → `conformance`; claims requiring model output (binder mapping, query success, schema repair, subagent classification) → `live`; prose/structural assertions → `inspection`.
