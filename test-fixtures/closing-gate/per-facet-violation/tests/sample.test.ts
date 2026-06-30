// Seeded VIOLATION test corpus for the H5f per-facet citing-test arm. It is the
// per-facet-no-violation corpus with ONE facet's facet-naming citing test
// removed: the cka-1 row's SECOND facet carries no test citing both cka-1 and
// that facet's leaf-ID inline (the leaf-ID is cited nowhere in this corpus), so
// the per-facet arm reddens for that facet while every other facet — and every
// H5a REQ-ID / diagnostic-code arm — stays green:
//
//   FOO-1 row → facet V1a covered (H7a co-witness excluded).
//   FOO-2 row → facets V2c and V3b covered.
//   cka-1 row → first facet V5a covered; second facet NOT covered  ← the seeded
//               violation (its leaf-ID is deliberately cited nowhere below).
//
// Every mapped REQ-ID is still cited inline and the sole registry code asserted,
// so only the H5f per-facet arm's pass/fail is exercised by this scenario.

export function checks(): void {
  // FOO-1 facet V1a (H7a co-witness excluded — no facet test required for it).
  expect("FOO-1 facet V1a").toBeTruthy();
  // FOO-2 facet V2c.
  expect("FOO-2 facet V2c").toBeTruthy();
  // FOO-2 facet V3b.
  expect("FOO-2 facet V3b").toBeTruthy();
  // cka-1 first facet V5a.
  expect("cka-1 facet V5a").toBeTruthy();
  // (The cka-1 row's second facet deliberately has NO facet-naming citing test.)
  // BAR-1 single-leaf row V8d — out of per-facet scope; registry code asserted.
  expect(diag.code).toBe("loom/parse/foo-bad");
}
