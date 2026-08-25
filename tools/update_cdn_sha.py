#!/usr/bin/env python3
"""Repoint every pinned jsDelivr URL in the READMEs at a new commit.

Each version README is deliberately self-contained, so the pinned commit SHA
appears in several files. Editing them by hand is exactly the sort of thing that
leaves one file stale, so use this instead.

    python3 tools/update_cdn_sha.py            # pin to current git HEAD
    python3 tools/update_cdn_sha.py <sha>      # pin to a specific commit
    python3 tools/update_cdn_sha.py --check    # report the SHAs in use, change nothing

Run it AFTER pushing the commit that contains the data and widget files: jsDelivr
can only serve a commit GitHub already has, and a freshly pushed SHA may 404 for a
minute or two while jsDelivr fetches it for the first time.
"""
import glob
import io
import re
import subprocess
import sys

PATTERN = re.compile(r'(occupation-qualtrics-bilingual@)([0-9a-f]{7,40})')
FILES = ["README.md"] + sorted(glob.glob("versions/*/README.md"))


def current_shas():
    found = {}
    for f in FILES:
        s = io.open(f, encoding="utf-8").read()
        for m in PATTERN.finditer(s):
            hits = found.setdefault(m.group(2), {})
            hits[f] = hits.get(f, 0) + 1
    return found


def main():
    args = [a for a in sys.argv[1:]]

    if "--check" in args:
        found = current_shas()
        if not found:
            print("no pinned URLs found")
            return 0
        for sha, files in sorted(found.items(), key=lambda kv: -len(kv[1])):
            total = sum(files.values())
            print("%s  %d file(s), %d occurrence(s)" % (sha, len(files), total))
            for f, n in sorted(files.items()):
                print("    %-52s x%d" % (f, n))
        shorts = {}
        for f in FILES:
            body = io.open(f, encoding="utf-8").read()
            for m in re.finditer(r'pinned to(?: commit)? `([0-9a-f]{7,40})`', body, re.I):
                shorts.setdefault(m.group(1), []).append(f)
        expected = {s[:len(k)] for s in found for k in shorts} if found else set()
        stale = [(k, v) for k, v in shorts.items()
                 if not any(full.startswith(k) for full in found)]
        if stale:
            print("\nWARNING: prose cites a SHA no URL uses:")
            for k, v in stale:
                print("    `%s` in %s" % (k, ", ".join(sorted(set(v)))))
        print("\nOK: one SHA everywhere" if len(found) == 1 and not stale
              else "\nWARNING: %d different SHAs are in use" % len(found))
        return 0 if len(found) <= 1 and not stale else 1

    if args:
        sha = args[0]
    else:
        sha = subprocess.check_output(["git", "rev-parse", "HEAD"]).decode().strip()

    if not re.fullmatch(r'[0-9a-f]{40}', sha):
        print("error: expected a full 40-character commit SHA, got %r" % sha)
        return 2

    short = sha[:7]
    changed = 0
    for f in FILES:
        s = io.open(f, encoding="utf-8").read()
        new = PATTERN.sub(lambda m: m.group(1) + sha, s)
        # the prose also cites the short form, e.g. "pinned to commit `1a8ec42`"
        # Case-insensitive: the prose says both "pinned to" and "Pinned to", and a
        # missed short form is exactly the silent drift this script exists to stop.
        new = re.sub(r'(pinned to(?: commit)? `)[0-9a-f]{7,40}(`)',
                     lambda m: m.group(1) + short + m.group(2), new, flags=re.I)
        if new != s:
            io.open(f, "w", encoding="utf-8").write(new)
            changed += 1
            print("updated %s" % f)
    print("\n%d file(s) repointed at %s" % (changed, sha))
    print("Verify before committing:")
    print("  grep -rhoE 'https://cdn\\.jsdelivr\\.net/gh/[^ \")<>`]+' README.md versions/*/README.md \\")
    print("    | sort -u | while read u; do echo \"$(curl -s -o /dev/null -w '%{http_code}' \"$u\") $u\"; done")
    return 0


if __name__ == "__main__":
    sys.exit(main())
