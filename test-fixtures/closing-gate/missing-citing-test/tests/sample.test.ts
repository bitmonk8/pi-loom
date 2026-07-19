// The second foo obligation is deliberately NOT cited here, though it is mapped
// in the coverage matrix — the seeded mapped-REQ-ID-with-no-citing-test
// violation. (Its REQ-ID token is intentionally omitted from this whole file so
// the best-effort inline-citation scan finds no citing test for it.)
//
// FOO-1: covered.
// BAR-1: covered.

export function checks(): void {
  expect(diag.code).toBe("theta/parse/foo-bad");
}
