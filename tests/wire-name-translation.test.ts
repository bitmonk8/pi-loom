import { describe, expect, it } from "vitest";
import { type SchemaSidecar } from "../src/parser/schema-lowering";
import { makeEnumValue, valuesEqual, type ThetaValue } from "../src/runtime/value";
import {
  translateInbound,
  translateOutbound,
} from "../src/runtime/wire-translation";

// V2e-T — failing tests for the paired `V2e` "wire-name translation boundary"
// implementation.
//
// Spec: runtime-value-model.md §"Wire-name translation" (the RVM code-keyed
// obligation area — no numbered REQ-IDs) and schemas.md §"Wire-name renaming".
// Wire-name translation happens in exactly two places — *inbound* (model output
// → theta value, after AJV validation) and *outbound* (theta value → JSON). The
// inbound pass (a) rebuilds theta-side names using the V5f wire-name sidecar so
// theta code never sees wire names, and (b) reattaches each named-enum position's
// declaring-enum tag (V2c representation) so the result compares equal to a
// locally constructed variant; anonymous string-literal-union positions are
// absent from the sidecar and receive no tag. Frontmatter `params:` defaults
// BYPASS the inbound pass — they arrive already branded and theta-side-named.
//
// These tests red because the V2e theta-side rebuild and enum-tag reattach are
// absent: `translateInbound` / `translateOutbound` are inert identity stubs, so
// wire names survive inbound, named-enum positions stay plain strings, and
// outbound never produces wire names. Each test reds on its own primary
// assertion, not on a compile error, missing fixture, or harness throw.

// A schema with one renamed field (`first_name as "FirstName"`), one
// non-renamed field (`age`), and one non-renamed named-enum field
// (`severity: Severity`). The V5f sidecar carries the wire-name map (renamed
// fields only) and the named-enum-position map (named `enum` positions only).
function externalUserSidecar(): ReadonlyMap<string, SchemaSidecar> {
  const sidecar: SchemaSidecar = {
    wireNames: [{ theta: "first_name", wire: "FirstName" }],
    namedEnumPositions: [{ pointer: "/properties/severity", enumName: "Severity" }],
  };
  return new Map([["ExternalUser", sidecar]]);
}

