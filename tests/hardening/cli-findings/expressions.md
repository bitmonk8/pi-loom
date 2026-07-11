# Real-CLI hardening findings — Language evaluation (expressions / interpolation / control flow / functions / match)

Lens: language evaluation through the actual `pi` CLI binary. Method: `mode: prompt`
looms that compute values into `let` bindings and interpolate them into a single
pinned-echo query template (`@`Repeat verbatim, output nothing else: ...${EXPR}...``),
`--model claude-haiku-4-5`, grep stdout for the expected string. One model turn per
loom. Invocation:

    MSYS_NO_PATHCONV=1 timeout 90 pi -ne -e ./extensions --loom <DIR> \
      --model claude-haiku-4-5 -p "/<stem>"

## Verified CORRECT via the real CLI (no findings)

Broad sweep passed, confirming the prior EXPR-1/6/7/8 render-path fixes hold end-to-end:

- **Number rendering (QRY-18 / BNDR-4/5), incl. edges not covered by EXPR-1:** max
  safe integer `9007199254740991`; unary `-0` → `0`; computed `-0` (`-4 % 2`, `0 * -1`)
  → `0`; `1.5e-3` → `0.0015`; **large magnitudes never scientific** — `1e21` →
  `1000000000000000000000`, `1e100` → full 100-zero decimal; `-0.5` → `-0.5`.
- **Arithmetic / precedence / modulo:** `6/3` → `2` (number-typed, no trailing `.0`),
  `2+3*4` → `14`, `(2+3)*4` → `20`, `7 % -3` → `1`, `-7 % 3` → `-1`,
  `9007199254740991 + 1` → `9007199254740992`.
- **Type rendering:** `string`, `boolean`, `null`, `array<number>` → `[1,2,3]`, nested
  arrays → `[[1,2],[3]]`, deep `[[[1]]]`, empty `array<integer>` → `[]`, enum-in-array
  → `["Red","Green"]`.
- **Enum wire value (QRY-2/3 regression check):** bare `Sev.Low` for `enum Sev { Low = "low" }`
  interpolates as `low` (explicit value honoured, unquoted).
- **Control flow producing computed text:** `for` accumulating a string (`abc`), `while`
  building `***`, empty-iterand `for` (body skipped, count `0`).
- **Functions:** recursion via tail expression `fn fact(n){ if n<=1 {return 1}\n n*fact(n-1) }`
  → `120` (EXPR-4/5 fix holds); mutual recursion `isEven(4)` → `true`; no-tail `fn`
  returns `null`.
- **`match` on values:** integer-literal arms + wildcard; array patterns `[]` / `[a]` /
  `[a,b]` (exact-length) select correctly; non-exhaustive `match` panics (see EXPR-CLI-3).
- **Indexing:** array OOB and negative index panic with `index out of bounds` (not a
  silent `null`).
- **String / array stdlib:** `toUpperCase`, `split(" ")`, `split(",")` incl. empty
  element `["a","b","","c"]`, `replace("aa","x")` → `xxa`, `replace("","X")` → `abc`,
  `includes`, `concat` → `[1,2,3,4]` (EXPR-2 fix holds), `join("-")` → `a-b`,
  `has`/`keys`/`values`, string ordering `"apple" < "banana"` → `true`.
- **Scoping/shadowing:** `fn`-local `let x` and a `for x in …` loop variable both shadow
  an outer `let x = 1` without leaking; outer value intact after the loop.

---

## FINDING EXPR-CLI-1: object/array interpolation renders loom-side field names, not wire names

- **repro** (`wire.loom`, drive `/wire`):
  ```
  ---
  description: wire
  mode: prompt
  ---
  schema Inner { streetName as "street_name": string }
  schema Outer { homeAddr as "home_addr": Inner, userId as "user_id": integer }
  let v = Outer { homeAddr: Inner { streetName: "Main" }, userId: 7 }
  let arr = [v]
  @`Repeat verbatim, output nothing else: R[v=${v}|arr=${arr}]E`
  ```
  Also seen with a single-level schema (`edges.loom`): `schema P { fullName as "full_name": string, age: integer }`, `P { fullName: "Bob", age: 3 }`.
- **expected:** the model sees **wire** names. QRY-18 stringification table: a
  "Schema-typed object" and an "`array<T>`" interpolation both render as compact
  `JSON.stringify` "**with wire-name translation applied recursively**"
  (`docs/spec_topics/query/query-escapes-stringification.md#qry-18`;
  `docs/reference/frontmatter.md` §Template-interpolation). Runtime value model: "Loom
  code never sees wire names; … external consumers never see loom-side names" and the
  *outbound* pass "produces wire-named JSON" (`docs/reference/type-system.md`
  §Wire-name-translation). Expected: `v={"home_addr":{"street_name":"Main"},"user_id":7}`,
  `arr=[{"home_addr":{"street_name":"Main"},"user_id":7}]`.
