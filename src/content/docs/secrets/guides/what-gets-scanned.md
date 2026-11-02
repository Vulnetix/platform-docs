---
title: What gets scanned
description: The files, binaries, image metadata, Kubernetes Secret values and git history the secrets stage reads, the limits on each, and what it cannot see.
order: 1
sources: [cli/internal/sast/input.go, cli/internal/sast/engine.go, cli/internal/secretscan/inspect.go, cli/internal/secretscan/strings.go, cli/internal/secretscan/k8s.go, cli/internal/secretscan/githistory.go, cli/internal/sast/rules/lib_secrets.rego, cli/cmd/scan.go]
checked: [cli@2449840]
updated: 02 Nov 2026
---

The secrets stage builds one input document from five sources, then runs every rule of kind `secrets` over it. A finding from a source other than the working tree carries a synthetic path prefix, which you see in the SARIF `artifactLocation.uri` and in the report.

| Source | Path in findings | Turned off by |
|---|---|---|
| Text files in the working tree | `src/config.py` | `--exclude`, `--ignore` |
| Printable strings from binary files | `__binary_strings__/<path>` | `--ignore-binaries` |
| EXIF, IPTC and XMP metadata of images | `__exif__/<path>` | `--ignore-binaries` |
| Decoded `data:` values of Kubernetes `Secret` manifests | `__k8s_secret__/<file>/<key>` | `--exclude` on the manifest |
| Files changed in past commits | `__git_history__/<short-sha>/<path>` | `--ignore-git` or `--git-history=false` |

## The working tree

The walk starts at `--path` and goes `--depth` levels down (default `3`). A file at depth 4 (`a/b/c/file`) is not read.

These directories are never walked, at any depth: `.git`, `node_modules`, `vendor`, `.venv`, `.tox`, `__pycache__`, `.cargo`, `.hg`, `.vulnetix`. A `.git` file (a worktree or submodule pointer) is skipped the same way.

Paths matched by your `.gitignore` files are skipped unless you pass `--secrets-include-ignored` (or the family-wide `--include-ignored`). `--exclude` and `--ignore` both take globs relative to the scan root and are applied together; `--ignore` is not limited to secret rules.

A file is read in full when it is at most 1 MiB. A larger file is skipped and counted in the notice `N file(s) were not content-scanned (over the 1 MiB text cap, unreadable, or binary)`.

The rules then skip some paths of their own (`lib_secrets.rego`, `skip_path`):

| Skipped | Patterns |
|---|---|
| Lock, sum and generated files | `.lock`, `.sum`, `.min.js`, `.min.css`, `.min.html`, `.min.json`, `.map`, `.svg`, `.snap`, `.pb.go`, `.woff`, `.woff2`, `.ttf`, `.eot` |
| Test files by name | `_test.go`, `.spec.ts`, `.spec.js`, `.test.ts`, `.test.js`, `.spec.tsx`, `.spec.jsx`, `.test.tsx`, `.test.jsx`, `Test.java`, `Tests.java`, `Test.kt`, `Tests.kt`, `_test.py`, `_spec.rb` |
| Directories anywhere in the path | `testdata/`, `fixtures/`, `node_modules/`, `vendor/`, `.terraform/`, `dist/`, `build/`, `__snapshots__/`, `__tests__/`, `src/test/` |

A hand-written rule can skip more (`VNX-SEC-001` also skips `__mocks__/` and Xcode test targets). The 1,010 catalogue rules use `skip_path` alone.

## Binary files

A file with a NUL byte in its first 512 bytes is binary. Unless `--ignore-binaries` is set, the stage extracts every run of at least 4 printable characters (the `strings(1)` default) and scans them as one text file. A credential compiled into an executable, a `.pyc` file or a JAR is found this way, with no useful line number.

Images (`.jpg`, `.jpeg`, `.jpe`, `.jfif`, `.tif`, `.tiff`, `.heic`, `.heif`, `.webp`, `.png`, `.gif`, `.psd`, `.dng`, `.cr2`, `.nef`, `.arw`, `.orf`, `.rw2`) also have their EXIF, IPTC and XMP fields extracted as `key=value` lines.

## Kubernetes Secret manifests

For each `.yaml` or `.yml` file, every document with `kind: Secret` has its `data:` values base64-decoded. A decoded value is scanned when it is printable text of at most 1 MiB. `stringData:` is already plain text in the file and is scanned as written. `VNX-SEC-074` also reports the manifest itself when it carries credential data.

## Git history

When `--git-history` is on (the default) and `--ignore-git` is off, the stage opens the repository's object database with go-git and walks commits newest first:

| Limit | Default | Flag |
|---|---|---|
| Commits walked | 500 | `--git-history-max-commits` (0 = no cap) |
| File versions extracted | 5,000 | `--git-history-max-files` (0 = no cap) |
| Size of one file version | 4 MiB | none |

Each added or modified file in a commit is read as it was in that commit. A credential you deleted from the tree but which is still in a past commit is reported with the history path, and the report says *removed from the tree, still in history*. If the pack files cannot be read, the stage falls back to the loose objects under `.git/objects` and reports each blob as `__git_history__/loose/<sha>`, without a file name.

If history cannot be read at all, the scan continues and adds the notice `git history was not scanned: <reason>`.

## How a rule decides

Every catalogue rule runs the same pipeline, cheapest check first:

1. **Path**: `skip_path` above.
2. **Keyword**: the file, then the line, must contain one of the rule's keywords or prefixes (case-insensitive).
3. **Token**: a regular expression extracts the candidate credential from the line.
4. **Placeholder**: the token is dropped if it contains a stopword (`example`, `placeholder`, `redacted`, `changeme`, `dummy`, `sample`, `fake-key`, `lorem`, `todo` and others), ends in `EXAMPLE`, is mostly one filler character (`x`, `a`, `0`, `1`, `z` making up 40% of it), is a run of dots, dashes or underscores, or is a well-known example UUID.
5. **Entropy**: for `keyword_entropy` rules the token's Shannon entropy must reach the rule's threshold. `fixed_prefix` rules, whose prefix is distinctive on its own (`ghp_`, `sk_live_`), skip this check.

## What it cannot see

Detection is conservative: a missed credential is preferred over a wrong one. By design it does not find:

- Values encrypted at rest (SOPS, Sealed Secrets, `ansible-vault`).
- Values encoded twice. Kubernetes `Secret.data` is decoded one level only.
- Values that are referenced, not present: `valueFrom.secretKeyRef`, `env_file:`, a Terraform variable. The reference name is never reported.
- Credentials split across lines or assembled at runtime.
- Files deeper than `--depth`, larger than 1 MiB, gitignored, or under a skipped directory.
- History older than `--git-history-max-commits` commits, or missing from a shallow clone.

No finding does not prove there is no secret.
