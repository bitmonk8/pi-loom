# FIX-4 results — extension wiring: `description:` dropped at registration (C1 / FIND-S6-1)

Requirement: REQ-PIC-31 (`pi.registerCommand(name,{description,handler})`). Defect: a
loom's top-level `description:` (and its `///` doc-comment lowering) was dropped before
`pi.registerCommand`, so Pi autocomplete showed no description.

## Root cause

`runComposePass` reconstructed each runnable loom as `{ ...composedInput, run: fixture.run }`,
picking only `fixture.run` and discarding the top-level `description` that `composeLoomFixture`
computed (`src/extension/loom-composition-producer.ts:300-303`). The factory then read
`fixture.description` (`src/extension/factory.ts:370`) = `undefined`, so the `description`
key was omitted. Both production paths (`composeExtensionInstance`,
`discoverAndComposeFixtures`) flow through this single push site.

## Changes (file:line)

- `src/extension/production-composition.ts:533-546` — thread the composed `description`
  onto the pushed loom object:
  ```ts
  looms.push({
    ...composedInput,
    ...(fixture.description !== undefined ? { description: fixture.description } : {}),
    run: fixture.run,
  });
  ```
  (`...(fixture.description !== undefined` at :540). Comment updated to note the
  registration path reads `slashName` + `description` + `run`, and that this covers BOTH
  production paths. Single push site — no parallel omission exists.

- `tests/e2e-s6-description-registration.test.ts` — campaign witness inverted from
  characterizing the dropped-description behaviour to asserting the correct behaviour:
  - :86 `expect(loom.description).toBe("HELLO-DESC")` (was `.toBeUndefined()`) —
    `discoverAndComposeFixtures` path.
  - :153 `expect(commands.get("hi")).toHaveProperty("description", "HELLO-DESC")` (was
    `.not.toHaveProperty("description")`) — `composeExtensionInstance` → `pi.registerCommand`
    path.
  - Header block + both `it` titles updated to describe the fixed (conforming) behaviour.

No globals/statics/singletons introduced — the change is a pure inline object spread.

## Gate results

- `npm run typecheck` — clean.
- `npm run test:conformance` — green (26 passed).
- `tests/e2e-s6-description-registration.test.ts` — green (2 passed) with the fix.
- Full `npm test` — 1848 passed, 8 failed. All 8 failures are in the FIX-1-owned
  parser-diagnostic witnesses (`tests/e2e-s1-expr-diagnostics.test.ts`,
  `tests/e2e-s1-grammar-literal-sublang.test.ts`, `tests/e2e-s1-lexer-intake.test.ts`) —
  they await the FIX-1 parser structural fixes and are unrelated to FIX-4. Verified
  pre-existing: with the FIX-4 src change stashed out, the same 8 fail identically, so
  FIX-4 flipped no witness. FIX-4 adds no diagnostics.

## Notes

- FIX-4 owns only the `tests/e2e-s6-description-registration.test.ts` witness; no other
  `tests/e2e-s*` file was touched.
- The 8 remaining full-suite reds are the expected FIX-1 pre-fix state; they go green when
  FIX-1 lands.
