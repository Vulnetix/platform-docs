---
title: Migrating from v3 to v4
nav: Migrating to v4
description: What changed when the Vulnetix CLI moved from v3 to v4.0.0, the Go module path, the config set and ai-firewall commands that became aliases of the config engine, plan and apply reading the well-known files, and the action version channel.
order: 4
sources: [cli/docs/platform-iac.md, cli/docs/PUBLISHING.md, cli/cmd/config_engine.go, cli/cmd/config_engine_alias.go, cli/cmd/config_engine_alias_aifw.go, cli/cmd/config_engine_alias_pfw.go, cli/action.yml, cli/install.sh]
checked: [cli@v4.4.0]
updated: 03 Nov 2026
---

CLI v4.0.0 was released on 3 November 2026. It is the first v4 release and the newest release overall: it is the GitHub Latest release, `install.sh` with no version installs it, and `Vulnetix/cli@v4` follows it. See [the releases](https://github.com/Vulnetix/cli/releases).

Nothing forces a move. v3 is frozen at v3.169.2 (commit `f52af4d`): the `v3` tag stays there, `Vulnetix/cli@v3` keeps installing a v3 binary, and a later v3 patch release would be published without moving `v3`, Latest, Homebrew, Scoop or the Nix flake. See [Versions and release channels](/cli/ci-cd/versions-and-channels/).

## What changed

| Area | v3 | v4.0.0 |
|---|---|---|
| Go module path | `github.com/vulnetix/cli/v3` | `github.com/vulnetix/cli/v4` |
| `config plan` and `config apply` input | `.vulnetix/config` only. A well-known file works when named with `-f`. | `.vulnetix/config` and, with no `-f`, the well-known files |
| `config set` aliases | `set quality-gate` and `set eol-policy` are aliases of the engine, falling back to the legacy endpoint. | `set package-firewall` (policy form) is an alias as well |
| `ai-firewall apply` and `ai-firewall export` | Call `cli.ai-firewall-*` | Aliases of the config engine for the `AiFirewallPolicy` kind, falling back to the legacy endpoints |
| Action `version` default | `v3` | `v4` for `Vulnetix/cli@v4`. `@v3` keeps `v3`. |
| `install.sh` with no version, `latest` | The newest release, v3 or later | The newest release, v4 |

v4.0.0 embeds `config-schemas` v1.10.0, the same release as the last v3 releases, so the major version added no kind: [`ComplianceTarget`](/platform-iac/kinds/compliance-target/) (config-schemas v1.11.0) is refused as unknown by `config validate`, `plan` and `apply` in v4.0.0 and v4.1.0. v4.1.1 embeds config-schemas v1.12.0 and knows it.

## Releases since v4.0.0

| Release | Change |
|---|---|
| v4.1.0 | `config apply` uploads a snapshot of the documents a `VexSource` with a `path` names. See [Path sources](/platform-iac/guides/vex-sources/#path-sources). |
| v4.1.1 | Embeds config-schemas v1.12.0, which adds `autoUpdate` to `RuntimeSensorPolicy` and, with v1.11.0, `ComplianceTarget` |
| v4.2.0 | Scans take `--vex <file, directory or https URL>` and read the `path` and `urls` sources of the `VexSource` documents declared in `.vulnetix/config`. See [VEX in a scan](/vex/scans/vex-file/). |
| v4.3.0 | The `sca`, `sast`, `secrets`, `iac` and `containers` actions and the root action take a `vex` input, one path, directory or `https` URL per line, passed as repeated `--vex`. `license` and `jail` take none. |
| v4.4.0 | An authenticated scan also applies the VEX statements the console holds for the repository, including those of `tea`, `s3` and `git` `VexSource` sources, de-duplicated against `--vex` documents and never sent back; `--no-vex` skips them and community mode applies none. `ignore remove` refuses a rule a `VexSource` owns and names the source, `ignore sync` leaves such rules out of `memory.yaml`, and `ignore list` shows them under their source. See [Statements the console holds](/vex/scans/vex-file/#statements-the-console-holds). |

## Go module path

The module path gains a `/v4` suffix at the major version. It matters only if you import the CLI's packages or install with Go:

```sh
go install github.com/vulnetix/cli/v4@latest
```

Change every import of `github.com/vulnetix/cli/v3/...` to `github.com/vulnetix/cli/v4/...`. The v3 path stays resolvable at its last release. Binary users are not affected. The `-X` linker flags that stamp the version take the new path as well.

## Well-known files in plan and apply

A file is a [Platform IaC document](/platform-iac/cli/validate/#which-files-are-platform-iac-documents) if and only if its `apiVersion` is `vulnetix.com/v1` and its `kind` is one `vulnetix config kinds` lists. Three files have fixed paths:

| Path | Kind | Sent to the engine |
|---|---|---|
| `.vulnetix/ai-firewall.yaml` | `AiFirewallPolicy` | Yes, so `config apply --prune` adopts it |
| `.vulnetix/license-policy.yaml` | `LicensePolicy` | No. Validated and reported in the plan with a note. |
| `.vulnetix/license-exceptions.yaml` | `LicenseExceptions` | No. Validated and reported in the plan with a note. |

In v3, `config validate` reads them and `config plan` and `config apply` do not. In v4, plan and apply read them when no `-f` is given, so a repository that keeps its AI Firewall policy or licence policy in these files sees them in its plans.

Before you upgrade a pipeline:

1. Run `vulnetix config plan` with v4 against a copy of the repository and read the plan.
2. If a well-known file also defines a kind that exists under `.vulnetix/config`, remove one. Defining a singleton kind in both places, or twice, is an error.
3. Plan with `--prune` off until the first plan is what you expect. With `--prune`, an `AiFirewallPolicy` declared in `.vulnetix/ai-firewall.yaml` is adopted by the manager that applies it.

The two licence kinds are marked validate only in config-schemas, so the server does not store them and apply sends nothing for them.

## Aliases of the config engine

These commands keep their flags and output, and send a document to the config engine as manager `console`. If the engine cannot take the request, they fall back to the legacy endpoint and print a deprecation warning that says why.

| Command | v3 | v4.0.0 | Warning |
|---|---|---|---|
| `config set quality-gate` | Alias | Alias | Always |
| `config set eol-policy` | Alias | Alias | Always |
| `config set package-firewall` (policy form, no positional arguments) | Legacy endpoint | Alias for `PackageFirewallPolicy` | When it falls back |
| `ai-firewall apply` | Legacy endpoint | Alias for `AiFirewallPolicy` | When it falls back |
| `ai-firewall export` | Legacy endpoint | Alias for `AiFirewallPolicy` | When it falls back |

The legacy fallback applies when the engine answers 401 or 403 (the credential is not an owner or admin, such as a service account's ApiKey), when it answers 404, when there is no credential for it, or when the request has no document form (a `null` flag, a local `--catalog` baseline). A blocked plan is not a fallback: the command prints the plan and exits 3.

What to expect after the move:

- An alias run makes the object `console`-managed. A later `config apply` from a repository is blocked with `managed_by_other` until the objects are moved to documents in one step.
- A credential that is not an owner or admin cannot plan or apply through the engine. Use a config management token (`vmt_...`) in CI so the aliases do not fall back.
- The declarative path is `config plan`, `config apply` and `config export`. To move to documents, `vulnetix config export` writes the current state.

### Commands that stay imperative

These are not aliases and are not deprecated:

| Command | Why |
|---|---|
| `config set package-firewall <ecosystem> <url>` (mirror form) | A mirror has no document form |
| `config set jail` | Same call as `vulnetix jail` |
| `config set ai-firewall provider`, `model` and `guardrail` | Single-object edits |
| Every `config get` | Read commands: `get quality-gate`, `eol-policy`, `package-firewall`, `jail` and `ai-firewall` |

See [Imperative commands](/platform-iac/cli/imperative-commands/) and [AiFirewallPolicy](/platform-iac/kinds/ai-firewall-policy/).

## GitHub Actions

The `version` input of every action defaults to the major channel that matches the action ref. `Vulnetix/cli@v4` and `Vulnetix/cli/<name>@v4` install the newest v4 release; `@v3` keeps a v3 binary.

| If your workflow uses | Do |
|---|---|
| `Vulnetix/cli@v3` or `Vulnetix/cli/<name>@v3` | Nothing. It keeps a v3 binary. |
| An exact `@v3.x.y` ref | Nothing. |
| `with: { version: latest }` or `install.sh` without `--version` | Pin `version: v3` first if you want to stay on v3, otherwise v4 is installed. |

To move, change the ref to `@v4`. Read [what changed](#what-changed) first, because the CLI is the part that changes, not the action inputs.

## Install channel

```sh
curl -fsSL https://cli.vulnetix.com/install.sh | sh -s -- --version v3   # stay on v3
curl -fsSL https://cli.vulnetix.com/install.sh | sh -s -- --version v4   # move to v4
```

Homebrew, Scoop and the Nix flake follow the newest release overall, so they install v4. Pin the version there, or install with the script and `--version v3`, to stay on v3.
