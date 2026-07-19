// Seeded NO-VIOLATION test corpus for the H5f per-facet citing-test arm. Every
// facet leaf of every multi-leaf coverage-matrix row carries a facet-naming
// citing test citing BOTH the row's subject (the numbered REQ-ID, or the cka-<n>
// token for the code-keyed row) and that facet's closing-leaf-ID inline:
//
//   FOO-1 row → facet V1a (the H7a leaf is a co-witness — excluded from the
//               facet partition, so it needs no per-facet citing test).
//   FOO-2 row → facets V2c and V3b, each with its own facet-naming citing test.
//   cka-1 row → facets V5a and V5b, each with its own facet-naming citing test.
//   BAR-1 row → single-leaf V8d, out of per-facet scope.
//
// The H5a REQ-ID / diagnostic-code arms also stay green: every mapped REQ-ID is
// cited inline and the sole registry code is asserted.

export function checks(): void {
  // FOO-1 facet V1a (H7a co-witness excluded — no facet test required for it).
  expect("FOO-1 facet V1a").toBeTruthy();
  // FOO-2 facet V2c.
  expect("FOO-2 facet V2c").toBeTruthy();
  // FOO-2 facet V3b.
  expect("FOO-2 facet V3b").toBeTruthy();
  // cka-1 facet V5a.
  expect("cka-1 facet V5a").toBeTruthy();
  // cka-1 facet V5b.
  expect("cka-1 facet V5b").toBeTruthy();
  // BAR-1 single-leaf row V8d — out of per-facet scope; registry code asserted.
  expect(diag.code).toBe("theta/parse/foo-bad");
}
