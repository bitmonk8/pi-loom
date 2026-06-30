// V2e / V2e-T — the wire-name translation boundary seam.
//
// This module owns the inbound/outbound wire-name translation pass of
// runtime-value-model.md §"Wire-name translation" (the RVM code-keyed
// obligation area — no numbered REQ-IDs). Wire-name translation happens in
// exactly two places:
//
//   - *Inbound* (model output → loom value): after AJV validation against the
//     lowered schema, the runtime walks the validated JSON and (a) rebuilds the
//     value with loom-side names using each schema's translation map (the
//     `V5f`-produced wire-name sidecar), and (b) at every position the lowering
//     pass's *Named-enum positions* sidecar maps to a declaring-enum name,
//     reattaches that enum's tag (via the `V2c` `makeEnumValue` representation)
//     so the resulting value compares equal to a locally constructed variant of
//     the same enum. Anonymous string-literal-union positions are absent from
//     the sidecar and receive no tag — equality on those falls back to plain
//     string equality (`Severity.Low == "low"` remains `false`). The walk
//     recurses through arrays, nested object fields, and `Result.Ok` /
//     `Result.Err` payloads. Loom code never sees wire names.
//   - *Outbound* (loom value → JSON): the runtime walks the loom-side value and
//     produces wire-named JSON before AJV validation.
//
//   Frontmatter `params:` defaults **bypass** the inbound translation pass:
//   defaults are parsed as ordinary Loom values at frontmatter-parse time and
//   arrive at the loom body already branded and loom-side-named, so a default
//   authored as `Severity.High` is indistinguishable from a body-code
//   `Severity.High` — neither passes through `translateInbound`.
//
// V2e-T (tests-task) declares these seam shapes and stubs every behaviour-
// bearing function inertly (identity passthrough) so the failing tests compile
// and red on their own primary assertions — the loom-side rebuild and the
// enum-tag reattach are absent. The paired V2e implementation leaf fills these
// in, consuming the `V5f` per-schema sidecar.

import { type SchemaSidecar } from "../parser/schema-lowering";
import { type LoomValue } from "./value";

/**
 * Inbound translation input. The runtime supplies the AJV-validated, wire-named
 * JSON together with the `V5f`-produced per-`$defs` sidecars (keyed by `$defs`
 * name so the walk can recurse through `$ref`) and the `$defs` name of the
 * schema the validated value conforms to.
 */
export interface InboundTranslationInput {
  /** AJV-validated, wire-named JSON (model output / typed decode source). */
  readonly validated: unknown;
  /** Per-`$defs` sidecars keyed by `$defs` name, for recursion through `$ref`. */
  readonly sidecars: ReadonlyMap<string, SchemaSidecar>;
  /** The `$defs` name of the schema `validated` conforms to. */
  readonly rootDef: string;
}

/**
 * Outbound translation input: a loom-side value plus the per-`$defs` sidecars
 * and the root `$defs` name, mirroring {@link InboundTranslationInput}.
 */
export interface OutboundTranslationInput {
  /** The loom-side value to lower to wire-named JSON. */
  readonly value: LoomValue;
  /** Per-`$defs` sidecars keyed by `$defs` name, for recursion through `$ref`. */
  readonly sidecars: ReadonlyMap<string, SchemaSidecar>;
  /** The `$defs` name of the schema `value` conforms to. */
  readonly rootDef: string;
}

/**
 * Inbound wire-name translation (model output → loom value). Walks the
 * AJV-validated JSON, rebuilds loom-side names using the sidecar's wire-name
 * translation map, and reattaches each named-enum position's declaring-enum tag
 * so the result compares equal to a locally constructed variant.
 *
 * Stub: returns the validated value unchanged so the V2e-T tests compile and
 * red — the loom-side rebuild and enum-tag reattach are absent.
 */
export function translateInbound(input: InboundTranslationInput): LoomValue {
  return input.validated as LoomValue;
}

/**
 * Outbound wire-name translation (loom value → JSON). Walks the loom-side value
 * and produces wire-named JSON before AJV validation.
 *
 * Stub: returns the loom-side value unchanged so the V2e-T tests compile and
 * red — the wire-name rewrite is absent.
 */
export function translateOutbound(input: OutboundTranslationInput): unknown {
  return input.value;
}
