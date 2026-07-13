# Example `.loom`/`.warp` Catalog

Exhaustive per-file analysis of every example in `docs/examples/`. Each H2 covers one file; every quoted frontmatter field or body claim carries a `docs/examples/<file>:<line>` citation.

---

## arg-binding.loom

- **Declared mode:** `subagent` — `mode: subagent` (`docs/examples/arg-binding.loom:4`)
- **Slash-command name:** inferred from filename → `/arg-binding` (no `name:` field present; `docs/examples/arg-binding.loom:1-11`)
- **Frontmatter fields present:**
  - `description: "Summarise a file for a given audience"` (`docs/examples/arg-binding.loom:2`)
  - `argument-hint: "<path> for <audience>"` (`docs/examples/arg-binding.loom:3`)
  - `mode: subagent` (`docs/examples/arg-binding.loom:4`)
  - `bind_model: claude-haiku` (`docs/examples/arg-binding.loom:5`)
  - `bind_echo: true` (`docs/examples/arg-binding.loom:6`)
  - `params:` block with `path: string` (`docs/examples/arg-binding.loom:8`) and `audience: string` (`docs/examples/arg-binding.loom:9`)
- **Required inputs/params:** two required string params — `path` and `audience` (`docs/examples/arg-binding.loom:7-9`)
- **Step by step:**
  1. Binds an override model `claude-haiku` and enables `bind_echo` for the run (`docs/examples/arg-binding.loom:5-6`).
  2. Emits a single query interpolating both params: `Summarise the file at ${path} for an audience of: ${audience}.` (`docs/examples/arg-binding.loom:11`).
- **Terminal outcome / final value:** success; the loom's terminal expression is the query at line 11, so the final value is that query's model text response (`docs/examples/arg-binding.loom:11`). No `?` and no explicit error handling, so a query failure would propagate as a failed run.

---

## call-tool.loom

- **Declared mode:** `subagent` — `mode: subagent` (`docs/examples/call-tool.loom:3`)
- **Slash-command name:** inferred from filename → `/call-tool` (no `name:` field; `docs/examples/call-tool.loom:1-5`)
- **Frontmatter fields present:**
  - `description: Count TODO markers under src` (`docs/examples/call-tool.loom:2`)
  - `mode: subagent` (`docs/examples/call-tool.loom:3`)
  - `tools: grep` (`docs/examples/call-tool.loom:4`)
- **Required inputs/params:** none (no `params:` block); relies on the `grep` tool being available (`docs/examples/call-tool.loom:4`)
- **Step by step:**
  1. Calls the `grep` tool with `{ pattern: "TODO", path: "src" }`, binding the result to `hits`; the `?` propagates a tool error if the call fails (`docs/examples/call-tool.loom:6`).
  2. Emits a query interpolating `hits`: `How many TODO markers appear in this grep output? ${hits}` (`docs/examples/call-tool.loom:7`).
- **Terminal outcome / final value:** success; terminal expression is the query at line 7, final value is that query's text answer (`docs/examples/call-tool.loom:7`). If `grep` errors, the `?` at line 6 aborts the run with that error (`docs/examples/call-tool.loom:6`).

---

## configure-tool-loop.loom

- **Declared mode:** `subagent` — `mode: subagent` (`docs/examples/configure-tool-loop.loom:3`)
- **Slash-command name:** inferred from filename → `/configure-tool-loop` (no `name:` field; `docs/examples/configure-tool-loop.loom:1-7`)
- **Frontmatter fields present:**
  - `description: Locate config loading with a bounded tool-call budget` (`docs/examples/configure-tool-loop.loom:2`)
  - `mode: subagent` (`docs/examples/configure-tool-loop.loom:3`)
  - `tools: grep` (`docs/examples/configure-tool-loop.loom:4`)
  - `tool_loop:` block with `max_rounds: 4` (`docs/examples/configure-tool-loop.loom:5-6`)
- **Required inputs/params:** none (no `params:` block); uses the `grep` tool within a bounded loop of 4 rounds (`docs/examples/configure-tool-loop.loom:4-6`)
- **Step by step:**
  1. Runs a query `Find where configuration is loaded. Use grep as needed.` inside a `match`, allowing the model up to 4 tool-call rounds (`docs/examples/configure-tool-loop.loom:5-8`).
  2. `Ok(text) => text` — on success, binds the model text to `answer` (`docs/examples/configure-tool-loop.loom:9`).
  3. `Err(QueryError { kind: "tool_loop_exhausted" })` — if the round budget is exhausted, `answer` = `"search stopped after the round budget"` (`docs/examples/configure-tool-loop.loom:10-11`).
  4. `Err(_)` — any other error, `answer` = `"search failed"` (`docs/examples/configure-tool-loop.loom:12`).
  5. Emits terminal query `Report: ${answer}` (`docs/examples/configure-tool-loop.loom:14`).
- **Terminal outcome / final value:** success in all branches (errors are caught by the `match`); final value is the `Report: ${answer}` query response, where `answer` is one of the model text, the exhaustion string, or the failure string (`docs/examples/configure-tool-loop.loom:8-14`).

