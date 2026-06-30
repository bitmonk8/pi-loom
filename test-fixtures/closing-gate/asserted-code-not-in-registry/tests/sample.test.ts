// FOO-1, FOO-2, BAR-1 cited. This test asserts loom/runtime/ghost, which is NOT
// in the registry — the seeded asserted-code-absent-from-registry violation.

export function checks(): void {
  expect(diag.code).toBe("loom/parse/foo-bad");
  expect(other.code).toBe("loom/runtime/ghost");
}
