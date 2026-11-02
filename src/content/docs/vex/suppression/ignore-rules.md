---
title: Ignore rules
description: Record a triage decision as an anchored, typed, expiring ignore rule with vulnetix ignore, stored in .vulnetix/memory.yaml and shared with your organisation when authenticated.
order: 1
sources: [cli/cmd/suppress.go, cli/cmd/suppress_filter.go, cli/internal/suppress/suppress.go, cli/internal/memory/memory.go]
checked: [cli@4c8c3b71c]
updated: 02 Nov 2026
---

`vulnetix ignore` (alias `suppress`) records a decision not to act on a finding: a false positive, an accepted risk, a vulnerability mitigated another way. A rule is anchored to what it covers, typed by why it exists, carries a reason, and can expire.

```bash
vulnetix ignore add [flags]       # create a rule
vulnetix ignore list [flags]      # list local and remote rules
vulnetix ignore remove [flags]    # deactivate a rule
vulnetix ignore sync [flags]      # pull the organisation's rules into .vulnetix/memory.yaml
```

Credentials are optional. Without them, rules live in `.vulnetix/memory.yaml` and work offline. When you are authenticated, `add` also saves the rule to Vulnetix, and every scan reads the organisation's active rules for the repository and branch alongside the local ones.

## ignore add

At least one anchor is required: `--rule`, `--finding`, `--value` or `--file`.

| Flag | Type | Description |
|---|---|---|
| `--rule` | string | Rego rule id (the rego file id), e.g. `vnx-sec-001` |
| `--finding` | string | Finding id: a CVE or other vulnerability id |
| `--value` | string | Inventory component value: an algorithm SPDX id, certificate subject, model id or purl. For `--category crypto` and `ai`. |
| `--file` | string | File path. Matching is suffix-tolerant. |
| `--line` | int | One line within `--file`. Needs `--file`. |
| `--line-range` | string | Line range within the file, e.g. `10-14` |
| `--category` | string | `sast`, `secrets`, `iac`, `container`, `sca`, `license`, `malware`, `crypto`, `ai` |
| `--type` | string | Suppression type. Default `rego_rule` when `--rule` is set, otherwise `risk_accepted`. |
| `--reason` | string | Why. Stored on the rule. |
| `--expires-in` | int | Days until the rule expires. `0` is never. |
| `--path` | string | Repository path the rule is scoped to. Default `.`. |

The repository (`owner/repo`, from the git remote) and the current branch are recorded on the rule.

### Suppression types

| Type | Set by | Meaning |
|---|---|---|
| `false_positive` | you | The finding is not real in this context |
| `wont_fix` | you | Acknowledged; no fix is planned |
| `risk_accepted` | you | The risk is understood and accepted |
| `mitigated` | you | A compensating control is in place |
| `deferred` | you | Not now. Pair it with `--expires-in`. |
| `rego_rule` | you, or the default with `--rule` | Suppresses a rego rule id |
| `nosec` | the scanner | Came from an inline `nosec` comment |
| `test-code` | the scanner | Finding in the test suite, suppressed with `sast --suppress-test-code` |

`ignore add --type` accepts the first seven. `test-code` is only written by the scanner.

## How a rule matches

A rule hides a finding only when every anchor it sets matches, and it is active and not expired.

| Anchor | Compared with |
|---|---|
| `category` | The scanner category, case-insensitive |
| `rule` | The finding's rule id, case-insensitive |
| `finding` | The finding id, case-insensitive |
| `value` | The inventory component's identity, case-insensitive |
| `file` | The finding's path. `src/app.go` matches `repo/src/app.go`. Leading `./` and `\` separators are normalised. |
| `line-range` | The finding's line, when the scanner knows it. `14` or `10-14`. |

A rule with no anchor matches nothing, so "ignore everything" cannot be written. Matching applies in every pipeline: SAST, secrets, IaC and container (by rule id), SCA (by vulnerability id and manifest file), licence, malware, and the CBOM and AIBOM inventories (by value).

## ignore list

Prints local rules from `.vulnetix/memory.yaml` and, when authenticated, the organisation's rules for this repository.

```text
SOURCE  ACTIVE  TYPE           CATEGORY  ANCHOR          FILE                       REASON                       UUID
local   true    risk_accepted  sca       CVE-2024-0001                              vulnerable path is not rea…  6f1c9c3e-…
remote  true    rego_rule      any       vnx-sec-001     internal/handler/login.go  input validated by the gate…  0b7d…
```

`ACTIVE` is false for a deactivated or expired rule. `CATEGORY any` means the rule has no category anchor.

## ignore remove

Deactivates rather than deletes, so the audit trail stays.

| Flag | Description |
|---|---|
| `--uuid` | Deactivate this exact rule |
| `--rule` | Deactivate rules with this rego rule id |
| `--finding` | Deactivate rules with this finding id |
| `--value` | Deactivate inventory rules with this value |
| `--reason` | Why it was removed |

One of `--uuid`, `--rule`, `--finding` or `--value` is required. Use the `UUID` column of `ignore list` for a rule anchored only on a file.

## ignore sync

Pulls every rule the organisation holds for this repository into `.vulnetix/memory.yaml`. It needs credentials and does not push local rules: a rule reaches Vulnetix when `ignore add` runs authenticated.

## .vulnetix/memory.yaml

```yaml
suppressions:
  - uuid: 6f1c9c3e-...
    rule_id: vnx-sec-001
    category: sast
    type: risk_accepted
    reason: "input is validated upstream by the gateway"
    file_path: internal/handler/login.go
    line_range: "42-58"
    repository_full_name: acme/api
    branch: main
    created_at: 1721174400
    expires_at: 1729036800
    is_active: true
    origin: cli
```

Other keys: `finding_id`, `target_value`, `line_number`, and for nosec rules `snippet`, `last_seen_commit` and `last_seen_at`. Times are Unix seconds; `expires_at: 0` is never.

## Examples

```bash
# Accept a CVE for 90 days
vulnetix ignore add --finding CVE-2024-0001 --category sca --type risk_accepted \
  --reason "vulnerable path is not reachable; upstream fix tracked in JIRA-123" --expires-in 90

# One SAST rule in one file range
vulnetix ignore add --rule vnx-sec-001 --file internal/handler/login.go --line-range 42-58 \
  --reason "input validated by the gateway"

# Secrets false positive in a sample file
vulnetix ignore add --file config/example.env --category secrets --type false_positive --reason "sample values only"

# An inventory component
vulnetix ignore add --category crypto --value SHA-1 --type risk_accepted --reason "non-security checksum"

vulnetix ignore list
vulnetix ignore remove --finding CVE-2024-0001 --reason "fixed upstream"
```

## In the console

The Suppression Policies page lists every rule by repository and category, with extend, deactivate and delete actions. The "Ignore this finding" action on a finding creates a rule. Rules created from VEX documents appear there too; see [VEX sent to Vulnetix](/vex/suppression/sent-to-vulnetix/).
