---
title: Policy file reference (AiFirewallPolicy)
nav: Policy file
description: Every field of the .vulnetix/ai-firewall.yaml AiFirewallPolicy document, how each one is validated, and how apply reconciles it against the live policy.
order: 1
sources:
  - cli/pkg/aifirewall/policy.go
  - cli/pkg/aifirewall/baseline.go
  - cli/cmd/ai_firewall_apply.go
  - cli/cmd/config_ai_firewall.go
  - vdb-api/internal/handler/v2_cli_ai_firewall.go
  - vdb-api/internal/handler/v2_cli_ai_firewall_baseline.go
  - vdb-api/internal/handler/ai_firewall_rules.go
checked: [cli@4c8c3b7, vdb-api@4145f0a]
updated: 02 Nov 2026
---

`.vulnetix/ai-firewall.yaml` is the declarative form of one organisation's AI Firewall policy: provider and model allow/deny entries, guardrails, the recommended baseline, and the inference logging switch. `vulnetix ai-firewall export` writes it from the live policy and `vulnetix ai-firewall apply` makes the live policy match it. The workflow is on [Policy as code with apply and export](/ai-firewall/cli/policy-file-workflow/); this page is the field reference.

The file is read only by the CLI. Nothing on the server stores or watches it, so a change takes effect when someone runs `apply`.

## Complete example

Every field, with the value it takes. It validates as written; replace the org UUID with your own before you apply it.

```yaml
apiVersion: vulnetix.com/v1
kind: AiFirewallPolicy
metadata:
  org: 6f2a1c3e-8d4b-4a51-9c3e-2b7d0e1f4a90
spec:
  prune: false
  settings:
    logsEnabled: false
  baseline:
    enabled: true
    ref: recommended
    exclude:
      - pii-phone
      - agent-curl-client
  providers:
    - slug: openai
      action: allow
      key:
        fromEnv: OPENAI_PROVIDER_KEY
    - slug: anthropic
      action: default
      key:
        fromFile: ~/.config/vulnetix/anthropic.key
    - slug: openrouter
      action: deny
  models:
    - slug: gpt-4o
      provider: openai
      action: allow
    - slug: claude-sonnet-4-5
      anyProvider: true
      action: allow
  guardrails:
    - name: block-internal-hostnames
      ruleType: blocked_pattern
      action: block
      pattern: '(?i)\b[a-z0-9-]+\.corp\.example\.com\b'
      priority: 10
    - name: cap-conversation
      ruleType: max_messages
      action: block
      pattern: "300"
      priority: 80
    - name: strip-github-mcp-writes
      ruleType: tool_deny
      action: strip
      pattern: mcp__github__create_*
      priority: 120
    - name: sealed-blocks
      ruleType: delimiter_integrity
      action: flag
      pattern: ""
      enabled: false
```

## Top level

