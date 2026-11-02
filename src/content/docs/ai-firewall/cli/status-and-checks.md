---
title: Status and checks
description: What vulnetix ai-firewall status reports, every check it runs against the org's policy, and how to use it as a CI gate.
order: 3
sources:
  - cli/cmd/ai_firewall.go
  - cli/pkg/aifirewall/checks.go
  - cli/pkg/aifirewall/detect.go
  - cli/pkg/aifirewall/clients.go
  - cli/cmd/exit_codes.go
checked: [cli@4c8c3b7]
updated: 02 Nov 2026
---

`vulnetix ai-firewall status` reads the org's policy from the API, inspects every AI client on the machine, and reports where the two disagree. It catches the failures you would otherwise meet as a `403` at request time, and the one that never errors: a client whose base URL points somewhere other than the gateway, so its traffic is not screened.

```bash
vulnetix ai-firewall status
vulnetix ai-firewall status --strict
vulnetix ai-firewall status -o json
```

## What it prints

| Section | Content |
|---|---|
| Header | Gateway URL, org UUID, credential source, inference logging on or off |
| Providers | Each catalog provider: slug, org policy (`allow`, `deny` or `default (allow)`), key `stored` or `missing`, and the base-URL variables that wire it, or `snippet only (no SDK base-URL env var)` |
| Guardrails | Priority, name, rule type, action, enabled |
| Local clients | Each detected client: name, scope, state, config path |
| Checks | `[error]` and `[warning]` lines, or `No problems found.` |

## Client states

| State | Meaning |
|---|---|
| `wired` | Points at this org's gateway |
| `points elsewhere` | Has a base URL, and it is not the gateway. Requests are not screened. |
| `not wired` | Installed, with no base URL override |
| `manual` | Cursor or Windsurf: the setting lives in application state, so it cannot be read |
| `not installed` | Not on this machine. Hidden in pretty output. |

## Checks

| Check id | Severity | Fires when | Fix |
|---|---|---|---|
| `bypasses_firewall` | warning | A client's base URL is set to a host other than the gateway | `vulnetix ai-firewall install <client>` |
| `provider_denied` | error | A wired client's provider is denied by the org | Change the client, or `vulnetix ai-firewall policy provider <slug> --allow` |
| `provider_key_missing` | error | A wired client's provider has no stored key | `vulnetix ai-firewall key set <slug>` |
| `model_denied` | error | The model pinned in a wired client is on the deny list | Pin another model, or remove the entry |
| `model_not_allowed` | error | The provider is in allowlist mode and the pinned model is not on the list | Pin an allowed model, or add it with `policy model <id> --allow --provider <slug>` |
| `wire_unsupported` | warning | The client needs a surface (`messages`, `responses`) the gateway does not serve for its provider | Use a provider that serves it; see [Keys and base URLs](/ai-firewall/get-started/keys-and-base-urls/) |
| `key_env_unset` | warning | A base URL points at the gateway but the provider's key variable (such as `OPENAI_API_KEY`) is empty | Export `VULNETIX_API_KEY`, or re-run `install` |
| `guardrail_pattern_invalid` | warning | An enabled guardrail's regex does not compile in Go RE2. The gateway skips it, so it is not enforced. | Rewrite the pattern without lookaround |

Only clients in state `wired` get the policy checks. The model checks use the model pinned in the client's config; a client with no pinned model is not checked.

## Exit codes

| Code | When |
|---|---|
| `0` | Status printed, whatever the checks found. Safe in a shell prompt. |
| `1` | With `--strict`, at least one error-level check failed. Also any failure to load credentials or reach the API. |

Warnings never fail `--strict`. A machine whose clients all bypass the gateway passes `status --strict`, because `bypasses_firewall` is a warning. To fail on that too, test the JSON:

```bash
vulnetix ai-firewall status -o json | jq -e '(.checks // []) | length == 0'
```

## JSON output

`status -o json` prints one object:

| Key | Content |
|---|---|
| `gateway` | `{baseUrl, org, logsEnabled}` |
| `providers` | The provider catalog with `slug`, `orgAction`, `hasKey` and the surfaces each serves |
| `guardrails` | The org's guardrails |
| `clients` | `[{id, name, scope, path, state, baseUrl, model}]`, including `not installed` ones |
| `checks` | `[{id, severity, client, message}]`; `severity` is `error` or `warn` |
| `summary` | `{errors, warnings}` |

## Related

- [Wiring clients](/ai-firewall/cli/wiring-clients/)
- [Verify the gateway](/ai-firewall/get-started/verify/)
- [Error reference](/ai-firewall/reference/errors/)
