import { describe, expect, it } from "vitest";
import {
  isWireLowerable,
  makeEnumValue,
  makeErr,
  makeOk,
  valuesEqual,
} from "../src/runtime/value";

// V2c-T — failing tests for the paired `V2c` "runtime value model and equality"
// implementation.
//
// Spec: runtime-value-model.md (the RVM code-keyed obligation area — no
// numbered REQ-IDs). Two areas:
//
//   - Value representation (value-representation table): `JSON.stringify` of an
//     enum value yields the bare wire string (the declaring-enum tag never
//     appears in JSON output); a `Result` value is never lowered to wire (it
//     has no lowered-schema form, so a `Result` value never crosses the wire).
//   - Equality (runtime-value-model.md §Equality, anchor #equality): structural
//     deep equality — a cross-type pair compares `false` (no parse diagnostic,
//     no panic); `NaN == NaN` is `true`; `+0 == -0` is `true`; enum equality
//     compares the declaring-enum tag (`Severity.High == OtherEnum.High` is
//     `false` even when wire values match); the subtype case `42 == 42.0` is
//     `true` (`integer ⊑ number` routes the pair to per-shape value comparison).
//
// These tests red because the V2c declaring-enum-tagged representation, the
// structural-equality relation, and the `Result`-not-lowerable recognition are
// absent: `makeEnumValue` returns a plain tagged object (so `JSON.stringify`
// yields the object form, not the bare wire string), `valuesEqual` reports every
// pair unequal, and `isWireLowerable` reports every value lowerable. Each test
// reds on its own primary assertion, not on a compile error, missing fixture, or
// harness throw.

// --- runtime-value-model.md — value representation ------------------------

describe("V2c-T — value representation (runtime-value-model.md, value-representation table)", () => {
  it("JSON.stringify of an enum value yields the bare wire string (the tag never appears in JSON output)", () => {
    const high = makeEnumValue("Severity", "high");
    // The enum row of the representation table: `JSON.stringify` of an enum
    // value yields the bare wire string. The interpreter-private declaring-enum
    // tag MUST NOT appear in JSON output.
    expect(JSON.stringify(high)).toBe('"high"');
    expect(JSON.stringify(high)).not.toContain("Severity");
  });

  it("Result is never lowered to wire (it has no lowered-schema form)", () => {
    // The `Result` row of the representation table: `Result` is not a lowerable
    // type form and a `Result` value never crosses the wire. Both `Ok` and
    // `Err` values are non-lowerable.
    expect(isWireLowerable(makeOk(1))).toBe(false);
    expect(isWireLowerable(makeErr("boom"))).toBe(false);
    // A plain primitive value IS lowerable — the contrast that pins the rule to
    // `Result` specifically rather than rejecting everything.
    expect(isWireLowerable(42)).toBe(true);
  });
});

// --- runtime-value-model.md §Equality — structural deep equality ----------

describe("V2c-T — structural equality (runtime-value-model.md #equality)", () => {
  it("structural deep equality: equal arrays / objects / nested values compare true", () => {
    // Arrays compare element-wise at equal length; objects compare theta-side
    // key set and per-key value (declaration order irrelevant).
    expect(valuesEqual([1, 2, 3], [1, 2, 3])).toBe(true);
    expect(valuesEqual({ a: 1, b: 2 }, { b: 2, a: 1 })).toBe(true);
    expect(valuesEqual([{ a: [1] }], [{ a: [1] }])).toBe(true);
    // A differing element / key makes them unequal.
    expect(valuesEqual([1, 2, 3], [1, 2, 4])).toBe(false);
  });

  it("cross-type compares to false (no parse diagnostic, no panic)", () => {
    // A structurally-equal same-type pair is the baseline against which the
    // cross-type rule is the contrast: the comparison loads and runs, neither
    // failing to parse nor panicking — it simply evaluates to a boolean.
    expect(valuesEqual([1], [1])).toBe(true);
    // Cross-type pairs (neither static type ⊑ the other) evaluate to `false`.
    expect(valuesEqual(42, true)).toBe(false);
    expect(valuesEqual(null, "x")).toBe(false);
    expect(valuesEqual([1], 1)).toBe(false);
    expect(valuesEqual(makeEnumValue("Severity", "low"), "low")).toBe(false);
  });

  it("NaN == NaN is true (the deliberate equality/ordering asymmetry)", () => {
    expect(valuesEqual(NaN, NaN)).toBe(true);
  });

  it("+0 == -0 is true (consistent with the -0 -> 0 rendering normalisation)", () => {
    expect(valuesEqual(+0, -0)).toBe(true);
    expect(valuesEqual(-0, +0)).toBe(true);
  });

  it("42 == 42.0 is true (integer <= number routes to per-shape value comparison)", () => {
    expect(valuesEqual(42, 42.0)).toBe(true);
  });

  it("enum equality compares the declaring-enum tag and the wire value", () => {
    // Same declaring enum + same wire value: equal.
    expect(
      valuesEqual(makeEnumValue("Severity", "high"), makeEnumValue("Severity", "high")),
    ).toBe(true);
    // Cross-enum, matching wire value: `Severity.High == OtherEnum.High` is
    // `false` even when wire values match (different declaring-enum tag).
    expect(
      valuesEqual(makeEnumValue("Severity", "high"), makeEnumValue("OtherEnum", "high")),
    ).toBe(false);
    // Same declaring enum, differing wire value: unequal.
    expect(
      valuesEqual(makeEnumValue("Severity", "high"), makeEnumValue("Severity", "low")),
    ).toBe(false);
  });

  it("Result equality compares the Ok/Err discriminator and recurses on the payload", () => {
    // Same discriminator + structurally-equal payload: equal.
    expect(valuesEqual(makeOk([1, 2]), makeOk([1, 2]))).toBe(true);
    expect(valuesEqual(makeErr("e"), makeErr("e"))).toBe(true);
    // Differing discriminator: unequal even with matching inner value.
    expect(valuesEqual(makeOk("x"), makeErr("x"))).toBe(false);
    // Same discriminator, differing payload: unequal.
    expect(valuesEqual(makeOk(1), makeOk(2))).toBe(false);
  });
});
