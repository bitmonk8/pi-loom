"use strict";

// Loom's bespoke local ESLint rules, wired by H2a's eslint.config.js over
// `src/**` (the single production-code root). All three rules are
// comment-keyed: a flagged construct is permitted only where its own source
// line carries the matching `// allow-...:` comment. The set of those
// same-line comments discovered across `src/**` IS the allow-list — there is
// no separate allow-list file to read. (See conventions.md cross-cutting
// rules: "Specific exception types only", "Sequential by default".)
//
// These are authored as custom rules, not stock `no-restricted-syntax`
// selectors, because the convention's allow-list is the set of *same-line
// comments* and stock `no-restricted-syntax` cannot consult a token's own
// line. The plan's `Adds.` naming of `no-restricted-syntax` is descriptive;
// the binding obligation is the comment-keyed pass/fail behaviour the leaf's
// Tests bullets specify, which a custom rule is the faithful way to provide.

function sourceCodeOf(context) {
  return context.sourceCode ?? context.getSourceCode();
}

// True iff some comment on the same source line as `node`'s start matches
// `regex`. The matched comment is itself the allow-list entry.
function hasSameLineComment(context, node, regex) {
  const sourceCode = sourceCodeOf(context);
  const line = node.loc.start.line;
  return sourceCode
    .getAllComments()
    .some((c) => c.loc.start.line === line && regex.test(c.value));
}

// A `// allow-broad-catch: <token> — <spec-page>` comment. The H2a lint
// verifies only that such a comment with a non-empty cited token is present;
// resolving the token against coverage-matrix.md is the loom 1.0 closing
// gate's job (H5c), not this rule's.
const ALLOW_BROAD_CATCH = /allow-broad-catch:\s*\S+/;
// A `// allow: <REQ-ID-or-cka-token> — <spec-page>` comment for a permitted
// concurrency combinator. `\ballow:` does not match `allow-broad-catch:` or
// `allow-sync:` (those have `allow-` before the colon, not `allow:`).
const ALLOW_PROMISE = /\ballow:\s*\S+/;
// A `// allow-sync: <reason>` comment for a permitted synchronous call.
const ALLOW_SYNC = /allow-sync:\s*\S+/;

const PROMISE_COMBINATORS = new Set(["all", "race", "allSettled", "any"]);

/** @type {import('eslint').Rule.RuleModule} */
const noBroadCatch = {
  meta: {
    type: "problem",
    docs: {
      description:
        "Forbid broad catch clauses (catch (e), catch (e: unknown|any|Error), bare catch) unless the same line carries a // allow-broad-catch: comment.",
    },
    schema: [],
    messages: {
      broadCatch:
        "Broad catch is forbidden: bind a specific exception subtype or let it propagate. Exempt a mandated Pi-SDK-boundary / spec-mandated site with a same-line `// allow-broad-catch: <token> — <spec-page>` comment.",
    },
  },
  create(context) {
    return {
      CatchClause(node) {
        const param = node.param;
        let broad = false;
        if (!param) {
          // `catch { }` — optional catch binding, binds nothing specific.
          broad = true;
        } else if (param.type === "Identifier") {
          const ann = param.typeAnnotation;
          if (!ann) {
            // `catch (e)` — no annotation.
            broad = true;
          } else {
            const t = ann.typeAnnotation;
            if (t.type === "TSUnknownKeyword" || t.type === "TSAnyKeyword") {
              broad = true;
            } else if (
              t.type === "TSTypeReference" &&
              t.typeName.type === "Identifier" &&
              t.typeName.name === "Error"
            ) {
              broad = true;
            }
          }
        } else {
          // Destructuring or any other param shape is not a specific subtype
          // binding.
          broad = true;
        }
        if (broad && !hasSameLineComment(context, node, ALLOW_BROAD_CATCH)) {
          context.report({ node, messageId: "broadCatch" });
        }
      },
    };
  },
};

/** @type {import('eslint').Rule.RuleModule} */
const noUnguardedPromiseCombinator = {
  meta: {
    type: "problem",
    docs: {
      description:
        "Forbid Promise.all/race/allSettled/any in production code (sequential by default) unless the same line carries a // allow: comment.",
    },
    schema: [],
    messages: {
      promiseCombinator:
        "Promise.{{name}} is forbidden by the Sequential-by-default rule. Exempt a spec-mandated concurrency site with a same-line `// allow: <REQ-ID-or-cka-token> — <spec-page>` comment.",
    },
  },
  create(context) {
    return {
      CallExpression(node) {
        const callee = node.callee;
        if (
          callee.type === "MemberExpression" &&
          !callee.computed &&
          callee.object.type === "Identifier" &&
          callee.object.name === "Promise" &&
          callee.property.type === "Identifier" &&
          PROMISE_COMBINATORS.has(callee.property.name)
        ) {
          if (!hasSameLineComment(context, node, ALLOW_PROMISE)) {
            context.report({
              node,
              messageId: "promiseCombinator",
              data: { name: callee.property.name },
            });
          }
        }
      },
    };
  },
};

/** @type {import('eslint').Rule.RuleModule} */
const noBlockingSync = {
  meta: {
    type: "problem",
    docs: {
      description:
        "Forbid synchronous calls whose callee name ends in the literal suffix `Sync` (e.g. fs.readFileSync, execSync) in production code unless the same line carries a // allow-sync: comment.",
    },
    schema: [],
    messages: {
      blockingSync:
        "Blocking synchronous call `{{name}}` is forbidden: it stalls Pi's shared event loop (Sequential by default). Route I/O through the V8* seam, or exempt with a same-line `// allow-sync: <reason>` comment.",
    },
  },
  create(context) {
    return {
      CallExpression(node) {
        const callee = node.callee;
        let name;
        if (callee.type === "Identifier") {
          name = callee.name;
        } else if (
          callee.type === "MemberExpression" &&
          !callee.computed &&
          callee.property.type === "Identifier"
        ) {
          name = callee.property.name;
        }
        if (typeof name === "string" && name.endsWith("Sync")) {
          if (!hasSameLineComment(context, node, ALLOW_SYNC)) {
            context.report({ node, messageId: "blockingSync", data: { name } });
          }
        }
      },
    };
  },
};

module.exports = {
  meta: {
    name: "eslint-plugin-loom-local",
    version: "0.1.0",
  },
  rules: {
    "no-broad-catch": noBroadCatch,
    "no-unguarded-promise-combinator": noUnguardedPromiseCombinator,
    "no-blocking-sync": noBlockingSync,
  },
};
