// Seeded no-violation test corpus. Cites every coverage-matrix-mapped REQ-ID
// inline and asserts every (non-typecheck) registry code.
//
// FOO-1: first obligation covered.
// FOO-2: second obligation covered.
// BAR-1: bar obligation covered.

export function checks(): void {
  expect(diag.code).toBe("theta/parse/foo-bad");
}
