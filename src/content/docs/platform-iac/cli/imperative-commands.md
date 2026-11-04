---
title: Imperative config commands
nav: Imperative commands
description: vulnetix config set and get for the quality gate, the EOL policy and the package firewall. Every flag, the null value that unsets a field, the API each command calls and its errors.
order: 5
sources: [cli/cmd/config.go, cli/cmd/config_engine_alias.go, cli/cmd/config_engine_alias_aifw.go, cli/cmd/config_engine_alias_pfw.go, cli/cmd/config_ai_firewall.go, cli/cmd/config_jail.go, cli/pkg/vdb/api_cli.go, cli/pkg/vdb/client.go, cli/cmd/quality_gate_enforce.go, vdb-api/internal/handler/v2_cli_quality_gate.go, vdb-api/internal/handler/v2_cli_package_firewall.go, saas/prisma/models/quality-gate.prisma]
checked: [cli@v4.0.0, vdb-api@4145f0a]
updated: 03 Nov 2026
---

These commands change your organization's stored settings one call at a time. Declare settings as documents and use [`vulnetix config apply`](/platform-iac/cli/apply/) instead. Since CLI v4.0.0, `set quality-gate`, `set eol-policy` and the policy form of `set package-firewall` are aliases of it, and so are `ai-firewall apply` and `ai-firewall export`; see [Aliases of the config engine](#aliases-of-the-config-engine). The mirror form of `set package-firewall`, `set jail`, `set ai-firewall provider|model|guardrail` and every `get` stay imperative and are not deprecated.

All of them need `vulnetix auth login`. The organization is the one you are authenticated as; a Business member resolves to the team's organization. The shared community org cannot store settings and gets HTTP 403.

| Command | Calls | Stores |
|---|---|---|
| `vulnetix config set quality-gate` | `POST /v2/cli.quality-gate-config` | Scan enforcement policy |
| `vulnetix config get quality-gate` | `POST /v2/cli.quality-gate-get` | |
| `vulnetix config set eol-policy` | `POST /v2/cli.quality-gate-config` | The four EOL severity buckets of the same record |
| `vulnetix config get eol-policy` | `POST /v2/cli.quality-gate-get` | |
| `vulnetix config set package-firewall` | `POST /v2/cli.package-firewall-config` or `cli.package-firewall-mirror` | Package firewall policy, or one mirror |
| `vulnetix config get package-firewall` | `POST /v2/cli.package-firewall-get` | |
| `vulnetix config get` and `set ai-firewall` | `cli.ai-firewall-*` | Providers, models, guardrails. See [AI Firewall](/ai-firewall/). |
| `vulnetix config get jail`, `set jail exempt` | as `vulnetix jail` | See [Quality gates](/quality-gates/). |

Every command here has these two flags:

| Flag | Default | Meaning |
|---|---|---|
| `--base-url` | `https://api.vdb.vulnetix.com` | VDB API base URL. |
| `-o`, `--output` | `pretty` | `pretty` or `json`. `json` prints the response's `data` object. |

> [!CAREFUL] Any member can change org policy
> The `/v2/cli.*` write endpoints check that the caller is authenticated to a real organization, not which role the caller has. A member's API key can change the organization's quality gate and package firewall. Restrict who holds keys accordingly.

## Aliases of the config engine

| Command | Document | Since | Deprecation warning |
|---|---|---|---|
| `config set quality-gate` | `QualityGate` | v3.155.0 | Every run |
| `config set eol-policy` | `QualityGate` | v3.155.0 | Every run |
| `config set package-firewall`, policy form | `PackageFirewallPolicy` | v4.0.0 | When it falls back to the legacy endpoint |
| `ai-firewall apply`, `ai-firewall export` | `AiFirewallPolicy` | v4.0.0 | When it falls back to the legacy endpoints |

