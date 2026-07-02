// V19b / V19b-T — the loom lexical environment and scope model.
//
// This module owns the runtime lexical environment and the real `EvalHost`
// implementation the `V19c` statement executor evaluates `V19a`'s body-AST
// expressions and statements against. It is an integration-realisation of the
// `V3a` (`EvalHost`), `V3b` (mutability), and `V15c` (import loader) seams at a
// real host; it closes no new coverage-matrix row.
//
// `V19b` OWNS the expressions.md §"Identifier resolution" first-match
// precedence — local `let` / parameter > top-level `fn` > import > callable —
// and IMPLEMENTS the local, top-level-`fn`-hoisting, and import arms of that
// order:
//
//   - local `let` / parameter bindings, immutable vs `let mut` slots, and the
//     per-iteration fresh `for` binding / `let _` discard rules of bindings.md;
//   - top-level `fn` declarations, hoisted so mutual recursion resolves in
//     either textual order (functions.md FN-1) and carrying `fn` bodies for the
//     `V19c` executor's final-value / `return` evaluation (FN-3…FN-5);
//   - imported `.warp` symbols (top-level `schema` / `enum` / `fn`) materialised
//     into the environment via `V15c`'s import loader (imports.md §Visibility),
//     an imported `fn` being callable with the cross-file `.warp fn` call
//     execution riding `V19d`'s invoke trampoline;
//   - top-level `schema` / `enum` declarations registered so runtime
//     `Enum.Variant` access and named-schema constructors resolve.
//
// `V19b` DEFINES the callable arm's precedence position (frontmatter `tools:`,
// `V6c`) but does NOT populate or execute it — that is supplied by `V19d`
// (effect wiring) / `V19e` (composition).
//
// V19b-T (tests-task) declares these seam shapes — the `LexicalEnvironment`
// scope model, the arm-labelled `Resolution`, the `WriteResult`, the
// `MaterializedImport` / `EnumRegistration` inputs, the `buildEnvironment`
// factory, and the real `LoomEvalHost` realising `V3a`'s `EvalHost` — and stubs
// each behaviour-bearing method inertly so the failing tests compile and red on
// their own primary assertions:
//
//   - `resolve` returns the inert `unresolved` arm, so every precedence,
//     `fn`-hoisting, and import-materialisation assertion reds (no arm matches);
//   - `writeBinding` inertly accepts every write without recording it, so the
//     `let mut` value-update assertion reds (the value never changes) and the
//     immutable-rejection assertion reds (the write is not rejected);
//   - `bindIterationVariable` / `child` return inert scopes, so the
//     per-iteration fresh-binding assertion reds;
//   - `resolveSchema` / `resolveEnumVariant` return `undefined`, so the
//     schema-constructor / `Enum.Variant` assertions red;
//   - the `LoomEvalHost` methods return the inert `null` sentinel, so the host
//     identifier-read / call assertions red.
//
// No test reds on a compile error, a missing fixture, or a harness throw. The
// paired V19b implementation leaf fills these in.
//
// Spec: expressions.md (§"Identifier resolution"), bindings.md, functions.md,
// imports.md, runtime-value-model.md.

import type { LoomValue } from "./value";
import type { EvalHost } from "./expression-evaluator";
import type { FnDecl, LoomBody, SchemaDecl } from "../parser/loom-document";

// --------------------------------------------------------------------------
// Resolution model
// --------------------------------------------------------------------------

/**
 * The four resolution arms of expressions.md §"Identifier resolution", in
 * first-match precedence order, plus the `unresolved` terminal:
 *
 *   1. `local`    — a local `let` binding or function parameter in scope;
 *   2. `fn`       — a top-level `fn` declaration in the same `.loom` / `.warp`;
 *   3. `import`   — a symbol imported from a `.warp` file (`V15c`);
 *   4. `callable` — a name in the loom's callable set (`tools:`, `V6c`) — the
 *      precedence position `V19b` DEFINES but does not populate or execute.
 */
