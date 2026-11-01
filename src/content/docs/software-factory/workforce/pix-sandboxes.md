---
title: Pix Sandboxes
description: The machines Vulnetix runs for your factory. Sizes, repositories, egress, package versions and Safe Harbour, extensions, launch configurations, maintenance windows, wakes, telemetry and usage.
order: 7
sources: [belai/docs/pix-sandbox.md, website/sandbox-worker/docs/pricing.md, website/sandbox-worker/docs/factory-wake.md, vdb-site/docs/pix-sandbox-safe-harbour.md, vdb-site/api/internal/handler/pix_sandbox_store.go, vdb-site/api/internal/handler/pix_sandbox_provisioning.go]
checked: [belai@35506b9, website@a31d470, vdb-site@284f1d6]
updated: 28 Oct 2026
---

A Pix Sandbox is a machine Vulnetix runs for your account: one Cloudflare container per purchase, running `belai rc` with your repositories checked out. It is a [host](/software-factory/workforce/hosts-and-placement/) like any other, but nobody has to keep it running. The Pix Sandboxes page (`/resolve/belai-hosts`) manages them.

## Sizes

| Size | vCPU | Memory | Disk | Price a month |
|---|---|---|---|---|
| `small` | 1 | 4 GiB | 20 GB | $85 |
| `medium` | 2 | 6 GiB | 20 GB | $180 |
| `large` | 4 | 12 GiB | 20 GB | $350 |

`pix.size` (default `medium`) is the size the next launch uses. Each size runs one web session per vCPU and 7 agents per vCPU. The sandbox runs all month, so `belai rc` is always online to take work.

## Repositories

Add repositories from the Repos page (**Add to Pix Sandbox**) or the sandbox's own page. Each is cloned into the sandbox, through your GitHub App installation (`app`) or as a public repository (`public`). The sandbox works only on the repositories it has; it never clones on demand for a step.

## Egress

Every outbound request from the sandbox goes through an egress gateway.

| `pix.egressMode` | Means |
|---|---|
| `deny_except_allow` | Only hosts you allowed. The default. |
| `allow_all_logged` | Everything, with every request logged |

Each host the sandbox reached has a decision: `allow`, `deny` or `unset`. The sandbox page's Egress view lists them with request counts. A new host can [trigger a workflow](/software-factory/workflows/source-events/) that researches it and files a review card.

## Package versions and Safe Harbour

`pix.versionPolicy` decides which version of each package a launch installs:

| Policy | Picks |
|---|---|
| `safest` | The highest stable release that Safe Harbour clears (no known vulnerability or exploit). The default. Never a pre-release. |
| `stable` | The cleared stable release closest to the one the sandbox runs |
| `latest` | The highest cleared stable release |
| `rolling` | Every non-malware version from the release day of the highest version, vulnerable ones included |
| `pinned` | The versions you pinned |

The sandbox's page shows, above its tabs, whether the versions the current launch installed are the ones to run (the Trust tab is the image's proof: checksums, SBOM and the evidence pack). **Check again** asks again, at most once a minute.

## Extensions and packs

`pix.extensionMode` decides what can be added to the sandbox's image: `packs_only` (curated packs, the default) or `any_indexed` (any indexed package). Library items installed on the sandbox are of kind `command`, `hook`, `mcp`, `prompt` or `skill`.

## Launch configurations

A launch configuration is a named set of library items, each pinned to a version or following the latest, plus the machine settings a sandbox launches with, and the provider keys to send. It lives in your library with versions like every other item. Applying it puts the machine settings in the sandbox's next launch and installs the items. A launch configuration is never stored on a host.

```json
{ "name": "payments team", "description": "...",
  "items": [ { "kind": "skill", "id": "...", "version": "latest", "source": "library", "name": "release-notes" } ],
  "keys": ["anthropic-prod"],
  "machine": { "packs": ["node"], "extensions": [], "version_policy": "safest", "egress_mode": "inherit", "egress_allow": ["registry.npmjs.org"] } }
```

- An item's `kind` is one of `skill`, `prompt`, `command`, `hook`, `process`, `mcp`, `repo`, `budget`, `provider`, `rewrite`, `profile` or `crew`. Skills, prompts, commands, hooks, agent profiles (`profile`) and crews can also come from the public registry.
- `egress_mode` is `inherit` (keep the sandbox's own), `allow_all_logged` or `deny_except_allow`. `egress_allow` lists up to 64 hosts.
- A configuration holds up to 128 items and 16 KiB.

## Settings that wait for the next launch

Size, egress mode and version policy apply at the next launch. After you save them, Settings lists them as pending.

## Reserve for your own sessions

`pix.reservePercent` (20% by default) keeps part of the built-in allowance for your own sessions, so factory work cannot use it all. It is the same value as the reserve on the Budgets page.

## The classifier

`pix.classifier` is the sandbox's own security classifier: `clef` (the default) or `jev`, or `tev1`. Its calls count against `pix.jevDailyCap` (2,000 a day), shared with the factory's decisions.

## Maintenance windows

`pix.maintenance` sets when the sandbox may be updated and restarted, for example Sundays 02:00 to 04:00 in your timezone. During the window the factory starts no new step, and a sandbox whose image is behind drains its work before it updates. See [Holds and blackouts](/software-factory/control/holds-and-blackouts/).

## Wakes

When a factory run needs a sandbox that has failed, crashed or gone silent, the factory asks for it to be relaunched. A sandbox is woken at most 3 times an hour, and a request expires after an hour. **A sandbox a person stopped is never woken**: the step waits and says who stopped it.

## Telemetry

A sandbox can send its OpenTelemetry `logs` and `metrics` to your own collector, set on its page. Header values come from named environment variables, and these headers cannot be set because the sandbox sets them itself or they change how a request is framed: `host`, `content-length`, `content-type`, `connection`, `transfer-encoding`, `upgrade`, `te`, `trailer` and `expect`.

## Usage

The sandbox's usage lists each session as `running`, `stopping`, `stopped`, `ended` or `lost`, with the built-in model tokens it used against your allowance. The sandbox's event log has entries for the `user` and entries for the `admin` audience, which only Vulnetix administrators see.

> [!WHY] Why a sandbox runs all month
> `belai rc` has to be online to take a dispatch the moment a workflow needs it. Memory and disk cost the same idle or busy, and CPU is billed only when agents use it, so keeping it up costs little more than starting it on demand, and nothing waits for a boot.

## API

| Method | Path |
|---|---|
| GET | `/v1/belai/sandboxes`, `/v1/belai/sandboxes/{id}` |
| PATCH | `/v1/belai/sandboxes/{id}` |
| POST, PATCH, DELETE | `/v1/belai/sandboxes/{id}/repos`, `/repos/{repoId}` |
| GET, PATCH | `/v1/belai/sandboxes/{id}/egress`, `/egress/{host}` |
| GET, POST | `/v1/belai/sandboxes/{id}/safe-harbour` |
| GET, PUT | `/v1/belai/sandboxes/{id}/launch-config` |
| PUT | `/v1/belai/sandboxes/{id}/maintenance-window` |
| PUT | `/v1/belai/sandboxes/{id}/providers`, `/telemetry` |
| GET | `/v1/belai/sandboxes/{id}/events`, `/permission-offers`, `/teleports` |
| GET | `/v1/belai/sandboxes/usage`, `/usage/stats`, `/builtin-usage`, `/repositories` |
| GET | `/v1/belai/sandboxes/lookup/owners`, `/lookup/repositories` |

Vulnetix administrators manage sandboxes and defaults under `/v1/admin/pix-sandboxes`.