An alias keeps its flags and output but sends a document to the config engine, as manager `console`. The legacy endpoint stays as the fallback, with a warning that says why, for a credential the engine refuses. The rest of this section describes `set quality-gate` and `set eol-policy`; the other aliases follow the same fallback rules, and `ai-firewall apply` also falls back for a local `--catalog` baseline. Each `set quality-gate` and `set eol-policy` run first prints to standard error:

```text
Deprecated: 'vulnetix config set quality-gate' will be removed; declare a QualityGate document in .vulnetix/config/ and run 'vulnetix config apply'.
```

The flags map to the fields in the tables below. A flag you leave out keeps its stored value, as it did on the legacy endpoint.

The command falls back to the legacy `POST /v2/cli.quality-gate-config`, and says why on standard error (`Using the legacy quality-gate endpoint: ...`), when:

| Case | Why |
|---|---|
| The engine answers 401 or 403 | The credential is not an owner or admin. A service account's ApiKey is a member, so CI keys usually land here. |
| The engine answers 404 | It is not deployed where `VULNETIX_WEB_URL` points. |
| A flag is `null` | The engine cannot unset a field. |
| No credential at all | The legacy path then fails with its usual `authentication required`. |

A blocked plan is not a fallback. If another manager (for example `gitops:acme/platform`) owns the quality gate, the command prints the plan and exits 3, rather than going around the owner through the legacy endpoint.

> [!CAREFUL] An alias run makes the gate console-managed
> A successful engine apply records `console` as the quality gate's manager. A later `vulnetix config apply` from a repository is then blocked with `managed_by_other`, and the CLI has no command to hand ownership to another manager. Move to documents in one step rather than mixing the two.

## vulnetix config set quality-gate

Sets the scan quality gate. A value set here overrides the matching flag on every authenticated `vulnetix scan` in the organization, including a flag passed explicitly. A value never set leaves the flag in charge.

```sh
vulnetix config set quality-gate --severity high --block-malware true --cooldown 3
vulnetix config set quality-gate --severity null --cooldown null
```

Each flag takes a value. Only the flags you pass are changed. The value `null` unsets the setting for the organization.

| Flag | Values | `QualityGate` field | Overrides scan flag |
|---|---|---|---|
| `--severity` | `low`, `medium`, `high`, `critical`, `null` | `spec.severity` | `--severity` |
| `--exploits` | `poc`, `active`, `weaponized`, `null` | `spec.exploits` | `--exploits` |
| `--block-malware` | `true`, `false`, `null` | `spec.blockMalware` | `--block-malware` |
| `--block-unpinned` | `true`, `false`, `null` | `spec.blockUnpinned` | `--block-unpinned` |
| `--block-eol` | `true`, `false`, `null` | `spec.eol.block` | `--block-eol` |
| `--cooldown` | integer `>= 0`, `null` | `spec.cooldownDays` | `--cooldown` |
| `--version-lag` | integer `>= 0`, `null` | `spec.versionLag` | `--version-lag` |
| `--sca-autofix-strategy` | `safest`, `stable`, `latest`, `rolling`, `null` | `spec.scaAutofix.strategy` | `--sca-autofix-strategy` |
| `--sca-autofix-max-major-bump` | integer `>= 0`, `null` | `spec.scaAutofix.maxMajorBump` | `--sca-autofix-max-major-bump` |

Values are trimmed and lowercased before they are checked. A bad value fails before any request, for example `--severity must be one of: low, medium, high, critical`.

## vulnetix config set eol-policy

Sets the severity given to an end-of-life dependency by how close its end of life is. The buckets are calendar quarters (Q1 is January to March).

```sh
vulnetix config set eol-policy --this-quarter-severity high --retired-severity critical
```

| Flag | Values | Stored default | `QualityGate` field |
|---|---|---|---|
| `--next-quarter-severity` | `skip`, `low`, `medium`, `high`, `critical` | `low` | `spec.eol.severities.nextQuarter` |
| `--this-quarter-severity` | same | `medium` | `spec.eol.severities.thisQuarter` |
| `--within-30-days-severity` | same | `high` | `spec.eol.severities.within30Days` |
| `--retired-severity` | same | `critical` | `spec.eol.severities.retired` |

