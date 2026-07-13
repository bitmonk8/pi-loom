# FIX-3 — frontmatter advisory diagnostics — results

Scope: implement the four missing advisory (W-severity) frontmatter diagnostics
A7–A10 in `src/parser/frontmatter.ts`. Findings closed: FIND-S4-7/-8/-9/-10,
FIND-S2-1/-2/-3. No registry codes added; all four codes already exist in the
closed registry and were previously never emitted.

## Per-item status

| ID | Code | Sev/Phase | Status | Trigger implemented |
|---|---|---|---|---|
| A7 | `loom/parse/bind-echo-on-bypass` | W/parse | done | explicit `bind_echo: true` AND `classifyBinderBypass(params.fields) == single-string-bypass` |
| A8 | `loom/load/bind-echo-without-params` | W/load | done | explicit `bind_echo: true` AND `classifyBinderBypass == no-params-bypass` (`params:` absent or `{}`) |
| A9 | `loom/load/argument-hint-not-displayed` | W/load | done | `argument-hint:` present AND `description:` absent-or-empty |
| A10 | `loom/load/deferred-frontmatter-field` | W/load | done | key in `DEFERRED_FRONTMATTER_FIELDS` → deferred code (NOT generic unknown) |

Messages are verbatim from `docs/reference/diagnostics.md` /
`code-registry-parse.md` / `code-registry-load.md` (DIAG-4 normative):

- A7: `'bind_echo: true' has no effect on a single-string-bypass loom`
- A8: `'bind_echo: true' has no effect on a no-params loom`
- A9: `'argument-hint:' declared without 'description:'; Pi's autocomplete entry will be empty`
- A10: `frontmatter field '<field>' is reserved for a deferred loom 1.0 feature`

## Design notes

- A7/A8 boundary reuses the existing `classifyBinderBypass`
  (`src/binder/binder-envelope.ts:176`) rather than duplicating the bypass-shape
  logic. `single-string-bypass` → A7 (parse namespace); `no-params-bypass` → A8
  (load namespace). This matches the registry provenance: the parse row owns the
  single-string bypass and the load row owns the no-params bypass.
- Only an *explicit* `bind_echo: true` fires (a defaulted/absent `bind_echo`
  never does): `bindEchoValue === true` is set only when the key is present and
  its scalar is boolean.
- A10 introduces a new `DEFERRED_FRONTMATTER_FIELDS` set, disjoint from
  `LOOM_1_0_FIELDS`. The unknown-key branch now checks the deferred set first.
  Reserved names recognised: `binder_temperature` (authoritative
  `frontmatter-fields-a.md:32` spelling; matches FIND-S4-10/FIND-S2-1 and the
  witnesses) and `bind_temperature` (the `future-considerations/surface-extensions.md:54`
  spelling of the same deferred binder-temperature knob). "User-overridable
  binder system prompt" is deferred but the spec names no concrete key for it, so
  no key was invented.
- A9 treats an empty `description: ""` the same as absent (matches the final
  frontmatter's own "retain description only when non-empty" rule and the empty
  autocomplete-entry rationale).

## Changes (file:line)

`src/parser/frontmatter.ts`:
- `:38` — import `classifyBinderBypass` (alongside the existing `BypassParamsField` type import).
- `:277` — new `DEFERRED_FRONTMATTER_FIELDS` set (`binder_temperature`, `bind_temperature`).
- `:~758` — new state vars: `bindEchoRange`, `argumentHintPresent`, `argumentHintRange`.
- `:781` — new `argument-hint` key branch (captures presence + range).
- `:791` — `bind_echo` branch now records `bindEchoRange`.
- `:847` — unknown-key handler discriminates: deferred set → `deferred-frontmatter-field` (A10); else non-vocabulary → `unknown-frontmatter-field` (unchanged).
- `:894` — A9 emission after the `bind_context` advisory (argument-hint without description).
- `:1053` — A7/A8 emission after `params:` extraction, gated on explicit `bind_echo: true` + `classifyBinderBypass`.

No other files changed. No globals/statics introduced (the two sets are
module-level `const` readonly `Set`s, matching the existing `LOOM_1_0_FIELDS`).
No witness (`tests/e2e-s*`) files edited.

## Behaviour probe (production `parseFrontmatter` entry)

```
A7 single-string bypass:       [ 'loom/parse/bind-echo-on-bypass' ]
A8 no-params:                  [ 'loom/load/bind-echo-without-params' ]
A8 params {}:                  [ 'loom/load/bind-echo-without-params' ]
A9 arg-hint no desc:           [ 'loom/load/argument-hint-not-displayed' ]
A9 arg-hint WITH desc:         []                      (suppressed — control)
A10 binder_temperature:        [ 'loom/load/deferred-frontmatter-field' ]
A10 bind_temperature:          [ 'loom/load/deferred-frontmatter-field' ]
noFire bind_echo:false noparam:[]
noFire bind_echo:true 2 params:[]                      (binder shape — no fire)
noFire unknown key:            [ 'loom/load/unknown-frontmatter-field' ]  (unchanged)
```

No over-firing: the binder (non-bypass) shape and `bind_echo: false` produce no
advisory; a genuinely-unknown key still routes to `unknown-frontmatter-field`.

## Gate results

- `npm run typecheck` — clean.
- Established suite minus S1–S6 campaign witnesses
  (`npx vitest run --exclude 'tests/e2e-s{1..6}-*.test.ts'`) — **148 files,
  1745 tests passed**. No regressions; `committed-fixture-parse-gate` green
  (no new diagnostics on valid committed fixtures).
- `npm run test:conformance` — **26 tests passed**.

The S2/S4 witness repros (`it.fails` in `tests/e2e-s2-advisory-diagnostics.test.ts`
and `tests/e2e-s4-never-emitted-diagnostics.test.ts`) now observe the emitted
codes; converting `it.fails`→`it` / un-skipping is FIX-5's reconciliation
(D7) and was not done here per scope.
