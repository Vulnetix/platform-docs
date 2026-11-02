---
title: Licence allow lists, policy and exceptions
nav: Policy and exceptions
description: The allow list file, the LicensePolicy document and its defaults, the LicenseExceptions document, and the policy and exceptions subcommands.
order: 2
sources: [cli/cmd/license_policy.go, cli/internal/license/policy.go, cli/internal/license/exceptions.go, cli/internal/license/allowlist.go, cli/internal/license/evaluate.go]
checked: [cli@4c8c3b7]
updated: 02 Nov 2026
---

There are three ways to state what licences are acceptable. They can be combined.

| Mechanism | File | Best for |
|---|---|---|
| Allow list | `--allow` or `--allow-file` | A short list of permitted SPDX ids |
| Policy | `.vulnetix/license-policy.yaml` | Severity by category, so a licence nobody listed is still classified |
| Exceptions | `.vulnetix/license-exceptions.yaml` | Recorded, attributable, expiring approvals |

## Allow list

```bash
vulnetix license --allow MIT,Apache-2.0,BSD-3-Clause
vulnetix license --allow-file .vulnetix/license-allow.yaml
```

```yaml
# .vulnetix/license-allow.yaml
licenses:
  - MIT
  - Apache-2.0
  - BSD-3-Clause
  - ISC
```

A licence not on the list raises `not-in-allowlist` at `high`. `--allow-file` overrides `--allow`.

## Policy

```bash
vulnetix license policy init       # write the recommended policy
vulnetix license policy show       # the policy in effect, defaults filled in
vulnetix license policy validate   # check a policy file
```

```yaml
# .vulnetix/license-policy.yaml
apiVersion: vulnetix.com/v1
kind: LicensePolicy

categories:                 # reassign SPDX ids, overriding the built-in classification
  strong-copyleft: [AGPL-3.0-only, AGPL-3.0-or-later, SSPL-1.0]

severity:                   # none | low | medium | high | critical, per category
  permissive: none
  public-domain: none
  weak-copyleft: low
  strong-copyleft: high
  proprietary: high
  unknown: medium

unknown: warn               # warn | fail | ignore

scopes:                     # evaluate | ignore, per dependency scope
  development: ignore
  dev: ignore
  test: ignore
  optional: ignore

projects:                   # overrides, selected with --project
  payment-service:
    severity:
      weak-copyleft: high
```

### Defaults

| Setting | Built-in default (no policy file) | `license policy init` |
|---|---|---|
| `permissive`, `public-domain` | `none` | `none` |
| `weak-copyleft` | `none` | `low` |
| `strong-copyleft` | `high` | `high` |
| `proprietary` | `none` | `high` |
| `unknown` | `medium` | `medium` |
| `unknown:` handling | `warn` | `warn` |
| Ignored scopes | none | `development`, `dev`, `test`, `optional` |
| Category overrides | none | AGPL-3.0-only, AGPL-3.0-or-later and SSPL-1.0 as `strong-copyleft` |

> [!WHY] The built-in default is looser than init
> With no policy file, the evaluator does what it did before policies existed: only strong copyleft carries a severity and no scope is ignored. Adopting a policy is a decision you make, not one that arrives with a CLI upgrade and turns a build red.

`license policy show` prints the resolved policy with every inherited value, so what you read is what the evaluator does. `--project <name>` shows it as it applies to one project.

## Exceptions

```bash
vulnetix license exceptions add --license MPL-2.0 \
  --reason "file-level copyleft, unmodified" --approver security@example.com

vulnetix license exceptions add --purl 'pkg:golang/github.com/hashicorp/*' \
  --license MPL-2.0 --reason "vendored, unmodified" --expires 2027-08-01

vulnetix license exceptions ls
vulnetix license exceptions check --expiring-within 90d
```

```yaml
# .vulnetix/license-exceptions.yaml
apiVersion: vulnetix.com/v1
kind: LicenseExceptions

blanket:
  - license: MPL-2.0
    reason: file-level copyleft, unmodified, dynamically linked
    approver: security@example.com
    approvedDate: 2026-08-01
    expires: 2027-08-01

packages:
  - purl: pkg:golang/github.com/hashicorp/*
    license: MPL-2.0
    scope: vendored, unmodified
    reason: widely used, reviewed 2026-08
    approver: security@example.com
    expires: 2027-08-01
    projects: [payment-service]
```

| Field | Required | Notes |
|---|---|---|
| `license` | blanket entries | Prefix match: `MPL-2.0` also covers `MPL-2.0-no-copyleft-exception`. On a package entry it narrows the exception. |
| `purl` or `name` | package entries, one of them | `purl` accepts `*`. The version is stripped, so a version bump does not end the exception. `name` is matched at `/` boundaries: `gpl-lib` matches `github.com/acme/gpl-lib` and `@acme/gpl-lib`, not `agpl-lib`. |
| `reason` | yes | |
| `approver`, `approvedDate`, `scope`, `id` | no | Attribution |
| `expires` | no | `YYYY-MM-DD`, inclusive |
| `projects` | no | Limit to named projects; omit for all |

An exempted finding keeps its row, is badged `exempted` with its attribution, and is counted separately (`8 findings (2 exempted)`). Only the gate ignores it. An expired exception stops applying and the finding is shown with `EXPIRED` and the exception that lapsed.

## Subcommand flags

| Command | Flags |
|---|---|
| `license policy init` | `--path` (`.`), `--file`, `--force` |
| `license policy show` | `--path`, `--file`, `--project`, `-o pretty\|table\|json` |
| `license policy validate` | `--path`, `--file` |
| `license exceptions ls` | `--path`, `--file`, `-o pretty\|table\|json` |
| `license exceptions check` | `--path`, `--file`, `--expiring-within` (`30d`), `-o pretty\|table\|json`. Exits `1` if any exception has expired. |
| `license exceptions add` | `--path`, `--file`, `--license`, `--purl`, `--name`, `--reason` (required), `--approver`, `--scope`, `--expires`, `--id`, `--project` (repeatable) |

`--file` names the document explicitly; otherwise it is the default path under `--path`.

These are local files read by the CLI. They are not part of the published `config-schemas` today; see [Platform IaC](/platform-iac/).
