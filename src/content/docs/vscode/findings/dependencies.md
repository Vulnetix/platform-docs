---
title: Dependencies
description: "Dependency findings in manifests and lockfiles: the diagnostic, the hover card, inline hints, quick fixes, the four Safe Harbour strategies and what the community tier withholds."
order: 2
sources: [cli/internal/lsp/sca.go, cli/internal/lsp/sca_diagnostics.go, cli/internal/lsp/sca_document.go, cli/internal/lsp/codeaction.go, cli/internal/lsp/inlayhint.go, cli/internal/lsp/hover.go, cli/internal/scaview/scaview.go, cli/internal/lsp/settings.go, vulnetix-vscode/package.json]
checked: [cli@4c8c3b7, vulnetix-vscode@9ad08fa]
updated: 02 Nov 2026
---

The server parses every manifest it finds with the same parsers as `vulnetix scan`, sends the package coordinates to the VDB in bulk, and reports each vulnerable package on the line that declares it. Diagnostics use the source `vulnetix-sca`. Turn the whole feature off with `vulnetix.sca.enabled: false`; hover, inlay hints and quick fixes are then not advertised either.

## The diagnostic

One diagnostic per package, however many advisories it has.

| Field | Content |
|---|---|
| Range | The declaring line in the manifest. Lockfile entries get their own diagnostic unless `vulnetix.sca.annotateLockfiles` is `false`. |
| Severity | The worst advisory: critical or high is an Error, medium a Warning, low or unscored an Information (or Hint with `vulnetix.diagnostics.mapLowTo: "hint"`) |
| Message | `name@version: N vulnerabilities (split by severity)`, then either `introduced via <pkg@ver>` (the package is only the route to a transitive problem) or `, including <pkg@ver> pulled in transitively`, then the worst advisory's ID and `(CISA KEV)` when listed |
| Code | The worst advisory's ID, linked to NVD for `CVE-` and to GitHub Advisories for `GHSA-` |
| Tags | `deprecated` (rendered as strikethrough) when the package is end of life |

A transitive vulnerability, present only in the lockfile, is also rolled up onto the direct dependency that pulls it in, because that is the line you can change. Without a lockfile there is no graph, and no parent is guessed.

## The hover card

Hover a dependency line in a manifest. A clean package gets a card too, saying "No known vulnerabilities".

| Section | Shows |
|---|---|
| Header | `name@version · ecosystem` and the count by severity |
| Advisories | The most severe first |
| **Exploits** | Known exploit count and whether it is listed as actively exploited, or "none known". On a plan without exploit data: "Pro unlocks exploit intel." |
| **Fix** / **Quick fix** | The target version for your strategy, "Resolving safe versions…", "none available" with the reason, or on the community tier "Pro unlocks Safe-Harbour version recommendations." |
| Notes | **Malicious package.** (remove it, a bump is not a fix) or **End of life since `<date>`** |
| **Introduced transitively** | The transitive packages rolled up onto this line |

> [!WHY] Withheld is not the same as none
> When the plan does not include ranked versions or exploit data, the card says so instead of printing "no fix" or "no exploits". Those are different claims, and the second would be false.

## Inline hints

Inlay hints sit at the end of each dependency line. Your editor must have inlay hints on (`editor.inlayHints.enabled`).

| Hint | Meaning |
|---|---|
| `✓` | Checked, no known vulnerabilities |
| `⋯ safe versions` | Vulnerable; replacement versions are still being fetched |
| `→ 4.17.21` | Vulnerable; the Safe Harbour target for your strategy |
| none | Not resolved by the VDB, or ranked versions are withheld on your plan |

Ranked versions are fetched only for the manifest you open, not for the whole workspace, so a vulnerable package shows `⋯ safe versions` briefly after you open the file.

## Quick fixes

Put the cursor on a vulnerable dependency and open the lightbulb (<kbd>Ctrl</kbd>+<kbd>.</kbd>, <kbd>Cmd</kbd>+<kbd>.</kbd> on macOS). You get the strategy's target first and up to three alternatives:

```
Bump lodash 4.17.20 → 4.17.21 (no known vulnerabilities, Safe-Harbour 92)
```

The suffix is `(no known vulnerabilities)`, `(1 known vulnerability remains)` or `(N known vulnerabilities remain)`. A version the VDB flags as malware is never offered.

Applying a fix edits the manifest line only, as a workspace edit: it works on unsaved buffers and <kbd>Ctrl</kbd>+<kbd>Z</kbd> undoes it. A declared range operator is kept, so `^4.17.20` becomes `^4.17.21`. The edit is the same one `vulnetix fix` makes. The extension does not run your package manager; run `npm install` (or the equivalent) yourself to update the lockfile, and the finding clears on the next check.

A transitive-only finding has no version on its line to change, so it has no quick fix. Fix it on the parent, or with an override: see [Fix a vulnerable dependency](/vscode/guides/fix-a-dependency/).

## Choosing the target version

| Setting | Values | Default |
|---|---|---|
| `vulnetix.sca.safeHarbourStrategy` | `safest`, `stable`, `latest`, `rolling` | `safest` |
| `vulnetix.sca.maxMajorBump` | integer 0 to 100; `0` refuses any major upgrade | `0` |

Malware is removed before any pick.

| Strategy | Picks |
|---|---|
| `safest` | The highest stable release Safe Harbour clears (no known vulnerability, exploit or malware report), by version order. Never a pre-release. |
| `stable` | The stable release closest to the one you run: major, then minor, then patch, a tie goes to the higher. It can be lower than yours. |
| `latest` | The highest stable release by the ecosystem's own version rules. Where versions cannot be ordered by number, the most recent by date. Never a pre-release. |
| `rolling` | Among every non-malware version published on the release day (UTC) of the highest version, pre-releases and vulnerable versions included, the one closest to yours |

The editor defaults to `safest` while `vulnetix fix` defaults to `stable`. A one-click fix behind a lightbulb gets less thought than a command someone typed, so the editor prefers the release with nothing known against it. `rolling` appears in the settings UI from extension 0.3.1; the server accepts it either way. Pick logic is described in full under [SCA](/sca/).

An out-of-range or unknown value is logged and replaced with the default; it never disables analysis.

## Network use

Only package coordinates (name, version, ecosystem as a package URL) are sent to `api.vdb.vulnetix.com`, from the server process. Responses are cached on disk under `~/.vulnetix/cache/vdb/`, keyed by CLI version. See [Privacy and network use](/vscode/configuration/privacy/).