`skip` means a dependency in that bucket is not reported. Only the flags you pass are changed. These values have no `null`: they always have a value, the default until you set one.

> [!CAREFUL] The buckets are read in two places, with different rules
> - **On the platform.** Once the organization has a quality gate record, every uploaded scan gets a synthetic `VULNETIX-EOL` finding for each end-of-life dependency, at its bucket's severity. The first write of either `set quality-gate` or `set eol-policy` creates that record, so either command opts the organization in.
> - **In the CLI gate.** `vulnetix scan` reads the buckets only when `--block-eol` is in effect, from the scan flag or from `set quality-gate --block-eol true`. Without it, EOL dependencies do not fail the build.
>
> The `QualityGate` schema's `spec.eol.block` description ("The horizon severities are only read when this is true") describes only the CLI gate.

## vulnetix config get quality-gate and eol-policy

```sh
vulnetix config get quality-gate
vulnetix config get eol-policy -o json
```

Both read the same record. A setting the organization never set shows as not set. A new organization returns `{"config": null}` until its first write.

## vulnetix config set package-firewall

Two forms, chosen by the positional arguments.

### Policy form

No positional arguments. Only the flags you pass are changed. Since CLI v4.0.0 this form is an [alias of the config engine](#aliases-of-the-config-engine) for `PackageFirewallPolicy`; the mirror form below is not.

```sh
vulnetix config set package-firewall --cvss-threshold 7 --block-malware --cooldown-days 3
```

| Flag | Type | Range |
|---|---|---|
| `--cvss-threshold` | float | 0 to 10 |
| `--epss-threshold` | float | 0 to 1 |
| `--cess-threshold` | float | 0 to 10 |
| `--block-malware` | bool | |
| `--block-eol` | bool | |
| `--block-kev` | bool | |
| `--block-weaponized-exploits` | bool | |
| `--block-active-exploits` | bool | |
| `--block-poc-exploits` | bool | |
| `--block-bad-actors` | bool | |
| `--cooldown-days` | int | `>= 0` |
| `--version-lag` | int | `>= 0` |

The bool flags are true when given alone. Write `--block-malware=false` to turn one off. `--block-malware true` also works: the CLI assigns trailing `true` and `false` words to the bool flags you passed, in order.

### Mirror form

`<ecosystem> <url>` adds or updates one upstream mirror, matched by ecosystem and URL.

```sh
vulnetix config set package-firewall npm https://npm.internal.example --priority 0
vulnetix config set package-firewall npm https://registry.npmjs.org --disable
```

| Argument or flag | Meaning |
|---|---|
| `<ecosystem>` | Ecosystem id, such as `npm`, `pypi`, `go`. |
| `<url>` | Absolute URL with scheme and host. |
| `--priority` | Order within the ecosystem, `>= 0`. A new mirror without it gets the ecosystem's highest priority plus one, starting at 0. |
| `--enable`, `--disable` | Set the mirror active or inactive. Mutually exclusive. |

Policy flags are refused in the mirror form, and mirror flags in the policy form. One positional argument alone is an error.

## vulnetix config get package-firewall

```sh
vulnetix config get package-firewall
```

Prints the policy and every mirror across all ecosystems.

## Errors

| Message or status | Cause |
|---|---|
| `authentication required: ... Run 'vulnetix auth login'` | No stored credentials. Fails before any request. |
| HTTP 400 | The server rejected a value. |
| HTTP 401 `authenticated org required` | The credentials did not resolve to an organization. |
| HTTP 403 `... requires an authenticated Vulnetix org` | You are using the community org. |
| HTTP 403 `authenticated org is not present in the SaaS database` | The organization has no account record yet. |
| HTTP 503 | The organization could not be resolved, or storage is not configured. |

Every failure exits 1.
