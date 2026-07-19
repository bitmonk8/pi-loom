// FOO-1, FOO-2, BAR-1 cited. This test asserts theta/runtime/ghost, which is NOT
// in the registry — the seeded asserted-code-absent-from-registry violation.

export function checks(): void {
  expect(diag.code).toBe("theta/parse/foo-bad");
  expect(other.code).toBe("theta/runtime/ghost");
}
