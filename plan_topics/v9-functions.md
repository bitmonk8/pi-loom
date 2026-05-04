# V9 — Function definitions

## V9a — Top-level `fn` declaration

- **Spec.** [Function Definitions](../spec_topics/functions.md), [Grammar Appendix — `///` placement](../spec_topics/grammar.md#-placement).
- **Adds.** `fn name(p: T, ...): R { body }`; nested `fn` is a parse error. `fn` accepts a leading `///` doc comment as a documented anchor; the description is preserved on the AST as human-facing documentation only and does not lower into JSON Schema (functions have no schema).
- **Tests.** Parse and call; nested `fn` rejected; closure / first-class function value rejected; `///` above a `fn` parses and the description is reachable on the resulting AST node; `///` inline with the `fn` declaration line is `loom/parse/doc-comment-misplaced`.
- **Deps.** V2, V1c.
- **Ships when.** Functions can be declared and called, with `///` documentation supported on the declaration.

## V9b — Hoisting and mutual recursion

- **Spec.** [Function Definitions](../spec_topics/functions.md) (placement).
- **Adds.** `fn` declarations hoisted within file; mutual recursion permitted.
- **Tests.** Forward call resolves; mutual `fn a(){b()}; fn b(){a()}` parses; recursion terminates via control flow.
- **Deps.** V9a.
- **Ships when.** Function order in file is irrelevant.

## V9c — Tail-expression return

- **Spec.** [Function Definitions](../spec_topics/functions.md).
- **Adds.** Function value is the value of its tail expression (no `return` needed).
- **Tests.** Tail-expression matches declared return type; mismatched tail-expression type is parse error.
- **Deps.** V9a.
- **Ships when.** Rust-style returns work.

## V9d — `?` requires `Result<_, QueryError>` return type

- **Spec.** [Function Definitions](../spec_topics/functions.md).
- **Adds.** Body containing `?` infers `Result<_, QueryError>` return type unless explicitly declared otherwise (and conflicting declaration is parse error).
- **Tests.** Inferred return type is `Result<T, QueryError>`; explicit non-Result return type with `?` in body is parse error with spec's hint.
- **Deps.** V9a, V6b.
- **Ships when.** `?` propagation through functions works.

## V9e — `void` return type

- **Spec.** [Function Definitions](../spec_topics/functions.md).
- **Adds.** `void` declared explicitly; tail-expression value discarded silently; bare `return` legal only here.
- **Tests.** `void` discards; bare `return` accepted; tail-expression evaluated for side effects but not returned.
- **Deps.** V9a, V8f.
- **Ships when.** Side-effect-only functions parse.

## V9f — Identifier resolution order

- **Spec.** [Expression Sublanguage](../spec_topics/expressions.md) (identifier resolution).
- **Adds.** Resolution order: (1) local binding/param, (2) top-level `fn` in same file, (3) imported symbol (V17), (4) `tools:` entry (V14). Collisions across (2)–(4) are load errors. Local shadows everything else.
- **Tests.** Each ordering rule; collision diagnostics name both sites; local shadowing works lexically.
- **Deps.** V9a.
- **Ships when.** Naming rules are uniform.
