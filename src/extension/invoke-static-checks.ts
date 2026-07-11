// Load-time (compose-pass) wiring for the invoke static checks the shipped
// pipeline previously never ran (invocation.md §Argument arity / §Resolution /
// §Cycle detection). Each check reuses an existing, unit-tested checker rather
// than reimplementing it:
//
//   - INV-3 — `checkInvokeArity` over each `invoke("./x.loom", …)` site against
//     the statically-resolved callee's `params:` counts
//     (`loom/parse/invoke-arity-too-many` / `-too-few`).
//   - INV-4 — `detectInvocationCycle` over the per-load-pass static-resolution
//     graph (`loom/load/invocation-cycle`); a self-cycle or an A→B→A cycle
//     un-registers the entry loom, which is what keeps a self-referential loom
//     from driving pure unbounded invoke recursion at runtime.
//   - INV-5 — `checkInvokePathAtLoad` (the shared realpath + discovery-root
//     containment check) so a callee resolving outside every active discovery
//     root is `loom/load/invoke-path-escape` and the parent does not register.
//
// The invoke-graph is keyed by discovered slash name (unique per registration),
// so the cycle message renders `invocation cycle: A → B → A` per the spec prose.
//
// Spec: invocation.md (§Argument arity, §Resolution, §Static resolution,
// §Cycle detection), diagnostics/code-registry-parse.md,
// diagnostics/code-registry-load.md.

import { dirname, isAbsolute, resolve as resolvePath } from "node:path";
import type { Diagnostic } from "../diagnostics/diagnostic";
import type {
  Block,
  Expr,
  InvokeExpr,
  LoomBody,
  Stmt,
} from "../parser/loom-document";
import { checkInvokeArity, checkCalleeHasErrors } from "../parser/invoke-diagnostics";
import {
  detectInvocationCycle,
  type InvokeGraph,
} from "../runtime/invoke-depth-cycle";
import { checkInvokePathAtLoad } from "../runtime/invocation";
import type { FileSystem } from "../seams/file-system";
import type { LoomCompositionInput } from "./loom-composition-producer";

/** Forward-slash-normalise a host path for byte-stable node identity. */
function normalizePath(path: string): string {
  return path.replace(/\\/g, "/");
}

/**
 * Collect every `invoke(...)` call expression reachable in a loom body, walking
 * the whole statement / expression tree (nested blocks, conditions, arms, and
 * arguments included). `.loom`-callable calls through `tools:` are handled by
 * the callable-set resolver, not here.
 */
export function collectInvokeExprs(body: LoomBody): InvokeExpr[] {
  const out: InvokeExpr[] = [];
  walkBlock({ statements: body.statements, tail: body.tail }, out);
  return out;
}

function walkBlock(block: Block, out: InvokeExpr[]): void {
  for (const stmt of block.statements) {
    walkStmt(stmt, out);
  }
  if (block.tail !== null) {
    walkExpr(block.tail, out);
  }
}

function walkStmt(stmt: Stmt, out: InvokeExpr[]): void {
  switch (stmt.kind) {
    case "let":
      if (stmt.init !== null) walkExpr(stmt.init, out);
      return;
    case "reassign":
      walkExpr(stmt.value, out);
      return;
    case "if":
      walkExpr(stmt.condition, out);
      walkBlock(stmt.then, out);
      if (stmt.otherwise !== null) {
        if ("kind" in stmt.otherwise) walkStmt(stmt.otherwise, out);
        else walkBlock(stmt.otherwise, out);
      }
      return;
    case "while":
      walkExpr(stmt.condition, out);
      walkBlock(stmt.body, out);
      return;
    case "for":
      walkExpr(stmt.iterand, out);
      walkBlock(stmt.body, out);
      return;
    case "fn":
      walkBlock(stmt.body, out);
      return;
    case "return":
      if (stmt.operand !== null) walkExpr(stmt.operand, out);
      return;
    case "tool-call":
      walkExpr(stmt.call, out);
      return;
    case "invoke":
      walkExpr(stmt.invoke, out);
      return;
    case "expr":
      walkExpr(stmt.expr, out);
      return;
    // `query`, `break`, `continue`, `schema`, `enum`, `import`, `export`,
    // `doc-comment` carry no nested `invoke(...)` sub-expression.
    default:
      return;
  }
}

