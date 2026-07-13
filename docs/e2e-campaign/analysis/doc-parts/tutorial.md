# Analysis: `docs/tutorial.md`

Source: `docs/tutorial.md` (337 lines). Every behaviour claim, step instruction, documented outcome, command, and referenced example extracted below.

Verifiability tags: `offline` (static parse/typecheck, no model) · `conformance` (conformance suite / runtime dispatch, no live model) · `live` (real LLM required) · `inspection` (doc/structural claim, verifiable by reading code or files).

## 1. Behaviour claims

### Front matter / framing

1. Every tutorial step runs a real, checked-in file under `docs/examples/`, so every result is reproducible on the reader's machine. `docs/tutorial.md:5` — inspection
2. The tutorial is one continuous path; each step builds on the last. `docs/tutorial.md:3` — inspection
3. The Guide (`./guide.md`) explains *why* looms are shaped this way; the Reference (`./reference/`) holds normative behaviour; the tutorial links into it rather than restating. `docs/tutorial.md:9` — inspection

### "What you need"

4. `pi` must be installed and on the reader's `PATH`. `docs/tutorial.md:15` — inspection
5. A configured provider and model is required; the steps issue real turns against the provider. `docs/tutorial.md:16` — live
6. Without a configured provider, `pi` reports `needs-provider` and no turn is sent. `docs/tutorial.md:17` — conformance
7. A checkout of the repository is required so example files resolve under `docs/examples/`. `docs/tutorial.md:18` — inspection
8. Every example is invoked by its filename stem, as a slash command, with the example directory placed on the discovery path via `--loom`, using the form `pi --loom docs/examples -p "/<stem> <arguments>"`. `docs/tutorial.md:21` (form at `docs/tutorial.md:25`) — conformance
9. `--loom <path>` is one of the five discovery sources. `docs/tutorial.md:28` — inspection
10. `--loom <path>` registers every `*.loom` in the directory as a slash command for that run. `docs/tutorial.md:29` — conformance

### "One fact to carry through the tutorial" — execution modes

11. Looms run under one of two execution modes, set by frontmatter `mode:`. `docs/tutorial.md:34` — offline
12. The execution mode governs what the reader can observe on `pi -p` stdout. `docs/tutorial.md:35` — conformance
13. Prompt mode drives the reader's existing session. `docs/tutorial.md:38` — conformance
14. In prompt mode, assistant tokens stream into the transcript, so a prompt-mode loom's trailing turn is visible on stdout. `docs/tutorial.md:39` — live
15. Subagent mode spawns a fresh, isolated conversation whose transcript is private and discarded when the loom returns. `docs/tutorial.md:41` — conformance
16. A subagent loom's final value reaches programmatic callers and propagates across the subagent boundary. `docs/tutorial.md:43` — conformance
17. A subagent loom's final value is **not** printed on the `pi -p` text channel. `docs/tutorial.md:45` — conformance
18. A successful subagent run surfaces as exit 0 with empty stdout. `docs/tutorial.md:46` — live
19. Steps 1–2 illustrate what is visible on stdout; Steps 3–5 run in subagent mode and complete successfully (exit 0). `docs/tutorial.md:49` — live
20. Every step records its actual observed runtime status; no transcript is imagined. `docs/tutorial.md:51` — inspection

### Step 1 — `hello.loom` (prompt mode)

21. The smallest useful loom is a single model turn. `docs/tutorial.md:56` — inspection
22. `hello.loom` has two parts: YAML frontmatter declaring `mode: prompt`, and a body that is a single query template. `docs/tutorial.md:67` (file at `docs/tutorial.md:59-65`) — inspection
23. The `@` before a backtick string marks that string as text to send to the model as a query. `docs/tutorial.md:68` — offline
24. The query template is the primitive that crosses code → model. `docs/tutorial.md:69` — inspection
25. The query-template form is part of the expression sublanguage. `docs/tutorial.md:70` — inspection
26. Command `pi --loom docs/examples -p "/hello"` runs the loom. `docs/tutorial.md:76` — live
27. Observed result of the command: exit 0, a success terminal outcome. `docs/tutorial.md:79` — live
28. Because it is prompt mode, the assistant turn streams onto stdout — a greeting followed by a short confirming line. `docs/tutorial.md:81` — live
29. The exact wording is model-generated and non-deterministic (illustrative). `docs/tutorial.md:82` — live
30. The stable shape is: one completed assistant turn, exit 0, no error. `docs/tutorial.md:83` — live

### Step 2 — `arg-binding.loom` (subagent, binder)