describe("V2e-T — inbound wire-name translation (runtime-value-model.md §Wire-name translation, RVM code-keyed area)", () => {
  it("inbound translation rebuilds theta-side names so theta code never sees wire names", () => {
    // RVM §Wire-name translation, inbound (a): after AJV validation the runtime
    // rebuilds the value with theta-side names using the schema's translation
    // map. The validated JSON is wire-named (`FirstName`); the theta-side value
    // is keyed by the theta identifier (`first_name`) and the wire key is gone.
    const result = translateInbound({
      validated: { FirstName: "Ada", age: 36 },
      sidecars: externalUserSidecar(),
      rootDef: "ExternalUser",
    }) as { readonly [k: string]: ThetaValue };

    expect(result.first_name).toBe("Ada");
    expect(Object.prototype.hasOwnProperty.call(result, "FirstName")).toBe(false);
    // The un-renamed field keeps its name (wire name equals theta name).
    expect(result.age).toBe(36);
  });

  it("inbound reattaches the declaring-enum tag at a named-enum position (compares equal to a locally constructed variant)", () => {
    // RVM §Wire-name translation, inbound (b): at every named-enum position the
    // sidecar maps to a declaring-enum name, the runtime reattaches that enum's
    // tag to the validated string, so the rebuilt value compares equal to a
    // locally constructed `Severity` variant — and `JSON.stringify` still yields
    // the bare wire string (the tag never appears in JSON output).
    const result = translateInbound({
      validated: { FirstName: "Ada", age: 36, severity: "high" },
      sidecars: externalUserSidecar(),
      rootDef: "ExternalUser",
    }) as { readonly severity: ThetaValue };

    expect(valuesEqual(result.severity, makeEnumValue("Severity", "high"))).toBe(true);
    expect(JSON.stringify(result.severity)).toBe('"high"');
  });

  it("inbound tags a named-enum position but leaves an anonymous string-literal-union position untagged", () => {
    // RVM §Wire-name translation: a named-enum position (present in the sidecar)
    // is tagged so it compares equal to a constructed variant; an anonymous
    // string-literal-union position is absent from the sidecar and receives no
    // tag, so equality falls back to plain string equality (`Severity.Low ==
    // "low"` remains `false`). The contrast pins the discrimination between the
    // two position kinds — both fields carry the same wire string `"low"`.
    const mixedSidecar: ReadonlyMap<string, SchemaSidecar> = new Map([
      [
        "Report",
        {
          wireNames: [],
          // `graded` is a named `enum Severity`; `freeform` is an anonymous
          // `"low" | "medium" | "high"` literal union — absent from the map.
          namedEnumPositions: [{ pointer: "/properties/graded", enumName: "Severity" }],
        } satisfies SchemaSidecar,
      ],
    ]);
    const result = translateInbound({
      validated: { graded: "low", freeform: "low" },
      sidecars: mixedSidecar,
      rootDef: "Report",
    }) as { readonly graded: ThetaValue; readonly freeform: ThetaValue };

    // The named-enum position is tagged — compares equal to a constructed variant.
    expect(valuesEqual(result.graded, makeEnumValue("Severity", "low"))).toBe(true);
    // The anonymous-union position stays a plain string — no tag attached.
    expect(result.freeform).toBe("low");
    expect(valuesEqual(result.freeform, makeEnumValue("Severity", "low"))).toBe(false);
  });

  it("inbound translation recurses through nested object fields", () => {
    // RVM §Wire-name translation: the inbound walk recurses through nested
    // object fields; a wire name nested one level deep is still rebuilt to its
    // theta-side name (theta code never sees a wire name at any depth).
    const nestedSidecar: ReadonlyMap<string, SchemaSidecar> = new Map([
      [
        "Outer",
        {
          wireNames: [{ theta: "inner", wire: "Inner" }],
          namedEnumPositions: [],
        } satisfies SchemaSidecar,
      ],
      [
        "Inner",
        {
          wireNames: [{ theta: "first_name", wire: "FirstName" }],
          namedEnumPositions: [],
        } satisfies SchemaSidecar,
      ],
    ]);
    const result = translateInbound({
      validated: { Inner: { FirstName: "Ada" } },
      sidecars: nestedSidecar,
      rootDef: "Outer",
    }) as { readonly inner: { readonly [k: string]: ThetaValue } };

    expect(result.inner.first_name).toBe("Ada");
    expect(Object.prototype.hasOwnProperty.call(result.inner, "FirstName")).toBe(false);
  });
});

describe("V2e-T — defaults bypass inbound translation (runtime-value-model.md §Wire-name translation)", () => {
  it("a frontmatter default arrives already branded and theta-side-named, bypassing the inbound pass", () => {
    // RVM §Wire-name translation, defaults clause: a default authored as
    // `Severity.High` is parsed as an ordinary Theta value and arrives already
    // branded (V2c `makeEnumValue`) and theta-side-named — it does NOT pass
    // through `translateInbound`. Proof of the bypass: the same wire string
    // arriving as *model output* needs the inbound pass to brand it into a value
    // equal to the default; the default (built with no translation) is already
    // in that branded form.
    const defaultSeverity = makeEnumValue("Severity", "high"); // defaults path: no translation
    const translated = translateInbound({
      validated: { severity: "high" },
      sidecars: externalUserSidecar(),
      rootDef: "ExternalUser",
    }) as { readonly severity: ThetaValue };

    // Model output, once translated, equals the default — so the default's
    // untranslated branded value is exactly what the inbound pass produces,
    // confirming defaults legitimately skip the pass.
    expect(valuesEqual(translated.severity, defaultSeverity)).toBe(true);
    // And the default needs no translation to serialise to its bare wire string.
    expect(JSON.stringify(defaultSeverity)).toBe('"high"');
  });
});

describe("V2e-T — outbound wire-name translation (runtime-value-model.md §Wire-name translation)", () => {
  it("outbound translation produces wire-named JSON from a theta-side value", () => {
    // RVM §Wire-name translation, outbound: when constructing tool input / query
    // response payloads / `invoke` arguments, the runtime walks the theta-side
    // value and produces wire-named JSON — the theta-side name (`first_name`) is
    // rewritten to its wire name (`FirstName`) and the theta-side key is gone.
    const wire = translateOutbound({
      value: { first_name: "Ada", age: 36 },
      sidecars: externalUserSidecar(),
      rootDef: "ExternalUser",
    }) as { readonly [k: string]: unknown };

    expect(wire.FirstName).toBe("Ada");
    expect(Object.prototype.hasOwnProperty.call(wire, "first_name")).toBe(false);
    expect(wire.age).toBe(36);
  });
});
