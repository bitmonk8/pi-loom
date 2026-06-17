# `V2d` — Canonical integer/number renderer

**Spec.** [`../spec_topics/binder/defaulting-system-note-echo.md`](../spec_topics/binder/defaulting-system-note-echo.md).

**Adds.** The canonical number-rendering pure function shared by the schema canonical-hash recipe (`V5f`) and the binder argument echo (`V11h`). The function receives the numeric value together with an explicit `integer`-vs-`number` kind discriminator supplied by the caller, and selects BNDR-4 versus BNDR-5 from that discriminator — never from the value's runtime integrality: it renders an `integer`-kind value as canonical base-10 (BNDR-4) and a `number`-kind value as shortest round-tripping fixed-point (BNDR-5). The renderer itself has no dependency on the runtime value model or schema declarations; deriving the kind discriminator is each caller's obligation — `V5f` from the JSON-Schema `type` of the enclosing `const`/`enum` position, `V11h` from the bound value's static type via the value model (`V2c`).

**Tests.**
- `BNDR-4`: integer echo is canonical base-10 — no leading zeros/separators/exponent; `-0` renders `0`.
- `BNDR-5`: number echo is shortest round-trip fixed-point — no scientific notation: both forbidden `String(n)` switches are expanded to full fixed-point, the large-magnitude `±1e21` switch and the small-magnitude `|value| < 1e-7` switch (illustrative vectors `1e21` → `1000000000000000000000` and `1e-8` → `0.00000001` reproduce exactly, and an in-range value such as `5e-8` is likewise expanded — not only the named magnitudes); a non-integral value carries at least one fractional digit; an integral value carries no `.0`; `-0` renders `0`.

**Deps.** `V2d-T`, `V2a`

**Ships when.** `npm test` asserts the BNDR-4 integer renderings and the BNDR-5 shortest-fixed-point renderings across both forbidden-switch ranges — the `±1e21` large-magnitude switch and the `|value| < 1e-7` small-magnitude switch (including an in-range value such as `5e-8`, not only the `1e21` / `1e-8` named magnitudes) — and the `-0 → 0` pin.
