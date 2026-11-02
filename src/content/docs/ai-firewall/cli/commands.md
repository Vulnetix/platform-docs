---
title: vulnetix ai-firewall commands
nav: Commands
description: Every vulnetix ai-firewall subcommand with its flags, defaults, credentials and exit codes.
order: 1
sources:
  - cli/cmd/ai_firewall.go
  - cli/cmd/ai_firewall_apply.go
  - cli/cmd/ai_firewall_policy.go
  - cli/cmd/ai_firewall_inventory.go
  - cli/cmd/ai_firewall_kiro.go
  - cli/cmd/config_ai_firewall.go
  - cli/cmd/package_firewall.go
  - cli/cmd/exit_codes.go
  - cli/pkg/aifirewall/provider.go
  - cli/pkg/aifirewall/clients.go
  - cli/pkg/aifirewall/snippet.go
  - cli/pkg/auth/credentials.go
  - vdb-api/internal/handler/v2_cli_ai_firewall.go
checked: [cli@4c8c3b7, vdb-api@4145f0a]
updated: 02 Nov 2026
---

`vulnetix ai-firewall` wires the AI clients on a machine to the gateway at `https://guardrails.vulnetix.com`, checks that they are wired, and edits the policy the gateway enforces for your organisation. It is separate from `vulnetix package-firewall`, which proxies package registries.

```text
vulnetix ai-firewall
├── install     [client...]   wire local AI clients to the gateway
├── uninstall   [client...]   remove that wiring (local files only)
├── status                    what is wired, and where it conflicts with policy
├── get                       print providers, model lists and guardrails
├── policy      provider | model | guardrail
├── key         set | remove  provider API keys (BYOK)
├── kiro        login         store a Kiro sign-in in the secrets vault
├── settings                  org-wide switches (inference logging)
├── baseline                  the server's recommended guardrails
├── apply                     reconcile the policy from .vulnetix/ai-firewall.yaml
├── export                    write the live policy to .vulnetix/ai-firewall.yaml
├── inventory                 tools, MCP servers and skills seen on the wire
└── snippet                   print code wired to the gateway
```

## Credentials

Every subcommand except `uninstall` needs a Vulnetix credential, found in this order: `VULNETIX_API_TOKEN`; `VULNETIX_API_KEY` with `VULNETIX_ORG_ID`; `VVD_ORG` with `VVD_SECRET`; `.vulnetix/credentials.json` in the project; `~/.vulnetix/credentials.json`; the Package Firewall netrc entry. See [CLI authentication](/cli/authentication/overview/).

`install`, `status`, `snippet`, `apply` and `export` also need the org's Vulnetix API key itself, because they write it into client config or compare it with `metadata.org`. They accept only an API key credential (`VULNETIX_API_KEY` with `VULNETIX_ORG_ID`, or a stored API key login) or a SigV4 credential, from which a derived API key is fetched. A `VULNETIX_API_TOKEN` credential fails with `unsupported authentication method`.

> [!CAREFUL] VULNETIX_API_KEY alone is not a credential
> The CLI uses `VULNETIX_API_KEY` only when `VULNETIX_ORG_ID` is also set. With the key alone it falls through to the stored login, or fails with `no credentials found`. In CI, set both.

## Flags shared by many subcommands

| Flag | Default | On | Meaning |
|---|---|---|---|
| `--base-url` | `https://api.vdb.vulnetix.com` | every subcommand except `uninstall` | Vulnetix API the policy is read from and written to |
| `--gateway-url` | `https://guardrails.vulnetix.com` | `install`, `uninstall`, `status`, `snippet` | Gateway written into client config, and the host `status` and `uninstall` look for |
| `-o`, `--output` | `pretty` | every subcommand | `pretty` or `json`. Anything else fails with `--output must be one of: pretty, json`. |

## install

```bash
vulnetix ai-firewall install [client...] [flags]
```

Points local AI clients at the gateway. With no client named, every client detected on this machine is wired. Only providers the org holds a key for, and does not deny, are wired. Details and the files each client gets are on [Wiring clients](/ai-firewall/cli/wiring-clients/).

