// V9f / V9f-T — tool-registration lifetime and visibility.
//
// This module owns the prompt-mode tool-registration cache (PIC-44 cache-hit
// schema byte-equality verification + collision disambiguation), the
// active-set gating window's snapshot/restore protocol (PIC-17 install vector,
// PIC-8 restore-failure protocol, PIC-19 snapshot/swap-install-failure
// protocol), and the materialised `ToolDefinition.label` derivation
// (extension-bootstrap-and-per-loom.md §Per-loom registration — a GOV-22
// un-anchored residue), per
// pi-integration-contract/tool-registration-lifetime.md.
//
// V9f-T (tests-task) declares the seam shapes and stubs every behaviour-bearing
// function inertly:
//   - `deriveToolLabel` returns `""` (no capitalisation / no literal),
//   - `withActiveSetGate` runs the body with NO snapshot/swap/restore and emits
//     no diagnostic or note (so PIC-17 install-vector, PIC-8 restore-failure,
//     and PIC-19 setup-failure all go unwitnessed),
//   - `registerToolInCache` always registers a fresh base name without storing
//     or byte-comparing canonical-form bytes and never emits a collision.
// Each paired V9f-T test therefore reds on its own primary assertion — an
// absent install vector, an absent restore-failure diagnostic/note, an absent
// internal-error routing, an absent collision diagnostic, a wrong label — not
// on a compile error, missing fixture, or harness throw. The paired V9f
// implementation leaf fills these in.

import type { Diagnostic } from "../diagnostics/diagnostic";
import type { SystemNote } from "../extension/system-note-channel";

// --- ToolDefinition.label derivation ---------------------------------------

/**
 * Input to the materialised `ToolDefinition.label` derivation
 * (extension-bootstrap-and-per-loom.md §Per-loom registration).
 *
 * `loom-file` carries the loom file's basename (without the `.loom` extension);
 * the label is that basename with interior hyphens preserved and only the
 * leading character capitalised (`code-review` → `"Code-review"`).
 * `typed-query-respond` synthesises the one-shot tool whose label is the fixed
 * literal `"Loom typed-query response"`.
 */
export type ToolLabelInput =
  | { readonly kind: "loom-file"; readonly basename: string }
  | { readonly kind: "typed-query-respond" };

/**
 * Derive the materialised `ToolDefinition.label`.
 *
 * V9f-T stub: returns `""` so the paired label tests red on their own
 * assertion (the absent capitalisation / absent literal). The V9f
 * implementation fills this in.
 */
export function deriveToolLabel(_input: ToolLabelInput): string {
  return "";
}

// --- Active-set gating window (PIC-17 / PIC-8 / PIC-19) ---------------------

/** The narrow `pi` subset the active-set gate touches. */
export interface ActiveSetPi {
  /** Step-1 snapshot of the user session's active tool-name list. */
  getActiveTools(): string[];
  /** Step-2 swap-install / step-4 restore — name lists only. */
  setActiveTools(names: string[]): void;
}

/** Construction dependencies for the active-set gating window. */
export interface ActiveSetGateDeps {
  /** The `pi.getActiveTools` / `pi.setActiveTools` snapshot/restore surface. */
  readonly pi: ActiveSetPi;
  /** The bare loom name substituted into `/<name>` in the PIC-8 note template. */
  readonly loomName: string;
  /**
   * The exact step-2 install vector: `[...loomCallableSetNames, respondToolName?]`.
   * The step-1 snapshot is deliberately NOT unioned into this set, so the
   * "ambient tools are deliberately not inherited" invariant holds.
   */
  readonly installVector: readonly string[];
  /** Submit a constructed `Diagnostic` through the standard diagnostics channel. */
  readonly emitDiagnostic: (diagnostic: Diagnostic) => void;
  /** Deliver a `loom-system-note` (the PIC-8 `display: true` advisory). */
  readonly emitSystemNote: (note: SystemNote) => void;
  /**
   * Route a setup-side (step-1/step-2) failure onto the
   * `loom/runtime/internal-error` runtime-defect channel (PIC-19); the routing
   * owner is capability-probe's Post-probe SDK-shape drift.
   */
  readonly routeInternalError: (error: Error) => void;
}

