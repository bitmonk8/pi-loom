// FOO-1, FOO-2, BAR-1 cited. Only theta/parse/foo-bad is asserted. The registry
// also lists a second runtime code that no test asserts — the seeded
// registry-code-with-no-asserting-test violation. (That code's token is
// intentionally omitted from this whole file so the asserting-test scan finds
// no test asserting it.)

export function checks(): void {
  expect(diag.code).toBe("theta/parse/foo-bad");
}