Clients: `aider`, `claude-code`, `codex`, `continue`, `cursor`, `env`, `shell`, `windsurf`. `cursor` and `windsurf` are printed as manual instructions; nothing is written for them.

| Flag | Default | Meaning |
|---|---|---|
| `--provider <slug>[,<slug>]` | every provider with a stored key | Wire only these providers. Repeatable. |
| `--model <id>` | none | Default model to pin in agent configs. Refused if the policy would reject it. |
| `--scope user\|project` | per client | Where to write. Defaults: `shell`, `codex`, `continue`, `cursor`, `windsurf` user; `env`, `claude-code`, `aider` project. |
| `--embed-key` | `false` | Write the literal API key instead of a reference to `$VULNETIX_API_KEY`. |
| `--create-env` | `false` | Create a `.env` at the git root when there is no `.env`, `.envrc` or `Makefile`. |
| `--dry-run` | `false` | Print the planned changes and write nothing. |

Fails with `no provider is ready to wire` when no provider has a stored key.

## uninstall

```bash
vulnetix ai-firewall uninstall <client...> | --all | --except <client>[,<client>]
```

Removes what `install` wrote. Server policy and stored keys are not touched, and no credential is needed. Exactly one selector is required: client names, `--all` or `--except`.

| Flag | Default | Meaning |
|---|---|---|
| `--all` | `false` | Every client |
| `--except <client>` | none | Every client except these |
| `--dry-run` | `false` | Print the planned changes and write nothing |
| `--gateway-url` | `https://guardrails.vulnetix.com` | Host whose settings are stripped |

## status

```bash
vulnetix ai-firewall status [--strict]
```

Prints the gateway, org, credential source, logging state, providers, guardrails, detected local clients and checks. The checks are listed on [Status and checks](/ai-firewall/cli/status-and-checks/).

| Flag | Default | Meaning |
|---|---|---|
| `--strict` | `false` | Exit `1` when any error-level check fails. Without it, `status` exits `0` with findings. |

## get

```bash
vulnetix ai-firewall get [-o json]
```

Prints the provider catalog with the org's action (`allow`, `deny` or `default (allow)`), the model allow/deny entries, and the guardrails in priority order. Same as `vulnetix config get ai-firewall`.

## policy

Edits one rule at a time. Each subcommand is also available as `vulnetix config set ai-firewall <provider|model|guardrail>`; both spellings run the same code.

### policy provider

```bash
vulnetix ai-firewall policy provider <slug> --allow | --deny | --clear
```

Exactly one of the three. `--clear` removes the org's association, which returns the provider to default-allow. `--allow` and `--deny` need the Pro plan.

### policy model

```bash
vulnetix ai-firewall policy model <model-id> (--allow | --deny | --remove) (--provider <slug> | --any-provider)
```

| Flag | Meaning |
|---|---|
| `--allow` | Add to the allow list. The first allow entry for a provider puts it into allowlist mode. |
| `--deny` | Add to the deny list. |
| `--remove` | Remove the entry. Not plan-gated. |
| `--provider <slug>` | The provider the entry applies to. |
| `--any-provider` | Expand across every provider whose catalog lists the model. |

Exactly one action and exactly one of `--provider` and `--any-provider`. See [Models](/ai-firewall/policy/models/).

### policy guardrail

```bash
vulnetix ai-firewall policy guardrail <name> --rule-type <type> --action <action> --pattern <pattern> [flags]
```

| Flag | Default | Meaning |
|---|---|---|
| `--rule-type` | required on create | `blocked_pattern`, `max_messages`, `pii_redact`, `delimiter_integrity`, `tool_allow`, `tool_deny`, `mcp_allow`, `mcp_deny`, `skill_allow`, `skill_deny`, `client_allow`, `client_deny` |
| `--action` | `flag` on create | `block`, `redact`, `strip`, `flag` |
| `--pattern` | none | RE2 regex for `blocked_pattern` and `pii_redact`, an integer for `max_messages`, a glob for capability rules, empty for `delimiter_integrity` |
| `--priority` | `100` on create | Evaluation order, lowest first |
| `--enable`, `--disable` | enabled on create | Mutually exclusive |
| `--uuid` | none | Update the guardrail with this UUID instead of creating one. Only changed flags are sent. |
| `--delete` | `false` | Delete the guardrail. Requires `--uuid`. |

