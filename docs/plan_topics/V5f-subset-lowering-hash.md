# `V5f` — Schema lowering and canonical hash

**Spec.** [`../spec_topics/schema-subset.md`](../spec_topics/schema-subset.md), [`../spec_topics/schemas.md`](../spec_topics/schemas.md).

**Adds.** The lowering pass over the accepted JSON-Schema subset ([`V5d`](./V5d-reject-gate.md) owns the reject gate): the `__inline_<slug>` hoist, auto `$defs`/`$ref`, the per-schema two-map sidecar (wire-name translation map plus named-enum-position map) whose shared type `V5f` owns as the seam `V2e` consumes, per-query `$defs` pruning, and the canonical-hash → 16-hex-slug recipe with the slug-collision byte-verify posture. The recipe's binder-number-rendered canonical form composes the `V2d` renderer, supplying that renderer's `integer`-vs-`number` kind discriminator from the JSON-Schema `type` of the enclosing `const`/`enum` position rather than from runtime integrality.

**Tests.**
- `loom/load/schema-slug-collision`: two non-byte-identical inline schemas hashing to the same slug fire; byte-identical ones dedup silently.
- The canonical hash is SHA-256 over the keys-sorted, whitespace-free, binder-number-rendered canonical form; the slug is its first 16 hex.
- [SUBS-1](../spec_topics/schema-subset.md#subs-1) (Lowering Algorithm step 3, union lowering): a union all of whose arms are primitive — treating `null` as a primitive — lowers to `{ "type": [...] }`, and a union with any non-primitive arm lowers to `{ "anyOf": [...] }`; arms are emitted in source order with `"null"` last whenever the union admits it (`string | number` → `{ "type": ["string", "number"] }`; `string | null` → `{ "type": ["string", "null"] }`; `string | Author` → `{ "anyOf": [...] }`).
- [schema-subset.md — Lowering Algorithm step 5 (per-schema sidecar)](../spec_topics/schema-subset.md#lowering-algorithm) (SUBS code-keyed area): the lowering pass captures, per `$defs` entry, a two-map sidecar — a wire-name translation map and a named-enum-position map keyed by JSON Pointer into the lowered fragment; a named-enum position is present iff its source type was a named `enum` declaration, and anonymous string-literal-union positions are absent.

**Deps.** `V5f-T`, `V5d`, `V5a`, `V5b`, `V2d`

**Ships when.** `npm test` asserts the canonical-hash recipe, slug-collision detection, and the per-schema sidecar two-map shape against the lowered fragment.
