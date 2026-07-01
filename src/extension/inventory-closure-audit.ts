// V18b / V18b-T — the build-time inventory-closure audit seam.
//
// This module owns the negative-direction *inventory-closure audit* the
// pi-integration-contract audit shards specify (a post-1.0 hardening that
// mechanizes the loom-1.0 *surface-set closure* MUST):
//
//   • inventory-audit-intro.md §"Inventory-closure audit"
//   • audit-resolution.md   (scope, per-category join keys, exemption /
//                            malformed- / stale-marker discriminators)
//   • audit-recognised-shapes.md (recognised category-(1)/(2)/(3) shapes and
//                            the non-exemptible family-(4) prohibited shapes)
//   • audit-target-categories.md (the three target surface categories + the
//                            typebox `{ Type }` / `{ Unsafe }` sibling
//                            allow-lists)
//   • audit-failures.md     (the five-family Failure-surface contract, the
//                            three-class `audit/<class>/<family>/<symptom>`
//                            discriminator shape, the per-family record shape)
//   • audit-wire-and-canary.md (wire serialisation, fail-closed
//                            infrastructure-failure handling, the non-empty
//                            two-counter canary)
//
// The audit resolves every recognised Pi-side surface reference in the audited
// source tree against the `SDK_SURFACE_INVENTORY` rows + entry-kind taxonomy
// `V18a` establishes, the typebox sibling allow-lists, or a declared
// `// allow-pi-surface:` marker, and surfaces every unresolved / prohibited
// reference under exactly one of the five families as an
// `audit/<class>/<family>/<symptom>` record. It additionally emits, on every
// invocation, the non-empty-scan canary's two counters.
//
// SEAM SHAPE (V18b-T). The audit core is a pure function over an already-read
// in-memory file map (POSIX-form audited-source-tree path -> UTF-8 content),
// the inventory, and the two typebox allow-lists — so file-system walking,
// symlink/encoding handling, and the fail-closed infrastructure wrapper the
// spec assigns to the audit's disk driver stay outside this pure core and off
// the *Sequential by default* blocking-runtime surface. The V18b implementation
// fills `runInventoryClosureAudit` in (and wires a thin disk-walk + `npm test`
// driver around it); this tests-task ships the seam + a non-compliant stub so
// the paired failing tests red on their own primary assertions.

import type { SurfaceInventoryEntry } from "./sdk-inventory";

/**
 * The three-class partition every emitted record's discriminator carries in its
 * `<class>` segment (audit-failures.md §"Three-class partition"): the five
 * inventory-closure-audit violation families, infrastructure failures, and the
 * non-empty-scan canary.
 */
export type AuditClass = "violation" | "infra" | "canary";

/**
 * One emitted audit record (audit-failures.md §"Failure-surface contract" +
 * §"Per-family record-shape table"; audit-wire-and-canary.md §"Wire
 * serialisation"). `discriminator` is the leading `audit/<class>/<family>/
 * <symptom>` token; the four packed fields follow in fixed order.
 */
export interface AuditRecord {
  /** The `audit/<class>/<family>/<symptom>` discriminator token. */
  readonly discriminator: string;
  /** Offending source path, or the literal `<n/a>` sentinel. */
  readonly path: string;
  /** 1-based integer line as a string, or the literal `<n/a>` sentinel. */
  readonly line: string;
  /** Family-keyed symbol value, or the literal `<n/a>` sentinel. */
  readonly symbol: string;
  /** Plain-ASCII resolution arm the contributor would take. */
  readonly proposedResolution: string;
}

/**
 * The build-time inputs the closure audit resolves against.
 *
 * `files` is the already-read audited source tree keyed by POSIX-form path
 * (the disk driver the V18b implementation wraps this core in owns the
 * `src/**\/*.ts`-minus-exclusions glob, symlink, and encoding rules). The
 * `inventory` is the `SDK_SURFACE_INVENTORY` V18a pins; the two allow-lists are
 * the typebox `{ Type }` named-import and `{ Unsafe }` member-access siblings.
 */
export interface AuditInput {
  /** POSIX-form audited-source-tree path -> UTF-8 file content. */
  readonly files: ReadonlyMap<string, string>;
  /** The `SDK_SURFACE_INVENTORY` rows (V18a). */
  readonly inventory: readonly SurfaceInventoryEntry[];
  /** typebox named-import allow-list (loom 1.0: `{ Type }`). */
  readonly typeboxNamedImportAllowList: readonly string[];
  /** typebox member-access allow-list (loom 1.0: `{ Unsafe }`). */
  readonly typeboxMemberAccessAllowList: readonly string[];
}

/**
 * The audit's structured result: the ordered emitted records plus the
 * non-empty-scan canary's two counters (audit-wire-and-canary.md
 * §"Non-empty-scan canary") — the number of audited source files walked and
 * the number of in-scope surface references recognised.
 */
export interface AuditResult {
  readonly records: readonly AuditRecord[];
  readonly walked: number;
  readonly recognised: number;
}

/**
 * Run the inventory-closure audit over an in-memory audited source tree.
 *
 * V18b-T stub: returns an inert empty result — no records emitted and both
 * canary counters zero — so the paired failing tests red on their own primary
 * assertions (the expected family-(1) / family-(4) / family-(5) / canary
 * records are absent, and the recognised-reference counter is zero) rather than
 * on a compile error or a harness throw. The V18b implementation replaces this
 * body with the real recogniser, resolver, and canary.
 */
export function runInventoryClosureAudit(input: AuditInput): AuditResult {
  void input;
  return { records: [], walked: 0, recognised: 0 };
}
