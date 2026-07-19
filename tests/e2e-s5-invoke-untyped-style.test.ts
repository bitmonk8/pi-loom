import { describe, expect, it } from "vitest";
import {
  parseThetaDocument,
  type InvokeExpr,
  type InvokeStmt,
  type ThetaDocument,
  type ParseThetaDocumentDeps,
} from "../src/parser/theta-document";
import type { ThetaSource } from "../src/lexer/lexer";
import type { SystemNoteChannelDeps } from "../src/extension/system-note-channel";
import type { ModelReferenceMatcher } from "../src/parser/frontmatter";

// e2e-S5 — offline (METHOD M1) coverage of three previously-UNCOVERED INV
// requirements, driven through the REAL whole-file parser
// (`parseThetaDocument`) so the assertions witness the shipped parse path, not
// an isolated per-module seam.
//
// Requirements (docs/e2e-campaign/analysis/spec-requirements.md):
//   - REQ-INV-1  (line 961): `invoke("./x.theta", …)` is the only inline-path
//     `.theta`-spawn surface; `import` is reserved for `.thetalib` library code, so
//     an `import` naming a `.theta` path is rejected.  [offline-unit]
//   - REQ-INV-5  (line 967): `invoke<Schema>(…)` AJV-validates the child return
//     against `Schema`; UNTYPED `invoke(…)` returns `Result<null, QueryError>`
//     and DISCARDS the child's return value.  [statically-observable part only;
//     runtime discard needs the live spawn — see NOTE below]
//   - REQ-INV-20 (line 979): the invocation AST node carries a
//     `style: "positional" | "named"` discriminator; theta 1.0's only surface is
//     positional, so a parsed `invoke(…)` node MUST carry `style: "positional"`.
//
// Assertions are written against SPEC behaviour. Where production does not
// match, the assertion is left failing (not weakened) and reported as a
// candidate finding in the run summary.

/** A trivially-wired diagnostic sink + resolving `model:` matcher for the parse. */
function parseDeps(): ParseThetaDocumentDeps {
  const systemNote: SystemNoteChannelDeps = {
    pi: { sendMessage: (): void => {} },
    ui: { notify: (): void => {} },
    emitDiagnostic: (): void => {},
  };
  const modelMatcher: ModelReferenceMatcher = {
    resolve: (): "resolved" => "resolved",
  };
  return { systemNote, modelMatcher };
}

/** Parse a UTF-8 `.theta` source string through the production whole-file parser. */
function parse(src: string, path = "e2e-s5.theta"): ThetaDocument {
  const source: ThetaSource = { path, bytes: new TextEncoder().encode(src) };
  return parseThetaDocument(source, parseDeps());
}

/** Assemble a minimal prompt-mode `.theta` with the given body lines. */
function theta(...bodyLines: readonly string[]): string {
  return ["---", "mode: prompt", "---", ...bodyLines].join("\n");
}

/** The set of diagnostic codes the parse aggregated for `src`. */
function codesOf(doc: ThetaDocument): string[] {
  return doc.diagnostics.map((d) => d.code);
}

/**
 * Find the first `invoke(...)` expression node in a parsed body — an
 * `invoke(...)` in statement position lowers to an `InvokeStmt` carrying the
 * `InvokeExpr` on `.invoke`; in tail position it is the bare `InvokeExpr`.
 */
function firstInvokeExpr(doc: ThetaDocument): InvokeExpr | undefined {
  const stmt = doc.body.statements.find(
    (s): s is InvokeStmt => s.kind === "invoke",
  );
  if (stmt !== undefined) {
    return stmt.invoke;
  }
  if (doc.body.tail?.kind === "invoke") {
    return doc.body.tail;
  }
  return undefined;
}

// --------------------------------------------------------------------------
// REQ-INV-1 — `invoke(...)` is the only inline-path `.theta`-spawn surface;
// an `import` naming a `.theta` path is rejected (invocation.md §Resolution;
// imports.md §"Path resolution").
// --------------------------------------------------------------------------

