// FOO-1, FOO-2, BAR-1 cited. FOO-3 is unmapped, so it carries no citing-test
// obligation and is exercised only by the unmapped-executable-REQ-ID arm.

export function checks(): void {
  expect(diag.code).toBe("loom/parse/foo-bad");
}
