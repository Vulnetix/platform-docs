---
title: Match the editor to CI
description: The editor and CI run the same engine; this page maps editor settings to `vulnetix scan` flags and lists the differences that are expected.
order: 2
sources: [cli/cmd/scan.go, cli/cmd/fix.go, cli/internal/lsp/server.go, cli/internal/lsp/settings.go, vulnetix-vscode/package.json]
checked: [cli@4c8c3b7, vulnetix-vscode@9ad08fa]
updated: 02 Nov 2026
---

The extension runs `vulnetix lsp` from the same CLI your pipeline runs, with the same rules, parsers, VDB and suppression matcher. Differences come from configuration and scope, not from a second engine.

## Settings and their CLI equivalents

| Editor setting | `vulnetix scan` / `vulnetix fix` | Note |
|---|---|---|
| `vulnetix.diagnostics.minimumSeverity` | `--severity <level>` | The editor hides findings; the CLI exits `1` when one meets the level |
| `vulnetix.sca.safeHarbourStrategy` | `vulnetix fix --strategy` (`--sca-autofix-strategy` on `scan`) | Editor default `safest`, CLI default `stable` |
| `vulnetix.sca.maxMajorBump` | `vulnetix fix --max-major-bump` (`--sca-autofix-max-major-bump` on `scan`) | Both default `0` |
| `vulnetix.memory.path` | The `.vulnetix/` directory under `--path` | Both read `memory.yaml` suppressions |
| `vulnetix.suppressions` | none | Editor only, by design |
| `vulnetix.sca.enabled: false` | `--no-sca` | |

To keep the team on the same values, commit the resource-scoped settings:

```jsonc
// .vscode/settings.json
{
  "vulnetix.diagnostics.minimumSeverity": "medium",
  "vulnetix.sca.safeHarbourStrategy": "stable",
  "vulnetix.sca.maxMajorBump": 1
}
```

and run the matching commands in CI:

```sh
vulnetix scan --severity medium                                  # fail on what the editor shows as an Error or Warning
vulnetix fix --strategy stable --max-major-bump 1 --dry-run      # the same fix targets the quick fixes offer
```

CI setup is covered under [CLI](/cli/).

## Differences that are expected

| Difference | Editor | `vulnetix scan` |
|---|---|---|
| Git history for secrets | Never walked | Walked by default (`--git-history`, up to 500 commits and 5000 files) |
| Which files get code findings | Files you open | Every file under `--path` to `--depth` (default 3) |
| `nosec` comments | Not honoured | Honoured |
| Exit status, quality gate, malware, EOL, cooldown gates | None | `--severity`, `--exploits`, `--block-malware`, `--block-eol`, `--cooldown` and others |
| Licences, malware, SBOM, AI BOM, CBOM | Not run | Run unless skipped |
| Organisation quality gate | Not applied | Applied when signed in: see [Quality gates](/quality-gates/) |

When CI reports a finding you did not see, reproduce it locally with the same command your pipeline runs.
