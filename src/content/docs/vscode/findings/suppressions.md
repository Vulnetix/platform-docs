---
title: Suppressions
description: Hide findings in the editor with the repository's `.vulnetix/memory.yaml` or editor-only `vulnetix.suppressions` rules, how they match, and what is hidden.
order: 4
sources: [cli/internal/lsp/suppression.go, cli/internal/suppress/suppress.go, cli/internal/memory/memory.go, cli/internal/lsp/settings.go, cli/internal/scaview/scaview.go, vulnetix-vscode/package.json]
checked: [cli@4c8c3b7, vulnetix-vscode@9ad08fa]
updated: 02 Nov 2026
status: available
---

Every finding the server publishes, from every family, passes through one suppression filter. It uses the same matcher as `vulnetix scan`, so a rule that hides a finding in CI hides it in the editor.

| Source of rules | Scope | Setting |
|---|---|---|
| `suppressions:` in `.vulnetix/memory.yaml` | Everyone who clones the repository | `vulnetix.memory.path` to use another directory or file |
| `vulnetix.suppressions` | You, in user or workspace settings | n/a |

Both lists are merged. The first rule that matches wins, and only decides which reason is shown. Changes to either take effect without a restart: `memory.yaml` is watched, and settings changes are pushed to the server.

## Editor rules

```jsonc
// settings.json
"vulnetix.suppressions": [
  { "ruleId": "VNX-DOCKER-008", "path": "docker/dev.Dockerfile", "reason": "dev image only" },
  { "findingId": "CVE-2021-23337", "reason": "template() is never called with user input" }
]
```

| Key | Matches | Comparison |
|---|---|---|
| `ruleId` | The diagnostic code of a code, secret, infrastructure or container finding | Case-insensitive, exact |
| `findingId` | A dependency finding's advisory ID (see the caution below), or a code finding's fingerprint | Case-insensitive, exact |
| `path` | The workspace-relative file path | Equal to the path, or a suffix of it after a `/` |
| `reason` | Not matched. Appended to the message when suppressed findings are shown. | n/a |

Every key that is present must match. An entry with none of `ruleId`, `findingId` or `path` is dropped, because it would hide everything. The settings editor flags any other key, because the schema sets `additionalProperties: false`.

> [!CAREFUL] `path` is not a directory prefix
> `"path": "test/fixtures"` matches a file whose path ends in `/test/fixtures`, not the files inside that directory. Name the file: `"path": "test/fixtures/keys.pem"`.

> [!CAREFUL] A dependency finding matches only its first advisory ID
> One diagnostic covers every advisory on a package, and a `findingId` rule is compared with the alphabetically first CVE ID among them. Suppressing any other CVE on that package has no effect, and suppressing the first one hides the whole package diagnostic, including its other advisories. To hide one package, use its first CVE ID from the hover card, or a `path` rule on the manifest.

## Repository rules in memory.yaml

`.vulnetix/memory.yaml` is the CLI's per-repository state file. You can add entries by hand; its `suppressions:` entries use snake_case keys:

```yaml
suppressions:
  - rule_id: VNX-DOCKER-008
    category: oci
    file_path: docker/dev.Dockerfile
    type: risk_accepted
    reason: dev image only
    expires_at: 1798761600   # unix seconds; 0 or absent = never
    is_active: true
```

| Key | Effect in the editor |
|---|---|
| `rule_id`, `finding_id`, `file_path` | Matched as in the table above |
| `category` | Restricts the rule to one family: `sast`, `secrets`, `iac`, `oci`, `sca`, `license`, `malware` |
| `target_value` | Matches inventory components; no editor diagnostic carries one |
| `is_active` | `false` disables the rule. It must be `true` for the rule to apply. |
| `expires_at` | A rule past its expiry is ignored |
| `line_range` | Ignored in the editor: the server matches by file, not line |
| `type`, `reason`, `uuid`, `repository_full_name`, `branch` | Not used for matching |

A missing or unreadable `memory.yaml` is not an error; only the editor rules apply.

## Seeing what is hidden

Set `vulnetix.diagnostics.showSuppressed` to `true`. Suppressed findings are then published as Hints (a faint underline with no Problems panel entry) and their message ends with `(suppressed: <reason>)`, or `(suppressed)` with no reason.

## What does not suppress in the editor

- `nosec` comments. Only `vulnetix scan` honours them. See [Code, secrets and infrastructure](/vscode/findings/code-secrets-iac/).
- `vulnetix.diagnostics.minimumSeverity` hides by severity, which is a filter, not a suppression: see [Severity and filtering](/vscode/findings/severity/).
- There is no Suppress or Triage command and no VEX output from the editor yet. Record VEX with the CLI: see [VEX](/vex/).
