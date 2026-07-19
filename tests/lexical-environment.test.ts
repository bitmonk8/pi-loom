import { describe, expect, it } from "vitest";
import {
  buildEnvironment,
  ThetaEvalHost,
  type MaterializedImport,
} from "../src/runtime/lexical-environment";
import type {
  Block,
  FnDecl,
  ThetaBody,
  SchemaDecl,
} from "../src/parser/theta-document";
import type { SourceRange } from "../src/diagnostics/diagnostic";

// V19b-T — failing tests for the paired `V19b` "lexical environment and scope
// model". Integration-realisation leaf: every test is a `Convention:` witness
// (conventions.md §"Per-phase TDD ritual" / §"Leaf format"); the inline
// REQ-ID / `cka` citations are integration witnesses of already-closed
// obligations, not re-closures, and the leaf adds no coverage-matrix row.
//
// Spec (integration witnesses): expressions.md §"Identifier resolution"
// (`cka-3` / `cka-4`), bindings.md `cka-6`, functions.md FN-1 / FN-3…FN-5,
// imports.md §Visibility, runtime-value-model.md (enum row).
//
// These tests red because the real `V19b` environment is absent: `resolve`
// returns the inert `unresolved` arm (so every precedence / `fn`-hoisting /
// import-materialisation assertion reds), `writeBinding` inertly accepts every
// write without recording it (so the `let mut` value-update assertion reds and
// the immutable-rejection assertion reds), `bindIterationVariable` returns an
// inert scope (so the per-iteration fresh-binding assertion reds),
// `resolveSchema` / `resolveEnumVariant` return `undefined` (so the
// constructor / `Enum.Variant` assertions red), and the `ThetaEvalHost` methods
// return the inert `null` sentinel (so the host identifier-read assertion
// reds). No test reds on a compile error, a missing fixture, or a harness
// throw. The paired `V19b` implementation leaf fills these in.

// --- AST builders ----------------------------------------------------------

/** A throwaway 1:1–1:2 span for the AST-node builders. */
function span(): SourceRange {
  return { start: { line: 1, column: 1 }, end: { line: 1, column: 2 } };
}

/** An empty `ThetaBody` (no statements, no tail). */
function emptyBody(): ThetaBody {
  return { statements: [], tail: null };
}

/** A minimal top-level `fn` declaration node carrying an empty body block. */
function fnDecl(name: string): FnDecl {
  const body: Block = { statements: [], tail: null };
  return {
    kind: "fn",
    name,
    params: [],
    returnType: null,
    body,
    range: span(),
  };
}

/** A minimal `schema` declaration node. */
function schemaDecl(name: string): SchemaDecl {
  return { kind: "schema", name, range: span() };
}

// --- Identifier-resolution first-match precedence --------------------------

describe("V19b-T — identifier-resolution first-match precedence (expressions.md §Identifier resolution, cka-3/cka-4)", () => {
  it("Convention: resolves local `let`/param > top-level `fn` > import > callable in first-match order (cka-3/cka-4)", () => {
    // A name bound at every arm resolves to the LOCAL slot first (a local
    // binding shadows all outer scopes).
    const bodyAll: ThetaBody = { statements: [fnDecl("thing")], tail: null };
    const importsAll: readonly MaterializedImport[] = [
      { name: "thing", kind: "fn", fn: fnDecl("thing") },
    ];
    const envLocal = buildEnvironment({
      body: bodyAll,
      imports: importsAll,
      callables: ["thing"],
    });
    envLocal.defineLocal("thing", 42, false);
    expect(
      envLocal.resolve("thing").arm,
      "cka-3: a local binding shadows the fn / import / callable arms",
    ).toBe("local");

    // With no local, the top-level `fn` arm wins over import + callable.
    const envFn = buildEnvironment({
      body: bodyAll,
      imports: importsAll,
      callables: ["thing"],
    });
    expect(
      envFn.resolve("thing").arm,
      "cka-3: a top-level `fn` shadows the import / callable arms",
    ).toBe("fn");

    // With no local and no top-level `fn`, the import arm wins over callable.
    const envImport = buildEnvironment({
      body: emptyBody(),
      imports: importsAll,
      callables: ["thing"],
    });
    expect(
      envImport.resolve("thing").arm,
      "cka-3: an import shadows the callable arm",
    ).toBe("import");

    // The callable arm is the lowest-precedence match (`V19b` DEFINES its
    // position but does not populate/execute it).
    const envCallable = buildEnvironment({
      body: emptyBody(),
      callables: ["thing"],
    });
    expect(
      envCallable.resolve("thing").arm,
      "cka-3: the callable arm is the lowest-precedence match",
    ).toBe("callable");
  });

  it("Convention: a nested-scope local shadows an outer-scope local (lexical shadowing, cka-4)", () => {
    const env = buildEnvironment({ body: emptyBody() });
    env.defineLocal("x", 1, false);
    const inner = env.child();
    inner.defineLocal("x", 2, false);
    expect(inner.resolve("x").value, "cka-4: inner local shadows outer").toBe(2);
    expect(env.resolve("x").value, "cka-4: outer local unshadowed in its own scope").toBe(1);
  });

  it("Convention: the real `EvalHost` resolves a bare identifier read to its bound local value (cka-3)", () => {
    const env = buildEnvironment({ body: emptyBody() });
    env.defineLocal("greeting", "hi", false);
    const host = new ThetaEvalHost(env);
    expect(
      host.resolveIdentifier("greeting"),
      "cka-3: the EvalHost consults the environment for an identifier read",
    ).toBe("hi");
  });
});

