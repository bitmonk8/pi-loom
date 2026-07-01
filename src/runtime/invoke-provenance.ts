// V15g / V15g-T — the per-`invoke`-hop invocation-record provenance seam.
//
// This module owns the producer seam that, for an executed `invoke` hop,
// records into the per-frame invocation record:
//
//   - the parent loom's **post-`realpath`** path — the same `realpath`-normalised
//     parent path V15a captures for discovery-root containment (invocation.md
//     §Resolution), obtained through the injected `FileSystem` seam via the
//     shared `canonicalizePath` identity; and
//   - the **1-indexed source line** of the call-site token that produced the
//     `invoke_callee` hop: the `invoke(` token of a literal `invoke(...)`
//     expression, or the callee-name identifier of a `.loom`-callable
//     bare-identifier call (slash-invocation.md §SLSH-5). The line is the
//     call-site token's, not any receiving binding's, so multi-line calls are
//     unambiguous.
//
// This is the seam V12b consumes to render its SLSH-5 chain-attribution suffix
// `from <callee_path> invoked at <parent_path>:<line>`; this leaf is its
// producer, V12b the consumer.
//
// V15g-T (tests-task) declares the seam shapes and stubs the behaviour-bearing
// producer inertly so the failing tests compile and red on their own primary
// assertions:
//   - `recordInvocationProvenance` returns an inert record with an empty
//     `parentPath` (never the post-`realpath` output) and a `callSiteLine` of
//     `0` (never the call-site token's 1-indexed line), so both the
//     post-`realpath`-parent-path assertion and the call-site-line assertion
//     (including the multi-line "not the receiving binding's line" pin) red.
// No test reds on a compile error, a missing fixture, or a harness throw.
//
// Spec: invocation.md (§Resolution), slash-invocation.md (§SLSH-5).

import type { FileSystem } from "../seams/file-system";
import type { Position } from "../diagnostics/diagnostic";

/**
 * The call-site token descriptor for the two loom 1.0 invocation surfaces that
 * produce an `invoke_callee` hop (slash-invocation.md §SLSH-5). Each arm carries
 * the token whose 1-indexed source line the provenance record captures.
 */
export type InvokeCallSite =
  | {
      /** A literal `invoke(...)` / `invoke<Schema>(...)` expression. */
      readonly style: "literal_invoke";
      /**
       * The `invoke(` token position — specifically the `invoke` keyword
       * beginning the call expression. Its `line` is the recorded call-site
       * line, not that of any receiving binding on an earlier line.
       */
      readonly invokeToken: Position;
    }
  | {
      /**
       * A `.loom`-callable bare-identifier call (e.g. `summarise(doc)` when
       * `./summariser.loom` is registered in `tools:`), operationally
       * equivalent to `invoke(...)` per Tool Calls — Relationship with invoke.
       */
      readonly style: "loom_callable_bare";
      /**
       * The callee-name identifier token position (e.g. the `summarise` token).
       * Its `line` is the recorded call-site line.
       */
      readonly calleeNameToken: Position;
    };

/**
 * The per-frame invocation record this seam produces for one executed `invoke`
 * hop. V12b reads it to render `from <callee_path> invoked at <parent_path>:<line>`.
 */
export interface InvocationRecord {
  /**
   * The parent loom's **post-`realpath`** absolute path — the same
   * `realpath`-normalised value V15a captures for discovery-root containment
   * (invocation.md §Resolution). This is `<parent_path>` in the SLSH-5 suffix.
   */
  readonly parentPath: string;
  /**
   * The **1-indexed** source line of the call-site token in the parent loom
   * (the `invoke(` token, or the `.loom`-callable callee-name identifier) — the
   * `<line>` in the SLSH-5 suffix. Never a receiving binding's line.
   */
  readonly callSiteLine: number;
}

/** Host dependencies the provenance producer needs. */
export interface InvocationProvenanceDeps {
  /** The injected `FileSystem` seam; only `realpath` is consulted (post-`realpath` parent path). */
  readonly fs: Pick<FileSystem, "realpath">;
}

/** Inputs to one `invoke`-hop provenance record. */
export interface InvocationProvenanceInput {
  /**
   * The parent loom's path as resolved at the call site (pre-`realpath`); the
   * producer `realpath`-normalises it so the recorded `parentPath` is the
   * post-`realpath` form V15a's containment check uses.
   */
  readonly parentPath: string;
  /** The call-site token descriptor whose 1-indexed line is recorded. */
  readonly callSite: InvokeCallSite;
}

/**
 * Produce the per-frame invocation record for one executed `invoke` hop: the
 * parent loom's post-`realpath` path and the call-site token's 1-indexed line
 * (slash-invocation.md §SLSH-5; invocation.md §Resolution).
 *
 * V15g-T stub: returns an inert record (empty `parentPath`, `callSiteLine` 0),
 * so the paired-`V15g` assertions red on their own primary expectations while
 * the suite still type-checks and runs.
 */
export async function recordInvocationProvenance(
  _deps: InvocationProvenanceDeps,
  _input: InvocationProvenanceInput,
): Promise<InvocationRecord> {
  return { parentPath: "", callSiteLine: 0 };
}