export type ResolutionArm = "local" | "fn" | "import" | "callable" | "unresolved";

/**
 * The outcome of resolving a bare identifier against the environment, tagged
 * with the arm that matched so first-match precedence is observable. A `local`
 * resolution carries the bound value and slot mutability; an `fn` / `import`-`fn`
 * resolution carries the `FnDecl` body (for the executor's final-value / return
 * evaluation) and whether it is callable.
 */
export interface Resolution {
  readonly arm: ResolutionArm;
  /** The bound value — present for a `local` read. */
  readonly value?: LoomValue;
  /** Whether a `local` slot was declared `let mut`. */
  readonly mutable?: boolean;
  /** The carried `fn` body — present for an `fn` / imported-`fn` resolution. */
  readonly fn?: FnDecl;
  /** Whether the resolution names a callable target (a `fn`, imported `fn`, or callable). */
  readonly callable?: boolean;
}

/**
 * The outcome of a reassignment write at the scope layer (bindings.md `cka-6`).
 * A write against a `let mut` slot is `accepted`; a write against an immutable
 * `let` slot is rejected (`accepted: false`) and the slot is left unchanged.
 */
export interface WriteResult {
  readonly accepted: boolean;
}

// --------------------------------------------------------------------------
// Import materialisation inputs (V15c import loader)
// --------------------------------------------------------------------------

/** A top-level `.warp` symbol kind — each is materialisable into the environment. */
export type ImportedSymbolKind = "fn" | "schema" | "enum";

/**
 * An imported `.warp` symbol materialised into the runtime environment via
 * `V15c`'s import loader (imports.md §Visibility). An imported `fn` carries its
 * `FnDecl` body and is callable; an imported `schema` / `enum` is registered so
 * its constructor / `Enum.Variant` access resolves.
 */
export interface MaterializedImport {
  /** The local binding name (the `as` alias, or the source name when unaliased). */
  readonly name: string;
  readonly kind: ImportedSymbolKind;
  /** The imported `fn` body — present only for `kind: "fn"`. */
  readonly fn?: FnDecl;
  /** The variant wire strings — present only for `kind: "enum"`. */
  readonly variants?: readonly string[];
}

/**
 * A top-level `enum` registration: the enum name and its variant wire strings.
 * `V19a`'s `EnumDecl` carries only the name, so the variant set is supplied
 * alongside it (see notes.md — the seam-shape decision).
 */
export interface EnumRegistration {
  readonly name: string;
  readonly variants: readonly string[];
}

/**
 * The inputs a root environment is built from: `V19a`'s parsed body AST (for
 * top-level `fn` hoisting and `schema` registration), the `V15c`-materialised
 * imports, the enum registrations, and the callable-set names (the precedence
 * position `V19b` defines but does not populate).
 */
export interface EnvironmentInputs {
  readonly body: LoomBody;
  readonly imports?: readonly MaterializedImport[];
  readonly enums?: readonly EnumRegistration[];
  readonly callables?: readonly string[];
}

// --------------------------------------------------------------------------
// Lexical environment
// --------------------------------------------------------------------------

/**
 * The runtime lexical environment and scope model. A root environment holds the
 * hoisted top-level `fn` declarations, the registered `schema` / `enum`
 * declarations, the materialised imports, and the callable-set names; nested
 * scopes (`child`, `bindIterationVariable`) hold local `let` / parameter slots
 * and delegate outward for the identifier-resolution precedence walk.
 *
 * State is per-instance (constructor-injected) — no module-level mutable state.
 *
 * V19b-T stubs every behaviour-bearing method inertly (see the module header).
 * The paired V19b implementation leaf fills the scope model in.
 */
export class LexicalEnvironment {
  public constructor(
    private readonly inputs: EnvironmentInputs,
    private readonly parent: LexicalEnvironment | null = null,
  ) {}

