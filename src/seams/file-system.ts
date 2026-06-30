// H3a — `FileSystem` seam (PIC-13). Declares the seam interface's full member
// signatures, sourced from host-interfaces-services.md#fakefilesystem--filesystem-interface.
// The per-member behaviour (Node-style `.code` rejection mapping, `homedir()` /
// `cwd()` single-source-of-truth rules, the readdir entry-name encoding
// guarantee, the `realpath` canonicalisation guarantees) is added by the V8*
// leaves implementing the `PiFileSystem` / `FakeFileSystem` adapters.
//
// Spec: host-interfaces-services.md PIC-13.

export interface FileStat {
  isDirectory(): boolean;
  isFile(): boolean;
  isSymbolicLink(): boolean;
}

export interface FileSystem {
  /** Text read; rejects with Node-style `.code` (`ENOENT` / `EACCES` / `EPERM` / …). */
  readText(path: string): Promise<string>;
  /** Raw, pre-decode byte sequence; same `.code` rejection shape as `readText`. */
  readBytes(path: string): Promise<Uint8Array>;
  writeText(path: string, contents: string): Promise<void>;
  /** Resolves `false` on `ENOENT`; rejects on any other error. */
  exists(path: string): Promise<boolean>;
  /** Single source of truth for home-directory expansion; never reads `process.env`. */
  homedir(): string;
  /** Factory-time working directory captured once; never reads `process.cwd()` ad-hoc. */
  cwd(): string;
  /** Entry names only (no full paths); same `.code` rejection shape as `readText`. */
  readdir(path: string): Promise<readonly string[]>;
  /** Does NOT follow symlinks; same `.code` rejection shape as `readText`. */
  lstat(path: string): Promise<FileStat>;
  /** Resolves symlinks to a canonical absolute path; rejects `ELOOP` / `ENOENT` / `EACCES` / `EPERM`. */
  realpath(path: string): Promise<string>;
}
