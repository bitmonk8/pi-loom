// V11e / V11e-T — the binder determinism seed derivation seam.
//
// This module owns the FNV-1a seed derivation of
// binder/determinism-cancellation-failure.md §Determinism: the per-loom binder
// seed is the 32-bit FNV-1a hash (offset basis `0x811c9dc5`, prime
// `0x01000193`) of the loom's bare command name (the slash-registry name
// without the leading `/`), over the UTF-8 encoding of that name (no BOM, no
// NUL terminator), masked to 32-bit unsigned. The same loom therefore derives
// the same seed value on every binder call across processes and runs — loom's
// deterministic input to the provider call, whose `temperature: 0` pin is set
// by the V9j `buildBinderCompleteCall` and carried into the provider request.
//
// Spec: binder/determinism-cancellation-failure.md §Determinism (anchor before
// the reference-vector table): FNV-1a offset basis / prime, UTF-8 input bytes,
// 32-bit unsigned output mask, and the reference vectors
// (`code-review` → 0x7ba86b63, `hello` → 0x4f9f2cab, `a` → 0xe40c292c).
//
// V11e-T (tests-task) declares this seam and stubs it inertly so the failing
// determinism test compiles and reds on its own primary assertion (the FNV
// reference vectors) while the V11e body is absent. The paired V11e leaf fills
// in the FNV-1a algorithm.

/**
 * A sentinel returned by the inert V11e-T stub. It equals none of the
 * reference-vector seed values, so the determinism test reds on its own primary
 * assertion (the FNV reference vectors) while the V11e body is absent.
 */
const UNIMPLEMENTED_SEED = -1;

/**
 * Derive the deterministic per-loom binder seed from the loom's bare command
 * name via 32-bit FNV-1a (offset basis `0x811c9dc5`, prime `0x01000193`) over
 * the UTF-8 bytes of the name, masked to 32-bit unsigned.
 *
 * V11e-T stubs this inertly (returns {@link UNIMPLEMENTED_SEED}); the paired
 * V11e implementation leaf fills in the FNV-1a hash.
 */
export function deriveBinderSeed(bareCommandName: string): number {
  void bareCommandName;
  return UNIMPLEMENTED_SEED;
}
