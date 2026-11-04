---
title: Suppressing findings
nav: Suppression
description: Skip paths, mark a line with nosec, or record an ignore rule your organisation shares, for secrets findings.
order: 3
sources: [cli/internal/sast/nosec.go, cli/cmd/suppress.go, cli/cmd/suppress_filter.go, cli/internal/suppress/suppress.go, cli/cmd/scan.go, cli/internal/sast/input.go]
checked: [cli@2449840]
updated: 02 Nov 2026
---

There are three ways to stop a secrets finding from being reported. They apply in this order, before the report, the SARIF file, the upload and the gates see the findings.

| Method | Scope | Where it lives |
|---|---|---|
| Path exclusion | Files never read | Command line or `.gitignore` |
| `nosec` comment | One line, or one file | The source file |
| Ignore rule | Rule, file or both, in one repository | `.vulnetix/memory.yaml` and, when authenticated, the Vulnetix organisation |

A suppressed credential is still a credential. If it was ever committed, revoke it at the provider first.

## Exclude paths

```bash
vulnetix secrets --exclude 'test/**' --ignore 'fixtures/**' --ignore 'docs/examples/*.env'
```

`--exclude` and `--ignore` are both repeatable globs relative to the scan root. A matched file is never read, so a credential in it is never reported. `.gitignore` already excludes ignored paths unless `--secrets-include-ignored` is set. Test-file names and directories such as `testdata/` and `fixtures/` are skipped by the rules themselves ([list](/secrets/guides/what-gets-scanned/#the-working-tree)).

To skip the history and binary passes:

```bash
vulnetix secrets --ignore-git --ignore-binaries
```

## `nosec` comments

Put `nosec` in a comment on the reported line. It is recognised after `#`, `//`, `--` or `;`, anywhere on the line, in any file type.

| Comment | Effect |
|---|---|
| `# nosec` on the finding's line | Drops every finding on that line |
| `# nosec VNX-SEC-001,VNX-SEC-003` on the line | Drops only those rules on that line |
| `# nosec` on line 1 | Drops every finding in the file |
| `# nosec VNX-SEC-074` on line 1 | Drops that rule everywhere in the file |

Rule ids are case-insensitive.

```yaml
# config/sample.yaml
aws_access_key_id: AKIAIOSFODNN7SAMPLE1   # nosec VNX-SEC-001
```

Each suppressed finding is recorded in `.vulnetix/memory.yaml` and, when you are authenticated, sent to Vulnetix as a suppression of type `nosec`, so the Resolve Platform shows what was silenced and where.

> [!CAREFUL] nosec cannot reach history or binaries
> A finding under `__git_history__/`, `__binary_strings__/`, `__exif__/` or `__k8s_secret__/` has no source line to carry a comment. Use an ignore rule with `--file`, which also matches those paths.

## Ignore rules

`vulnetix ignore add` (alias `vulnetix suppress add`) records a rule. At least one of `--rule`, `--finding`, `--value` or `--file` is required.

```bash
# One rule in one file
vulnetix ignore add --category secrets --rule VNX-SEC-001 --file docs/example.env \
  --type false_positive --reason "AWS documentation example key"

# Every secrets finding in a file, for 30 days
vulnetix ignore add --category secrets --file scripts/legacy-deploy.sh \
  --type deferred --expires-in 30 --reason "rotation tracked in OPS-412"
```

| Flag | Value |
|---|---|
| `--category` | `secrets` for this scanner. Others: `sast`, `iac`, `container`, `sca`, `license`, `malware`, `crypto`, `ai`. Empty matches every category. |
| `--rule` | Rule id, e.g. `VNX-SEC-001`. |
| `--file` | Path relative to the repository. It matches the path itself and any path ending in `/<file>`, so it also covers `__git_history__/<sha>/<file>`. |
| `--line`, `--line-range` | `14` or `10-14`. See the warning below. |
| `--type` | `false_positive`, `wont_fix`, `risk_accepted`, `mitigated`, `deferred`, `rego_rule` or `nosec`. Default `rego_rule` when `--rule` is set, else `risk_accepted`. |
| `--reason` | Free text. |
| `--expires-in` | Days until the rule stops applying. `0` (default) is never. |
| `--path` | Repository to scope the rule to. Default `.`. |

The rule is written to `.vulnetix/memory.yaml`. When you are authenticated it is also saved to your organisation with the repository (from the git remote) and the current branch, and every member's next scan of that repository loads it. `vulnetix ignore sync` pulls the organisation's rules into `memory.yaml`; `vulnetix ignore list` and `vulnetix ignore remove` manage them.

> [!CAREFUL] Line numbers do not narrow secrets rules
> The scanner matches ignore rules without the finding's line, so `--line` and `--line-range` are not applied: a rule with `--file` and `--line` suppresses that rule (or every rule) in the whole file. Use a `nosec` comment to silence one line.

## Test code

`--suppress-test-code` drops findings in files the CLI attributes to the test suite (test files corroborated by a test-runner configuration or test-framework dependency). The report already lists test credentials separately under IN TESTS without ranking them, so this flag only matters for the SARIF file, the upload and the gate.