describe("REQ-INV-1 — invoke is the sole inline .theta-spawn surface; import of a .theta path is rejected", () => {
  it("REQ-INV-1: an `import` naming a `.theta` path fires theta/parse/import-non-thetalib-extension", () => {
    // `import`/`export … from` is reserved for `.thetalib` library code; a `.theta`
    // path is not a `.thetalib` import (imports.md §"Path resolution").
    const doc = parse(
      theta('import { Helper } from "./helper.theta"', "@`hi`"),
    );
    const diag = doc.diagnostics.find(
      (d) => d.code === "theta/parse/import-non-thetalib-extension",
    );
    expect(diag, "import of a .theta path must be rejected").toBeDefined();
    expect(diag?.severity).toBe("error");
    // Registry Message (code-registry-parse.md / lexer/literals.ts), `<path>`
    // rendered as written.
    expect(diag?.message).toBe(
      "import path './helper.theta' does not end in .thetalib",
    );
  });

  it("REQ-INV-1: `invoke(\"./child.theta\", …)` is the accepted inline `.theta`-spawn surface — it parses into an invoke node with NO import/extension rejection", () => {
    const doc = parse(theta('invoke("./child.theta", 1)', "@`hi`"));
    const codes = codesOf(doc);
    // The `.theta` spawn surface does not draw the import-non-thetalib rejection…
    expect(codes).not.toContain("theta/parse/import-non-thetalib-extension");
    // …nor the invoke-extension rejection (a byte-exact-lowercase `.theta`).
    expect(codes).not.toContain("theta/parse/invoke-non-theta-extension");
    // And it lowers to an invoke AST node carrying the literal callee path.
    const node = firstInvokeExpr(doc);
    expect(node, "invoke(...) lowers to an InvokeExpr").toBeDefined();
    expect(node?.path).toBe("./child.theta");
  });
});

// --------------------------------------------------------------------------
// REQ-INV-5 — typed vs untyped invoke return handling (invocation.md
// §"Typed return"). Statically-observable part: an untyped `invoke(...)`
// carries NO return schema (returnSchema === null → its return type is
// `Result<null, …>` and the child value is discarded); a typed
// `invoke<Schema>(...)` carries the annotation text that feeds runtime AJV.
// --------------------------------------------------------------------------

describe("REQ-INV-5 — untyped invoke carries no return schema (discards child value); typed invoke carries the AJV schema", () => {
  it("REQ-INV-5: an UNTYPED `invoke(...)` parses with returnSchema === null — no schema is threaded, so the child return is discarded (Result<null, QueryError>)", () => {
    const doc = parse(theta('invoke("./child.theta", 1)', "@`hi`"));
    const node = firstInvokeExpr(doc);
    expect(node, "untyped invoke(...) lowers to an InvokeExpr").toBeDefined();
    // No `<Schema>` annotation → no AJV return schema → the child's returned
    // value is not surfaced (the annotated return type is Result<null, …>).
    expect(node?.returnSchema).toBeNull();
  });

  it("REQ-INV-5: a TYPED `invoke<Schema>(...)` threads the annotation text that feeds the runtime AJV return-value validation", () => {
    const doc = parse(theta('invoke<Plan>("./child.theta", 1)', "@`hi`"));
    const node = firstInvokeExpr(doc);
    expect(node, "typed invoke<Plan>(...) lowers to an InvokeExpr").toBeDefined();
    // The `<Plan>` annotation is threaded onto the node so the runtime can
    // AJV-validate the callee's returned value against `Plan`.
    expect(node?.returnSchema).toBe("Plan");
  });

  // NOTE: the RUNTIME half of REQ-INV-5 — that an untyped invoke actually
  // resolves to `Ok(null)` while a typed invoke surfaces the AJV-validated
  // child value — is only reachable through a successful `.theta`-callable
  // spawn, which needs a resolved model / live `AgentSession` (see the note in
  // tests/production-core-exec.test.ts). It is out of scope for this offline
  // suite; only the parse-time discriminator (return-schema presence) is
  // witnessed here.
});

// --------------------------------------------------------------------------
// REQ-INV-20 — the invocation AST node carries a
// `style: "positional" | "named"` discriminator; theta 1.0's only surface is
// positional, so a parsed `invoke(...)` node MUST carry style: "positional"
// (invocation.md §"Argument style").
// --------------------------------------------------------------------------

describe("REQ-INV-20 — the parsed invoke AST node carries style: 'positional'", () => {
  // PINNED NONCOMPLIANCE (FIND-S5-1). The shipped `InvokeExpr`
  // (src/parser/theta-document.ts:157-168) carries { kind, path, returnSchema,
  // args } — it has NO `style: "positional" | "named"` discriminator, so this
  // SPEC assertion (REQ-INV-20 / invocation.md:40) does not hold. Encoded with
  // `it.fails` (the repo's known-red spec-repro idiom) so the suite stays green
  // while pinning the divergence: this block flips to a hard failure the moment
  // production grows the discriminator seam (at which point promote to `it`).
  // The gap has no theta-1.0 behavioural consequence (positional is the only
  // parse path); it is a forward-compat (INV-2) seam divergence only.
  it.fails(
    "REQ-INV-20: a parsed `invoke(...)` node carries a `style` discriminator equal to 'positional' (currently absent — FIND-S5-1)",
    () => {
      const doc = parse(theta('invoke("./child.theta", 1)', "@`hi`"));
      const node = firstInvokeExpr(doc);
      expect(node, "invoke(...) lowers to an InvokeExpr").toBeDefined();
      // Not weakened: the spec-mandated discriminator is asserted verbatim.
      expect((node as { style?: string }).style).toBe("positional");
    },
  );
});
