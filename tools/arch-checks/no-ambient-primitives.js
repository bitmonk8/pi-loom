// H3a architectural check: detect direct lexical references to banned ambient
// primitives in `src/**`, operationalising the conventions.md "No globals,
// statics, singletons" rule's ambient-access ban and the spec's WallClock /
// environment / UUID timing-source bans (PIC-12, PIC-13, PIC-20).
//
// The runtime reaches wall-clock time, the environment, the working
// directory, and UUID minting only through injected seams; no `src/**` module
// may DIRECTLY reference:
//
//   process.env, process.cwd, crypto.randomUUID,
//   Date.now, performance.now, Date.prototype.getTime,
//   setTimeout, clearTimeout
//
// The timing set is a manually-maintained derivation of the
// host-interfaces-services.md Clock/WallClock ban (PIC-12), required to be a
// superset of the spec ban (scan list ⊇ spec ban) and currently equal to the
// PIC-12 enumeration; it is re-reconciled by the loom 1.0 release-time residue
// inspection (checklist item 9).
//
// A direct reference is an EXEMPT AMBIENT SITE only if its source line carries
// a same-line `// allow-ambient: <primitive> — <seam>` comment, recognised by
// that comment alone (there is no separate allow-list artefact). The allow-list
// starts empty: each seam adapter registers its own site as it lands under the
// V8* leaves, so no entry exists at H3a time.
//
// This is an IDENTIFIER-KEYED scan: it catches only direct references. The
// indirect forms — aliased reads (`const env = process.env`), destructured
// reads (`const { cwd } = process`), computed access (`process["env"]`),
// helper wrappers, and re-export indirection — are NOT mechanically detected;
// that residue is owned by the Per-phase TDD ritual self-review step and the
// loom 1.0 release-time residue inspection (checklist item 2).
//
// `setTimeout` / `clearTimeout` are matched only in their BARE-IDENTIFIER form:
// a member access such as `clock.setTimeout(fn, 0)` (the injected PIC-12 timer
// seam) or `globalThis.setTimeout` is NOT a direct reference to the global and
// is not flagged here.

import { parse } from "@typescript-eslint/parser";

const ALLOW_COMMENT = "// allow-ambient:";

// Member-expression rules: each decides on the (object, property) shape of a
// non-computed `obj.prop` access. `objectName: null` matches any object, so the
// property name alone keys the ban (a deliberate superset — e.g. any `.getTime`
// or `.randomUUID` access, regardless of receiver).
const MEMBER_RULES = [
  { objectName: "process", property: "env", primitive: "process.env" },
  { objectName: "process", property: "cwd", primitive: "process.cwd" },
  { objectName: null, property: "randomUUID", primitive: "crypto.randomUUID" },
  { objectName: "Date", property: "now", primitive: "Date.now" },
  { objectName: "performance", property: "now", primitive: "performance.now" },
  { objectName: null, property: "getTime", primitive: "Date.prototype.getTime" },
];

// Bare-identifier rules: a reference to one of these names that is NOT a member
// property, an object/property key, or a binding site.
const BARE_IDENTIFIERS = new Map([
  ["setTimeout", "setTimeout"],
  ["clearTimeout", "clearTimeout"],
]);

function isBindingIdentifier(node, parent, key) {
  if (parent == null) return false;
  switch (parent.type) {
    case "VariableDeclarator":
      return key === "id";
    case "FunctionDeclaration":
    case "FunctionExpression":
    case "ArrowFunctionExpression":
      return key === "id" || key === "params";
    case "Property":
    case "PropertyDefinition":
    case "MethodDefinition":
    case "TSPropertySignature":
    case "TSMethodSignature":
      // a non-computed property / method NAME (object literal, class, or
      // interface member) is a declaration site, not a reference to the global
      return key === "key" && parent.computed !== true;
    case "MemberExpression":
      // the `.prop` half of a non-computed member access is handled by MEMBER_RULES
      return key === "property" && parent.computed !== true;
    default:
      return false;
  }
}

/**
 * Scan a TypeScript source string for direct lexical references to the banned
 * ambient primitives. References whose source line carries the same-line
 * `// allow-ambient:` comment are exempt and excluded.
 *
 * @param {string} code TypeScript source.
 * @returns {{primitive: string, line: number}[]} one entry per non-exempt direct reference.
 */
export function findAmbientPrimitiveReferences(code) {
  const ast = parse(code, {
    loc: true,
    range: false,
    ecmaVersion: 2022,
    sourceType: "module",
  });
  const lines = code.split("\n");
  const raw = [];

  function flag(primitive, node) {
    raw.push({ primitive, line: node.loc.start.line });
  }

  function visit(node, parent, key) {
    if (node == null || typeof node.type !== "string") return;

    if (
      node.type === "MemberExpression" &&
      node.computed !== true &&
      node.property != null &&
      node.property.type === "Identifier"
    ) {
      const prop = node.property.name;
      const objName = node.object != null && node.object.type === "Identifier"
        ? node.object.name
        : null;
      for (const rule of MEMBER_RULES) {
        if (rule.property !== prop) continue;
        if (rule.objectName != null && rule.objectName !== objName) continue;
        flag(rule.primitive, node);
      }
    }

    if (
      node.type === "Identifier" &&
      BARE_IDENTIFIERS.has(node.name) &&
      !isBindingIdentifier(node, parent, key)
    ) {
      flag(BARE_IDENTIFIERS.get(node.name), node);
    }

    for (const childKey of Object.keys(node)) {
      if (childKey === "parent" || childKey === "loc" || childKey === "range") continue;
      const value = node[childKey];
      if (Array.isArray(value)) {
        for (const item of value) {
          if (item != null && typeof item.type === "string") visit(item, node, childKey);
        }
      } else if (value != null && typeof value.type === "string") {
        visit(value, node, childKey);
      }
    }
  }

  visit(ast, null, null);

  return raw.filter((v) => {
    const lineText = lines[v.line - 1] ?? "";
    return !lineText.includes(ALLOW_COMMENT);
  });
}
