// V11g / V11g-T — Fill-if-absent defaulting and post-merge AJV validation.
//
// This module owns the runtime default-fill and the post-default-merge AJV
// validation named in binder/defaulting-system-note-echo.md §Defaulting
// (anchor #post-default-merge-ajv-validation, coverage-matrix `cka-40`):
//
//   - Fill-if-absent (keyed on the field's wire name in the binder-returned
//     `args`): when a defaulted field's wire name is ABSENT, the field takes its
//     declared default and is reported as default-supplied; when the wire name
//     is PRESENT, the binder-supplied value is preserved unchanged and no default
//     is applied (even for a defaulted field), and it is NOT reported as
//     default-supplied.
//   - Post-default-merge AJV validation: after the merge, `SchemaValidator`'s
//     compiled validator re-validates the merged `args` object against the
//     lowered `params` schema, and the verdict is surfaced.
//
// V11g-T (tests-task) declares this seam shape and stubs `fillDefaultsAndRevalidate`
// with an inert result — an empty merged-args object, no default-supplied fields,
// and an unconditional `ok` verdict that never consults the validator — so the
// failing tests red on their own primary assertions (an absent default not
// filled, a present value not preserved, the validator never invoked on the
// merged args). The paired V11g implementation leaf fills the behaviour in.
//
// Spec: binder/defaulting-system-note-echo.md §Defaulting
// (#post-default-merge-ajv-validation).

import type { CompiledValidator, ValidationError } from "../seams/schema-validator";

/** One `params:` field that declared a default, with its declared default value. */
export interface DefaultedField {
  /** The field's wire name (the key looked up in the binder-returned `args`). */
  readonly wireName: string;
  /** The field's declared default value (a literal-sublanguage form, already lowered). */
  readonly defaultValue: unknown;
}

/** Inputs to the fill-if-absent + post-default-merge validation step. */
export interface FillDefaultsInput {
  /** The binder-returned `args` (the `ok` arm's `args`), before defaulting. */
  readonly binderArgs: Readonly<Record<string, unknown>>;
  /** The loom's defaulted `params:` fields (wire name + declared default). */
  readonly defaults: readonly DefaultedField[];
  /**
   * The compiled validator for the lowered `params` schema (from
   * `SchemaValidator.compile()`). Its `validate()` re-validates the merged args.
   */
  readonly validator: CompiledValidator;
}

/** The verdict of the post-default-merge AJV validation of the merged `args`. */
export type PostMergeValidation =
  | { readonly ok: true }
  | { readonly ok: false; readonly errors: readonly ValidationError[] };

/** The result of filling defaults and re-validating the merged `args`. */
export interface FillDefaultsResult {
  /** The merged `args`: binder values preserved, absent defaulted fields filled. */
  readonly args: Readonly<Record<string, unknown>>;
  /**
   * The wire names of the fields that took their declared default this run
   * (default-supplied only — a binder-supplied value for a defaulted field is
   * NOT listed). Drives the echo's `(default)` tagging.
   */
  readonly defaultedWireNames: readonly string[];
  /** The post-default-merge AJV validation verdict for the merged `args`. */
  readonly validation: PostMergeValidation;
}

/**
 * Fill absent defaulted fields (fill-if-absent, keyed on wire name) and then
 * re-validate the merged `args` through the compiled validator
 * (§Defaulting, #post-default-merge-ajv-validation).
 */
export function fillDefaultsAndRevalidate(
  _input: FillDefaultsInput,
): FillDefaultsResult {
  // V11g-T inert stub: no merge, no default-supplied reporting, no validator
  // consultation. The paired V11g leaf implements the fill-if-absent merge and
  // the post-default-merge SchemaValidator.validate() re-validation.
  return { args: {}, defaultedWireNames: [], validation: { ok: true } };
}
