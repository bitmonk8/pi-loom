// H3a — the constructor-injection runtime root.
//
// The runtime root is a per-runtime object graph that threads the host seams
// (`Checkpoint`, `SchemaValidator`, `Clock`, `FileSystem`, `FileWatcher`,
// `TokenEstimator`, `IdSource`) as injected interfaces. Every collaborator is
// passed by constructor — there is no module-level global, static, or singleton
// (conventions.md "No globals, statics, singletons"), and no ambient access:
// the runtime reaches wall-clock time, the environment, the working directory,
// UUID minting, the filesystem, and the file watcher only through these seams.
//
// One instance per runtime: each `createRuntimeRoot(...)` call returns a fresh
// graph whose seams are exactly those injected, so two runtime roots constructed
// with distinct seam instances share no mutable state (parallel tests, the
// `invoke` parent/child split, etc.). The root holds no mutable state of its own
// — it only retains the injected seams as readonly fields.

import type {
  Checkpoint,
  Clock,
  FileSystem,
  FileWatcher,
  IdSource,
  SchemaValidator,
  TokenEstimator,
} from "./seams/index";

/** The complete host-seam set a runtime root is constructed from. */
export interface RuntimeSeams {
  readonly checkpoint: Checkpoint;
  readonly schemaValidator: SchemaValidator;
  readonly clock: Clock;
  readonly fileSystem: FileSystem;
  readonly fileWatcher: FileWatcher;
  readonly tokenEstimator: TokenEstimator;
  readonly idSource: IdSource;
}

/**
 * The per-runtime object graph. Constructor-injected, immutable in its seam
 * references; behaviour-bearing collaborators are added by later leaves wiring
 * against this graph.
 */
export class RuntimeRoot {
  readonly checkpoint: Checkpoint;
  readonly schemaValidator: SchemaValidator;
  readonly clock: Clock;
  readonly fileSystem: FileSystem;
  readonly fileWatcher: FileWatcher;
  readonly tokenEstimator: TokenEstimator;
  readonly idSource: IdSource;

  constructor(seams: RuntimeSeams) {
    this.checkpoint = seams.checkpoint;
    this.schemaValidator = seams.schemaValidator;
    this.clock = seams.clock;
    this.fileSystem = seams.fileSystem;
    this.fileWatcher = seams.fileWatcher;
    this.tokenEstimator = seams.tokenEstimator;
    this.idSource = seams.idSource;
  }
}

/** Construct a fresh runtime root from an injected seam set. */
export function createRuntimeRoot(seams: RuntimeSeams): RuntimeRoot {
  return new RuntimeRoot(seams);
}
