# pi-loom

`pi-loom` is a [Pi Coding Agent](https://github.com/earendil-works/pi-mono)
extension that adds **Loom**, a scripting language for authoring parameterized,
programmatic templates that target the boundary between code and an LLM.

A `.loom` file interleaves ordinary code — variables, loops, conditionals,
functions — with literal text destined for the model. Evaluating a loom appends
turns to a conversation: the caller's current conversation in *prompt mode*, or a
fresh isolated conversation in *subagent mode*. On the success outcome it also
produces a [*final value*](./docs/reference/errors-and-results.md#final-value-fn-5)
— the loom's tail expression, or the operand of an executed `return` — available
to programmatic callers and propagated across the subagent boundary. The language
has no file-writing, network, or process-spawning primitive; effects of those
kinds occur only through the Pi tools a loom admits in its
[callable set](./docs/reference/frontmatter.md#tools-callable-set).
`.warp` files are library modules that share Loom's grammar and type system and
are imported by `.loom` files; they are never invoked directly.

## The problem

Pi's built-in `prompt` and `subagent` features are parameterized Markdown —
static text with YAML frontmatter. They cannot branch, loop, parse a model's
response, drive a conversation across several turns, or return a typed value to a
programmatic caller. Loom is a full scripting language for those cases: code
decides *what* text is sent to the model, the model's responses flow back as
values, and evaluation resolves to one of three terminal outcomes — success,
failure, or cancellation — defined in
[Errors and Results](./docs/reference/errors-and-results.md#terminal-outcomes-closed-set).

## Status

This package is at **0.1.x** — an early, pre-stable release. The shipped runtime
carries no public-surface stability guarantee yet and is under active hardening,
so the `package.json` version stays on a `0.x` line. That version tracks *package
maturity*, which is a distinct axis from the *language design scope*: the language
this package implements is at its first major scope, **loom 1.0** — a design-scope
term defined by the specification's versioning governance
(`docs/spec_topics/governance/release-version-naming.md`), not a claim that the
shipped code is stable.

The full documented language surface is implemented and exercised end-to-end —
the binder, typed queries with schema validation, code-driven tool calls,
`invoke`/subagent value passing, `match`/`?`, enums, and user functions all work;
the load-time diagnostic surface (a non-boolean `if` condition, indexing a
`string`, a non-array `for` iterand, an unknown identifier or method, a
mixed-type `+`, and object-construction field errors) diagnoses at load; and
control/effect forms (a nested `match`, an `@`-query, a tool-call, an `invoke`, a
user-`fn` call) evaluate correctly in every expression position.

A standing **production-path conformance suite** drives the full documented
language surface through the shipped composition (discovery/registration, the
whole-file parser, and the runtime dispatch) as a regression net against
wiring breaks that isolated unit tests miss; it runs under the opt-in
`npm run test:conformance` runner, outside the default `npm test`.

Report issues against the behaviour the [Reference](./docs/reference/) defines.

## Documentation

- **[Guide](./docs/guide.md)** — the mental model: how code interleaves with
  model-directed text, why evaluation appends turns, prompt vs. subagent mode,
  `.loom` vs. `.warp`, and the final value.
- **[Tutorial](./docs/tutorial.md)** — one hands-on path that takes a newcomer
  from an empty file to a working loom.
- **[How-to guides](./docs/how-to/)** — goal-directed recipes for competent
  users.
- **[Reference](./docs/reference/)** — exact, normative behaviour: grammar, type
  system, frontmatter fields, error and result model, hard ceilings, diagnostics,
  and the CLI / discovery surface.

## Provenance

- Terminology (`Loom`, `.loom`, `.warp`, *prompt mode* / *subagent mode*, *final
  value*, *callable set*) matches `docs/spec_topics/glossary.md`.
- "What loom is" and "The problem" draw on `docs/spec_topics/overview.md` §Overview
  and §Conceptual Model, and `docs/spec_topics/overview-and-orientation.md`
  §Overview (the success / fail / cancelled trichotomy, the no-file-write effect
  surface, prompt/subagent conversation targeting).
- The `.loom` / `.warp` split draws on
  `docs/spec_topics/overview-and-orientation.md` §"file-extension-grammar" and
  `docs/spec_topics/language-and-architecture.md`.
- The **loom 1.0** language design-scope framing follows the specification's
  versioning governance (`docs/spec_topics/governance/release-version-naming.md`).
  The package's `0.1.x` version is a separate axis (implementation release
  maturity), deliberately kept pre-stable.
- Definition links point into `docs/reference/` (errors-and-results.md,
  frontmatter.md) rather than restating normative detail, per `docs/STYLE.md`.
</content>
</invoke>
