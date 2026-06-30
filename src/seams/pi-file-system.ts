// V8b — `PiFileSystem` production adapter for the `FileSystem` seam (PIC-13).
//
// Delegates the `FileSystem` interface to Node's `fs.promises` / `os` surface,
// applying PIC-13's Node-style `.code` rejection mapping, the `readBytes`
// raw-pre-decode-bytes contract (lexical.md §Encoding), the `readdir`
// entry-name encoding guarantee (no Unicode normalisation), and `realpath`'s
// case-canonicalisation / transitive-symlink / byte-stable guarantees.
//
// V8b-T stub: the seam shape is declared so the V8b-T tests type-check; the
// per-member behaviour is implemented by the paired `V8b` leaf. Each member
// throws until then so every behavioural test reds on its own assertion.
//
// Spec: host-interfaces-services.md PIC-13; lexical.md §Encoding.

import type { FileStat, FileSystem } from "./file-system";

function notImplemented(member: string): never {
  throw new Error(`V8b: PiFileSystem.${member} not implemented`);
}

export class PiFileSystem implements FileSystem {
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