31. Inside a template, `${...}` splices a value into the text sent to the model. `docs/tutorial.md:88` — offline
32. To get a value to splice, a loom takes typed parameters. `docs/tutorial.md:89` — inspection
33. `arg-binding.loom` frontmatter declares `description`, `argument-hint`, `mode: subagent`, `bind_echo: true`, and `params:` with `path: string` and `audience: string`. `docs/tutorial.md:93-104` — inspection
34. `params:` declares two typed inputs. `docs/tutorial.md:108` — offline
35. On a slash invocation, the free-form argument string is mapped onto the typed parameters by the binder. `docs/tutorial.md:108` — live
36. `${path}` and `${audience}` interpolate those parameters into the query text. `docs/tutorial.md:111` — offline
37. The interpoland renders by its Loom static type per the template-interpolation rules. `docs/tutorial.md:112` — conformance
38. `bind_model: claude-haiku` selects the model the binder runs against. `docs/tutorial.md:114` — conformance *(note: prose references `bind_model:` but the shown `arg-binding.loom` frontmatter at `docs/tutorial.md:93-104` does not contain a `bind_model:` field — possible doc/example mismatch to flag)*
39. A loom with a multi-field `params:` block is **not** bypass-eligible, so it needs a resolvable binder model (`bind_model:` or the project-wide `looms.binderModel` setting). `docs/tutorial.md:114-117` — conformance
40. With neither binder model resolvable, the loom fails to load with `loom/load/binder-model-unresolved` and its slash command is not registered. `docs/tutorial.md:117` — offline
41. `bind_echo: true` is the default. `docs/tutorial.md:120` — offline
42. `bind_echo: true` emits a one-line success echo note showing what the binder resolved, on the loom's system-note channel, immediately before the loom runs. `docs/tutorial.md:120` — conformance
43. Command `pi --loom docs/examples -p "/arg-binding README.md for new hires"` runs the loom. `docs/tutorial.md:127` — live
44. Observed result: exit 0. `docs/tutorial.md:130` — live
45. The binder runs off-session and invisibly: it dispatches against the resolved binder model out of band, with no user-visible turn and no transcript card. `docs/tutorial.md:130` — live
46. The binder's internal `ok | needs_info | ambiguous` envelope is never surfaced to the user. `docs/tutorial.md:132` — conformance
47. On a successful bind, the observable proof is the `bind_echo` success note `Running /arg-binding: path=README.md, audience="new hires"`. `docs/tutorial.md:133-138` — live
48. The success note is the observable proof the binder mapped the free-form string onto the two typed params; the raw envelope JSON stays runtime-internal. `docs/tutorial.md:140` — live
49. If the binder cannot bind (a missing required parameter, or a genuinely ambiguous argument string), it instead emits a one-line failure note `loom /arg-binding: argument binding needs more info — …` and the loom does not run. `docs/tutorial.md:142-144` — conformance
50. Because this loom is `mode: subagent`, its trailing query runs inside an isolated conversation; the query's own turn is not on stdout, and the run ends at exit 0. `docs/tutorial.md:145` — live

### Step 3 — `sentiment.loom` (typed return with schema)

51. A loom can demand structured output that conforms to a declared schema and bind the parsed result to a variable. `docs/tutorial.md:151` — conformance
52. `sentiment.loom` declares `mode: subagent`, `params: text: string`, a `schema Sentiment { label: "positive" | "neutral" | "negative", confidence: number }`, `let result: Sentiment = @\`Classify the sentiment of: ${text}\`?`, and tail `result`. `docs/tutorial.md:155-169` — inspection
53. `schema Sentiment { ... }` declares an object schema in the schema subset that Loom lowers to JSON Schema. `docs/tutorial.md:173` — offline
54. `label` is a literal-union type; `confidence` is a number. `docs/tutorial.md:175` — offline
55. `let result: Sentiment = @\`...\`` makes this a typed query; the annotation `: Sentiment` is a type sink supplying the schema the model's response is validated against. `docs/tutorial.md:176` — conformance
56. A conforming response is parsed into `result`; a non-conforming one enters the respond-repair loop and, if unrecovered, returns an `Err`. `docs/tutorial.md:178-180` — live
57. The trailing `?` is the error-propagation operator: on `Ok` it unwraps to the inner value; on `Err` it early-returns the `Err` from the top-level loom. `docs/tutorial.md:181-183` — offline
58. The final line `result` is the loom's tail expression — its final value. `docs/tutorial.md:184` — offline
59. `text` is a single `string` parameter with no default, so the binder is bypassed and the whole argument string becomes `text`. `docs/tutorial.md:187` — conformance
60. Command `pi --loom docs/examples -p "/sentiment I love this new build"` runs the loom. `docs/tutorial.md:191` — live
61. Observed result: exit 0, a success terminal outcome. `docs/tutorial.md:194` — live
62. This is subagent mode, so stdout is empty on success; the typed `Sentiment` value is the loom's final value, which propagates across the subagent boundary to a programmatic caller but is not printed on the `pi -p` text channel. `docs/tutorial.md:194-197` — live

