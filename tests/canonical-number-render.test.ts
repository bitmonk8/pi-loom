import { describe, expect, it } from "vitest";
import { renderCanonicalNumber } from "../src/render/canonical-number";

// V2d-T — failing tests for the paired `V2d` "canonical integer/number
// renderer" implementation.
//
// Spec: binder/defaulting-system-note-echo.md §"Echo policy" (BNDR-4 integer
// rendering, BNDR-5 number rendering) and the BNDR-6 reference-rendering table.
//
// The renderer is a pure function selecting BNDR-4 vs BNDR-5 from a caller-
// supplied `integer`-vs-`number` kind discriminator — never from the value's
// runtime integrality. These tests red because the `V2d` body is absent: the
// stub returns `""`, so each `toBe(...)` reds on its own primary assertion, not
// on a compile error, missing fixture, or harness throw. The expected strings
// are the exact observable byte output the spec pins as the contract.

// --- BNDR-4 — canonical base-10 integer rendering -------------------------

describe("V2d-T — BNDR-4 canonical integer rendering (defaulting-system-note-echo.md, anchor #bndr-4)", () => {
  it("BNDR-4: a positive integer renders as base-10 digits with no separators/exponent (bndr-6o)", () => {
    // BNDR-6o: `42` (integer) renders as `42`.
    expect(renderCanonicalNumber(42, "integer")).toBe("42");
  });

  it("BNDR-4: zero renders as the single digit `0`", () => {
    // BNDR-4: no leading zeros other than the single `0` for zero itself.
    expect(renderCanonicalNumber(0, "integer")).toBe("0");
  });

  it("BNDR-4: a negative integer renders with a single leading `-`", () => {
    // BNDR-4: a leading `-` for negative values, then the magnitude as base-10.
    expect(renderCanonicalNumber(-7, "integer")).toBe("-7");
  });

  it("BNDR-4: a large integer renders in full base-10 with no exponent (no separators)", () => {
    // BNDR-4: no exponent, no thousands separators — even at a magnitude where
    // `String(n)` would switch to exponential form.
    expect(renderCanonicalNumber(1e21, "integer")).toBe(
      "1000000000000000000000",
    );
  });

  it("BNDR-4: `-0` renders as `0` (bndr-6p)", () => {
    // BNDR-6p: `-0` (integer or number) renders as `0`.
    expect(renderCanonicalNumber(-0, "integer")).toBe("0");
  });
});

// --- BNDR-5 — shortest round-tripping fixed-point number rendering --------

describe("V2d-T — BNDR-5 shortest fixed-point number rendering (defaulting-system-note-echo.md, anchor #bndr-5)", () => {
  it("BNDR-5: a non-integral value renders shortest fixed-point with fractional digits (bndr-6q)", () => {
    // BNDR-6q: `3.14` (number) renders as `3.14`. A non-integral value MUST
    // include at least one fractional digit.
    expect(renderCanonicalNumber(3.14, "number")).toBe("3.14");
  });

  it("BNDR-5: an integral `number` carries no trailing `.0`", () => {
    // BNDR-5: an integral value MUST NOT carry a trailing `.0` — `42`, not
    // `42.0`.
    expect(renderCanonicalNumber(42, "number")).toBe("42");
  });

  it("BNDR-5: the large-magnitude `±1e21` switch is expanded to full fixed-point (bndr-6r)", () => {
    // BNDR-6r: `1e21` (number) renders as `1000000000000000000000` — the
    // forbidden large-magnitude `String(n)` exponential switch expanded.
    expect(renderCanonicalNumber(1e21, "number")).toBe(
      "1000000000000000000000",
    );
  });

  it("BNDR-5: the named small-magnitude `1e-8` switch is expanded to full fixed-point (bndr-6s)", () => {
    // BNDR-6s: `1e-8` (number) renders as `0.00000001` — the forbidden
    // small-magnitude (`|value| < 1e-7`) exponential switch expanded.
    expect(renderCanonicalNumber(1e-8, "number")).toBe("0.00000001");
  });

  it("BNDR-5: an interior small-magnitude vector `5e-8` is likewise expanded to full fixed-point", () => {
    // BNDR-5: a value strictly inside the small-magnitude switch
    // (`1e-8 < |5e-8| < 1e-7`) is expanded too — not only the named magnitudes.
    expect(renderCanonicalNumber(5e-8, "number")).toBe("0.00000005");
  });

  it("BNDR-5: `-0` renders as `0` (bndr-6p)", () => {
    // BNDR-6p: `-0` (integer or number) renders as `0`.
    expect(renderCanonicalNumber(-0, "number")).toBe("0");
  });
});
