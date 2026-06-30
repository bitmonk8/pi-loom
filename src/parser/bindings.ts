// V3b / V3b-T — the bindings & mutability checker seam.
//
// This module owns the parse-time well-formedness checks for the binding and
// mutability rules of bindings.md:
//
//   - `let` form        — `let x = ...` (immutable) / `let mut x = ...` (mutable):
//       * `loom/parse/let-without-initialiser` — `let x: T` (annotation, no
//         initialiser). Loom has no `undefined` value and no
//         definite-assignment analysis, so a binding with no value cannot be
//         admitted (bindings.md §`let` requires an initialiser).
//   - Reassignment      — `x = ...` / `x += ...` (statement-only):
//       * `loom/parse/immutable-rebinding` — reassignment of a `let`
//         (non-`mut`) binding (bindings.md §`let` vs `let mut`).
//       * `loom/parse/assignment-to-member-or-index` — `obj.field = ...` or
//         `arr[i] = ...`; loom 1.0 mutability is binding-level only
//         (bindings.md §Mutability is binding-level only).
//   - Immutable contexts — function parameters, `for` iteration variables, and
//     `match` pattern bindings are always immutable:
//       * `loom/parse/mut-on-immutable-context` — a `mut` modifier on any of
//         those positions (bindings.md §Immutable contexts).
//   - Increment / decrement:
//       * `loom/parse/increment-decrement` — `++` / `--` are rejected; use
//         `count += 1` / `count -= 1` (bindings.md §Increment / decrement).
//
// V3b-T (tests-task, this leaf) declares these seam shapes and stubs the five
// behaviour-bearing functions so the failing tests compile and red on their
// own primary assertions; the paired V3b implementation leaf fills them in.

import { type Diagnostic, type SourceRange } from "../diagnostics/diagnostic";

/** A located site at which a binding / reassignment form is checked. */
export interface BindingSite {
  readonly file: string;
  readonly range: SourceRange;
}

/**
 * A `let` (or `let mut`) binding declaration. `hasInitialiser` is `false` for
 * the annotation-only `let x: T` form (no `= <expr>`), which is rejected.
 */
export interface LetBindingDecl {
  readonly name: string;
  readonly mutable: boolean;
  readonly hasInitialiser: boolean;
}

/**
 * Check a `let` binding, returning `loom/parse/let-without-initialiser` when
 * the binding carries no initialiser. Returns `undefined` for a binding with
 * an initialiser (bindings.md §`let` requires an initialiser).
 */
export function checkLetBinding(
  _decl: LetBindingDecl,
  _site: BindingSite,
): Diagnostic | undefined {
  // V3b-T stub: the V3b implementation raises
  // `loom/parse/let-without-initialiser` here when `!decl.hasInitialiser`.
  return undefined;
}

/**
 * A reassignment of a plain identifier binding (`x = ...` / `x += ...`).
 * `mutable` is whether the target binding was declared `let mut`.
 */
export interface BindingReassignment {
  readonly name: string;
  readonly mutable: boolean;
}

/**
 * Check a plain-identifier reassignment, returning
 * `loom/parse/immutable-rebinding` when the target binding is immutable (not
 * `let mut`). Returns `undefined` for a `let mut` target (bindings.md
 * §`let` vs `let mut`; the compound forms `+=` etc. are equally legal on a
 * `let mut` binding).
 */
export function checkReassignment(
  _reassign: BindingReassignment,
  _site: BindingSite,
): Diagnostic | undefined {
  // V3b-T stub: the V3b implementation raises `loom/parse/immutable-rebinding`
  // here when `!reassign.mutable`.
  return undefined;
}

/** The shape of an assignment target. */
export type AssignTargetKind = "identifier" | "member" | "index";

/** An assignment target (`x` / `obj.field` / `arr[i]`). */
export interface AssignmentTarget {
  readonly kind: AssignTargetKind;
}

/**
 * Check an assignment target, returning
 * `loom/parse/assignment-to-member-or-index` for a member (`obj.field = ...`)
 * or index (`arr[i] = ...`) target. Returns `undefined` for a plain identifier
 * target (bindings.md §Mutability is binding-level only).
 */
export function checkAssignmentTarget(
  _target: AssignmentTarget,
  _site: BindingSite,
): Diagnostic | undefined {
  // V3b-T stub: the V3b implementation raises
  // `loom/parse/assignment-to-member-or-index` here when `target.kind !==
  // "identifier"`.
  return undefined;
}

/**
 * A binding position at which a `mut` modifier may appear. `let` is the only
 * position where `mut` is legal; the other three are always-immutable contexts
 * (bindings.md §Immutable contexts).
 */
export type BindingPosition = "let" | "fn-param" | "for-var" | "match-bind";

/** A `mut` modifier observed at a binding position. */
export interface MutModifier {
  readonly position: BindingPosition;
}

/**
 * Check a `mut` modifier, returning `loom/parse/mut-on-immutable-context` when
 * the modifier sits on a function parameter, a `for` iteration variable, or a
 * `match` pattern binding. Returns `undefined` for a `let` binding (bindings.md
 * §Immutable contexts).
 */
export function checkMutModifier(
  _mod: MutModifier,
  _site: BindingSite,
): Diagnostic | undefined {
  // V3b-T stub: the V3b implementation raises
  // `loom/parse/mut-on-immutable-context` here when `mod.position !== "let"`.
  return undefined;
}

/** An increment / decrement operator occurrence (`x++`, `--y`, …). */
export interface IncrementDecrementOp {
  readonly op: "++" | "--";
}

/**
 * Check an increment / decrement operator, always returning
 * `loom/parse/increment-decrement` — `++` and `--` are unsupported; use
 * `count += 1` / `count -= 1` (bindings.md §Increment / decrement). The `<op>`
 * placeholder in the message is the source token verbatim.
 */
export function checkIncrementDecrement(
  _op: IncrementDecrementOp,
  _site: BindingSite,
): Diagnostic | undefined {
  // V3b-T stub: the V3b implementation raises `loom/parse/increment-decrement`
  // here for every `++` / `--` occurrence.
  return undefined;
}