Guardrails need the Teams plan; deleting one does not. Which actions each rule type accepts is on [Policy file reference](/ai-firewall/reference/policy-file/#rule-types-actions-and-patterns). Find a guardrail's UUID with `vulnetix ai-firewall get -o json`.

```bash
vulnetix ai-firewall policy guardrail "Block AWS keys" \
  --rule-type blocked_pattern --action block \
  --pattern '\b(?:AKIA|ASIA)[A-Z0-9]{16}\b' --priority 10
```

## key

```bash
vulnetix ai-firewall key set <provider> --from-env <VAR> | --stdin | --key <key>
vulnetix ai-firewall key remove <provider>
```

Stores or removes the provider API key the gateway uses upstream. The key is encrypted with KMS under a context bound to the org and provider and is never returned. See [Provider keys](/ai-firewall/get-started/provider-keys/).

| Flag | Meaning |
|---|---|
| `--from-env <VAR>` | Read the key from this environment variable |
| `--stdin` | Read the first line of stdin |
| `--key <key>` | The key on the command line. Prints a warning, because it lands in shell history and the process list. |

Exactly one source. The key is trimmed and must be 1 to 4096 bytes with no control characters. `key set kiro` is refused; use `kiro login`. A key managed in the secrets vault is refused with `409`; change it at `https://www.vulnetix.com/resolve/vault`. Storing a key for a disabled provider fails with `400 provider <slug> is disabled`.

```bash
vulnetix ai-firewall key set openai --from-env OPENAI_API_KEY
printf '%s\n' "$ANTHROPIC_API_KEY" | vulnetix ai-firewall key set anthropic --stdin
```

## kiro login

```bash
vulnetix ai-firewall kiro login [flags]
```

Kiro has no API key. This signs in with an AWS Builder ID, or an IAM Identity Center start URL, and stores the sign-in in the secrets vault as the `kiro` provider's key, granted to the AI Firewall. The gateway mints a short-lived Kiro access token from it for each request. Clients send their Vulnetix API key to `https://guardrails.vulnetix.com/kiro/<org-uuid>/v1`. Needs an API key sign-in (`vulnetix auth login` with an API key).

| Flag | Default | Meaning |
|---|---|---|
| `--start-url <url>` | AWS Builder ID | IAM Identity Center start URL |
| `--region <region>` | `us-east-1` | Region of the sign-in |
| `--api-region <region>` | the profile's region, else the sign-in region | Kiro API region |
| `--profile-arn <arn>` | prompt when there are several | CodeWhisperer profile to use (Identity Center) |
| `--import` | `false` | Reuse the sign-in the Kiro IDE (`kiro-auth-token.json` in the AWS SSO cache) or kiro-cli holds. GitHub and Google Kiro sign-ins cannot be used. |
| `--name <name>` | `kiro` | Vault entry name when one is created |
| `--owner <uuid>` | every API key owner | Principals whose API keys may use the entry. Repeatable. |
| `--expires-in-days <n>` | `0` (never) | Expire the vault entry |
| `--no-browser` | `false` | Print the sign-in URL without opening a browser |

Run it again when requests fail with `vault_kiro_relogin`; it replaces the value of the existing vault entry and keeps its grants.

## settings

```bash
vulnetix ai-firewall settings --logs | --no-logs
```

Turns [inference logging](/ai-firewall/operations/logs/) on or off. Logging records metadata only. Enabling needs a paid plan; disabling never does. Exactly one flag is required.

## baseline

```bash
vulnetix ai-firewall baseline [--ref recommended] [--catalog <file>]
```

Prints the recommended guardrail set (id, name, rule type, action, priority) from the server. The rules are on [Recommended baseline](/ai-firewall/policy/recommended-baseline/).

| Flag | Default | Meaning |
|---|---|---|
| `--ref` | `recommended` | Named set: `default` or `recommended` |
| `--catalog <file>` | none | Read a local JSON or YAML baseline instead |

When the server cannot serve the set, `baseline` prints `No baseline available` and exits `0`.

## apply

```bash
vulnetix ai-firewall apply [-f .vulnetix/ai-firewall.yaml] [flags]
```

Makes the live policy match a policy file. See [Policy as code](/ai-firewall/cli/policy-file-workflow/) and [Policy file reference](/ai-firewall/reference/policy-file/).

| Flag | Default | Meaning |
|---|---|---|
| `-f`, `--file` | `.vulnetix/ai-firewall.yaml` | Policy file |
| `--dry-run` | `false` | Print the plan and change nothing |
| `--prune` | `false` | Delete guardrails and model entries the file does not mention. Never providers. |
| `--no-baseline` | `false` | Do not compose in the recommended guardrails |
| `--baseline-required` | `false` | Fail when the baseline cannot be fetched or does not validate |
| `--catalog <file>` | none | Local baseline file instead of the server's |
| `--ref` | `recommended` | Baseline set; overrides `spec.baseline.ref` |
| `--force` | `false` | Apply even when `metadata.org` differs from your credential's org |

## export

```bash
vulnetix ai-firewall export [-f .vulnetix/ai-firewall.yaml] [--stdout] [--force]
```

Writes the live policy as a policy file with `metadata.org` set and `spec.baseline.enabled: false`. Keys are never written.

| Flag | Default | Meaning |
|---|---|---|
| `-f`, `--file` | `.vulnetix/ai-firewall.yaml` | Where to write. Parent directories are created. |
| `--stdout` | `false` | Print instead of writing a file |
| `--force` | `false` | Overwrite an existing file |

## inventory

```bash
vulnetix ai-firewall inventory [--kind tool|mcp_server|skill] [--client <name>] [--search <text>] [--limit 200] [--clear]
```

Lists the tools, MCP servers and skills the gateway has seen this org's agents carry. See [Inventory](/ai-firewall/operations/inventory/).

| Flag | Default | Meaning |
|---|---|---|
| `--kind` | all | `tool`, `mcp_server` or `skill` |
| `--client <name>` | all | Client name, such as `claude-code` |
| `--search <text>` | none | Substring match on the identity |
| `--limit <n>` | `200` | 1 to 1000 rows |
| `--clear` | `false` | Delete the whole inventory instead of reading it |

## snippet

```bash
vulnetix ai-firewall snippet [--lang python] [--sdk openai] [flags]
```

Prints a runnable program with the gateway URL, org UUID and model filled in. See [Code snippets](/ai-firewall/cli/snippets/).

| Flag | Default | Meaning |
|---|---|---|
| `--lang` | `python` | `go`, `python`, `sh`, `ts` |
| `--sdk` | `openai` | `anthropic`, `curl`, `langchain`, `llamaindex`, `openai`, `vercel-ai` |
| `--provider <slug>` | first provider with a stored key | Provider to call |
| `--model <id>` | an allowed model, else `gpt-4o` or `claude-sonnet-4-5` | Model to call. Refused if the policy would reject it. |
| `--output-file <path>` | stdout | Write to a file |
| `--force` | `false` | Overwrite the output file |

## Exit codes

| Code | When |
|---|---|
| `0` | Success. Also `status` with findings and no `--strict`, `apply --dry-run` with pending changes, and `baseline` with no baseline available. |
| `1` | Any failure: credentials, network, API error, plan-locked write, invalid flags, invalid policy file, `metadata.org` mismatch, a failed change partway through `apply`, or `status --strict` with an error-level check. |

`status --help` says `--strict` exits `2`. It exits `1`: the command returns a plain error and the CLI maps every error without its own code to `1`.

## Related

- [Wiring clients](/ai-firewall/cli/wiring-clients/)
- [Status and checks](/ai-firewall/cli/status-and-checks/)
- [Policy as code](/ai-firewall/cli/policy-file-workflow/)
- [Troubleshooting](/ai-firewall/reference/troubleshooting/)
