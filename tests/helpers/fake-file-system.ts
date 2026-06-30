// V8b — in-memory `FakeFileSystem` conforming `FileSystem` seam implementation
// (PIC-13). Test code (unrestricted) constructs it with the values it should
// report, so a conformance test drives the seam's `.code` rejection mapping,
// the `readBytes` raw-bytes contract, `homedir()` / `cwd()` single-source-of-
// truth values, the `readdir` entry-name encoding guarantee, and `realpath`'s
// case-canonicalisation / transitive-symlink / ELOOP / ENOENT behaviour at
// chosen boundaries instead of reaching the real disk.
//
// V8b-T stub: the constructor shape and member signatures are declared so the
// V8b-T tests type-check; each member throws until the paired `V8b` leaf
// implements the in-memory behaviour, so every behavioural test reds on its
// own assertion (the implementation under test is absent).
//
// Spec: host-interfaces-services.md PIC-13; lexical.md §Encoding.

import type { FileStat, FileSystem } from "../../src/seams/file-system";

/**
 * Constructor inputs the fake reports. Every map is keyed by absolute path.
 * A path present in `errors` rejects every operation on it with the configured
 * Node-style `.code` (`ENOENT` / `EACCES` / `EPERM` / `ELOOP` / `ENOTDIR` / …),
 * exercising the same rejection surface production reaches through Node.
 */
export interface FakeFileSystemOptions {
  /** Reported by `homedir()` (the Home-directory expansion single source). */
  readonly homedir: string;
  /** Reported by `cwd()` (the factory-time project-local discovery root). */
  readonly cwd: string;
  /** Regular files: path → content (string is UTF-8 encoded; bytes used as-is). */
  readonly files?: Readonly<Record<string, string | Uint8Array>>;
  /** Directories: path → entry names (no full paths, no normalisation). */
  readonly dirs?: Readonly<Record<string, readonly string[]>>;
  /** Symlinks: path → immediate target (resolved transitively by `realpath`). */
  readonly symlinks?: Readonly<Record<string, string>>;
  /** Injected per-path Node-style `.code` rejections. */
  readonly errors?: Readonly<Record<string, string>>;
  /** When true, `realpath` canonicalises component/leaf case to one entry. */
  readonly caseInsensitive?: boolean;
}

function notImplemented(member: string): never {
  throw new Error(`V8b: FakeFileSystem.${member} not implemented`);
}

class FakeStat implements FileStat {
  constructor(
    private readonly kind: "file" | "dir" | "symlink",
  ) {}
  isDirectory(): boolean {
    return this.kind === "dir";
  }
  isFile(): boolean {
    return this.kind === "file";
  }
  isSymbolicLink(): boolean {
    return this.kind === "symlink";
  }
}

export class FakeFileSystem implements FileSystem {
  // Retained for the V8b implementation; referenced so the field is live.
  readonly #options: FakeFileSystemOptions;

  constructor(options: FakeFileSystemOptions) {
    this.#options = options;
    void this.#options;
    void FakeStat;
  }

  readText(_path: string): Promise<string> {
    return notImplemented("readText");
  }

  readBytes(_path: string): Promise<Uint8Array> {
    return notImplemented("readBytes");
  }

  writeText(_path: string, _contents: string): Promise<void> {
    return notImplemented("writeText");
  }

  exists(_path: string): Promise<boolean> {
    return notImplemented("exists");
  }

  homedir(): string {
    return notImplemented("homedir");
  }

  cwd(): string {
    return notImplemented("cwd");
  }

  readdir(_path: string): Promise<readonly string[]> {
    return notImplemented("readdir");
  }

  lstat(_path: string): Promise<FileStat> {
    return notImplemented("lstat");
  }

  realpath(_path: string): Promise<string> {
    return notImplemented("realpath");
  }
}
