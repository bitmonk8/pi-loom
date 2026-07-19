import { describe, expect, it } from "vitest";
import {
  checkAssignmentTarget,
  checkIncrementDecrement,
  checkLetBinding,
  checkMutModifier,
  checkReassignment,
} from "../src/parser/bindings";
import type { SourceRange } from "../src/diagnostics/diagnostic";

// V3b-T — failing tests for the paired `V3b` "bindings and mutability"
// implementation.
//
// Spec: bindings.md
//   - §`let` requires an initialiser           → theta/parse/let-without-initialiser
//   - §`let` vs `let mut`                       → theta/parse/immutable-rebinding
//   - §Mutability is binding-level only         → theta/parse/assignment-to-member-or-index
//   - §Immutable contexts                       → theta/parse/mut-on-immutable-context
//   - §Increment / decrement                    → theta/parse/increment-decrement
//
// The binding/mutability checks need the resolved binding model (the target
// binding's `mut`-ness, the assignment target's shape, the binding position a
// `mut` modifier sits on, whether a `let` carries an initialiser) the tokeniser
// does not carry, so they are asserted against the standalone
// `checkLetBinding` / `checkReassignment` / `checkAssignmentTarget` /
// `checkMutModifier` / `checkIncrementDecrement` seams
// (src/parser/bindings.ts).
//
// Diagnostic *Message* strings are sourced from the diagnostics registry
// (diagnostics/code-registry-parse.md) per the *Diagnostic message anchors*
// rule.
//
// These tests red because the V3b binding checker is absent: every seam is an
// inert stub returning `undefined`. Each obligation test reds on its own
// primary assertion (an absent expected diagnostic), not on a compile error,
// missing fixture, or harness throw.

/** A throwaway 1:1–1:2 span for the seam calls. */
function span(): SourceRange {
  return { start: { line: 1, column: 1 }, end: { line: 1, column: 2 } };
}

/** A located site at the throwaway span. */
function site(): { file: string; range: SourceRange } {
  return { file: "test.theta", range: span() };
}

// --- bindings.md §`let` vs `let mut` --------------------------------------

describe("V3b-T — immutable rebinding (theta/parse/immutable-rebinding)", () => {
  it("theta/parse/immutable-rebinding: reassigning a `let` (non-`mut`) binding fires", () => {
    // `let x = 0; x = 1` — `x` is immutable.
    const d = checkReassignment({ name: "x", mutable: false }, site());
    expect(
      d,
      "theta/parse/immutable-rebinding for reassignment of an immutable binding",
    ).toBeDefined();
    expect(d?.code).toBe("theta/parse/immutable-rebinding");
    // Message from code-registry-parse.md (`cannot reassign immutable binding '<name>'`).
    expect(d?.message).toBe("cannot reassign immutable binding 'x'");
  });

  it("a `let mut` reassignment (incl. `+=`) raises no immutable-rebinding diagnostic", () => {
    // `let mut count = 0; count = count + 1` — `count` is mutable; this is the
    // valid-reassignment acceptance case of the V3b `Ships when` gate.
    const d = checkReassignment({ name: "count", mutable: true }, site());
    expect(
      d,
      "a `let mut` binding accepts reassignment",
    ).toBeUndefined();
  });
});

// --- bindings.md §Mutability is binding-level only -------------------------

describe("V3b-T — member/index assignment (theta/parse/assignment-to-member-or-index)", () => {
  it("theta/parse/assignment-to-member-or-index: `obj.field = …` fires", () => {
    const d = checkAssignmentTarget({ kind: "member" }, site());
    expect(
      d,
      "theta/parse/assignment-to-member-or-index for a member assignment target",
    ).toBeDefined();
    expect(d?.code).toBe("theta/parse/assignment-to-member-or-index");
    // Message from code-registry-parse.md.
    expect(d?.message).toBe(
      "cannot assign to member or index; mutability is binding-level only",
    );
  });

  it("theta/parse/assignment-to-member-or-index: `arr[i] = …` fires", () => {
    const d = checkAssignmentTarget({ kind: "index" }, site());
    expect(
      d,
      "theta/parse/assignment-to-member-or-index for an index assignment target",
    ).toBeDefined();
    expect(d?.code).toBe("theta/parse/assignment-to-member-or-index");
  });

  it("a plain identifier assignment target raises no member/index diagnostic", () => {
    const d = checkAssignmentTarget({ kind: "identifier" }, site());
    expect(
      d,
      "a plain identifier target is not a member/index assignment",
    ).toBeUndefined();
  });
});

