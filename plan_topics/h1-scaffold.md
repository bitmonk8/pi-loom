# H1 — Repository scaffold and test framework

**Adds.** TypeScript project (strict mode, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`); Vitest + coverage; ESLint with `@typescript-eslint`, no-floating-promises, no-globals, no-broad-catch; Prettier; npm scripts (`build`, `test`, `test:watch`, `typecheck`, `lint`, `format`); GitHub Actions workflow file.

**Source layout:**
```
src/{parser, ast, lowering, runtime, extension, diagnostics, util}/
test/{unit (mirrors src/), integration, fixtures/{loom, warp, schemas}, fakes/}
```

**Tests.**
- Sentinel test (`1 + 1 === 2`) proving toolchain runs.
- Per-directory presence test (`__present` re-exported by every `src/*/index.ts`).
- `no-static-state.test.ts` greps `src/` for `^let `, `^var `, `^const ` at module top-level (allow only `const` of literals/frozen objects); fails on violation.

**Deps.** None.

**Ships when.** `npm run typecheck && npm run lint && npm test` green; `depcheck` clean.
