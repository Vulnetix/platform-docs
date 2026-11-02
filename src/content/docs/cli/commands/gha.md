---
title: GitHub posture commands
nav: gha posture
description: vulnetix gha workflows, actions, settings, org and audit check GitHub Actions workflows, the actions they run, and repository and organisation settings against the VNX-GH rules.
order: 5
sources: [cli/cmd/gha_analysis.go, cli/cmd/gha.go, cli/internal/ghtasks/docs.go, cli/internal/analyze/forge/auth.go, vdb-sca-match/ghaudit/rule.go]
checked: [cli@24498404a, vdb-sca-match@v0.8.14]
updated: 02 Nov 2026
---

```sh
vulnetix gha workflows [path] [flags]
vulnetix gha actions   [path] [flags]
vulnetix gha settings  [flags]
vulnetix gha org       [flags]
vulnetix gha audit     [path] [flags]
```

These commands run the [GitHub posture rules](/cli/github-rules/overview/) (`VNX-GH-001` to `VNX-GH-309`), the same engine the Software Factory runs on GitHub App events. The other `gha` subcommands, `upload`, `status` and `setup`, publish third-party scanner reports and are on [gha upload and status](/cli/ci-cd/gha-command/).

| Command | Checks | Reads | Token needed |
|---|---|---|---|
| `workflows` | Injection, privilege and trust flaws in workflow and composite action files | Local `.github/` files, or the API | Optional. With one, the repository's settings rate each finding up or down. |
| `actions` | Every `uses:` reference: SHA pinning, pin and comment mismatch, impostor commits, repo-jacking, vulnerable versions, retired runtimes, typosquats, allowed-actions policy, unpinned images, remote scripts piped to a shell | Local files and the API | Yes, to resolve references. Vulnerable action versions come from Vulnetix (community access when not signed in). |
| `settings` | Default-branch protection (rulesets and classic), Actions token defaults, fork approval, allowed actions, secret scanning, Dependabot, environments, deploy keys, webhooks, outside admins, policy files, secret age | The API | Yes, with read access to the repository's administration settings |
| `org` | Two-factor enforcement, default member permission, public repository creation, Actions policy and token, organisation secrets, runner groups, webhooks | The API | Yes, an organisation owner's |
| `audit` | All of the above (`org` when `--org` is given or the owner is an organisation) as one report | Both | As above |

A rule that needs GitHub facts the token could not read is reported as **not evaluated**, never as passed.

## GitHub token

Resolved in this order: `GITHUB_TOKEN`, `GH_TOKEN`, then `gh auth token`. Without one the commands run on local files and say so: `no GitHub token (GITHUB_TOKEN, GH_TOKEN or gh auth login): settings and action references were not read; rules that need them are reported as not evaluated`. With no local files either, they stop: `no local workflows and no GitHub token to read them with`.

For GitHub Enterprise Server, `--github-api-url` (or `GITHUB_API_URL`) points at the instance.

## Flags

All five commands take the same flags.

| Flag | Default | Effect |
|---|---|---|
| `[path]` | the checkout | Directory holding `.github/` (`workflows`, `actions`, `audit`) |
| `--repo owner/name` | `GITHUB_REPOSITORY`, then the checkout's GitHub remote | Repository to read through the API |
| `--org <name>` | the repository owner, when it is an organisation | Organisation for `org` and `audit` |
| `--ref <ref>` | the default branch | Branch, tag or commit to read files at, when they come from the API |
| `--offline` | off | Do not call the GitHub API; local files only |
| `--github-api-url <url>` | `GITHUB_API_URL`, else `https://api.github.com` | API base for GitHub Enterprise Server |
| `--max-action-refs <n>` | `40` | Most distinct `uses:` references to resolve through the API |
| `--rule <id>` | all | Run only these rule IDs (repeatable, or comma-separated) |
| `--min-severity <s>` | none | Drop findings below `critical`, `high`, `medium` or `low` |
| `--fail-on <s>` | none | Exit `1` when a finding is at or above this severity |
| `--format <f>` | `table` | `table`, `json` or `sarif` |
| `--json` | | Same as `--format json` |
| `-o`, `--output <file>` | stdout | Write the report to a file |
| `--upload` | off | Publish the SARIF to Vulnetix as a snapshot. Needs Vulnetix credentials. |

`--fail-on` ends with `Error: found <n> finding(s) at or above <severity>` and exit `1`. A bad `--format`, `--min-severity` or `--fail-on` value also exits `1`.

## Examples

```sh
vulnetix gha workflows                                   # this checkout, table output
vulnetix gha workflows --rule VNX-GH-001,VNX-GH-003      # two rules only
vulnetix gha actions --fail-on high
vulnetix gha audit --repo acme/api --format sarif --output gh.sarif
vulnetix gha org --org acme --json
vulnetix gha audit --upload                              # publish next to the factory's findings
```

## In GitHub Actions

```yaml
name: GitHub posture
on:
  pull_request:
    paths: [".github/**"]
  schedule:
    - cron: "41 4 * * 1"
permissions:
  contents: read
  security-events: write
jobs:
  posture:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5
        with:
          persist-credentials: false
      - name: Install Vulnetix CLI
        run: |
          curl -fsSL https://cli.vulnetix.com/install.sh | sh -s -- --install-dir "$HOME/.local/bin"
          echo "$HOME/.local/bin" >> "$GITHUB_PATH"
      - name: Check workflows and actions
        env:
          GITHUB_TOKEN: ${{ github.token }}
        run: vulnetix gha workflows --format sarif --output gha.sarif --fail-on high
      - if: always()
        uses: github/codeql-action/upload-sarif@v3
        with:
          sarif_file: gha.sarif
```

The workflow token can read workflow files and resolve action references. `settings` and `org` need more than the workflow token grants: use a token with administration read (for `settings`) or an organisation owner's token (for `org`), from a secret.
