// Canonical integer/number renderer (BNDR-4 / BNDR-5).
//
// A pure function shared by the schema canonical-hash recipe (`V5f`) and the
// binder argument echo (`V11h`). It receives the numeric value together with an
// explicit `integer`-vs-`number` kind discriminator supplied by the caller and
// selects BNDR-4 versus BNDR-5 from that discriminator — never from the value's
// runtime integrality. The renderer has no dependency on the runtime value
// model or schema declarations; deriving the kind discriminator is each
// caller's obligation.
//
// Spec: binder/defaulting-system-note-echo.md §"Echo policy" (BNDR-4, BNDR-5).

/** Caller-supplied discriminator selecting the BNDR-4 vs BNDR-5 rendering. */
export type NumberKind = "integer" | "number";

/**
 * Render `value` as its canonical decimal string for the given `kind`.
 *
 * V2d-T stub: returns a deliberately-wrong constant so the paired `V2d` tests
 * red on their own primary assertion (the implementation under test is absent).
 * `V2d` replaces this body with the BNDR-4 / BNDR-5 logic.
 */
export function renderCanonicalNumber(value: number, kind: NumberKind): string {
  void value;
  void kind;
  return "";
}