function walkExpr(expr: Expr, out: InvokeExpr[]): void {
  switch (expr.kind) {
    case "invoke":
      out.push(expr);
      for (const arg of expr.args) walkExpr(arg, out);
      return;
    case "array":
      for (const el of expr.elements) walkExpr(el, out);
      return;
    case "binary":
      walkExpr(expr.left, out);
      walkExpr(expr.right, out);
      return;
    case "ternary":
      walkExpr(expr.condition, out);
      walkExpr(expr.consequent, out);
      walkExpr(expr.alternate, out);
      return;
    case "try":
      walkExpr(expr.operand, out);
      return;
    case "call":
      for (const arg of expr.args) walkExpr(arg, out);
      return;
    case "member":
      walkExpr(expr.target, out);
      return;
    case "index":
      walkExpr(expr.target, out);
      walkExpr(expr.index, out);
      return;
    case "object":
      for (const field of expr.fields) walkExpr(field.value, out);
      return;
    case "match":
      walkExpr(expr.scrutinee, out);
      for (const arm of expr.arms) walkExpr(arm.body, out);
      return;
    case "result-ctor":
      walkExpr(expr.arg, out);
      return;
    case "method-call":
      walkExpr(expr.target, out);
      for (const arg of expr.args) walkExpr(arg, out);
      return;
    // `ident`, `number`, `string`, `bool`, `null`, `query` carry no nested
    // `invoke(...)`.
    default:
      return;
  }
}

/** Resolve an `invoke` path literal to a forward-slash-normalised absolute path. */
function resolveCalleeAbsolute(callerPath: string, literalPath: string): string {
  const baseDir = dirname(callerPath);
  const absolute = isAbsolute(literalPath)
    ? literalPath
    : resolvePath(baseDir, literalPath);
  return normalizePath(absolute);
}

/**
 * Build the per-load-pass static-resolution invoke graph across the discovered,
 * successfully-parsed looms (invocation.md §Static resolution / §Cycle
 * detection). Nodes are discovered slash names; an edge `A → B` exists when
 * `A.loom` has a literal `invoke("./B.loom")` resolving (byte-exact absolute
 * path) to a discovered loom `B`. Edges to non-discovered callees are dropped —
 * a cycle routed only through undiscovered files is not detected until they are
 * discovered (the spec's leaf-termination rule).
 */
export function buildInvokeGraph(inputs: readonly LoomCompositionInput[]): InvokeGraph {
  const byPath = new Map<string, string>();
  for (const input of inputs) {
    if (input.sourcePath !== undefined) {
      byPath.set(normalizePath(input.sourcePath), input.slashName);
    }
  }
  const edges = new Map<string, string[]>();
  for (const input of inputs) {
    if (input.sourcePath === undefined) continue;
    const targets: string[] = [];
    for (const invoke of collectInvokeExprs(input.body)) {
      if (invoke.path.length === 0 || !invoke.path.endsWith(".loom")) continue;
      const abs = resolveCalleeAbsolute(input.sourcePath, invoke.path);
      const targetName = byPath.get(abs);
      if (targetName !== undefined) targets.push(targetName);
    }
    edges.set(input.slashName, targets);
  }
  return { edges, unresolvable: new Set<string>() };
}

/** The callee shape the arity check consults, resolved once per site. */
export interface CalleeArity {
  /** Count of `params:` fields that are neither defaulted nor optional. */
  readonly requiredCount: number;
  /** Total `params:` field count. */
  readonly totalCount: number;
}

