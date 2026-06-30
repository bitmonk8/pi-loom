# H5f per-facet citing-test arm — enabled for this scenario

The presence of this file flips `loadCorpus`'s `perFacetCitingTests` flag on, so
the H5f per-facet citing-test arm runs against this fixture. Fixtures for the
other arms omit it and leave this arm dormant, exactly as `h5b-deps.md` and
`plan-leaves.md` gate the H5d / H5e arms.