/**
 * Gate query visibility via the active-set: snapshot (step 1), swap-install the
 * `installVector` (step 2), run `body` (step 3), restore the snapshot (step 4)
 * with the PIC-8 single-re-attempt protocol, routing step-1/step-2 setup
 * failures to `internal-error` per PIC-19. Propagates the original body
 * error/result unmasked.
 *
 * V9f-T stub: runs `body()` directly with NO snapshot/swap/restore and emits
 * nothing — so the install vector is never installed, no restore is attempted,
 * and no diagnostic/note is produced. The paired tests red on those absent
 * effects. The V9f implementation fills this in.
 */
export async function withActiveSetGate<T>(
  _deps: ActiveSetGateDeps,
  body: () => Promise<T>,
): Promise<T> {
  return body();
}

// --- Prompt-mode registration cache (PIC-44) -------------------------------

/** A lowered tool's content-addressed registration-cache entry. */
export type RegistrationEntry =
  | {
      readonly kind: "callee";
      /** Schema slug of the lowered `parameters` (64-bit SHA-256 truncation). */
      readonly slug: string;
      /** Canonical-form schema bytes, stored for the byte-equality check. */
      readonly canonicalFormBytes: string;
      /** The post-rename callee name spliced into the content-addressed name. */
      readonly postRenameName: string;
    }
  | {
      readonly kind: "respond";
      readonly slug: string;
      readonly canonicalFormBytes: string;
    };

/**
 * The extension-scoped registration cache: `Map<schemaSlug, …>`. Stores the
 * canonical-form bytes alongside the registered name so the PIC-44 equality
 * check is a byte comparison, not a re-serialisation, and a per-slug counter
 * for collision disambiguation (`n` starts at 2 on the first collision).
 */
export interface RegistrationCacheRecord {
  readonly registeredName: string;
  readonly canonicalFormBytes: string;
  /** Next disambiguation counter for this slug (starts at 2). */
  nextCounter: number;
}

export type RegistrationCache = Map<string, RegistrationCacheRecord>;

/** Construction dependencies for the prompt-mode registration cache. */
export interface RegistrationCacheDeps {
  /** The `pi.registerTool` mutation (the only registry mutation Pi exposes). */
  readonly registerTool: (name: string) => void;
  /** Submit a constructed `Diagnostic` (the PIC-44 collision diagnostic). */
  readonly emitDiagnostic: (diagnostic: Diagnostic) => void;
}

/** Construct an empty registration cache. */
export function createRegistrationCache(): RegistrationCache {
  return new Map();
}

/**
 * Register a lowered tool through the prompt-mode cache, returning the
 * registered name. On first encounter of a unique slug, registers once with the
 * content-addressed name. On a cache hit, verifies byte-equality of the cached
 * canonical-form bytes against the new entry's (PIC-44): byte-equal reuses the
 * registration; a byte-mismatch fires `loom/runtime/registration-cache-collision`,
 * refuses to dedup, and registers under a disambiguated per-slug-counter name.
 *
 * V9f-T stub: always mints the base content-addressed name and calls
 * `registerTool` unconditionally, never storing or byte-comparing canonical-form
 * bytes and never emitting a collision — so the reuse-on-byte-equality and
 * disambiguate-on-mismatch tests red on their own assertions. The V9f
 * implementation fills this in.
 */
export function registerToolInCache(
  _cache: RegistrationCache,
  entry: RegistrationEntry,
  deps: RegistrationCacheDeps,
): string {
  const name =
    entry.kind === "callee"
      ? `__loom_callee_${entry.slug}__${entry.postRenameName}`
      : `__loom_respond_${entry.slug}`;
  deps.registerTool(name);
  return name;
}
