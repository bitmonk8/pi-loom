// V3a / V3a-T — the expression-evaluator seam.
//
// This module owns the loom expression interpreter and the one type-phase
// boolean-position check the expression sublanguage needs (expressions.md — the
// EXPR code-keyed obligation area, plus the `loom/parse/non-boolean-condition`
// diagnostic of expressions.md §Truthiness). The interpreter is the bounded
// TypeScript-subset evaluator described in expressions.md §"Supported forms":
//
//   - literals, parenthesised sub-expressions, identifier reads, and `f(args)`
//     calls;
//   - unary `!` / `-`, binary arithmetic `+ - * / %`, comparison `< <= > >=`,
//     equality `== !=`, logical `&& ||`, and the ternary `cond ? a : b`, with
//     the precedence and associativity of expressions.md §"Operator precedence"
//     (highest→lowest: postfix/access, unary, `* / %`, `+ -`, ordering,
//     equality, `&&`, `||`, ternary);
//   - left-to-right evaluation with `&&` / `||` short-circuit and ternary
//     branch selection, so a short-circuited / not-taken operand's observable
//     effect (its calls) does not run (expressions.md §"Evaluation order and
//     short-circuiting");
//   - structural `==` / `!=` via the V2c `valuesEqual` relation — a cross-type
//     pair evaluates `false`, never panicking (expressions.md §Equality);
//   - arithmetic with the `integer ⊑ number` widening (TYPE-2) and the
//     non-panicking div/mod-by-zero disposition: `/` always yields `number`,
//     `n / 0` is `±Infinity`, `0 / 0` and `n % 0` are `NaN`, and no integer
//     overflow or div/mod-by-zero panics (expressions.md §"Other arithmetic");
//   - ordering by signed IEEE-754 value / UTF-16 code unit, with every ordering
//     operator against `NaN` evaluating `false` (expressions.md §"Ordering
//     comparisons").
//
// Boolean position: `&&` / `||` operands, the ternary condition, and the `if` /
// `while` scrutinees accept only `boolean`; loom performs no truthiness
// coercion, so a non-`boolean` there is `loom/parse/non-boolean-condition`, a
// `type`-phase parse diagnostic (expressions.md §Truthiness). `checkBooleanPosition`
// is the per-site checker that reports it, mirroring the V2b per-site checkers.
//
// V3a-T (tests-task) declares the seam — the `EvalHost` collaborator, the
// `evaluateSource` entry point, and the `checkBooleanPosition` type-phase
// checker — and stubs the behaviour-bearing functions inertly so the failing
// tests compile and red on their own primary assertions:
//
//   - `evaluateSource` returns the inert `null` sentinel without parsing,
//     evaluating, or calling the host, so every result-value assertion reds
//     (a precedence result, an equality/ordering/arithmetic value) and the
//     short-circuit observability assertion reds because the must-run operand's
//     call is never recorded;
//   - `checkBooleanPosition` returns no diagnostics, so the
//     `loom/parse/non-boolean-condition` assertion reds on its absent
//     diagnostic.
//
// No test reds on a compile error, a missing fixture, or a harness throw. The
// paired V3a implementation leaf fills these in.

import type { Diagnostic } from "../diagnostics/diagnostic";
import type { CompatSite, CompatType } from "../parser/type-compat";
import type { LoomValue } from "./value";

/**
 * The host the expression interpreter resolves names and effects through. Kept
 * out of the evaluator so identifier reads and calls (the observable effects
 * short-circuiting governs) are injected, not ambient.
 *
 *   - `resolveIdentifier` resolves a bare identifier read to its bound value,
 *     in the expressions.md §"Identifier resolution" order (local `let` /
 *     parameter > top-level `fn` > import > callable). The evaluator calls it
 *     only for identifier-read positions.
 *   - `callFunction` performs a call `f(args)` and returns its value. It is the
 *     observable effect short-circuiting and ternary branch selection must
 *     skip: a short-circuited / not-taken call is never invoked.
 */
export interface EvalHost {
  resolveIdentifier(name: string): LoomValue;
  callFunction(name: string, args: readonly LoomValue[]): LoomValue;
}

/**
 * Parse and evaluate a single loom expression `source` against `host`, per the
 * expressions.md operator-precedence table, left-to-right short-circuit /
 * ternary evaluation order, structural equality, and the arithmetic / ordering
 * rules. Never panics on div/mod-by-zero (it yields `±Infinity` / `NaN`).
 *
 * V3a-T stubs this as the inert `null` sentinel: it neither parses nor
 * evaluates `source` and never touches `host`, so every value assertion reds on
 * its own primary expectation and the short-circuit must-run assertion reds
 * because the host call is never recorded. The paired V3a leaf implements it.
 */
export function evaluateSource(source: string, host: EvalHost): LoomValue {
  void source;
  void host;
  return null;
}

/**
 * The boolean positions of expressions.md §Truthiness: the `if` / `while`
 * scrutinees, the ternary condition, and the `&&` / `||` operands. Each accepts
 * only `boolean`; a non-`boolean` there is `loom/parse/non-boolean-condition`.
 */
export type BooleanPosition = "if" | "while" | "ternary-condition" | "&&" | "||";

/**
 * The type-phase boolean-position check. Reports
 * `loom/parse/non-boolean-condition` when the value used in an `if` / `while` /
 * ternary condition or as a `&&` / `||` operand has a static type other than
 * `boolean` — loom performs no truthiness coercion (expressions.md §Truthiness).
 * Returns no diagnostic for a `boolean`-typed operand.
 *
 * V3a-T stubs this inert (no diagnostics); the paired V3a leaf fills it in.
 */
export function checkBooleanPosition(opts: {
  readonly position: BooleanPosition;
  readonly operandType: CompatType;
  readonly site: CompatSite;
}): Diagnostic[] {
  void opts;
  return [];
}