- **observed:** `R[v={"homeAddr":{"streetName":"Main"},"userId":7}|arr=[{"homeAddr":{"streetName":"Main"},"userId":7}]]E`
  (EXIT 0). Every field renders under its **loom-side** name; the `as "…"` wire renames
  are ignored, at every nesting level (top object, nested object, array element). The
  single-level `P` case likewise emitted `{"fullName":"Bob","age":3}` instead of
  `{"full_name":"Bob","age":3}`. (`obj.keys()` correctly returns loom-side names
  `["fullName","age"]` — that surface is right; only the QRY-18 interpolation path is
  wrong.)
- **verdict:** **bug** — QRY-18 explicitly mandates recursive wire-name translation for
  object and array interpolands, and the runtime-value-model guarantees the model only
  ever sees wire forms. The outbound translation is not applied on the interpolation
  render path, so any loom that renames a field with `as "…"` and interpolates the
  object/array silently ships the internal loom-side names into the model prompt — the
  exact `[object Object]`-class prompt-corruption QRY-18 exists to prevent, and a
  correctness break for any downstream consumer keyed on the wire contract.

## FINDING EXPR-CLI-2: `match` on enum-variant patterns fails to load (loom silently does not register)

- **repro** (`menum.loom`, drive `/menum`):
  ```
  ---
  description: menum
  mode: prompt
  ---
  enum Color { Red, Green, Blue }
  fn nm(c: Color): string {
    match c {
      Color.Red => "R",
      Color.Green => "G",
      _ => "other",
    }
  }
  let a = nm(Color.Green)
  let b = nm(Color.Blue)
  @`Repeat verbatim, output nothing else: R[a=${a}|b=${b}]E`
  ```
  Control: an identical `match` whose arms use integer/string **literal** patterns +
  `_` + trailing comma (`mval.loom`) registers and evaluates correctly, isolating the
  cause to the `Color.Red` / `Color.Green` variant patterns.
- **expected:** either the loom loads and matches the variant (the most natural use of
  `match` over an enum), or a surfaced load diagnostic tells the author enum-variant
  patterns are unsupported. The pattern grammar
  (`docs/reference/grammar.md` §"`match` arm body") lists Wildcard, Identifier, Literal,
  Constructor (`Ok`/`Err`), Object/schema, Array — enum-variant access is **not** a
  listed pattern form, so rejection is defensible; but there is then **no documented way
  to `match` on an enum**, and the failure mode is invisible in `-p`.
- **observed:** the loom does **not** register (parse-fails on the variant pattern) and
  emits no diagnostic on stdout in `-p` mode; the harness routes the literal text
  `/menum` to the model, which answers it as chat ("`/menum` … Please clarify…"). From a
  user's seat the slash command silently doesn't exist. The workaround is `if c == Color.Red`
  (enum `==` works), but nothing documents that `match` is off-limits for enums.
- **verdict:** **borderline** — parse-rejecting an out-of-grammar pattern is arguably
  correct, but (a) enum-variant patterns are a natural, expected `match` shape with no
  documented substitute, and (b) the load failure is entirely silent through the real
  CLI, so the author gets no signal that the whole loom failed to register — the same
  "load diagnostics don't surface in `-p`" gap noted in the campaign registry, here on
  the enum-`match` surface.

## FINDING EXPR-CLI-3: runtime panics abort with exit code 0 (no failure signal for a driving script)

- **repro:** `idxoob.loom` (`let v = [10,20,30][5]`), `idxneg.loom`
  (`[10,20,30][-1]`), `exhaust.loom` (non-exhaustive `match n { 0 => …, 1 => … }`,
  `cls(5)`), each with a pinned-echo tail. Driven individually with
  `pi … -p "/<stem>"; echo "PI_EXIT: $?"`.
- **expected:** a loom that hits a closed-list runtime panic
  (`loom/runtime/index-out-of-bounds`, `loom/runtime/match-error` —
  `docs/spec_topics/expressions.md` §Indexed-access;
  `docs/reference/grammar.md` §"`match` arm body") aborts before issuing the turn (that
  part is correct), and a non-interactive `-p` caller can distinguish that abort from a
  clean run — conventionally via a non-zero exit code.
- **observed:** each run prints `Extension error (command:<stem>): index out of bounds: 5 not in 0..3`
  / `… -1 not in 0..3` / `MatchError: no arm matched 5` and **`pi` exits 0** (verified
  un-piped: `PI_EXIT: 0`). The panic is only observable on the text channel; the process
  exit is indistinguishable from a successful loom run (which also exits 0 with the echoed
  turn on stdout).
- **verdict:** **borderline** — the panics themselves are spec-conformant (correct
  message, correct abort, no silent wrong value). The concern is the CLI contract: a
  batch/automation caller driving looms through `pi -p` cannot detect a runtime panic
  from the exit code, and the panic surfaces as a generic "Extension error" rather than
  the named `loom/runtime/*` code. Reasonable users scripting looms would expect a
  non-zero exit on abort. (Leans toward a Pi extension-harness contract issue rather than
  a language-evaluation defect, hence borderline.)