/**
 * Run the load-time invoke static checks for one discovered loom, returning
 * every diagnostic (error-severity entries un-register the loom):
 *
 *   - INV-5 path-escape (`loom/load/invoke-path-escape`) via the shared
 *     realpath + discovery-root containment check;
 *   - INV-3 arity (`loom/parse/invoke-arity-too-{many,few}`) against the
 *     statically-resolved callee's `params:` counts;
 *   - INV-4 invocation cycle (`loom/load/invocation-cycle`) via the graph walk.
 *
 * The extension / path-separator (INV-1 / INV-2) and dynamic-path (INV-8) checks
 * already fired during the whole-file parse and are not repeated here.
 */
export async function checkInvokeStaticResolution(
  input: LoomCompositionInput,
  deps: {
    readonly fs: Pick<FileSystem, "realpath">;
    readonly activeRoots: readonly string[];
    readonly graph: InvokeGraph;
    readonly resolveCalleeArity: (calleeAbsolutePath: string) => Promise<CalleeArity | undefined>;
  },
): Promise<Diagnostic[]> {
  const diagnostics: Diagnostic[] = [];
  const callerPath = input.sourcePath;

  if (callerPath !== undefined) {
    for (const invoke of collectInvokeExprs(input.body)) {
      // A dynamic path (empty literal) or a non-`.loom` extension already
      // produced its own parse error; skip to avoid a confusing second report.
      if (invoke.path.length === 0 || !invoke.path.endsWith(".loom")) {
        continue;
      }
      const site = { file: callerPath, range: invoke.range };
      const resolvedPath = resolveCalleeAbsolute(callerPath, invoke.path);

      // INV-5 (invocation.md §Resolution): a resolved callee outside every
      // active discovery root un-registers the parent. The containment check
      // consults `realpath`, which THROWS for a callee that does not exist on
      // disk. Per discovery-cli.md §Static resolution, an unreadable callee
      // reached by a *literal* `invoke(...)` is `loom/load/callee-has-errors`
      // severity WARNING — the parent still registers, static checks against
      // that callee are skipped, and the runtime AJV load is the safety net. So
      // a missing callee must NOT propagate as a throw: an unguarded throw here
      // aborts the whole discovery/compose walk, silently un-registering every
      // unrelated sibling loom from the same source (INVCEIL-1). Convert it into
      // a per-loom, non-fatal warning and skip the remaining static checks for
      // this site.
      // A `realpath` rejection (an unreadable / non-existent callee) is handled
      // as `undefined` via the same rejection-to-`undefined` idiom the callee
      // read paths in this pipeline use, rather than a broad `try`/`catch`.
      const containment = await checkInvokePathAtLoad({
        deps: { fs: deps.fs },
        resolvedPath,
        literalPath: invoke.path,
        activeRoots: deps.activeRoots,
      }).then(
        (value) => value,
        () => undefined,
      );
      if (containment === undefined) {
        diagnostics.push(
          ...checkCalleeHasErrors({
            calleePath: invoke.path,
            surface: "invoke",
            hasErrors: true,
            relatedSites: [],
            site,
          }),
        );
        continue;
      }
      if (containment.kind === "escape") {
        diagnostics.push({ ...containment.diagnostic, file: site.file, range: site.range });
        // An escaping callee cannot be opened for the arity check; move on.
        continue;
      }

      // INV-3 (invocation.md §Argument arity): arity is checked against the
      // statically-resolved callee's `params:` counts. The provided count
      // excludes the leading path-literal argument.
      const providedCount = Math.max(0, invoke.args.length - 1);
      const arity = await deps.resolveCalleeArity(resolvedPath);
      if (arity !== undefined) {
        diagnostics.push(
          ...checkInvokeArity({
            callee: invoke.path,
            staticallyResolvable: true,
            requiredCount: arity.requiredCount,
            totalCount: arity.totalCount,
            providedCount,
            site,
          }),
        );
      }
    }
  }

  // INV-4 (invocation.md §Cycle detection): walk the static-resolution graph
  // from this loom; a back-edge un-registers it.
  const cycle = detectInvocationCycle(input.slashName, deps.graph);
  if (cycle !== undefined) {
    diagnostics.push(cycle);
  }

  return diagnostics;
}
