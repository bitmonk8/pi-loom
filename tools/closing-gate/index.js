// H5a — REQ-ID / diagnostic-code closing-gate automation.
//
// This module IS the closing gate that reconciles the spec REQ-ID set and the
// diagnostics code registry against the plan's coverage-matrix and the
// asserting tests, operationalising conventions.md *REQ-ID discipline* and
// *Diagnostic message anchors* and the coverage-matrix.md closure obligation.
//
// The gate is a PURE reconciliation over an in-memory corpus snapshot:
// `runClosingGate(corpus)` returns a structured findings collection — one entry
// per gap, each tagged with the gap KIND it represents — and never throws or
// mutates global state. The caller decides the disposition: at H5a the gate is
// evaluated against the seeded fixtures under the dedicated test-fixtures root
// (`test-fixtures/closing-gate/`, outside docs/spec_topics/** and outside the
// live vitest corpus), green against the no-violation fixture and non-empty
// against each seeded violation fixture this leaf owns. The warn-only canary
// (H5b) consumes the returned collection; the hard-fail release-gate footing
// (H6a) raises the non-zero npm-test exit status over the live corpus. Neither
// the live-corpus gating footing nor the warn-only live wiring is built here.
//
// Gap KINDS this gate recognises (Adds. enumeration):
//   - unmapped-executable-req-id     : a spec REQ-ID with no coverage-matrix row
//   - mapped-req-id-no-citing-test   : a coverage-matrix-mapped numbered REQ-ID
//                                      with no test citing it inline
//   - registry-code-no-asserting-test: a registry code with no asserting test
//   - asserted-code-not-in-registry  : a test asserts a code absent from registry
//   - retired-live-id-clash          : a REQ-ID present in both live and retired
//   - per-prefix-numbering-hole      : an n ≤ max(live∪retired) neither live nor
//                                      retired for a prefix the corpus owns
//
// The `loom/typecheck/*` build-time `tsc` brand-string prefix is NOT a
// diagnostics-registry code and is excluded from registry reconciliation on
// both sides (registry-code-no-asserting-test and asserted-code-not-in-registry).
//
// The citing-test reconciliation is a best-effort scan for the inline `PREFIX-N`
// citation across the test sources: it certifies that a citing test EXISTS for
// each mapped REQ-ID, not that the cited test's assertion is semantically
// faithful to the obligation — faithfulness stays a TDD / self-review obligation.

import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

// Prefixes that govern the spec corpus itself rather than runtime behaviour and
// so are NOT executable spec REQ-IDs (conventions.md *REQ-ID discipline*).
const NON_EXECUTABLE_PREFIXES = new Set(["GOV"]);

// The build-time tsc brand-string namespace, excluded from registry
// reconciliation on both sides (conventions.md *REQ-ID discipline* carve-out).
const TYPECHECK_PREFIX = "loom/typecheck/";