// --- Import-arm materialisation --------------------------------------------

describe("V19b-T — import-arm materialisation (imports.md §Visibility; V15c)", () => {
  it("Convention: materialises imported `.thetalib` fn/schema/enum; an imported fn is resolvable and callable", () => {
    const imported = fnDecl("helper");
    const imports: readonly MaterializedImport[] = [
      { name: "helper", kind: "fn", fn: imported },
      { name: "Widget", kind: "schema" },
      { name: "Color", kind: "enum", variants: ["Red", "Blue"] },
    ];
    const env = buildEnvironment({ body: emptyBody(), imports });

    const r = env.resolve("helper");
    expect(r.arm, "imported fn resolves via the import arm").toBe("import");
    expect(r.callable, "imported fn is callable (execution rides V19d's trampoline)").toBe(true);
    expect(r.fn?.name, "the imported fn body is carried").toBe("helper");

    expect(
      env.resolveSchema("Widget"),
      "an imported schema constructor resolves",
    ).toBeDefined();
    expect(
      env.resolveEnumVariant("Color", "Red"),
      "an imported enum variant resolves",
    ).toBeDefined();
  });
});

// --- Top-level schema/enum registration ------------------------------------

describe("V19b-T — top-level schema/enum registration (runtime-value-model.md enum row)", () => {
  it("Convention: registers top-level schema/enum so named-schema constructors and Enum.Variant access resolve", () => {
    const body: ThetaBody = { statements: [schemaDecl("Author")], tail: null };
    const env = buildEnvironment({
      body,
      enums: [{ name: "Severity", variants: ["Low", "High"] }],
    });

    expect(
      env.resolveSchema("Author"),
      "a top-level schema constructor resolves",
    ).toBeDefined();

    const variant = env.resolveEnumVariant("Severity", "High");
    expect(variant, "Enum.Variant access resolves to a runtime enum value").toBeDefined();
    // The enum value serialises to its bare wire string; the declaring-enum tag
    // never appears in JSON output (runtime-value-model.md, enum row).
    expect(
      JSON.stringify(variant),
      "the resolved enum value carries its wire string",
    ).toBe('"High"');
  });
});

// --- Immutable vs `let mut` mutability -------------------------------------

describe("V19b-T — immutable vs `let mut` binding slots (bindings.md cka-6)", () => {
  it("Convention: writes a reassignment against a `let mut` slot (accepted, value updated)", () => {
    const env = buildEnvironment({ body: emptyBody() });
    env.defineLocal("count", 0, true);
    const w = env.writeBinding("count", 5);
    expect(w.accepted, "cka-6: a `let mut` write is accepted at the scope layer").toBe(true);
    expect(env.resolve("count").value, "cka-6: the `let mut` slot reflects the written value").toBe(5);
  });

  it("Convention: rejects a write against an immutable `let` slot at the scope layer (cka-6)", () => {
    const env = buildEnvironment({ body: emptyBody() });
    env.defineLocal("name", "a", false);
    const w = env.writeBinding("name", "b");
    expect(w.accepted, "cka-6: a write against an immutable `let` slot is rejected").toBe(false);
    expect(env.resolve("name").value, "cka-6: the immutable slot is left unchanged").toBe("a");
  });
});

// --- Per-iteration `for` binding and `let _` discard -----------------------

describe("V19b-T — per-iteration `for` binding and `let _` discard (bindings.md)", () => {
  it("Convention: each `for x in …` iteration binds a fresh `x` slot (per-iteration fresh binding)", () => {
    const env = buildEnvironment({ body: emptyBody() });
    const it1 = env.bindIterationVariable("x", 1);
    const it2 = env.bindIterationVariable("x", 2);
    expect(it1.resolve("x").value, "iteration 1 binds its own fresh `x` slot").toBe(1);
    expect(it2.resolve("x").value, "iteration 2 binds a distinct fresh `x` slot").toBe(2);
  });

  it("Convention: `let _` discards its value without creating a resolvable binding", () => {
    const env = buildEnvironment({ body: emptyBody() });
    env.defineLocal("kept", 7, false);
    env.defineLocal("_", 99, false);
    expect(env.resolve("kept").value, "a real binding is resolvable").toBe(7);
    expect(env.resolve("_").arm, "`let _` creates no resolvable binding").toBe("unresolved");
  });
});

// --- Top-level `fn` hoisting -----------------------------------------------

describe("V19b-T — top-level `fn` hoisting (functions.md FN-1, FN-3…FN-5)", () => {
  it("Convention: hoists top-level `fn` so mutual recursion resolves in either textual order (FN-1), carrying fn bodies (FN-3…FN-5)", () => {
    // `is_even` references `is_odd` declared textually AFTER it, and vice-versa;
    // hoisting makes both resolve regardless of textual order.
    const isEven = fnDecl("is_even");
    const isOdd = fnDecl("is_odd");
    const body: ThetaBody = { statements: [isEven, isOdd], tail: null };
    const env = buildEnvironment({ body });

    const rEven = env.resolve("is_even");
    const rOdd = env.resolve("is_odd");
    expect(rEven.arm, "FN-1: the first-declared fn resolves").toBe("fn");
    expect(rOdd.arm, "FN-1: the later-declared fn resolves too (hoisting)").toBe("fn");
    expect(rEven.fn?.body, "FN-3…FN-5: the fn body is carried for the executor").toBe(isEven.body);
    expect(rOdd.fn?.body, "FN-3…FN-5: the fn body is carried for the executor").toBe(isOdd.body);
  });
});
