# Runtime Value Model

Loom values are represented in the interpreter as native JavaScript values, tagged where needed for type recovery:

| Loom type | JS representation |
|---|---|
| `string` | JS `string` |
| `number`, `integer` | JS `number` (the static type system enforces the distinction; at runtime they are the same value). Division produces IEEE-754 `Infinity` / `NaN` per JS semantics |
| `boolean` | JS `boolean` |
| `null` | JS `null` |
| `array<T>` | JS `Array`, elements following these rules recursively |
| Object schema (named or anonymous) | JS plain object keyed by **loom-side identifiers**, regardless of any wire-name renames declared on the schema. Wire-name translation happens only at the validation boundary |
| Enum variant | An enum value carries the variant's wire string plus an interpreter-private tag identifying the declaring enum. Cross-enum equality compares both: `Severity.High == OtherEnum.High` is `false` even when wire values match. The tag MUST NOT appear in JSON output (`JSON.stringify` of an enum value yields the bare wire string) |
| `Result<T, E>` | Internally tagged with a discriminator distinguishing `Ok` from `Err` and carrying the payload. Loom code observes `Result` only through `Ok` / `Err` constructors, `match` patterns, and `?`; the in-memory shape is not part of the language surface. `Result` values are not directly serialised to provider JSON — they cross the wire only via schema-driven encodings defined by the relevant call site |

**Reference encoding (non-normative).** The reference interpreter implements the enum tag as a non-enumerable `__loomEnum` string property on the JS string wrapper, and represents `Result<T, E>` as `{ ok: true, value: T }` for `Ok(v)` and `{ ok: false, error: E }` for `Err(e)`. These shapes are implementation details — neither is reachable from loom code, neither appears in any wire schema, and either may change without a spec revision. If a future host-interop surface ever exposes a live `Result` or enum value to JS (rather than a JSON-serialised projection), this section MUST be revisited before that surface ships.

**Equality (`==`).** Structural deep equality:

- Primitives compare via `Object.is` semantics (so `NaN == NaN` is `true` and `+0 != -0` is `false`).
- Arrays compare element-wise at the same indices; same length required.
- Objects compare key set (loom-side identifiers) and per-key value equality; key declaration order is irrelevant.
- Enum variants compare the declaring-enum tag and the wire value: `Severity.High == OtherEnum.High` is `false` even when wire values match.
- `Result` compares the `Ok`/`Err` discriminator and recurses on the payload.

**Wire-name translation** happens in exactly two places:

- *Inbound* (model output → loom value): after AJV validation against the lowered schema, the runtime walks the validated JSON and rebuilds the value with loom-side identifiers using each schema's translation map.
- *Outbound* (loom value → JSON): when constructing tool input, query response payloads, or `invoke` arguments, the runtime walks the loom-side value and produces wire-named JSON before AJV validation.

Loom code never sees wire names; tools, the model, and external JSON Schema consumers never see loom-side names.
