// V4a / V4a-T — the parse/type seam for `match`, `?`, and `Result`.
//
// This module owns the type-phase well-formedness checks for the two
// `Result`-destructuring constructs of expressions.md — the postfix `?`
// operator and the `match` expression — that are decidable statically:
//
//   - `?` operand-type precondition (ERR-18, expressions.md §`?` operator) —
//     the operand `?` unwraps MUST itself have static type
//     `Result<T, QueryError>` for some `T`; any other operand type is
//     `loom/parse/question-on-non-result` (a `type`-phase, hence lex/parse/type
//     batch pre-evaluation, failure).
//   - `?` enclosing-scope precondition (expressions.md §`?` operator) — the
//     scope `?` early-returns from must be compatible with
//     `Result<U, QueryError>` for some `U`: either it carries no explicit return
//     annotation (`?` then implicitly returns `Result<T, QueryError>`) or its
//     explicit annotation `R` satisfies `Result<U, QueryError> ⊑ R`. Otherwise
//     the use of `?` is `loom/parse/question-outside-result-fn`. This is the
//     scope precondition, distinct from the operand precondition above.
//   - `match` arm common-type (expressions.md §`match` expression, Arm syntax) —
//     all arms must produce values of one type, or values whose types share a
//     common upper bound under type-system.md §"Type compatibility" (every arm
//     `⊑` the chosen common type, narrowed by any sink in scope). A `match`
//     whose arms share no common upper bound is `loom/parse/match-arm-type-mismatch`;
//     a well-typed `match` resolves to the least upper bound of its arms.
//
// V4a-T (tests-task) declares these seam shapes and stubs the behaviour-bearing
// functions inertly (each parse/type checker returns no diagnostic, and the
// `match` arm checker computes no LUB), so the failing tests compile and red on
// their own primary assertions (an absent expected diagnostic, or an absent
// computed LUB), not on a compile error, a missing fixture, or a harness throw.
// The paired V4a implementation leaf fills every check in.

import { type Diagnostic, type SourceRange } from "../diagnostics/diagnostic";
import { checkCompatible, type CompatType, type TypeEnv } from "./type-compat";

/** A located site at which a `match` / `?` form is type-checked. */
export interface MatchResultSite {
  readonly file: string;
  readonly range: SourceRange;
}

/**
 * The static type of a `?` operator's operand, projected for the ERR-18
 * operand-type check:
 *
 *   - `result`     — the operand is `Result<T, E>`; `errIsQueryError` records
 *                    whether `E` is `QueryError` (the only error type loom 1.0
 *                    admits for `?`). ERR-18 requires `Result<T, QueryError>`.
 *   - `non-result` — the operand is any non-`Result` type; `display` is its
 *                    rendered type name for the `<type>` placeholder of the
 *                    `loom/parse/question-on-non-result` message.
 */
export type QuestionOperandType =
  | { readonly kind: "result"; readonly errIsQueryError: boolean }
  | { readonly kind: "non-result"; readonly display: string };

/**
 * ERR-18 — the `?` operand-type precondition. Returns
 * `loom/parse/question-on-non-result` (a `type`-phase diagnostic) when the
 * operand `?` is applied to does not statically type as `Result<T, QueryError>`
 * for some `T` (e.g. `let x = 5?`, where `5` is `integer`). Returns `undefined`
 * for a `Result<T, QueryError>` operand (expressions.md ERR-18).
 *
 * V4a-T stubs this inert (always `undefined`); the paired V4a leaf fills it in.
 */
export function checkQuestionOperand(
  operand: QuestionOperandType,
  site: MatchResultSite,
): Diagnostic | undefined {
  // A `Result<T, QueryError>` operand satisfies the precondition.
  if (operand.kind === "result" && operand.errIsQueryError) {
    return undefined;
  }
  // Otherwise the operand is not `Result<T, QueryError>`: either a non-`Result`
  // type, or a `Result` whose error arm is not `QueryError`. The `<type>`
  // placeholder renders the operand's type name (a `Result` whose error arm is
  // not `QueryError` renders as `Result`). Message from
  // diagnostics/code-registry-parse.md.
  const display = operand.kind === "non-result" ? operand.display : "Result";
  return {
    severity: "error",
    code: "loom/parse/question-on-non-result",
    file: site.file,
    range: site.range,
    message: `'?' requires a Result operand; got ${display}`,
  };
}

/**
 * The enclosing scope a `?` early-returns from, projected for the scope
 * precondition check:
 *
 *   - `inferred`  — no explicit return annotation; `?` then makes the scope
 *                   implicitly return `Result<T, QueryError>`, so the scope is
 *                   compatible by construction.
 *   - `annotated` — an explicit return annotation `R`; `resultCompatible`
 *                   records whether `Result<U, QueryError> ⊑ R` for some `U`.
 */
export type EnclosingReturnScope =
  | { readonly kind: "inferred" }
  | { readonly kind: "annotated"; readonly resultCompatible: boolean };

