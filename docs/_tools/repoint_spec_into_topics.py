#!/usr/bin/env python3
"""One-shot: collapse docs/spec/ section pages into docs/spec_topics/.

Moves the 3 section files into spec_topics/ and repoints every markdown link
across docs/ by recomputing relative paths. Inverse-shaped to split_spec.py.
"""
import os
import re
import subprocess
import sys

DOCS = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
NAMES = [
    "overview-and-orientation",
    "language-and-architecture",
    "session-model-and-appendix",
]
OLD_DIR = os.path.join(DOCS, "spec")
NEW_DIR = os.path.join(DOCS, "spec_topics")

LINK_RE = re.compile(
    r"\]\((?P<path>[^)#\s]*?spec/(?P<name>"
    + "|".join(re.escape(n) for n in NAMES)
    + r")\.md)(?P<frag>#[^)]*)?\)"
)


def rel(target_abs, from_dir):
    r = os.path.relpath(target_abs, from_dir).replace(os.sep, "/")
    if not r.startswith("."):
        r = "./" + r
    return r


def iter_md():
    for root, _dirs, files in os.walk(DOCS):
        if os.path.basename(root) == "_tools":
            continue
        for f in files:
            if f.endswith(".md"):
                yield os.path.join(root, f)


def phase_move():
    for n in NAMES:
        src = os.path.join(OLD_DIR, n + ".md")
        dst = os.path.join(NEW_DIR, n + ".md")
        subprocess.check_call(["git", "mv", src, dst], cwd=DOCS)


def phase_outbound():
    # Moved files now live in spec_topics/; their ../spec_topics/ links
    # become same-dir-relative (./).
    changed = 0
    for n in NAMES:
        p = os.path.join(NEW_DIR, n + ".md")
        text = open(p, encoding="utf-8").read()
        new = text.replace("](../spec_topics/", "](./")
        if new != text:
            open(p, "w", encoding="utf-8").write(new)
            changed += new.count("](./") - text.count("](./")
    return changed


def phase_inbound():
    moved = {os.path.join(NEW_DIR, n + ".md") for n in NAMES}
    total = 0
    for path in iter_md():
        if path in moved:
            continue
        from_dir = os.path.dirname(path)
        text = open(path, encoding="utf-8").read()

        def sub(m):
            name = m.group("name")
            old_target = os.path.normpath(os.path.join(from_dir, m.group("path")))
            assert old_target == os.path.join(OLD_DIR, name + ".md"), \
                f"{path}: link {m.group('path')} resolves to {old_target}, not spec/{name}.md"
            new_target = os.path.join(NEW_DIR, name + ".md")
            frag = m.group("frag") or ""
            return f"]({rel(new_target, from_dir)}{frag})"

        new, k = LINK_RE.subn(sub, text)
        if k:
            open(path, "w", encoding="utf-8").write(new)
            total += k
    return total


def main():
    phase_move()
    out = phase_outbound()
    inb = phase_inbound()
    if os.path.isdir(OLD_DIR) and not os.listdir(OLD_DIR):
        os.rmdir(OLD_DIR)
    print(f"outbound rewrites (in moved files): {out}")
    print(f"inbound rewrites (other files):     {inb}")
    print(f"spec/ removed: {not os.path.isdir(OLD_DIR)}")


if __name__ == "__main__":
    sys.exit(main())
