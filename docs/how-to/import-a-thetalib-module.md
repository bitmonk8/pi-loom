# How to import a .thetalib module

You want to share a schema, enum, or helper `fn` across thetas. Put it in a
`.thetalib` library file and `import` it. `.thetalib` files hold only declarations, are
never slash-discovered, and are never invoked directly — you exercise them
through a `.theta` that imports them.

## Steps

1. Create a `.thetalib` file containing top-level `schema`, `enum`, and/or `fn`
   declarations. Every top-level declaration is implicitly exported.
2. In the `.theta`, add `import { Name, other } from "./path.thetalib"` at the top of
   the body. Paths are relative and must end in `.thetalib` (byte-exact lowercase).
3. Use the imported symbols like local ones — an imported `schema` resolves in
   `params:` and type annotations; an imported `fn` is called directly. A query
   inside an imported `fn` runs against the *calling* theta's conversation.

Resolve name clashes with `import { Name as Alias } from ...`.

## Working example

Library [`docs/examples/personas.thetalib`](../examples/personas.thetalib) exports a schema
and a helper:

```theta
schema Author {
  name: string,
  role: string,
  experience_years: integer
}

fn rate_strictness(a: Author): Result<integer, QueryError> {
  @<integer>`On a 1-5 scale, how strict a reviewer is ${a.name}, a ${a.role} with ${a.experience_years}y of experience?`
}
```

Theta [`docs/examples/import-thetalib.theta`](../examples/import-thetalib.theta) imports both:

```theta
---
description: "Use a shared Author schema and helper from a .thetalib module"
mode: subagent
params:
  reviewer: Author
---
import { Author, rate_strictness } from "./personas.thetalib"

let strictness = rate_strictness(reviewer)?
@`Produce a review checklist calibrated to strictness level ${strictness}/5.`
```

Run the importing theta (the `.thetalib` is reached only through it):

```
pi --theta docs/examples -p "/import-thetalib Ada Lovelace, senior engineer, 12 years"
```

## Result

`Author` resolves in `params:` from the import, and `rate_strictness(reviewer)?`
runs the imported helper — its query executes against `import-thetalib.theta`'s own
conversation. The `.thetalib` file never appears in slash autocomplete.

## Reference

- `schema`, `enum`, `fn` declarations and type grammar — [Grammar](../reference/grammar.md).
- Named-type resolution against imported symbols in `params:` — [Frontmatter](../reference/frontmatter.md).
- Import path resolution, re-exports, cycles, and unknown-symbol errors —
  spec `docs/spec_topics/imports.md`.
- Why the `.theta` / `.thetalib` split exists — [Guide](../guide.md).

## Provenance

- Spec: `docs/spec_topics/imports.md` (`.thetalib` rules, path resolution, IMP-1,
  visibility, re-exports, collisions), `docs/spec_topics/functions.md` (FN-1),
  `docs/spec_topics/frontmatter/frontmatter-fields-a.md` (`params:` named-type
  resolution against imports), glossary entry *`.thetalib` file (library module)*.
- Examples `import-thetalib.theta` + `personas.thetalib` requested from
  `theta-docs-example-runner`.
