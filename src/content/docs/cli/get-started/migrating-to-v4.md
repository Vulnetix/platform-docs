---
title: Migrating from v3 to v4
nav: Migrating to v4
description: What changes for you when the Vulnetix CLI moves from v3 to v4, the Go module path, the config set, get and ai-firewall commands becoming aliases of the config engine, plan and apply reading the well-known files, and the action version channel.
order: 4
sources: [cli/docs/platform-iac.md, cli/docs/PUBLISHING.md, cli/cmd/config_engine.go, cli/cmd/config_engine_alias.go, cli/action.yml, cli/install.sh]
checked: [cli@3e6fd831d]
updated: 03 Nov 2026
---

> [!CAREFUL] v4.0.0 is upcoming
> No v4 release exists yet. This page is written for the release, from the CLI source. Where it says "from v4", the change is not in any released binary. Check [the releases](https://github.com/Vulnetix/cli/releases) first.

Nothing forces a move. v3 stays installable, `Vulnetix/cli@v3` keeps working, and a v3 patch release is still published after v4 ships. See [Versions and release channels](/cli/ci-cd/versions-and-channels/).

## What changes

| Area | v3 | v4 |
|---|---|---|
| Go module path | `github.com/vulnetix/cli/v3` | `github.com/vulnetix/cli/v4` |
| `config plan` and `config apply` input | `.vulnetix/config` only. A well-known file works when named with `-f`. | `.vulnetix/config` and the well-known files |
| `config set` and `config get` | `set quality-gate` and `set eol-policy` are aliases of the engine, falling back to the legacy endpoint. The rest call `/v2/cli.*` directly. | All are aliases of the config engine |
| `ai-firewall apply` and `ai-firewall export` | Call `cli.ai-firewall-*` | Aliases of the config engine for the `AiFirewallPolicy` kind |
| Action `version` default | `v3` | `v4` for `Vulnetix/cli@v4`. `@v3` keeps `v3`. |
| `install.sh` with no version | The newest release, v3 or later | The newest release, v4 |

## Go module path

The module path gains a `/v4` suffix at the major version. It matters only if you import the CLI's packages or install with Go:

```sh
go install github.com/vulnetix/cli/v4@latest
```

Binary users are not affected.

## Well-known files in plan and apply

A file is a [Platform IaC document](/platform-iac/cli/validate/#which-files-are-platform-iac-documents) if and only if its `apiVersion` is `vulnetix.com/v1` and its `kind` is one `vulnetix config kinds` lists. Three files have fixed paths:

| Path | Kind |
|---|---|
| `.vulnetix/ai-firewall.yaml` | `AiFirewallPolicy` |
| `.vulnetix/license-policy.yaml` | `LicensePolicy` |
| `.vulnetix/license-exceptions.yaml` | `LicenseExceptions` |

In v3, `config validate` reads them and `config plan` and `config apply` do not. From v4, plan and apply read them too, so a repository that keeps its AI Firewall policy or licence policy in these files will see them in its plans.

Before you upgrade a pipeline:

1. Run `vulnetix config plan` with v4 against a copy of the repository and read the plan.
2. If a well-known file also defines a kind that exists under `.vulnetix/config`, remove one. Defining a singleton kind in both places, or twice, is an error.
3. Plan with `--prune` off until the first plan is what you expect.

`LicenseExceptions` is not stored by the server yet. Its document is validated and reported with a note in the plan; apply sends nothing for it.

## config set, config get and ai-firewall

`vulnetix config set quality-gate` and `set eol-policy` already send a `QualityGate` document to the engine as manager `console`. From v4 the other imperative commands become engine aliases for their kinds, and `ai-firewall apply` and `export` become aliases for the `AiFirewallPolicy` kind. The aliases keep their flags and output. What to expect:

- An alias run makes the object `console`-managed. A later `config apply` from a repository is blocked with `managed_by_other` until the objects are moved to documents in one step.
- A credential that is not an owner or admin, such as a service account's ApiKey, cannot plan or apply. Use a config management token (`vmt_...`) in CI.

See [Imperative commands](/platform-iac/cli/imperative-commands/) and [AiFirewallPolicy](/platform-iac/kinds/ai-firewall-policy/). To move to documents, `vulnetix config export` writes the current state.

## GitHub Actions

| If your workflow uses | Do |
|---|---|
| `Vulnetix/cli@v3` or `Vulnetix/cli/<name>@v3` | Nothing. It keeps a v3 binary. |
| An exact `@v3.x.y` ref | Nothing. |
| `with: { version: latest }` or `install.sh` without `--version` | Pin `version: v3` first if you want to stay on v3, otherwise the first v4 release is installed. |

To move, change the ref to `@v4`. The `version` input then defaults to `v4`. Read [the v4 differences](#what-changes) first, because the CLI is the part that changes, not the action inputs.

## Install channel

```sh
curl -fsSL https://cli.vulnetix.com/install.sh | sh -s -- --version v3   # stay on v3
curl -fsSL https://cli.vulnetix.com/install.sh | sh -s -- --version v4   # move to v4
```

Homebrew, Scoop and the Nix flake follow the newest release overall, so after v4 ships they install v4. Pin the version there, or install with the script and `--version v3`, to stay on v3.