// --- bindings.md §Immutable contexts --------------------------------------

describe("V3b-T — `mut` on an immutable context (theta/parse/mut-on-immutable-context)", () => {
  it("theta/parse/mut-on-immutable-context: `mut` on a function parameter fires", () => {
    const d = checkMutModifier({ position: "fn-param" }, site());
    expect(
      d,
      "theta/parse/mut-on-immutable-context for `mut` on a function parameter",
    ).toBeDefined();
    expect(d?.code).toBe("theta/parse/mut-on-immutable-context");
    // Message from code-registry-parse.md.
    expect(d?.message).toBe("'mut' is not permitted in this binding position");
  });

  it("theta/parse/mut-on-immutable-context: `mut` on a `for` iteration variable fires", () => {
    const d = checkMutModifier({ position: "for-var" }, site());
    expect(
      d,
      "theta/parse/mut-on-immutable-context for `mut` on a `for` iteration variable",
    ).toBeDefined();
    expect(d?.code).toBe("theta/parse/mut-on-immutable-context");
  });

  it("theta/parse/mut-on-immutable-context: `mut` on a `match` pattern binding fires", () => {
    const d = checkMutModifier({ position: "match-bind" }, site());
    expect(
      d,
      "theta/parse/mut-on-immutable-context for `mut` on a `match` pattern binding",
    ).toBeDefined();
    expect(d?.code).toBe("theta/parse/mut-on-immutable-context");
  });

  it("`mut` on a `let` binding raises no immutable-context diagnostic", () => {
    const d = checkMutModifier({ position: "let" }, site());
    expect(
      d,
      "`let mut` is the legal `mut` position",
    ).toBeUndefined();
  });
});

// --- bindings.md §Increment / decrement -----------------------------------

describe("V3b-T — increment / decrement (theta/parse/increment-decrement)", () => {
  it("theta/parse/increment-decrement: `++` is rejected", () => {
    const d = checkIncrementDecrement({ op: "++" }, site());
    expect(d, "theta/parse/increment-decrement for `++`").toBeDefined();
    expect(d?.code).toBe("theta/parse/increment-decrement");
    // Message from code-registry-parse.md; `<op>` is the source token verbatim.
    expect(d?.message).toBe("'++' operator is not supported");
  });

  it("theta/parse/increment-decrement: `--` is rejected", () => {
    const d = checkIncrementDecrement({ op: "--" }, site());
    expect(d, "theta/parse/increment-decrement for `--`").toBeDefined();
    expect(d?.code).toBe("theta/parse/increment-decrement");
    expect(d?.message).toBe("'--' operator is not supported");
  });
});

// --- bindings.md §`let` requires an initialiser ---------------------------

describe("V3b-T — `let` without an initialiser (theta/parse/let-without-initialiser)", () => {
  it("theta/parse/let-without-initialiser: `let x: T` (no initialiser) fires", () => {
    const d = checkLetBinding(
      { name: "x", mutable: false, hasInitialiser: false },
      site(),
    );
    expect(
      d,
      "theta/parse/let-without-initialiser for an initialiser-less `let`",
    ).toBeDefined();
    expect(d?.code).toBe("theta/parse/let-without-initialiser");
    // Message from code-registry-parse.md.
    expect(d?.message).toBe("let binding 'x' has no initialiser");
  });

  it("a `let` with an initialiser raises no let-without-initialiser diagnostic", () => {
    const d = checkLetBinding(
      { name: "x", mutable: false, hasInitialiser: true },
      site(),
    );
    expect(
      d,
      "an initialised `let` is well-formed",
    ).toBeUndefined();
  });
});
