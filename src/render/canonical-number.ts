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
 * Re-expand a non-negative finite magnitude to pure fixed-point decimal,
 * eliminating the exponential form `String(n)` produces at the two magnitudes
 * BNDR-5 forbids (the large-magnitude `±1e21` switch and the small-magnitude
 * `|value| < 1e-7` switch). `String(n)` already yields the shortest
 * round-tripping digit string; this only shifts the decimal point so the same
 * digits are written without an exponent.
 */
function expandToFixedPoint(magnitude: number): string {
  const digits = String(magnitude);
  const exponential = /^(\d+)(?:\.(\d+))?[eE]([+-]?\d+)$/.exec(digits);
  if (exponential === null) {
    // Already fixed-point (e.g. `3.14`, `42`); the shortest digits stand.
    return digits;
  }
  const [, intDigits = "", fracDigits = "", expDigits = "0"] = exponential;
  const exponent = Number.parseInt(expDigits, 10);
  const significand = intDigits + fracDigits;
  // Decimal point currently sits after `intDigits.length` significand digits;
  // the exponent shifts it `exponent` places (right for +, left for -).
  const pointPosition = intDigits.length + exponent;
  if (pointPosition <= 0) {
    return `0.${"0".repeat(-pointPosition)}${significand}`;
  }
  if (pointPosition >= significand.length) {
    return significand + "0".repeat(pointPosition - significand.length);
  }
  return `${significand.slice(0, pointPosition)}.${significand.slice(pointPosition)}`;
}

/**
 * Canonical decimal form shared by BNDR-4 and BNDR-5: sign handling, the
 * `-0 → 0` pin, and the exponent-free fixed-point body. For every conforming
 * input both rules reduce to this one computation — BNDR-4 integers are
 * integral (the body carries no fractional digits), and BNDR-5 numbers are the
 * shortest round-tripping fixed-point with no exponent and no trailing `.0`.
 */
function canonicalDecimal(value: number): string {
  // Covers both `+0` and `-0` (bndr-6p): `Object.is`-distinct, `===`-equal.
  if (value === 0) {
    return "0";
  }
  const negative = value < 0;
  const body = expandToFixedPoint(negative ? -value : value);
  return negative ? `-${body}` : body;
}

/**
 * Render `value` as its canonical decimal string for the given `kind`.
 *
 * The caller-supplied `kind` discriminator selects BNDR-4 (`integer`) versus
 * BNDR-5 (`number`) — never the value's runtime integrality. The renderer
 * inspects only the discriminator and the value's IEEE-754 digits; it derives
 * nothing from a value model or schema. For conforming inputs both rules emit
 * the same exponent-free fixed-point canonical decimal, so each arm delegates
 * to {@link canonicalDecimal}; the explicit branch keeps the discriminator the
 * sole selector of the rendering rule.
 */
export function renderCanonicalNumber(value: number, kind: NumberKind): string {
  switch (kind) {
    case "integer": // BNDR-4 — canonical base-10 integer.
      return canonicalDecimal(value);
    case "number": // BNDR-5 — shortest round-tripping fixed-point.
      return canonicalDecimal(value);
  }
}
