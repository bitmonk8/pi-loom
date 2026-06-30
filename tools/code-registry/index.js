// V7b — Diagnostic code registry and closing gate.
//
// This module IS the machine-checkable diagnostic registry the `H5a` closing
// gate consumes: a structured parse of the four sharded registry tables
// (`loom/parse/*`, `loom/load/*`, `loom/runtime/*`, `loom/host/*`) into one row
// per code carrying its namespace / severity / phase / trigger / message, plus
// the closed-set (DIAG-2) and stable-id (DIAG-3) enforcement, and the
// Message-column-normative lookup (DIAG-4) that asserting tests source their
// expected strings from.
//
// ── V7b-T STATUS: STUBBED SEAM ────────────────────────────────────────────────
// This file is the seam the paired V7b-T tests pin. At V7b-T it is INERT: every
// export returns an empty / undefined result so the test suite type-checks,
// imports cleanly, and reds out on each test's PRIMARY assertion (the absent
// machine-checkable registry, closed-set / stable-id enforcement, and message
// lookup) rather than on a harness throw. The paired V7b implementation task
// fills these in until the V7b-T tests go green.
//
// Findings shape (mirrors the H5a closing gate): { kind, subject, detail }.
//   - asserted-code-not-in-registry  : a test asserts a code with no registry row (DIAG-2)
//   - registry-code-no-asserting-test: a registry code no test asserts (DIAG-2)
//   - code-renamed                   : a baseline (stable) code absent from the
//                                      current registry — a rename, deferred to
//                                      loom 2.0 (DIAG-3)

/**
 * Parse the diagnostics registry markdown (the concatenated four sharded
 * tables) into one structured row per code.
 *
 * @param {string} _text concatenated registry-table markdown
 * @returns {{code: string, namespace: string, severity: string, phase: string, trigger: string, message: string}[]}
 */
export function parseRegistry(_text) {
  // V7b: parse each `| `loom/...` | Sev | Phase | Trigger | ... | Message |`
  // body row into a structured registry row (namespace from the code, message
  // from the backtick-stripped last cell). Inert at V7b-T.
  return [];
}

/**
 * Look up a code's normative *Message* column string in a parsed registry.
 *
 * @param {{code: string, message: string}[]} _registry parsed registry rows
 * @param {string} _code the diagnostic code to resolve
 * @returns {string | undefined} the normative message string, or undefined when absent
 */
export function registryMessage(_registry, _code) {
  // V7b: return the row's Message column verbatim (DIAG-4). Inert at V7b-T.
  return undefined;
}

/**
 * Closed-set enforcement (DIAG-2): reconcile the asserted code set against the
 * machine-checkable registry, in both directions.
 *
 * @param {{registry: {code: string}[], assertedCodes: string[]}} _input
 * @returns {{kind: string, subject: string, detail: string}[]}
 */
export function reconcileClosedSet(_input) {
  // V7b: emit `asserted-code-not-in-registry` for an asserted code with no
  // registry row and `registry-code-no-asserting-test` for a registry code no
  // test asserts. Inert at V7b-T.
  return [];
}

/**
 * Stable-id enforcement (DIAG-3): a registered code is a stable identifier, so
 * a code present in the pinned baseline but absent from the current registry is
 * a rename — deferred to loom 2.0 — and fails the gate.
 *
 * @param {{currentCodes: string[], baselineCodes: string[]}} _input
 * @returns {{kind: string, subject: string, detail: string}[]}
 */
export function reconcileStableIds(_input) {
  // V7b: emit `code-renamed` for each baseline code absent from the current
  // registry. Inert at V7b-T.
  return [];
}
