---
title: Policy as code with apply and export
nav: Policy as code
description: Keep the AI Firewall policy in .vulnetix/ai-firewall.yaml, review changes as pull requests, and apply them from CI with vulnetix ai-firewall apply.
order: 5
sources:
  - cli/cmd/ai_firewall_apply.go
  - cli/pkg/aifirewall/policy.go
  - cli/pkg/aifirewall/baseline.go
  - cli/pkg/auth/credentials.go
checked: [cli@4c8c3b7]
updated: 02 Nov 2026
---

The policy file is the one config-as-code form the AI Firewall has. Every field is on [Policy file reference](/ai-firewall/reference/policy-file/). This page is the workflow.

## Adopt it on an existing organisation

Start from what is live, so the first apply changes nothing.

```bash
vulnetix ai-firewall export
git add .vulnetix/ai-firewall.yaml
vulnetix ai-firewall apply --dry-run
```

`export` writes `.vulnetix/ai-firewall.yaml` with `metadata.org` set to your org and `spec.baseline.enabled: false`, and refuses to overwrite an existing file without `--force`. Applying an export straight back is a no-op, with two exceptions:

- A live guardrail whose regex does not compile is exported as it is, and `apply` then refuses the file with `pattern does not compile`. That rule was never enforced: the gateway skips patterns it cannot compile. Fix or delete it.
- Two live guardrails with the same name export as one entry, because guardrails are reconciled by name. The other shows as drift. Rename one in the Resolve Platform first.

To take the recommended rules as well, set `spec.baseline.enabled: true` and dry-run again. The baseline rules appear as `create` lines.

## Plan, then apply

```bash
vulnetix ai-firewall apply --dry-run
vulnetix ai-firewall apply
```

The dry run prints the same plan `apply` will execute, under a title that says nothing was changed:

```text
  Policy file  .vulnetix/ai-firewall.yaml
  Baseline     baseline recommended (2026.10.1) composed in

Changes
  Op      Kind       Target                    Detail
  create  guardrail  block-internal-hostnames  blocked_pattern / block, priority 10
  update  guardrail  cap-conversation          action flag -> block
  create  model      openai/gpt-4o             allow
  update  provider   openrouter                deny
  update  key        openai                    from OPENAI_PROVIDER_KEY

Drift (left alone)
  guardrail "Ad-hoc incident rule": on the server, not in this file (pass --prune to delete)
```

| Op | Meaning |
|---|---|
| `create` | Not on the server; will be created |
| `update` | On the server and different; will be changed. Keys and `anyProvider` model entries are always `update`. |
| `delete` | On the server, not in the file, and `--prune` or `spec.prune: true` is set |
| `drift` | On the server, not in the file, left alone. Reported, never executed. |

Changes run in order: guardrails, models, providers, keys, settings. The first failure stops the run:

```text
Error: applied 3 of 7 change(s), then failed: create guardrail block-internal-hostnames: ...
```

The changes before it have been made. Fix the cause and run `apply` again; finished changes plan as no-ops.

## Drift and prune

Guardrails and model entries someone added in the Resolve Platform are reported as drift and left alone. Pass `--prune`, or set `spec.prune: true`, when the file is meant to be the whole policy. Without prune, deleting a line from `spec.models` does nothing: the entry stays on the server.

Providers are never pruned, with or without `--prune`. A provider with an action that the file does not mention is reported as drift with the command that clears it. Removing a `deny` opens a provider, so reopening one is always written down as `action: default` or run as `vulnetix ai-firewall policy provider <slug> --clear`.

## Keys

The file names where a provider key comes from, never the key:

```yaml
providers:
  - slug: openai
    action: allow
    key:
      fromEnv: OPENAI_PROVIDER_KEY
```

`apply` reads `$OPENAI_PROVIDER_KEY` when it runs and fails with `$OPENAI_PROVIDER_KEY is not set` if it is empty. Because a stored key cannot be read back, every `key` entry is re-sent on every apply. Leave `key` out of the file once the key is stored if you do not want CI to need the secret.

## The baseline in CI

With no `--baseline-required`, an unreachable or invalid baseline is a note in the output and `apply` carries on with your own rules. In CI that would apply a policy missing every baseline rule and report success, so pass `--baseline-required` there.

## In GitHub Actions

Check the plan on pull requests and apply on `main`. The CLI needs both `VULNETIX_API_KEY` and `VULNETIX_ORG_ID`: with the key alone it does not authenticate. `VULNETIX_API_TOKEN` does not work for `apply` or `export`. Install the CLI as described in [CI/CD](/cli/ci-cd/github-actions/).

```yaml
name: ai-firewall-policy
on:
  pull_request:
    paths: [.vulnetix/ai-firewall.yaml]
  push:
    branches: [main]
    paths: [.vulnetix/ai-firewall.yaml]

jobs:
  policy:
    runs-on: ubuntu-latest
    env:
      VULNETIX_API_KEY: ${{ secrets.VULNETIX_API_KEY }}
      VULNETIX_ORG_ID: ${{ secrets.VULNETIX_ORG_ID }}
    steps:
      - uses: actions/checkout@v4
      # Install the vulnetix CLI here.
      - name: Plan
        run: vulnetix ai-firewall apply --dry-run --baseline-required
      - name: Apply
        if: github.event_name == 'push'
        run: vulnetix ai-firewall apply --baseline-required
        env:
          OPENAI_PROVIDER_KEY: ${{ secrets.OPENAI_PROVIDER_KEY }}
```

`apply --dry-run` exits `0` whatever the plan says, so the Plan step shows the changes without failing the job. To fail a job when the live policy has drifted from the committed file, test the JSON plan. Keys and `anyProvider` entries are excluded because they always plan as `update`:

```bash
vulnetix ai-firewall apply --dry-run --baseline-required -o json \
  | jq -e '[(.changes // [])[]
            | select(.kind != "key")
            | select((.detail // "") | test("across every provider") | not)
           ] | length == 0'
```

`jq -e` exits `1` when the expression is `false`, that is when there is any create, update, delete or drift. Drop the `drift` entries from the count with `select(.op != "drift")` if additions made only in the Resolve Platform are acceptable.

## JSON output

`apply -o json` prints:

| Key | Type | Meaning |
|---|---|---|
| `dryRun` | bool | Whether anything was changed |
| `file` | string | Policy file path |
| `baseline` | string | What happened to the baseline, e.g. `baseline recommended (2026.10.1) composed in` or `disabled with --no-baseline` |
| `applied` | int | Changes made (not present on a dry run) |
| `changes` | list or `null` | `{kind, op, target, detail}`; `kind` is `guardrail`, `model`, `provider`, `key` or `settings`; `op` is `create`, `update`, `delete` or `drift` |

## Related

- [Policy file reference](/ai-firewall/reference/policy-file/)
- [Recommended baseline](/ai-firewall/policy/recommended-baseline/)
- [Commands](/ai-firewall/cli/commands/#apply)
- [Platform IaC](/platform-iac/)
