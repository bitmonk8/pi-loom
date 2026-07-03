# How to import a .warp module

You want to share a schema, enum, or helper `fn` across looms. Put it in a
`.warp` library file and `import` it. `.warp` files hold only declarations, are
never slash-discovered, and are never invoked directly — you exercise them
through a `.loom` that imports them.

## Steps

1. Create a `.warp` file containing top-level `schema`, `enum`, and/or `fn`
   declarations. Every top-level declaration is implicitly exported.
2. In the `.loom`, add `import { Name, other } from "./path.warp"` at the top of
   the body. Paths are relative and must end in `.warp` (byte-exact lowercase).
3. Use the imported symbols like local ones — an imported `schema` resolves in
   `params:` and type annotations; an imported `fn` is called directly. A query
   inside an imported `fn` runs against the *calling* loom's conversation.

Resolve name clashes with `import { Name as Alias } from ...`.

## Working example

Library [`docs/examples/personas.warp`](../examples/personas.warp) exports a schema
and a helper:

```loom
schema Author {
  name: string,
  role: string,
  experience_years: integer
}

fn rate_strictness(a: Author): Result<integer, QueryError> {
  @<integer>`On a 1-5 scale, how strict a reviewer is ${a.name}, a ${a.role} with ${a.experience_years}y of experience?`
}
```

Loom [`docs/examples/import-warp.loom`](../examples/import-warp.loom) imports both:

```loom
---
description: "Use a shared Author schema and helper from a .warp module"
mode: subagent
params:
  reviewer: Author
---
import { Author, rate_strictness } from "./personas.warp"

let strictness = rate_strictness(reviewer)?
@`Produce a review checklist calibrated to strictness level ${strictness}/5.`
```

Run the importing loom (the `.warp` is reached only through it):

```
pi --loom docs/examples -p "/import-warp Ada Lovelace, senior engineer, 12 years"
```

## Result

`Author` resolves in `params:` from the import, and `rate_strictness(reviewer)?`
runs the imported helper — its query executes against `import-warp.loom`'s own
conversation. The `.warp` file never appears in slash autocomplete.

## Reference

- `schema`, `enum`, `fn` declarations and type grammar — [Grammar](../reference/grammar.md).
- Named-type resolution against imported symbols in `params:` — [Frontmatter](../reference/frontmatter.md).
- Import path resolution, re-exports, cycles, and unknown-symbol errors —
  spec `docs/spec_topics/imports.md`.
- Why the `.loom` / `.warp` split exists — [Guide](../guide.md).

## Provenance

- Spec: `docs/spec_topics/imports.md` (`.warp` rules, path resolution, IMP-1,
  visibility, re-exports, collisions), `docs/spec_topics/functions.md` (FN-1),
  `docs/spec_topics/frontmatter/frontmatter-fields-a.md` (`params:` named-type
  resolution against imports), glossary entry *`.warp` file (library module)*.
- Examples `import-warp.loom` + `personas.warp` requested from
  `loom-docs-example-runner`.
