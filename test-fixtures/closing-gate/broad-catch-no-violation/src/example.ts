// Seeded broad-catch allow-list fixture (H5c): every exemption comment cites a
// token the predicate admits — one entry per admitted arm: a coverage-matrix
// REQ-ID, an exactly-one cka-<n> Token cell, a concrete theta/... registry code,
// and the structural pi-sdk-boundary token.
//
// These are fixture data outside the gated src tree; the broad `catch` clauses
// here are never linted by no-broad-catch.

export function pisdkBoundary(): void {
  try {
    hostCall();
  } catch (e: unknown) {
    handle(e);
  } // allow-broad-catch: pi-sdk-boundary — conventions.md Specific exception types only
}

export function reqIdArm(): void {
  try {
    work();
  } catch (e: unknown) {
    handle(e);
  } // allow-broad-catch: FOO-1 — spec/foo.md
}

export function ckaArm(): void {
  try {
    work();
  } catch (e: unknown) {
    handle(e);
  } // allow-broad-catch: cka-1 — spec/foo.md
}

export function registryCodeArm(): void {
  try {
    work();
  } catch (e: unknown) {
    handle(e);
  } // allow-broad-catch: theta/parse/foo-bad — spec/foo.md
}