### Step 4 — `call-tool.loom` (code-driven tool call)

63. Loom code can call a tool directly, not only through the model. `docs/tutorial.md:202` — conformance
64. A loom declares its callable set in `tools:` and calls an entry by its bare name. `docs/tutorial.md:202-204` — conformance
65. `call-tool.loom` declares `mode: subagent`, `tools: grep`, `let hits = grep({ pattern: "TODO", path: "src" })?`, and a tail query interpolating `${hits}`. `docs/tutorial.md:207-215` — inspection
66. `tools: grep` puts the `grep` Pi tool in this loom's callable set. `docs/tutorial.md:219` — conformance
67. The host session's ambient tools are not inherited; a loom sees only what its `tools:` declares. `docs/tutorial.md:220` — conformance
68. `grep({ pattern: "TODO", path: "src" })` is a code-driven tool call whose single object argument matches the tool's input schema. `docs/tutorial.md:222` — conformance
69. The tool call returns a `Result`; the `?` unwraps it (or early-returns on failure). `docs/tutorial.md:223` — offline
70. `hits` (the tool's output) is interpolated into a query, so the model reasons over a value deterministic code produced. `docs/tutorial.md:225` — inspection
71. This loom takes no parameters. `docs/tutorial.md:228` — inspection
72. Command `pi --loom docs/examples -p "/call-tool"` runs the loom. `docs/tutorial.md:231` — live
73. Observed result: exit 0, a success terminal outcome; subagent mode, so stdout is empty on success. `docs/tutorial.md:234` — live
74. The step's point is the mechanics — a tool call in code, its result flowing into a query — which complete without error. `docs/tutorial.md:235` — live

### Step 5 — `typed-return.loom` (subagent invoke, typed final value)

75. This step composes the previous two: one subagent loom invokes another and consumes the typed value the callee returns across the subagent boundary. `docs/tutorial.md:240` — live
76. `typed-return.loom` declares `mode: subagent`, `tools: - ./sentiment.loom`, `params: text: string`, `let s = sentiment(text)?`, an `if s.confidence < 0.5 { ... }` branch, and a tail query interpolating `${s.label}`. `docs/tutorial.md:244-258` — inspection
77. The `tools:` entry `./sentiment.loom` is a `.loom` callable — a path to the Step-3 subagent loom, wrapped as a callable and called by its bare stem name `sentiment`. `docs/tutorial.md:262-264` — conformance
78. `sentiment(text)` invokes that callee; arguments are positional, in `params:` order. `docs/tutorial.md:267` — conformance
79. The callee runs in its own isolated subagent conversation and returns its final value (the typed `Sentiment` from Step 3) across the boundary; the `?` unwraps it into `s`. `docs/tutorial.md:268-270` — live
80. `s` is a real typed value in this loom's code: `s.confidence` and `s.label` are read to branch. `docs/tutorial.md:271` — conformance
81. This is the final-value contract in action — an invoke parent receives the callee's final value as the `Ok` payload. `docs/tutorial.md:272-273` — conformance
82. The tail query is this loom's own final value. `docs/tutorial.md:275` — offline
83. `text` is again a single-string parameter, so the reader passes the text directly. `docs/tutorial.md:277` — conformance
84. Command `pi --loom docs/examples -p "/typed-return I love this new build"` runs the loom. `docs/tutorial.md:280` — live
85. Observed result: exit 0, a success terminal outcome; the callee's typed value crosses the subagent boundary and drives the `if` branch in code. `docs/tutorial.md:283` — live
86. This loom is itself in subagent mode, so its own final value is not printed on the `pi -p` text channel; success is exit 0 with empty stdout. `docs/tutorial.md:284-286` — live

### "Where to go next"

87. The reader has run a loom end-to-end through five constructs: a prompt-mode query, `${}` interpolation with typed params, a typed return with a schema, a code-driven tool call, and a subagent invoke returning a typed final value. `docs/tutorial.md:292` — inspection
88. How-to guides cover single-goal recipes past this path: recovering from a `QueryError`, configuring the tool-call round budget, sharing a schema from a `.warp` module. `docs/tutorial.md:296-297` — inspection

### Provenance

89. Every step runs a checked-in example under `docs/examples/`. `docs/tutorial.md:304` — inspection
90. Runtime validation used provider `unity-messages` / model `claude-haiku-4-5`, loading the working-tree build via `pi -ne -e ./extensions --loom docs/examples -p "/<stem> ..."`. `docs/tutorial.md:305-307` — live
91. All five steps reach a success terminal outcome (exit 0, no runtime panic). `docs/tutorial.md:307-308` — live
92. Provenance table: Step 1 `hello`, prompt mode, observable = streamed assistant turn (illustrative, non-deterministic), pass (exit 0). `docs/tutorial.md:312` — live
93. Provenance table: Step 2 `arg-binding`, subagent, observable = bind echo note `Running /arg-binding: path=README.md, audience="new hires"` (binder envelope never surfaced), pass (exit 0). `docs/tutorial.md:313` — live
94. Provenance table: Step 3 `sentiment`, subagent, observable = none on success (typed final value not on `pi -p` text channel), pass (exit 0). `docs/tutorial.md:314` — live
95. Provenance table: Step 4 `call-tool`, subagent, observable = none on success, pass (exit 0). `docs/tutorial.md:315` — live
96. Provenance table: Step 5 `typed-return`, subagent (invokes `sentiment.loom`), observable = none on success (typed final value propagated across subagent boundary, not to stdout), pass (exit 0). `docs/tutorial.md:316` — live
97. Recorded constraint (not a defect): subagent-mode looms run an isolated, discarded conversation; their final value reaches programmatic callers and propagates across the subagent boundary but is not observable on `pi -p` stdout. `docs/tutorial.md:318-320` — conformance
98. Prompt mode (Step 1) surfaces its trailing turn on stdout. `docs/tutorial.md:321` — live

## Examples referenced

Each `docs/examples/*.loom` the tutorial names, the referencing line, and the documented expected outcome when run.

- **`docs/examples/hello.loom`** — referenced `docs/tutorial.md:57` (Step 1). Run via `pi --loom docs/examples -p "/hello"` (`docs/tutorial.md:76`). Expected: exit 0, success terminal outcome; prompt mode streams an assistant turn (greeting + short confirming line) onto stdout; wording is model-generated/non-deterministic. `docs/tutorial.md:79-84`, table row `docs/tutorial.md:312`.
- **`docs/examples/arg-binding.loom`** — referenced `docs/tutorial.md:91` (Step 2). Run via `pi --loom docs/examples -p "/arg-binding README.md for new hires"` (`docs/tutorial.md:127`). Expected: exit 0; observable proof is the bind-echo note `Running /arg-binding: path=README.md, audience="new hires"`; subagent trailing query not on stdout. `docs/tutorial.md:130-147`, table row `docs/tutorial.md:313`.
- **`docs/examples/sentiment.loom`** — referenced `docs/tutorial.md:153` (Step 3). Run via `pi --loom docs/examples -p "/sentiment I love this new build"` (`docs/tutorial.md:191`). Expected: exit 0, success terminal outcome; subagent mode → empty stdout on success; typed `Sentiment` value is the final value, propagated across the boundary, not printed. `docs/tutorial.md:194-197`, table row `docs/tutorial.md:314`. Also referenced as a `.loom` callable dependency by `typed-return.loom` at `docs/tutorial.md:249` / `docs/tutorial.md:262`.
- **`docs/examples/call-tool.loom`** — referenced `docs/tutorial.md:205` (Step 4). Run via `pi --loom docs/examples -p "/call-tool"` (`docs/tutorial.md:231`). Expected: exit 0, success terminal outcome; subagent mode → empty stdout on success. `docs/tutorial.md:234-236`, table row `docs/tutorial.md:315`.
- **`docs/examples/typed-return.loom`** — referenced `docs/tutorial.md:242` (Step 5); invokes `./sentiment.loom` as a `.loom` callable (`docs/tutorial.md:249`, `docs/tutorial.md:262`). Run via `pi --loom docs/examples -p "/typed-return I love this new build"` (`docs/tutorial.md:280`). Expected: exit 0, success terminal outcome; callee's typed value crosses the subagent boundary and drives the `if` branch; subagent mode → own final value not printed, empty stdout. `docs/tutorial.md:283-288`, table row `docs/tutorial.md:316`.

### `.warp` modules

- No `docs/examples/*.warp` file is invoked or run in the tutorial. A `.warp` module is mentioned only once, as a forward pointer to a how-to guide ("sharing a schema from a `.warp` module"). `docs/tutorial.md:297` — inspection.

## Notes / flags for the campaign

- **Doc/example mismatch candidate:** Claim 38 (`docs/tutorial.md:114`) asserts `bind_model: claude-haiku` selects the binder model, but the inline `arg-binding.loom` frontmatter shown at `docs/tutorial.md:93-104` contains `bind_echo: true` and no `bind_model:` field. Verify against the checked-in `docs/examples/arg-binding.loom` — either the prose or the shown snippet may be stale.
- All command-invocation forms use `pi --loom docs/examples -p "/<stem> ..."`; the Provenance section (`docs/tutorial.md:307`) documents the actual validation command as `pi -ne -e ./extensions --loom docs/examples -p "/<stem> ..."` (adds `-ne -e ./extensions`). Confirm whether the reader-facing form reproduces without `-ne -e ./extensions`.
