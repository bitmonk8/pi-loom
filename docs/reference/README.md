# Reference

The exact, normative behaviour of Theta and the pi-theta runtime. Look here to
settle a question about what a construct means, what a field accepts, or how a
failure surfaces. For the mental model read the [Guide](../guide.md); to learn by
doing, the [Tutorial](../tutorial.md) and the [How-to guides](../how-to/).

## Language

- [Grammar](./grammar.md) — lexical structure and every grammar production:
  expressions, `let`, blocks, `fn` (including the `subagent fn` modifier),
  `match`, control flow (`for` / `par for`), `return`, the type grammar, and the
  Pi-tool argument grammar.
- [Type system](./type-system.md) — type expressions, the compatibility relation,
  the runtime value model, equality, wire-name translation, and effects.
- [Schema subset](./schema-subset.md) — the JSON-Schema subset Theta lowers to:
  `schema` / `enum` / union declarations, discriminated unions, recursion, depth
  enforcement, and the canonical schema hash.

## File configuration

- [Frontmatter](./frontmatter.md) — the frontmatter field contract: `params:`
  types and defaults, the `tools:` callable set, `system:`, `respond_repair:`,
  `tool_loop:`, and template interpolation.

## Runtime behaviour

- [Errors and results](./errors-and-results.md) — the success / fail / cancelled
  trichotomy, `QueryError` variant schemas, the no-rollback contract, runtime
  panics, and the final-value rule (FN-5).
- [Hard ceilings](./hard-ceilings.md) — the four hard ceilings and their routing
  classes, plus the `par for` width throttle (which is a scheduling bound, not a
  ceiling).
- [Diagnostics](./diagnostics.md) — the full closed diagnostic-code registry
  (`theta/parse/*`, `theta/load/*`, `theta/runtime/*`, `theta/host/*`) with code,
  severity, phase, and message.

## Discovery and CLI

- [Discovery and CLI](./discovery-cli.md) — the five discovery sources, priority
  and collision rules, settings, slash-command invocation, and `invoke`
  (resolution, typed return, arity, cross-mode, cycle detection).

---

`coverage-matrix.md` in this directory is internal bookkeeping (which Reference
page owns which spec surface, and what is deferred) — it is not part of the
Reference proper and is not linked above.

## Provenance

- Diátaxis boundaries (reference as one of four distinct modes), the
  link-into-the-reference rule, and one-document-one-job: `docs/STYLE.md`
  §"Structure and cross-linking".
- The `coverage-matrix.md` bookkeeping page and its "done is observable" posture:
  [coverage-matrix.md](./coverage-matrix.md).
