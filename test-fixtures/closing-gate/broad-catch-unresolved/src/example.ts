// Seeded broad-catch violation fixture (H5c): an exemption comment whose cited
// token resolves to none of the four admitted arms — here a theta/... glob/
// wildcard family, which the theta/... arm's concrete-registry-code resolver
// never matches (the gate fires broad-catch-allow-list-unresolved).
//
// These are fixture data outside the gated src tree; the broad `catch` clause
// here is never linted by no-broad-catch.

export function wildcardFamily(): void {
  try {
    work();
  } catch (e: unknown) {
    handle(e);
  } // allow-broad-catch: theta/host/session-shutdown-* — spec/foo.md
}