// ── Markdown exclusion stripping (GOV-3) ──────────────────────────────────────
// Before REQ-ID extraction, strip fenced code blocks, HTML comments, and inline
// code spans, in that order, so a REQ-ID inside any of them is invisible.
function stripMarkdownExclusions(text) {
  return text
    .replace(/```[\s\S]*?```/g, "")
    .replace(/~~~[\s\S]*?~~~/g, "")
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/`[^`\n]*`/g, "");
}

// ── Prefix table + retirement parsing ─────────────────────────────────────────
// Parse the governance prefix table (`| Page | Prefix |` rows) into the live
// prefix set, and the `## Retired REQ-IDs` section into the retired-ID set.
export function parsePrefixTable(text) {
  const prefixes = new Set();
  const lines = text.split("\n");
  let inTable = false;
  for (const line of lines) {
    if (/^\s*##\s+REQ-ID prefix table/i.test(line)) {
      inTable = true;
      continue;
    }
    if (inTable && /^\s*##\s+/.test(line)) inTable = false;
    if (!inTable) continue;
    const cells = parseTableRow(line);
    if (cells == null || cells.length < 2) continue;
    const prefix = cells[cells.length - 1].trim();
    if (/^[A-Z]{2,4}$/.test(prefix)) prefixes.add(prefix);
  }
  return [...prefixes];
}

export function parseRetiredReqIds(text) {
  const retired = new Set();
  const lines = text.split("\n");
  let inSection = false;
  for (const line of lines) {
    if (/^\s*##\s+Retired REQ-IDs/i.test(line)) {
      inSection = true;
      continue;
    }
    if (inSection && /^\s*##\s+/.test(line)) inSection = false;
    if (!inSection) continue;
    for (const id of line.match(/\b[A-Z]{2,4}-[1-9][0-9]*\b/g) ?? []) {
      retired.add(id);
    }
  }
  return [...retired];
}

// Split a markdown table row `| a | b |` into trimmed cells, or null if the line
// is not a table body row (header separators `|---|` are rejected).
function parseTableRow(line) {
  const trimmed = line.trim();
  if (!trimmed.startsWith("|")) return null;
  if (/^\|[\s:|-]+\|?\s*$/.test(trimmed)) return null; // separator row
  const inner = trimmed.replace(/^\|/, "").replace(/\|\s*$/, "");
  return inner.split("|").map((c) => c.trim());
}

// ── Spec REQ-ID extraction (GOV-3) ────────────────────────────────────────────
// Distinct `PREFIX-N` tokens over the exclusion-stripped spec sources, keyed to
// the live prefix set, excluding the non-executable governance family.
export function extractReqIds(sources, prefixes) {
  const executable = prefixes.filter((p) => !NON_EXECUTABLE_PREFIXES.has(p));
  if (executable.length === 0) return [];
  const re = new RegExp(`\\b(${executable.join("|")})-([1-9][0-9]*)\\b`, "g");
  const found = new Set();
  for (const src of sources) {
    const stripped = stripMarkdownExclusions(src.text);
    for (const m of stripped.matchAll(re)) found.add(`${m[1]}-${m[2]}`);
  }
  return [...found];
}

// ── Coverage-matrix parsing ───────────────────────────────────────────────────
// Parse the `| REQ-ID | Closing leaf(s) |` rows, expanding each `X-n … X-m`
// inclusive range, into the set of mapped REQ-IDs. Retired interior IDs are
// excluded from the citing-test obligation set by the caller (see runClosingGate).
export function parseCoverageMatrix(text) {
  const mapped = new Set();
  for (const line of text.split("\n")) {
    const cells = parseTableRow(line);
    if (cells == null || cells.length < 2) continue;
    const leftCell = cells[0];
    // Header row guard: the left cell of the header literally reads "REQ-ID".
    if (/^REQ-ID$/i.test(leftCell)) continue;
    for (const id of expandReqIdSpec(leftCell)) mapped.add(id);
  }
  return [...mapped];
}

// Expand a coverage-matrix left-cell REQ-ID spec into concrete IDs. Handles a
// `X-n … X-m` / `X-n ... X-m` inclusive contiguous range and comma-separated
// single IDs; mixed forms in one cell are each handled by their own segment.
function expandReqIdSpec(cell) {
  const out = [];
  const rangeRe = /\b([A-Z]{2,4})-([1-9][0-9]*)\s*(?:…|\.\.\.)\s*([A-Z]{2,4})-([1-9][0-9]*)\b/;
  for (const seg of cell.split(",")) {
    const piece = seg.trim();
    const range = piece.match(rangeRe);
    if (range != null && range[1] === range[3]) {
      const prefix = range[1];
      const lo = Number(range[2]);
      const hi = Number(range[4]);
      for (let n = lo; n <= hi; n++) out.push(`${prefix}-${n}`);
      continue;
    }
    const single = piece.match(/\b([A-Z]{2,4}-[1-9][0-9]*)\b/);
    if (single != null) out.push(single[1]);
  }
  return out;
}

// ── Diagnostics-registry parsing ──────────────────────────────────────────────
// Distinct backtick-delimited `loom/...` codes in the registry sources,
// excluding the `loom/typecheck/*` build-time brand namespace.
export function parseRegistryCodes(text) {
  const codes = new Set();
  for (const m of text.matchAll(/`(loom\/[a-z0-9/_-]+)`/g)) {
    const code = m[1];
    if (code.startsWith(TYPECHECK_PREFIX)) continue;
    codes.add(code);
  }
  return [...codes];
}

// ── Test-corpus scans ─────────────────────────────────────────────────────────
// Distinct `loom/...` codes a test asserts (in any quote or backtick form),
// excluding the `loom/typecheck/*` brand namespace.
export function extractAssertedCodes(sources) {
  const codes = new Set();
  for (const src of sources) {
    for (const m of src.text.matchAll(/loom\/[a-z0-9/_-]+/g)) {
      const code = m[0];
      if (code.startsWith(TYPECHECK_PREFIX)) continue;
      codes.add(code);
    }
  }
  return [...codes];
}

// Distinct `PREFIX-N` tokens cited inline anywhere in the test sources.
export function extractCitingReqIds(sources) {
  const ids = new Set();
  for (const src of sources) {
    for (const m of src.text.matchAll(/\b[A-Z]{2,4}-[1-9][0-9]*\b/g)) {
      ids.add(m[0]);
    }
  }
  return [...ids];
}

// ── The gate ──────────────────────────────────────────────────────────────────
/**
 * Reconcile a corpus snapshot and return one finding per gap.
 *
 * @param {{
 *   prefixTableText: string,
 *   specSources: {path: string, text: string}[],
 *   coverageMatrixText: string,
 *   registryText: string,
 *   testSources: {path: string, text: string}[],
 * }} corpus
 * @returns {{kind: string, subject: string, detail: string}[]}
 */
export function runClosingGate(corpus) {
  const prefixes = parsePrefixTable(corpus.prefixTableText);
  const retired = new Set(parseRetiredReqIds(corpus.prefixTableText));
  const specReqIds = extractReqIds(corpus.specSources, prefixes);
  const mapped = new Set(parseCoverageMatrix(corpus.coverageMatrixText));
  const registryCodes = parseRegistryCodes(corpus.registryText);
  const assertedCodes = new Set(extractAssertedCodes(corpus.testSources));
  const citingReqIds = new Set(extractCitingReqIds(corpus.testSources));

  const findings = [];

  // (1) Unmapped executable REQ-ID: a live spec REQ-ID with no coverage-matrix row.
  for (const id of specReqIds) {
    if (!mapped.has(id)) {
      findings.push({
        kind: "unmapped-executable-req-id",
        subject: id,
        detail: `spec REQ-ID ${id} has no coverage-matrix row`,
      });
    }
  }

  // (2) Mapped numbered REQ-ID with no citing test. The mapped set this arm
  // iterates is the matrix mappings intersected with the live executable set,
  // minus retired interior IDs (which carry no citing-test obligation).
  const executableSet = new Set(specReqIds);
  for (const id of mapped) {
    if (!executableSet.has(id)) continue; // mapping outside the live executable set
    if (retired.has(id)) continue; // retired interior ID: no citing-test obligation
    if (!citingReqIds.has(id)) {
      findings.push({
        kind: "mapped-req-id-no-citing-test",
        subject: id,
        detail: `coverage-matrix-mapped REQ-ID ${id} has no citing test in the test corpus`,
      });
    }
  }

  // (3) Registry code with no asserting test (loom/typecheck/* already excluded).
  for (const code of registryCodes) {
    if (!assertedCodes.has(code)) {
      findings.push({
        kind: "registry-code-no-asserting-test",
        subject: code,
        detail: `registry code ${code} has no asserting test`,
      });
    }
  }

  // (4) Asserted code absent from the registry (loom/typecheck/* already excluded).
  const registrySet = new Set(registryCodes);
  for (const code of assertedCodes) {
    if (!registrySet.has(code)) {
      findings.push({
        kind: "asserted-code-not-in-registry",
        subject: code,
        detail: `test asserts diagnostic code ${code} absent from the registry`,
      });
    }
  }

  // (5) Retired/live ID clash: a REQ-ID present in both the live spec set and
  // the retirement registry.
  for (const id of specReqIds) {
    if (retired.has(id)) {
      findings.push({
        kind: "retired-live-id-clash",
        subject: id,
        detail: `REQ-ID ${id} is both live in the spec and listed retired`,
      });
    }
  }

  // (6) Per-prefix numbering hole: for each prefix the corpus owns, an integer
  // n ≤ max(live ∪ retired) that is neither live nor retired.
  for (const hole of numberingHoles(specReqIds, retired)) {
    findings.push({
      kind: "per-prefix-numbering-hole",
      subject: hole,
      detail: `${hole} is a per-prefix numbering hole (neither live nor retired)`,
    });
  }

  return findings;
}

function numberingHoles(liveIds, retiredSet) {
  const byPrefix = new Map();
  const record = (id) => {
    const m = id.match(/^([A-Z]{2,4})-([1-9][0-9]*)$/);
    if (m == null) return;
    if (!byPrefix.has(m[1])) byPrefix.set(m[1], new Set());
    byPrefix.get(m[1]).add(Number(m[2]));
  };
  for (const id of liveIds) record(id);
  for (const id of retiredSet) record(id);

  const holes = [];
  for (const [prefix, nums] of byPrefix) {
    const max = Math.max(...nums);
    for (let n = 1; n <= max; n++) {
      if (!nums.has(n)) holes.push(`${prefix}-${n}`);
    }
  }
  return holes;
}

// ── Corpus loader ─────────────────────────────────────────────────────────────
// Read a fixture scenario directory in the conventional closing-gate layout into
// the in-memory corpus snapshot `runClosingGate` consumes:
//
//   <dir>/governance.md       — prefix table + retirement sections
//   <dir>/spec/**/*.md        — spec pages (PREFIX-N anchors)
//   <dir>/coverage-matrix.md  — REQ-ID → closing-leaf mapping table
//   <dir>/registry.md         — diagnostics registry table(s)
//   <dir>/tests/**            — the (seeded or live) test corpus
//
// At the live-corpus footing (H6a) the same loader is pointed at the live trees;
// the path selection MUST exclude the fixtures root so no seeded fixture is ever
// scanned as live coverage — that selection is the caller's responsibility.
export function loadCorpus(dir) {
  const read = (rel) => readFileSync(path.join(dir, rel), "utf8");
  return {
    prefixTableText: read("governance.md"),
    specSources: readTree(path.join(dir, "spec"), (f) => f.endsWith(".md")),
    coverageMatrixText: read("coverage-matrix.md"),
    registryText: readTree(path.join(dir, "registry"), (f) => f.endsWith(".md"))
      .map((s) => s.text)
      .join("\n") || readIfPresent(path.join(dir, "registry.md")),
    testSources: readTree(path.join(dir, "tests"), (f) => f.endsWith(".ts")),
  };
}

function readIfPresent(file) {
  return existsSync(file) ? readFileSync(file, "utf8") : "";
}

function readTree(dir, accept) {
  if (!existsSync(dir)) return [];
  const out = [];
  const entries = readdirSync(dir);
  for (const entry of entries) {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) {
      out.push(...readTree(full, accept));
    } else if (accept(entry)) {
      out.push({ path: full, text: readFileSync(full, "utf8") });
    }
  }
  return out;
}