/**
 * The `?` enclosing-scope precondition. Returns
 * `loom/parse/question-outside-result-fn` (a `type`-phase diagnostic) when `?`
 * is used in a function or top-level loom whose explicit return annotation is
 * not compatible with `Result<U, QueryError>` for some `U` and cannot be
 * inferred to one. Returns `undefined` for an inferred scope, or an annotated
 * scope whose return type admits `Result<U, QueryError>` (expressions.md
 * §`?` operator).
 *
 * V4a-T stubs this inert (always `undefined`); the paired V4a leaf fills it in.
 */
export function checkQuestionScope(
  scope: EnclosingReturnScope,
  site: MatchResultSite,
): Diagnostic | undefined {
  // An inferred scope implicitly returns `Result<T, QueryError>` once `?` is
  // used, and an annotated scope whose return type admits
  // `Result<U, QueryError>` is compatible by construction.
  if (scope.kind === "inferred" || scope.resultCompatible) {
    return undefined;
  }
  // An explicit return annotation that does not admit `Result<U, QueryError>`
  // for any `U`. Message from diagnostics/code-registry-parse.md.
  return {
    severity: "error",
    code: "loom/parse/question-outside-result-fn",
    file: site.file,
    range: site.range,
    message: "'?' used in a scope whose return type is not Result<T, QueryError>",
  };
}

/**
 * The outcome of the `match` arm common-type check:
 *
 *   - `diagnostics` — `loom/parse/match-arm-type-mismatch` when the arm bodies
 *     share no common upper bound (or fail against an in-scope sink); empty
 *     when the arms are well-typed.
 *   - `lub`         — the resolved least upper bound the well-typed `match`
 *     expression evaluates to (the common type the arms widen to). `undefined`
 *     when the arms have no common upper bound (mismatch) or when none is
 *     computed.
 */
export interface MatchArmCheck {
  readonly diagnostics: readonly Diagnostic[];
  readonly lub: CompatType | undefined;
}

/**
 * The `match` arm common-type check (expressions.md §`match` expression,
 * Arm syntax). Given the static types of the arm bodies and an optional
 * in-scope type `sink` on the `match` expression:
 *
 *   - reports `loom/parse/match-arm-type-mismatch` when the arms share no
 *     common upper bound under type-system.md §"Type compatibility" (no `sink`),
 *     or when an arm is not `⊑` the `sink` (with a `sink`);
 *   - otherwise resolves the `match` to the least upper bound of its arms,
 *     returned as `lub`.
 *
 * V4a-T stubs this inert (no diagnostics, no computed LUB); the paired V4a leaf
 * fills it in.
 */
export function checkMatchArmTypes(opts: {
  readonly armTypes: readonly CompatType[];
  readonly sink: CompatType | undefined;
  readonly env: TypeEnv;
  readonly site: MatchResultSite;
}): MatchArmCheck {
  const { armTypes, sink, env, site } = opts;

  // With an in-scope sink on the `match` expression itself, every arm body must
  // be `⊑` the sink; the `match` then resolves to the sink type. A
  // statically-unresolvable arm is deferred to the runtime AJV safety net.
  if (sink !== undefined) {
    for (const armType of armTypes) {
      const r = checkCompatible(armType, sink, env);
      if (r === "compatible" || r === "unknown") {
        continue;
      }
      return { diagnostics: [mismatchDiagnostic(site)], lub: undefined };
    }
    return { diagnostics: [], lub: sink };
  }

  // Without a sink, the arms need a common upper bound — an arm type every other
  // arm is `⊑`, the least such being the LUB the `match` resolves to.
  const lub = leastUpperBound(armTypes, env);
  if (lub === undefined) {
    return { diagnostics: [mismatchDiagnostic(site)], lub: undefined };
  }
  return { diagnostics: [], lub };
}

/** The `loom/parse/match-arm-type-mismatch` diagnostic (diagnostics/code-registry-parse.md). */
function mismatchDiagnostic(site: MatchResultSite): Diagnostic {
  return {
    severity: "error",
    code: "loom/parse/match-arm-type-mismatch",
    file: site.file,
    range: site.range,
    message: "match arm body type does not match the common type of the other arms",
  };
}

/**
 * The least upper bound of the arm types under type-system.md §"Type
 * compatibility": a candidate arm type that every arm is `⊑`, and that is itself
 * `⊑` every other such candidate (the least). Returns `undefined` when the arms
 * share no common upper bound. A statically-unresolvable arm does not block a
 * candidate (deferred to the runtime AJV safety net).
 */
function leastUpperBound(
  armTypes: readonly CompatType[],
  env: TypeEnv,
): CompatType | undefined {
  const covers = (candidate: CompatType): boolean =>
    armTypes.every((arm) => {
      const r = checkCompatible(arm, candidate, env);
      return r === "compatible" || r === "unknown";
    });
  const candidates = armTypes.filter(covers);
  if (candidates.length === 0) {
    return undefined;
  }
  // The least candidate is `⊑` every other candidate.
  for (const candidate of candidates) {
    const isLeast = candidates.every((other) => {
      const r = checkCompatible(candidate, other, env);
      return r === "compatible" || r === "unknown";
    });
    if (isLeast) {
      return candidate;
    }
  }
  return candidates[0];
}