---

## handle-error.loom

- **Declared mode:** `subagent` — `mode: subagent` (`docs/examples/handle-error.loom:3`)
- **Slash-command name:** inferred from filename → `/handle-error` (no `name:` field; `docs/examples/handle-error.loom:1-6`)
- **Frontmatter fields present:**
  - `description: Triage a message, recovering from a schema-validation failure` (`docs/examples/handle-error.loom:2`)
  - `mode: subagent` (`docs/examples/handle-error.loom:3`)
  - `params:` block with `message: string` (`docs/examples/handle-error.loom:4-5`)
- **Return type / inline schema:** local `schema Triage { category: "bug" | "feature" | "question", urgent: boolean }` (`docs/examples/handle-error.loom:7-10`)
- **Required inputs/params:** one required string param — `message` (`docs/examples/handle-error.loom:4-5`)
- **Step by step:**
  1. Declares the `Triage` schema (`docs/examples/handle-error.loom:7-10`).
  2. Runs a schema-typed query `@<Triage>` `Triage this message: ${message}` inside a `match` (`docs/examples/handle-error.loom:12`).
  3. `Ok(t) => t` — on success, `outcome` is the parsed `Triage` (`docs/examples/handle-error.loom:13`).
  4. `Err(QueryError { kind: "validation", cause: "schema_validation" })` — on schema-validation failure, `outcome` = `Triage { category: "question", urgent: false }` (`docs/examples/handle-error.loom:14-15`).
  5. `Err(_)` — any other error, same fallback `Triage { category: "question", urgent: false }` (`docs/examples/handle-error.loom:16`).
  6. Emits terminal query `Handling as ${outcome.category} (urgent: ${outcome.urgent}).` (`docs/examples/handle-error.loom:18`).
- **Terminal outcome / final value:** success in all branches (all errors recovered by the `match`); final value is the response to the `Handling as …` query (`docs/examples/handle-error.loom:12-18`).

---

## hello.loom

- **Declared mode:** `prompt` — `mode: prompt` (`docs/examples/hello.loom:3`)
- **Slash-command name:** inferred from filename → `/hello` (no `name:` field; `docs/examples/hello.loom:1-4`)
- **Frontmatter fields present:**
  - `description: "Minimal discovered loom for the host-integration recipe"` (`docs/examples/hello.loom:2`)
  - `mode: prompt` (`docs/examples/hello.loom:3`)
- **Required inputs/params:** none (no `params:` block)
- **Step by step:**
  1. Emits a single query: `Say hello and confirm the loom extension is wired up.` (`docs/examples/hello.loom:5`).
- **Terminal outcome / final value:** success; final value is the model's greeting/confirmation text from the query at line 5 (`docs/examples/hello.loom:5`). Only `prompt`-mode example in the set.

---

## import-warp.loom

- **Declared mode:** `subagent` — `mode: subagent` (`docs/examples/import-warp.loom:3`)
- **Slash-command name:** inferred from filename → `/import-warp` (no `name:` field; `docs/examples/import-warp.loom:1-6`)
- **Frontmatter fields present:**
  - `description: "Use a shared Author schema and helper from a .warp module"` (`docs/examples/import-warp.loom:2`)
  - `mode: subagent` (`docs/examples/import-warp.loom:3`)
  - `params:` block with `reviewer: Author` (`docs/examples/import-warp.loom:4-5`) — param typed by an imported schema
- **Required inputs/params:** one required param `reviewer` of imported type `Author` (`docs/examples/import-warp.loom:5`)
- **Step by step:**
  1. Imports `Author` (schema) and `rate_strictness` (fn) from `./personas.warp` (`docs/examples/import-warp.loom:7`).
  2. Calls `rate_strictness(reviewer)` with `?` propagation, binding integer to `strictness` (`docs/examples/import-warp.loom:9`).
  3. Emits terminal query `Produce a review checklist calibrated to strictness level ${strictness}/5.` (`docs/examples/import-warp.loom:10`).
- **Terminal outcome / final value:** success; final value is the checklist text from the query at line 10 (`docs/examples/import-warp.loom:10`). A `QueryError` inside `rate_strictness` propagates via `?` and fails the run (`docs/examples/import-warp.loom:9`).

---

## personas.warp

- **Declared mode:** warp module (not invocable) — no frontmatter, no `mode:`; a `.warp` reusable module (`docs/examples/personas.warp:1-9`)
- **Slash-command name:** none; not a slash command (module imported by other looms, e.g. `import-warp.loom:7`)
- **Exports:**
  - `schema Author { name: string, role: string, experience_years: integer }` (`docs/examples/personas.warp:1-5`)
  - `fn rate_strictness(a: Author): Result<integer, QueryError>` (`docs/examples/personas.warp:7-9`)
