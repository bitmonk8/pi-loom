// H2a architectural check: detect module-level mutable bindings in `src/**`,
// operationalising the conventions.md "No globals, statics, singletons" rule
// for the binding forms a static AST scan can decide on the observable
// initializer shape:
//
//   - a top-level `let` or `var` declaration, or
//   - a top-level `const` whose initializer is a mutable object literal
//     (`{ ... }`) or array literal (`[ ... ]`),
//
// declared outside any class or function. Such a binding names an object
// shared and mutated across calls. The scan decides the ban on the
// initializer shape, not on runtime reuse: the closure-captured, lazy
// module-cache, and DI-container singleton forms are NOT mechanically
// detected here — that residue is owned by the conventions.md Per-phase TDD
// ritual self-review step and the theta 1.0 release-time residue inspection.
//
// A top-level immutable `const` (primitive, `as const`, frozen, function
// call result, arrow function, etc.) is allowed: only the directly-observable
// object/array literal initializer is flagged.

import { parse } from "@typescript-eslint/parser";

function bindingName(id) {
  if (id.type === "Identifier") return id.name;
  if (id.type === "ObjectPattern" || id.type === "ArrayPattern") {
    return "<destructured>";
  }
  return "<binding>";
}

function pushDeclarators(decl, flagged, violations) {
  for (const d of decl.declarations) {
    if (flagged(d)) {
      violations.push({
        name: bindingName(d.id),
        kind: decl.kind,
        line: d.loc.start.line,
      });
    }
  }
}

/**
 * Scan a TypeScript source string for module-level mutable bindings.
 * Only the program's own top-level statements are inspected (and the
 * declaration directly under a top-level `export`); bindings inside any
 * class or function body are out of scope by construction because the scan
 * never recurses into them.
 *
 * @param {string} code TypeScript source.
 * @returns {{name: string, kind: string, line: number}[]} one entry per flagged binding.
 */
export function findModuleLevelMutableBindings(code) {
  const ast = parse(code, { loc: true, range: false, ecmaVersion: 2022, sourceType: "module" });
  const violations = [];
  for (const stmt of ast.body) {
    let decl = stmt;
    if (
      (stmt.type === "ExportNamedDeclaration" || stmt.type === "ExportDefaultDeclaration") &&
      stmt.declaration
    ) {
      decl = stmt.declaration;
    }
    if (decl.type !== "VariableDeclaration") continue;
    if (decl.kind === "let" || decl.kind === "var") {
      pushDeclarators(decl, () => true, violations);
    } else if (decl.kind === "const") {
      pushDeclarators(
        decl,
        (d) =>
          d.init != null &&
          (d.init.type === "ObjectExpression" || d.init.type === "ArrayExpression"),
        violations,
      );
    }
  }
  return violations;
}
