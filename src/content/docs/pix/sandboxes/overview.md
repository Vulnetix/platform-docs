---
title: Pix Sandboxes
nav: Overview
description: What a Pix Sandbox is, the launch draft every relaunch builds from, how its fields override the product defaults, and the routes that read and write it.
order: 1
sources: [vdb-site/api/internal/handler/pix_sandbox_store.go, vdb-site/api/internal/handler/pix_sandbox_prefs.go, vdb-site/api/internal/handler/pix_sandbox_extensions.go, vdb-site/api/internal/handler/pix_sandbox_version_policy.go, vdb-site/api/internal/handler/pix_sandbox_provisioning.go, vdb-site/api/main.go, saas/prisma/models/pix-sandbox.prisma, website/sandbox-worker/src/launch.ts, website/sandbox-worker/src/packs.ts, website/src/pages/resolve/belai-hosts.vue]
checked: [vdb-site@1a06d67, saas@50cedf3, website@ad775f3]
updated: 02 Nov 2026
---

A Pix Sandbox is a Cloudflare container Vulnetix runs for you, one per purchase, running `belai rc` with your repositories cloned. It registers as a [Belai host](/software-factory/workforce/hosts-and-placement/) under the sandbox's own id and is online all month. Sizes, prices, repositories, Safe Harbour, maintenance windows, wakes and telemetry are on the factory's [Pix Sandboxes](/software-factory/workforce/pix-sandboxes/) page. This section covers what a sandbox is built from and what it may reach.

| Page | Covers |
|---|---|
| [Launch configurations](/pix/sandboxes/launch-configurations/) | The `launch` library item: a versioned, reusable set of items and machine settings to put on a sandbox or a host |
| [Egress policy](/pix/sandboxes/egress/) | The egress mode, the per-host allow and deny list with `*.` wildcards, and how each request is decided |

In the Resolve Platform: **Hosts** (`/resolve/belai-hosts`), tab **Pix Sandboxes** (the default) for a sandbox's Launch, Repositories and Egress tabs, and tab **Launch configs** (`?tab=launch`) for launch configurations.

## The launch draft

Each sandbox has one draft (`PixLaunchConfig`). A relaunch resolves it against the product defaults (`PixProductDefaults`, set by Vulnetix) and snapshots the result onto the launch. A field left `null` inherits the default. Saving the draft marks the sandbox `applyPending`; nothing changes on the running machine until it relaunches.

| Field | Values | Default when `null` |
|---|---|---|
| `packs` | Up to 32 pack ids, `^[a-z0-9][a-z0-9-]{0,31}$`. `null` inherits; `[]` means none. | The product's packs |
| `extensions` | Up to 64 extra Nix packages, `{name, registry, version, checksum?}` | `[]` |
| `imageDigest` | A digest-pinned image, `registry/path@sha256:<64 hex>`, never a tag | The product's pinned image |
| `egressMode` | `allow_all_logged`, `deny_except_allow` | The product default, seeded `allow_all_logged` |
| `webControls` | bool: `belai rc --web-controls` | `true` |
| `webGuardrailsOff` | bool: `--web-allow-guardrails-off`; needs `webControls` on | `false` |
| `webProjectSettings` | bool: `--web-project-settings` | `true` |
| `classifier` | `clef`, `jev`, `tev1` (Tev1 runs on your own Together key; without one the launch uses the product default) | `clef` |
| `provisioning` | `{agents, crews, schedules, registry, items}`: up to 32 agents, 16 crews, 128 items of kind `command`, `skill`, `prompt`, `mcp` or `hook` | none |
| `models` | Belai's default, fast and classifier models, provider and model names only | none |
| `versionPolicy` | `{strategy, pins}` (below) | none |
| `notes` | One line, at most 2,000 characters | `""` |

`jevDailyCap` is set by Vulnetix only (default 2,000); a tenant write that sends it gets `400 the Jev cap is set by Vulnetix`. Provider keys have their own route and are not part of a draft save.

### Packs

| Pack id | Installs |
|---|---|
| `python` | `python3`, `pyright`, `ruff`, `python-lsp-server`, `pytest` |
| `node` | `nodejs`, `typescript-language-server`, `yarn`, `pnpm` |
| `go` | `go`, `gopls` |
| `rust` | `cargo`, `rustfmt`, `rust-analyzer` |
| `java` | `jdk`, `jdt-language-server` |
| `ruby` | `ruby`, `ruby-lsp`, `solargraph` |
| `c` | `clang`, `clang-tools` |
| `dotnet` | `dotnet-sdk`, `csharp-ls` |
| `zig`, `dart`, `bash` | `zig` and `zls`; `dart`; `bash-language-server` |
| `screenshot` | `chromium`, for the loopback-only Screenshot tool |
| Cloud CLIs | `aws`, `azure`, `gcloud`, `kubectl`, `eksctl`, `flyctl`, `doctl`, `linode`, `heroku`, `netlify`, `stripe`, `twilio`, `circleci`, `bitwarden` |

Packs install from the image's pinned nixpkgs, signed cache closures only.

### Extensions

| Key | Rule |
|---|---|
| `registry` | `nixpkgs` (default when empty), `nixhub` or `flakehub` |
| `name` | A nixpkgs attribute (`^[A-Za-z0-9_][A-Za-z0-9_.-]{0,127}$`), or for FlakeHub `org/flake` with an optional `#output` |
| `version` | Empty for nixpkgs means the image's pinned revision. Required for `nixhub` and `flakehub`. `^[0-9A-Za-z][0-9A-Za-z._+-]{0,63}$`. |
| `checksum` | Optional SRI narHash, `sha256-<43 base64 chars>=`. A launch whose installed store path differs fails. |

A bare string such as `"ripgrep"` still reads as `{name: "ripgrep", registry: "nixpkgs"}`. A FlakeHub extension adds `flakehub.com`, `api.flakehub.com` and `cache.flakehub.com` to the hosts that launch always allows.

### Version policy

```json
{"strategy": "safest", "pins": {"nodejs": "22.11.0"}}
```

`strategy` is `safest`, `stable`, `latest`, `rolling` or `pinned`; `pins` maps up to 100 nixpkgs attributes to versions, and `pinned` needs at least one. The policy is advisory: nixpkgs cannot install one package at an older version, so the launch records it and reports each installed package that does not match. A mismatch never fails a launch. In a draft, an absent `versionPolicy` keeps the stored one and `null` clears it.

## API

All under `/v1/belai/sandboxes`, with a signed-in console session. Reads need a member of the organisation; writes need an owner or admin, or answer `403 only an owner or admin can change sandboxes`.

| Method | Path | Body or answer |
|---|---|---|
| GET | `/{id}/launch-config` | `{config, defaults}`: the draft and the product defaults a tenant may see |
| PUT | `/{id}/launch-config` | The whole draft. Answers `{config}`. A `400` carries `{"error": "<reason>"}`. |
| GET | `/{id}/egress` | `{hosts: [...]}`; see [Egress policy](/pix/sandboxes/egress/#api) |
| PATCH | `/{id}/egress/{host}` | `{"decision": "allow"\|"deny"\|"unset"}` |
| PUT | `/{id}/providers` | Provider keys and provider sets every launch installs |

A request body is at most 64 KiB. Relaunching is a sandbox Worker route the Resolve Platform calls, not one of these.