  /**
   * Define a local `let` / parameter binding in this scope. A `let _` discard
   * (`name === "_"`) records no resolvable binding (bindings.md §Discard).
   *
   * V19b-T stubs this inert (records nothing).
   */
  public defineLocal(name: string, value: LoomValue, mutable: boolean): void {
    void name;
    void value;
    void mutable;
  }

  /**
   * Write a reassignment against a local binding: accepted only against a
   * `let mut` slot, rejected against an immutable `let` slot at the scope layer
   * (bindings.md `cka-6`).
   *
   * V19b-T stubs this inert — it accepts every write without recording it, so
   * the `let mut` value-update assertion reds and the immutable-rejection
   * assertion reds.
   */
  public writeBinding(name: string, value: LoomValue): WriteResult {
    void name;
    void value;
    return { accepted: true };
  }

  /**
   * Resolve a bare identifier against this scope chain in the expressions.md
   * §"Identifier resolution" first-match order (local > `fn` > import >
   * callable), a local binding shadowing all outer scopes.
   *
   * V19b-T stubs this inert (always `unresolved`).
   */
  public resolve(name: string): Resolution {
    void name;
    return { arm: "unresolved" };
  }

  /** Open a nested lexical scope (a `{ … }` block / loop body). */
  public child(): LexicalEnvironment {
    return new LexicalEnvironment(this.inputs, this);
  }

  /**
   * Enter a fresh `for` iteration scope binding `name` to `value` in a
   * per-iteration fresh slot (bindings.md §"per-iteration fresh binding"), so
   * each iteration's binding is independent of the others.
   *
   * V19b-T stubs this inert (returns an inert child that resolves nothing).
   */
  public bindIterationVariable(name: string, value: LoomValue): LexicalEnvironment {
    void name;
    void value;
    return this.child();
  }

  /**
   * Resolve a registered top-level or imported `schema` by name so a
   * named-schema constructor resolves (expressions.md §"Object construction").
   *
   * V19b-T stubs this inert (always `undefined`).
   */
  public resolveSchema(name: string): SchemaDecl | undefined {
    void name;
    return undefined;
  }

  /**
   * Resolve a registered `enum`'s `Enum.Variant` access to its runtime
   * `EnumValue` (runtime-value-model.md, enum row). Returns `undefined` for an
   * unregistered enum or an unknown variant.
   *
   * V19b-T stubs this inert (always `undefined`).
   */
  public resolveEnumVariant(enumName: string, variant: string): LoomValue | undefined {
    void enumName;
    void variant;
    return undefined;
  }
}

/**
 * Build a root lexical environment from `V19a`'s parsed body AST and the
 * `V15c`-materialised imports: hoists every top-level `fn` (so mutual recursion
 * resolves in either textual order), registers top-level `schema` / `enum`
 * declarations, materialises imported symbols, and records the callable-set
 * names (the precedence position `V19b` defines but does not populate).
 *
 * V19b-T stubs this inert — it returns an environment whose methods are inert,
 * so no hoisting / registration / materialisation is observable. The paired
 * V19b leaf fills it in.
 */
export function buildEnvironment(inputs: EnvironmentInputs): LexicalEnvironment {
  return new LexicalEnvironment(inputs);
}

// --------------------------------------------------------------------------
// The real EvalHost (V3a seam realisation)
// --------------------------------------------------------------------------

/**
 * The real `EvalHost` (`V3a`'s seam): resolves a bare identifier read and
 * performs a call `f(args)` against the lexical environment, in the
 * expressions.md §"Identifier resolution" first-match order.
 *
 * V19b-T stubs both methods as the inert `null` sentinel — neither consults the
 * environment — so the host identifier-read / call assertions red. The paired
 * V19b leaf wires the host to the environment.
 */
export class LoomEvalHost implements EvalHost {
  public constructor(private readonly env: LexicalEnvironment) {}

  public resolveIdentifier(name: string): LoomValue {
    void this.env;
    void name;
    return null;
  }

  public callFunction(name: string, args: readonly LoomValue[]): LoomValue {
    void this.env;
    void name;
    void args;
    return null;
  }
}
