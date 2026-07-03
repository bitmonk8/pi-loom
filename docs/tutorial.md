# Tutorial: your first loom

This is one continuous path from an empty session to a loom that spawns a
subagent and reads a typed value back. Work through the steps in order — each one
builds on the last. You write nothing from scratch: every step runs a real,
checked-in file under [`docs/examples/`](./examples/), so you can reproduce every
result on your own machine.

For *why* looms are shaped the way they are, read the [Guide](./guide.md). For
exact behaviour, the [Reference](./reference/) holds the normative detail; this
tutorial links into it rather than restating it.

## What you need

- `pi` installed and on your `PATH`.
- A configured provider and model. The model-facing steps below issue real turns
  against your provider; without one, `pi` reports `needs-provider` and no turn is
  sent.
- A checkout of this repository, so the example files resolve at
  `docs/examples/`.

Every example is invoked the same way — by its filename stem, as a slash command,
with the example directory put on the discovery path via the `--loom` flag:

```
pi --loom docs/examples -p "/<stem> <arguments>"
```

`--loom <path>` is one of the [five discovery
sources](./reference/discovery-cli.md#the-five-discovery-sources); it registers
every `*.loom` in the directory as a slash command for that run.

One caveat this tutorial states up front rather than hiding: steps 1–2 run in
[prompt mode](./spec_topics/glossary.md) and execute end-to-end today. Steps 3–5
run in [subagent mode](./spec_topics/glossary.md), which parses and loads but does
not yet drive a live conversation at the 1.0 production root (a host precondition,
tracked as **H8a**, not a defect in your loom). Each step below reports its actual
observed runtime status; nothing is imagined.

## Step 1 — Run your first loom (prompt mode)

The smallest useful loom is a single model turn. Here is the whole file,
[`docs/examples/hello.loom`](./examples/hello.loom):

```loom
---
description: "Minimal discovered loom for the host-integration recipe"
mode: prompt
---
@`Say hello and confirm the loom extension is wired up.`
```

Two parts:

- The `---`-fenced **frontmatter** declares metadata. `mode: prompt` is required
  and selects [prompt mode](./spec_topics/glossary.md): the loom's turns run in
  your *current* Pi conversation and are visible to you. The required fields and
  which are mode-specific are in the [frontmatter
  reference](./reference/frontmatter.md#field-contract-normative).
- The body is one line: an `@`-prefixed backtick template. That is a **query** —
  the primitive that crosses from code to the model. Step 2 dissects it.

Run it:

```
pi --loom docs/examples -p "/hello"
```

The loom loads, `pi` sends the rendered line as a user turn in your session, and
the model answers. One observed run produced:

```
Hello.

I can't confirm the loom extension without inspecting it — no tools are
available in this session to read files or list extensions. Provide tool access
or point me to the extension's location, and I'll verify it's wired up.
```

The assistant text is model-generated and will differ run to run — do not expect
it verbatim. The stable, guaranteed fact is the *terminal outcome*: the loom ran
to the end and produced a **success** outcome (the first of the
[success / fail / cancelled trichotomy](./reference/errors-and-results.md#terminal-outcomes-closed-set)).
That outcome is what "it works" means for a loom.

Notice what you did **not** see: any explicit return value. In prompt mode the
loom's [final value](./reference/errors-and-results.md#final-value-fn-5) is not
surfaced to you — the conversation itself is the user-facing surface. That
distinction becomes the subject of steps 3–5.

## Step 2 — The `@` query template

Look again at the line from step 1:

```loom
@`Say hello and confirm the loom extension is wired up.`
```

The `@` operator turns the backtick template that follows it into a query. A
query does three things when evaluated:

1. renders the template text (interpolating any `${...}` expressions),
2. sends that text as the next turn into the loom's target conversation and
   awaits the model's reply, and
3. returns the reply as a value your code can use.

A query is an **expression**, not a statement — it yields a value. Untyped, that
value is `Result<string, QueryError>`: `Ok(text)` on success, or an `Err`
carrying a [`QueryError`](./reference/errors-and-results.md#queryerror-variants)
on failure. In `hello.loom` the query stands alone as the file's tail expression,
so its `Result` is the loom's final value — unread, because prompt mode does not
surface it.

To *use* a reply, you unwrap it. The postfix `?` operator unwraps `Ok` and
early-returns `Err`, so `let reply = @`...`?` binds the model's text to `reply` or
propagates a failure. Templates also interpolate: `@`Summarise ${topic}.`` splices
the value of `topic` into the text before sending. You will use both `?` and
`${...}` in the next step.

The query is the same construct in either mode — only the conversation it targets
changes. The full set of query forms, the `@<Schema>` explicit form, and template
normalisation are in the [grammar
reference](./reference/grammar.md#loom-literal-sublanguage) and the [frontmatter
template-interpolation rules](./reference/frontmatter.md#template-interpolation).

Runtime status: this step runs `hello.loom` — the same file as step 1 — so it is
runtime-validated to a **success** outcome.

## Step 3 — A typed return with a schema

So far a query returned a string. Now make the model return *structured* data your
code can branch on. This step also moves to
[subagent mode](./spec_topics/glossary.md), because the remaining concepts —
a typed final value and reading it across a boundary — are about a value a
*caller* consumes, which is subagent-mode territory.

Here is [`docs/examples/sentiment.loom`](./examples/sentiment.loom):

```loom
---
description: Classify text sentiment
mode: subagent
params:
  text: string
---
schema Sentiment {
  label: "positive" | "neutral" | "negative",
  confidence: number
}

let result: Sentiment = @`Classify the sentiment of: ${text}`?
result
```

New pieces, top to bottom:

- `mode: subagent` spawns a fresh, isolated conversation for the loom; its
  transcript is private and discarded when the loom returns. Only the return value
  crosses back to the caller.
- `params:` declares one input, `text: string`. Because it is exactly one string
  field with no default, the runtime uses the *single-string bypass*: the whole
  slash-argument string becomes `text`, and no LLM binder runs. (Declaring two
  parameters would invoke the binder instead — see the [argument-binding
  how-to](./how-to/bind-slash-command-arguments.md).)
- `schema Sentiment { ... }` declares a response shape from the [schema
  subset](./reference/schema-subset.md#schema-declarations): a string enum
  `label` and a numeric `confidence`.
- `let result: Sentiment = @`...`?` is a **typed query**. The binding's declared
  type `Sentiment` flows into the query as its response schema; the runtime asks
  the provider for that shape, validates the reply against it, and `?` unwraps the
  validated value. `result` is now a `Sentiment`, not a string — you can read
  `result.label` and `result.confidence`.
- The tail expression `result` is the loom's [final
  value](./reference/errors-and-results.md#final-value-fn-5): a typed `Sentiment`
  a caller can consume. Step 5 does exactly that.

Run it:

```
pi --loom docs/examples -p "/sentiment I love this, it works perfectly"
```

Observed runtime status: `sentiment.loom` **parses and loads cleanly** (it passes
the committed-fixture parse gate with zero `loom/load/*` or `loom/parse/*`
diagnostics), but the run does not reach the model. It reports the H8a host
precondition:

```
Extension error (command:sentiment): H8a: subagent-mode live drive is not
composed at the production root (the V9i isolated-AgentSession spawn needs host
AuthStorage/model not threaded into the per-loom producer). No prompt-mode loom
reaches this path.
```

This is a host-composition precondition for subagent mode at the 1.0 production
root — not a fault in the loom and not a missing provider key. The loom's shape,
schema, and typed-query wiring are validated; live subagent execution is what is
pending. Steps 4 and 5 are subagent-mode looms and report the same class of note.

## Step 4 — Call a tool

A loom's queries can reach the model, but a loom can also call **tools** — and so
can the model during a query. The set of tools available is the loom's [callable
set](./spec_topics/glossary.md), declared in the `tools:` frontmatter field.
Nothing outside that field is reachable; the host session's ambient tools are not
inherited.

Here is [`docs/examples/call-tool.loom`](./examples/call-tool.loom):

```loom
---
description: Count TODO markers under src
mode: subagent
tools: grep
---
let hits = grep({ pattern: "TODO", path: "src" })?
@`How many TODO markers appear in this grep output? ${hits}`
```

What is new:

- `tools: grep` puts one [Pi tool](./spec_topics/glossary.md) into the callable
  set. The scoping and shape rules for the field are in the [frontmatter
  reference](./reference/frontmatter.md#tools-callable-set).
- `grep({ pattern: "TODO", path: "src" })?` is a **tool call from loom code**: the
  bare tool name applied to a single object matching the tool's input schema, with
  `?` unwrapping the result. This runs deterministically — no model turn — and
  binds the tool output to `hits`.
- The final query interpolates `${hits}` into the prompt, so the model reasons
  over the tool output your code fetched.

This is the two-way pattern: code calls a tool, then feeds the result into a
query. (The model can also call `grep` itself during the query, from the same
callable set.) The call form and both directions are covered in the [call-a-tool
how-to](./how-to/call-a-tool-from-loom-code.md).

Run it:

```
pi --loom docs/examples -p "/call-tool"
```

Observed runtime status: `call-tool.loom` **parses and loads cleanly**; the run
reports the same H8a subagent-mode host precondition shown in step 3. The callable
set, the tool-call form, and the interpolation are validated; live execution is
pending.

## Step 5 — Invoke a subagent and read a typed final value

The last step composes everything: one loom **invokes** another, and reads the
child's typed [final value](./reference/errors-and-results.md#final-value-fn-5)
back across the subagent boundary.

The child is `sentiment.loom` from step 3 — unchanged; its final value is a typed
`Sentiment`. The parent is
[`docs/examples/typed-return.loom`](./examples/typed-return.loom):

```loom
---
description: Invoke a subagent classifier and branch on its typed result
mode: subagent
tools:
  - ./sentiment.loom
params:
  text: string
---
let s = sentiment(text)?
if s.confidence < 0.5 {
  @`The classifier was unsure (${s.label}). Ask a clarifying question.`?
}
@`Acknowledge the ${s.label} sentiment in one line.`
```

The mechanism:

- `tools:` lists a path, `./sentiment.loom`, not a tool name. A path entry is a
  [`.loom` callable](./spec_topics/glossary.md): the runtime wraps the child loom
  as a callable in the parent's callable set.
- `sentiment(text)?` calls that child by its stem, passing `text` positionally.
  The child runs in its own isolated conversation; its transcript never reaches
  the parent. Its inferred return type — `Sentiment` — flows into the call site,
  so `s` is a typed `Sentiment`, AJV-validated at the boundary before `?` unwraps
  it. This is the typed value crossing the subagent boundary.
- Because `s` is typed, the parent branches on `s.confidence` and interpolates
  `s.label` — ordinary code driven by the child's structured result.

The equivalent inline form is `invoke<Sentiment>("./sentiment.loom", text)?`; the
resolution and typing rules for both are in the [`invoke`
reference](./reference/discovery-cli.md#invoke-invocation), and the pattern is
written up in the [typed-return
how-to](./how-to/return-a-typed-value-across-a-subagent-boundary.md).

Run it:

```
pi --loom docs/examples -p "/typed-return I love this, it works perfectly"
```

Observed runtime status: `typed-return.loom` (with its `sentiment.loom` callee)
**parses and loads cleanly**; the run reports the same H8a subagent-mode host
precondition shown in step 3. The `.loom`-callable wiring, the typed boundary
crossing, and the branch on the typed result are validated; live execution is
pending.

## Where you are

You have run a prompt-mode loom end-to-end, learned the `@` query template and its
`Result`/`?` semantics, and read four progressively richer looms — a typed schema
query, a tool call, and a typed value crossing a subagent boundary — each a real,
parse-validated file.

Next:

- [How-to guides](./how-to/) — goal-titled recipes that pick up where each step
  here leaves off (binding multi-argument slash commands, handling a
  `QueryError`, configuring the tool-call loop, importing a `.warp` module).
- [Guide](./guide.md) — the mental model behind everything above.
- [Reference](./reference/) — exact grammar, type system, frontmatter, schema
  subset, error model, and discovery/CLI surface.

## Provenance

Concepts are drawn from the spec topics named below; every example is a
checked-in file under `docs/examples/` (parse-validated by the H7b
committed-fixture gate) and was invoked via `pi --loom docs/examples -p "/<stem>"`
for the runtime status recorded per step.

| Step | Concept (arc node) | Example stem(s) | Runtime-validation status |
|---|---|---|---|
| 1 | first loom (prompt mode) | `hello` | **success** — ran end-to-end; observed a success terminal outcome |
| 2 | the `@` query template | `hello` | **success** — same file as step 1 |
| 3 | typed return with a schema | `sentiment` | parse/load clean; runtime blocked by **H8a** (subagent-mode live drive not composed at production root) |
| 4 | a tool call | `call-tool` | parse/load clean; runtime blocked by **H8a** |
| 5 | subagent invoke returning a typed final value | `typed-return` (callee `sentiment`) | parse/load clean; runtime blocked by **H8a** |

- Spec topics: `overview-and-orientation.md`, `language-and-architecture.md`,
  `glossary.md`, `query/query-forms.md`, `schema-subset.md`, `tool-calls.md`,
  `invocation.md`, `return.md`, `control-flow.md`.
- Terminology (*prompt mode*, *subagent mode*, *callable set*, *final value*,
  *Pi tool*, *`.loom` callable*, `.loom`/`.warp`) matches
  `docs/spec_topics/glossary.md`; definitions link into `docs/reference/` per
  `docs/STYLE.md`.
- Runtime facts: `hello.loom` observed at a success terminal outcome; the
  subagent-mode looms (`sentiment.loom`, `call-tool.loom`, `typed-return.loom`)
  observed returning the H8a host-precondition note. H8a is a host-composition
  precondition for subagent-mode live drive at the 1.0 production root — not a
  loom defect and not a provider-key gap. No step's output is fabricated; the
  subagent-mode steps are documented as parse/load-validated with their actual
  observed runtime note.