| Field | Type | Required | Value |
|---|---|---|---|
| `apiVersion` | string | yes | Exactly `vulnetix.com/v1`. Anything else fails with `apiVersion must be "vulnetix.com/v1"`. |
| `kind` | string | yes | Exactly `AiFirewallPolicy`. |
| `metadata` | object | no | See [metadata](#metadata). |
| `spec` | object | yes | See [spec](#spec). An empty `spec` is valid: it changes nothing except composing in the baseline. |

The file is parsed with `gopkg.in/yaml.v3` into fixed structs. Unknown keys are ignored without a warning, so a misspelt key (`guardrail:` for `guardrails:`) is silently dropped. Run `apply --dry-run` and read the plan.

## metadata

| Field | Type | Default | Value |
|---|---|---|---|
| `metadata.org` | string (UUID) | none | The org UUID the file belongs to. `apply` refuses when it differs from the org UUID of the credential you are signed in with, unless you pass `--force`. Omit it and no check is made. `export` always writes it. |

> [!CAREFUL] The guard compares your credential's org, not the tenant
> `metadata.org` is compared with the org UUID in your Vulnetix credential (`VULNETIX_ORG_ID`, or the org stored by `vulnetix auth login`). The policy itself is stored on the tenant: a Business member and the team owner sign in as different principals and edit the same policy. A file exported by one member therefore carries that member's UUID, and `apply` run by another member refuses it. Drop `metadata.org`, or have CI apply with one fixed credential.

## spec

| Field | Type | Default | Value |
|---|---|---|---|
| `spec.prune` | bool | `false` | When `true`, guardrails and model entries on the server that the file does not mention are deleted. When `false`, they are reported as drift and left alone. `--prune` on the command line sets it to `true` for one run. Providers are never pruned. |
| `spec.settings` | object | none | See [settings](#specsettings). |
| `spec.baseline` | object | none | See [baseline](#specbaseline). Absent means the baseline is composed in. |
| `spec.providers` | list | `[]` | See [providers](#specproviders). |
| `spec.models` | list | `[]` | See [models](#specmodels). |
| `spec.guardrails` | list | `[]` | See [guardrails](#specguardrails). |

### spec.settings

| Field | Type | Default | Value |
|---|---|---|---|
| `spec.settings.logsEnabled` | bool | unset | `true` turns on [inference logging](/ai-firewall/operations/logs/) (metadata only, never prompt or completion text); `false` turns it off. Leave it out to leave the server's value alone. Enabling needs a paid plan: the server answers `403 inference logging requires a paid plan`. Disabling is never gated. |

### spec.baseline

The baseline is the server's recommended guardrail set: secret patterns, prompt-injection flags, PII redaction, a runaway-conversation cap and agent capability flags. The rules are listed on [Recommended baseline](/ai-firewall/policy/recommended-baseline/) and printed by `vulnetix ai-firewall baseline`.

| Field | Type | Default | Value |
|---|---|---|---|
| `spec.baseline.enabled` | bool | `true` when `spec.baseline` is absent | `false` declines the baseline. If you write a `baseline:` block, `enabled` defaults to `false` like any YAML bool, so write `enabled: true` explicitly. |
| `spec.baseline.ref` | string | `recommended` | Named set to fetch. The server knows `default` and `recommended`, which today hold the same rules. Any other ref is a `404`, which `apply` treats as "no baseline available" unless `--baseline-required` is set. `--ref` on the command line wins over this field. |
| `spec.baseline.exclude` | list of string | `[]` | Baseline rule **ids** (not names) to leave out, for example `pii-phone`. Unknown ids are ignored. |

How the baseline is composed into the desired guardrails:

1. A file guardrail with the same `name` as a baseline rule wins. The baseline rule is dropped, so you override a baseline rule by redefining it under its baseline name, for example `name: "PII: email address"`.
2. Excluded ids are dropped.
3. Every remaining baseline rule is added with its own rule type, action, pattern, priority and `enabled` value. Several ship disabled.
4. The whole baseline is validated with the same checks as file guardrails. One bad rule rejects the whole set: `apply` then carries on without it and says so, or fails with `--baseline-required`.

`--no-baseline` and `spec.baseline.enabled: false` both decline it. `--catalog <file>` replaces the server's set with a local JSON or YAML file in the shape `{version, ref, guardrails: [{id, name, description, ruleType, action, pattern, priority, enabled, tags, severity}]}`; `ref` defaults to `local`.

> [!WHY] Why a file that says nothing gets the baseline
> An organisation that writes a policy file, sees no error and runs with none of the recommended secret and injection rules has a hole nobody can see. Declining is therefore something you write down. An export pins `enabled: false`, because an export is a snapshot and re-applying it must add nothing.

### spec.providers

One entry per provider slug. A provider the file does not mention keeps its current action.

| Field | Type | Required | Value |
|---|---|---|---|
| `slug` | string | yes | Provider slug as it appears in the gateway URL: `openai`, `anthropic`, `groq`, `mistral`, `deepseek`, `xai`, `openrouter`, `together`, `fireworks`, or the slug of a custom provider added in the console. The full list is on [Provider catalog](/ai-firewall/reference/provider-catalog/). |
| `action` | enum | yes | `allow`, `deny` or `default`. `default` removes the org's association, which means allowed. Anything else fails with `action must be allow, deny, or default`. |
| `key` | object | no | Where `apply` reads the provider's API key from. The key itself is never in the file. |
| `key.fromEnv` | string | one of the two | Name of an environment variable holding the key. `apply` fails with `$NAME is not set` if it is empty. |
| `key.fromFile` | string | one of the two | Path of a file holding the key. A leading `~/` is expanded to your home directory; surrounding whitespace is trimmed. |

A `key` block with neither field fails validation (`set fromEnv or fromFile`). When both are set, `fromEnv` is used. Every `key` entry is sent on every apply, because the server never returns a stored key and the plan cannot tell whether it changed. A provider whose key is managed in the [secrets vault](https://www.vulnetix.com/resolve/vault) refuses a key write with `409`.

Setting `allow` or `deny` needs the Pro plan; `default` does not. The server answers a plan-locked write with `200` and a `{"planLocked": true, "feature": "ai-firewall-policy", "requiredPlan": "pro"}` body; the CLI turns that into an error and `apply` stops there.

### spec.models

One entry per model, scoped to one provider or to every provider that lists it.

| Field | Type | Required | Value |
|---|---|---|---|
| `slug` | string | yes | Model id as the provider names it, for example `gpt-4o`, or `openai/gpt-4o-mini` for an OpenRouter model. |
| `provider` | string | one of the two | Provider slug the entry applies to. |
| `anyProvider` | bool | one of the two | `true` expands the entry on the server into one row for each provider whose catalog lists the slug. |
| `action` | enum | yes | `allow` or `deny`. |

Exactly one of `provider` and `anyProvider: true` is required (`set exactly one of provider or anyProvider`). The first `allow` entry for a provider puts that provider into allowlist mode: from then on only listed models pass, and every other model gets `403 model_not_allowed`. See [Models](/ai-firewall/policy/models/).

An `anyProvider` entry cannot be compared with the server's rows, so it appears in every plan as an `update`. Model entries need the Pro plan; removing one does not.

### spec.guardrails

Guardrails are reconciled **by name**. The server keys them by UUID, so `apply` looks each name up in the live policy.

| Field | Type | Required | Default | Value |
|---|---|---|---|---|
| `name` | string | yes | | Unique within the file. A duplicate fails with `duplicate name`. |
| `ruleType` | enum | yes | | One of the twelve rule types below. |
| `action` | enum | yes | | `block`, `redact`, `flag` or `strip`, limited by rule type. |
| `pattern` | string | depends | `""` | A regex, an integer, a glob or empty, depending on `ruleType`. Quote it in YAML. |
| `priority` | int | no | `0` | Evaluation order, lowest first. Must be 0 or more. |
| `enabled` | bool | no | `true` | `false` keeps the rule on the server without enforcing it. |
| `baselineId` | string | no | | Accepted and ignored. It is never sent to the server and `export` never writes it. |

> [!CAREFUL] An omitted priority is 0 in a file, 100 elsewhere
> `apply` always sends the priority, so a guardrail without one is stored at `0` and runs before every baseline rule. A guardrail created in the console, or with `vulnetix ai-firewall policy guardrail` without `--priority`, gets the server default of `100`. Give every rule in the file an explicit priority.

#### Rule types, actions and patterns

| `ruleType` | Plane | Actions | `pattern` |
|---|---|---|---|
| `blocked_pattern` | content | `block`, `redact`, `flag` | Go RE2 regex, required |
| `pii_redact` | content | `block`, `redact`, `flag` | Go RE2 regex, or empty for the built-in email, card, SSN and phone detectors |
| `max_messages` | content | `block`, `redact`, `flag` | Positive integer as a string, such as `"200"` |
| `delimiter_integrity` | content | `block`, `flag` | Must be empty. Judges sealed harness blocks; see [Nonces and sealed blocks](/ai-firewall/reference/nonces/). |
| `tool_allow`, `tool_deny` | capability | `block`, `flag`, `strip` | Glob over tool names |
| `mcp_allow`, `mcp_deny` | capability | `block`, `flag`, `strip` | Glob over MCP server labels |
| `skill_allow`, `skill_deny` | capability | `block`, `flag` | Glob over skill names |
| `client_allow`, `client_deny` | capability | `block`, `flag` | Glob over client names such as `claude-code` |

What the actions do is covered on [Guardrails](/ai-firewall/policy/guardrails/). The pairing rules:

- `redact` works only on content rules (`action redact rewrites request content, so it cannot be used with tool_deny`).
- `strip` works only on `tool_*` and `mcp_*` rules, the ones whose match is an entry in a request array that can be removed.
- `delimiter_integrity` takes only `block` or `flag`.
- Any `*_allow` rule switches its family (tools, MCP servers, skills or clients) into allowlist mode.

#### Pattern syntax

- **Regex** (`blocked_pattern`, `pii_redact`): compiled with Go's `regexp`, which is RE2. There is no lookahead or lookbehind; a pattern containing `(?=`, `(?!` or `(?<` fails with a hint to drop it. Use `(?i)` for case-insensitive matching. Single-quote the value in YAML so backslashes survive.
- **Integer** (`max_messages`): parsed with `strconv.Atoi` after trimming. Zero and negatives fail.
- **Glob** (capability rules): only `*` is special and every other character is literal. The glob is anchored at both ends, so `Bash` matches only `Bash` and `mcp__github__*` matches every tool of one MCP server. A pattern that starts with `^` or ends with `$` is refused, because it would match a name containing those characters. See [Glob reference](/ai-firewall/reference/glob-reference/).

The CLI compiles every pattern before it contacts the server. A rule whose pattern the gateway cannot compile is skipped at request time while still showing as enabled, so this check is where it is caught.

## Validation errors

`apply` stops before any server call when the file fails these checks. Each message is prefixed with the file path.

| Message | Cause |
|---|---|
| `apiVersion must be "vulnetix.com/v1", got "..."` | Wrong or missing `apiVersion` |
| `kind must be "AiFirewallPolicy", got "..."` | Wrong or missing `kind` |
| `providers: slug is required` | Provider entry without `slug` |
| `providers[X]: action must be allow, deny, or default` | Bad provider action |
| `providers[X].key: set fromEnv or fromFile` | Empty `key` block |
| `models: slug is required` | Model entry without `slug` |
| `models[X]: action must be allow or deny` | Bad model action |
| `models[X]: set exactly one of provider or anyProvider` | Both or neither scope set |
| `guardrails: name is required` | Guardrail without `name` |
| `guardrails[X]: duplicate name` | Two guardrails share a name |
| `guardrails[X]: ruleType must be one of ...` | Unknown rule type |
| `guardrails[X]: action must be block, redact, flag, or strip` | Unknown action |
| `guardrails[X]: delimiter_integrity judges sealed harness blocks, so its action is block or flag` | Wrong action for `delimiter_integrity` |
| `guardrails[X]: action redact rewrites request content, so it cannot be used with ...` | `redact` on a capability rule |
| `guardrails[X]: action strip removes an entry from the request, so it cannot be used with ...` | `strip` on a content, skill or client rule |
| `guardrails[X]: max_messages needs a positive integer pattern` | Non-integer or non-positive cap |
| `guardrails[X]: blocked_pattern needs a pattern` | Empty regex |
| `guardrails[X]: pattern does not compile: ...` | Regex RE2 cannot compile |
| `guardrails[X]: delimiter_integrity takes no pattern` | Pattern on `delimiter_integrity` |
| `guardrails[X]: a capability rule needs a pattern` | Empty glob |
| `guardrails[X]: capability patterns are globs, not regexes` | Glob starts with `^` or ends with `$` |

## How apply reconciles

| Object | Keyed by | Present in file, not on server | On server, not in file |
|---|---|---|---|
| Guardrail | `name` | create | drift; deleted with `prune` |
| Model entry | `provider/slug` | create | drift; deleted with `prune` |
| Model entry with `anyProvider` | `slug` | update (always) | covers every provider's row for that slug |
| Provider | `slug` | update when the action differs | drift when it has an action; never deleted |
| Key | provider `slug` | update (always) | untouched |
| `logsEnabled` | | update when it differs | untouched |

A guardrail is updated when any of `ruleType`, `action`, `pattern`, `priority` or `enabled` differs. Renaming a guardrail in the file is a create plus, with `prune`, a delete.

Changes run in this order: guardrails, models, providers, keys, settings. Tightening a policy therefore never passes through a state where a provider is open and the guardrails constraining it are not yet in place. The first failing change stops the run with `applied N of M change(s), then failed: ...`.

Providers are never pruned. Removing a provider's row removes a `deny`, which opens the provider. Reopening one is written down as `action: default`, or run as `vulnetix ai-firewall policy provider <slug> --clear`.

## Plan requirements

| Part of the file | Minimum plan | Enforced by |
|---|---|---|
| `providers[].action: allow` or `deny`, `models[]` | Pro | API at write time, gateway at request time |
| `guardrails[]`, baseline | Business | API at write time, gateway at request time |
| `settings.logsEnabled: true` | paid plan | API at write time |
| `providers[].key`, `action: default`, deletes | community | |

## Related

- [Policy as code with apply and export](/ai-firewall/cli/policy-file-workflow/)
- [Commands](/ai-firewall/cli/commands/)
- [Guardrails](/ai-firewall/policy/guardrails/)
- [Platform IaC](/platform-iac/)
