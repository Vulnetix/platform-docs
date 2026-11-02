---
title: Fix a vulnerable dependency
description: From a dependency finding in a manifest to an updated lockfile, for a direct dependency and for one pulled in transitively.
order: 1
sources: [cli/internal/lsp/codeaction.go, cli/internal/lsp/sca.go, cli/internal/scaview/scaview.go, cli/cmd/fix.go]
checked: [cli@4c8c3b7]
updated: 02 Nov 2026
---

## A direct dependency

1. Open the manifest, for example `package.json`. The vulnerable line has a squiggle and, once safe versions have loaded, a `→ <version>` hint at its end.
2. Hover the line. Check the **Exploits** section and whether the headline ends in `(CISA KEV)`; that decides how urgent this is.
3. Put the cursor on the line and press <kbd>Ctrl</kbd>+<kbd>.</kbd> (<kbd>Cmd</kbd>+<kbd>.</kbd> on macOS).
4. Choose a bump. The first entry is the target for `vulnetix.sca.safeHarbourStrategy`; up to three alternatives follow, each saying how many known vulnerabilities would remain.
5. The manifest line changes, keeping any range operator (`^4.17.20` becomes `^4.17.21`). <kbd>Ctrl</kbd>+<kbd>Z</kbd> undoes it.
6. Save, then update the lockfile with your package manager. The extension does not run it.

   ```sh
   npm install        # or: yarn install, pnpm install, pip-compile, go mod tidy, cargo update
   ```

7. The lockfile change is picked up by the file watcher and the finding clears after the re-check.

No quick fix is offered when:

| Situation | Why | What to do |
|---|---|---|
| Hover says "Pro unlocks Safe-Harbour version recommendations." | Ranked versions are not on your plan | Choose a version yourself from the advisory |
| Hover says "Resolving safe versions…" | The lookup for this manifest is still running | Wait a moment and retry |
| **Fix:** none available | No release clears Safe Harbour within `vulnetix.sca.maxMajorBump` | Raise `maxMajorBump` (a major bump is usually a code change), or see below |
| **Malicious package.** | A version bump is not a fix | Remove the dependency |
| **End of life** | No further security releases are expected | Plan a migration |

## A transitive dependency

A package you did not declare appears in the lockfile, and the declaring line in the manifest says `introduced via <pkg@version>` or `, including <pkg@version> pulled in transitively`. There is no version on the manifest line to bump for it.

In order of preference:

1. **Upgrade the parent.** If a newer release of the direct dependency pulls a fixed version, bump the parent (by hand, or with its own quick fix when it is vulnerable itself).
2. **Force the version** with your package manager:

   | Ecosystem | Mechanism |
   |---|---|
   | npm | `"overrides": { "qs": "6.5.3" }` in `package.json` |
   | Yarn | `"resolutions": { "qs": "6.5.3" }` in `package.json` |
   | pnpm | `"pnpm": { "overrides": { "qs": "6.5.3" } }` in `package.json` |
   | Go | `go get example.com/mod@v1.2.4`, which raises the minimum version selected |
   | Cargo | `cargo update -p name --precise 1.2.4` |

   An override asserts that the parent works with a version it was not tested against. Run its tests.
3. **Record why it stays.** Suppress it with a reason (see [Suppressions](/vscode/findings/suppressions/)), or record a VEX statement with the CLI ([VEX](/vex/)).

## Many at once

The editor fixes one line at a time. To plan and apply fixes across a repository, use the CLI, which resolves targets the same way and also runs the package manager and rescans:

```sh
vulnetix fix --strategy safest --max-major-bump 0 --dry-run   # show the plan
vulnetix fix --strategy safest --max-major-bump 0             # apply interactively
```

See [SCA](/sca/) for `vulnetix fix` and `vulnetix scan --sca-autofix`.