- **Frontmatter fields present:** none (no `---` block; module has no frontmatter)
- **Required inputs/params:** n/a for the module itself; `rate_strictness` takes one arg `a: Author` (`docs/examples/personas.warp:7`)
- **Step by step (of the exported fn):**
  1. `rate_strictness` runs an integer-typed query `@<integer>` asking on a 1–5 scale how strict a reviewer `${a.name}`, a `${a.role}` with `${a.experience_years}y` of experience, is (`docs/examples/personas.warp:8`).
  2. Returns `Result<integer, QueryError>` (`docs/examples/personas.warp:7`).
- **Terminal outcome / final value:** module is not run standalone; consumed via import. `rate_strictness` yields an integer 1–5 or a `QueryError` (`docs/examples/personas.warp:7-8`).

---

## sentiment.loom

- **Declared mode:** `subagent` — `mode: subagent` (`docs/examples/sentiment.loom:3`)
- **Slash-command name:** inferred from filename → `/sentiment`; also imported as a tool `sentiment` by `typed-return.loom` (`docs/examples/sentiment.loom:1-6`, `docs/examples/typed-return.loom:5,9`)
- **Frontmatter fields present:**
  - `description: Classify text sentiment` (`docs/examples/sentiment.loom:2`)
  - `mode: subagent` (`docs/examples/sentiment.loom:3`)
  - `params:` block with `text: string` (`docs/examples/sentiment.loom:4-5`)
- **Return type / inline schema:** local `schema Sentiment { label: "positive" | "neutral" | "negative", confidence: number }` (`docs/examples/sentiment.loom:7-10`); loom returns a `Sentiment` value (`docs/examples/sentiment.loom:12-13`)
- **Required inputs/params:** one required string param — `text` (`docs/examples/sentiment.loom:4-5`)
- **Step by step:**
  1. Declares the `Sentiment` schema (`docs/examples/sentiment.loom:7-10`).
  2. Runs a schema-typed query `let result: Sentiment = @` `Classify the sentiment of: ${text}` with `?` propagation (`docs/examples/sentiment.loom:12`).
  3. Terminal bare expression `result` returns the parsed `Sentiment` (`docs/examples/sentiment.loom:13`).
- **Terminal outcome / final value:** success; final value is the typed `Sentiment` record (`label`, `confidence`) (`docs/examples/sentiment.loom:12-13`). A validation/query error propagates via `?` at line 12 and fails the run (`docs/examples/sentiment.loom:12`).

---

## typed-return.loom

- **Declared mode:** `subagent` — `mode: subagent` (`docs/examples/typed-return.loom:3`)
- **Slash-command name:** inferred from filename → `/typed-return` (no `name:` field; `docs/examples/typed-return.loom:1-8`)
- **Frontmatter fields present:**
  - `description: Invoke a subagent classifier and branch on its typed result` (`docs/examples/typed-return.loom:2`)
  - `mode: subagent` (`docs/examples/typed-return.loom:3`)
  - `tools:` list with one entry `- ./sentiment.loom` (loom-as-tool) (`docs/examples/typed-return.loom:4-5`)
  - `params:` block with `text: string` (`docs/examples/typed-return.loom:6-7`)
- **Required inputs/params:** one required string param — `text` (`docs/examples/typed-return.loom:6-7`); depends on the `./sentiment.loom` subagent being available as a tool named `sentiment` (`docs/examples/typed-return.loom:5,9`)
- **Step by step:**
  1. Calls the imported `sentiment(text)` loom-tool with `?` propagation, binding the typed result to `s` (`docs/examples/typed-return.loom:9`).
  2. If `s.confidence < 0.5`, runs a clarifying-question query interpolating `${s.label}` with `?` propagation (`docs/examples/typed-return.loom:10-12`).
  3. Emits terminal query `Acknowledge the ${s.label} sentiment in one line.` (`docs/examples/typed-return.loom:13`).
- **Terminal outcome / final value:** success; final value is the one-line acknowledgement text from the query at line 13 (`docs/examples/typed-return.loom:13`). Either `?`-propagated query (line 9 or 11) can fail the run on error (`docs/examples/typed-return.loom:9,11`).

---

## Cross-file summary

- **Modes:** `prompt` — only `hello.loom` (`docs/examples/hello.loom:3`); `subagent` — arg-binding, call-tool, configure-tool-loop, handle-error, import-warp, sentiment, typed-return (7 files); warp module (not invocable) — `personas.warp` (no frontmatter, `docs/examples/personas.warp:1`).
- **No file uses an explicit `name:` field;** every slash-command name is inferred from the filename stem.
- **Params required:** arg-binding (`path`, `audience`), handle-error (`message`), import-warp (`reviewer: Author`), sentiment (`text`), typed-return (`text`). No params: call-tool, configure-tool-loop, hello.
- **Tools used:** `grep` (call-tool, configure-tool-loop); loom-as-tool `./sentiment.loom` (typed-return); imported warp fn `rate_strictness` (import-warp).
- **Error-recovering (never fails) looms:** configure-tool-loop and handle-error wrap queries in `match` and always reach a success terminal. All others `?`-propagate and can fail.
