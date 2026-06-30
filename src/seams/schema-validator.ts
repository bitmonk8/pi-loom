// H3a — `SchemaValidator` seam (PIC-11). Declares the seam interface's full
// member signatures, sourced from host-interfaces-services.md#schemavalidator-interface.
// The behavioural contract (single-pass error reporting, no conversion / no
// default-fill, `$ref` resolution scope, cache-collision handling) is added by
// the V8* leaves implementing against this shape.
//
// Spec: host-interfaces-services.md PIC-11.

/**
 * The lowered per-query JSON-Schema document (Schema Subset — Lowering
 * Algorithm step 4). Its concrete shape is owned by the schema-subset leaves;
 * H3a declares it as the opaque document the validator compiles.
 */
export type LoweredSchema = Readonly<Record<string, unknown>>;

export interface ValidationError {
  /** RFC 6901 JSON Pointer to the failing value. */
  instancePath: string;
  /** Pointer into the schema that triggered the failure. */
  schemaPath: string;
  /** The JSON-Schema keyword that failed ("type", "required", "enum", …). */
  keyword: string;
  /** Human-readable failure description. */
  message: string;
  /** Keyword-specific failure context (AJV's `params`). */
  params: Record<string, unknown>;
}

export interface CompiledValidator {
  validate(value: unknown):
    | { ok: true }
    | { ok: false; errors: readonly ValidationError[] };
}

export interface SchemaValidator {
  compile(schema: LoweredSchema): CompiledValidator;
  /** File-watcher entry point per the cache-invalidation rule. */
  invalidate(schemaSlug: string): void;
}

// --------------------------------------------------------------------------
// V8c / V8c-T — the production `SchemaValidator` implementation (PIC-11).
//
// V8c-T (tests-task) declares the production class shape and an inert stub so
// the failing tests compile and red on their own primary assertions; the paired
// V8c leaf fills the AJV-backed behaviour in (one-pass multi-error, no
// coercion / no default-fill, in-document `$ref`, silent unknown `format`,
// deterministic, per-runtime, slug-cache byte-verify).
// --------------------------------------------------------------------------

import Ajv, { type ErrorObject, type ValidateFunction } from "ajv";
import addFormats from "ajv-formats";
import type { Diagnostic } from "../diagnostics/diagnostic";

/**
 * The content-address of a lowered per-query schema document: its schema slug
 * (per schema-subset.md §Canonical schema hash) and the canonical-form bytes
 * the cache stores alongside the compiled validator so the slug-collision
 * byte-equality check (schema-subset.md §Schema-slug collision posture) is a
 * byte comparison, not a re-serialisation.
 */
export interface SchemaSlug {
  readonly slug: string;
  readonly canonicalBytes: string;
}

/**
 * The injected content-addressing function: maps a lowered schema document to
 * its schema slug and canonical-form bytes. Production wiring supplies the
 * canonical schema-hash recipe; tests inject a fixed-slug function to drive the
 * slug-collision path deterministically (a genuine 64-bit slug collision is not
 * otherwise constructible).
 */
export type SchemaSlugFn = (schema: LoweredSchema) => SchemaSlug;

/** Constructor dependencies for the production `SchemaValidator`. */
export interface AjvSchemaValidatorDeps {
  /** Sink for the per-query cache's `loom/runtime/validator-cache-collision`. */
  readonly emit: (diagnostic: Diagnostic) => void;
  /** Content-addressing function keying the compiled-validator cache. */
  readonly slugOf: SchemaSlugFn;
}

/** A cached compiled validator alongside the canonical bytes that minted it. */
interface CacheEntry {
  readonly validator: CompiledValidator;
  readonly canonicalBytes: string;
}

/**
 * The production `SchemaValidator` (PIC-11). One instance is constructed per
 * runtime instance (never a module-level global); its `Ajv` instance and
 * compiled-validator cache are owned per-instance, so parallel runtimes share
 * no state.
 *
 * AJV flag rationale (implementation-notes.md §"Schema validation" hint):
 * `allErrors: true` gives one-pass multi-error reporting; the absence of
 * `coerceTypes` / `useDefaults` gives no-type-conversion / no-default-fill;
 * AJV's default in-document `$ref` resolver gives the ref-scope rule; and
 * `strict: false` + `ajv-formats` makes unknown `format` keywords silently
 * accepted rather than raised, and `logger: false` suppresses AJV's
 * console warning for an ignored unknown format so acceptance is truly silent.
 */
export class AjvSchemaValidator implements SchemaValidator {
  readonly #deps: AjvSchemaValidatorDeps;
  readonly #ajv: Ajv;
  /** Per-query compiled-validator cache, keyed by schema slug. */
  readonly #cache = new Map<string, CacheEntry>();

  constructor(deps: AjvSchemaValidatorDeps) {
    this.#deps = deps;
    this.#ajv = new Ajv({ strict: false, allErrors: true, logger: false });
    addFormats(this.#ajv);
  }

  compile(schema: LoweredSchema): CompiledValidator {
    const { slug, canonicalBytes } = this.#deps.slugOf(schema);
    const cached = this.#cache.get(slug);
    if (cached !== undefined) {
      // Cache hit: verify byte-equality of the candidate document's canonical
      // form against the cached document's bytes before serving the cached
      // validator (PIC-11 byte-comparison, not a re-serialisation).
      if (cached.canonicalBytes === canonicalBytes) {
        return cached.validator;
      }
      // Byte mismatch == schema-slug collision: refuse to serve the wrong
      // cached validator. Emit `validator-cache-collision` and recompile the
      // new document; validation proceeds against the fresh validator so the
      // diagnostic does not abort the query.
      this.#deps.emit({
        severity: "error",
        code: "loom/runtime/validator-cache-collision",
        message: `validator-cache collision on slug ${slug}: two distinct schema documents hash alike`,
        hint: `cached document canonical bytes: ${cached.canonicalBytes}; new document canonical bytes: ${canonicalBytes}`,
      });
      return this.#build(schema);
    }
    const validator = this.#build(schema);
    this.#cache.set(slug, { validator, canonicalBytes });
    return validator;
  }

  invalidate(schemaSlug: string): void {
    this.#cache.delete(schemaSlug);
  }

  /** Compile a lowered schema into a `CompiledValidator` (no caching). */
  #build(schema: LoweredSchema): CompiledValidator {
    const validateFn: ValidateFunction = this.#ajv.compile(schema);
    return {
      validate(value: unknown) {
        if (validateFn(value)) {
          return { ok: true as const };
        }
        const errors: ValidationError[] = (validateFn.errors ?? []).map(
          (e: ErrorObject) => ({
            instancePath: e.instancePath,
            schemaPath: e.schemaPath,
            keyword: e.keyword,
            message: e.message ?? "",
            params: e.params,
          }),
        );
        return { ok: false as const, errors };
      },
    };
  }
}
