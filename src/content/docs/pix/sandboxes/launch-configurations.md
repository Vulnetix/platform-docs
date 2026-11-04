---
title: Launch configurations
description: The launch library item, also called a launch profile. Every field, the limits and validation messages, how one is saved and versioned, and what applying it does to a Pix Sandbox and to your own host.
order: 2
sources: [vdb-site/api/internal/handler/belai_items_validate_launch.go, vdb-site/api/internal/handler/belai_items_kinds.go, vdb-site/api/internal/handler/belai_items.go, vdb-site/api/internal/handler/belai_items_validate.go, vdb-site/api/internal/handler/belai_library_settings.go, vdb-site/api/internal/handler/belai_provider_keys.go, vdb-site/api/internal/handler/marketplace_plan.go, vdb-site/api/internal/handler/pix_sandbox_store.go, vdb-site/api/internal/handler/pix_sandbox_extensions.go, vdb-site/api/internal/handler/pix_sandbox_version_policy.go, website/src/components/belai/belai-launch.ts, website/src/components/belai/belai-launch-provisioning.ts, website/src/components/belai/BelaiLaunchApply.vue, website/src/components/belai/BelaiSandboxLaunch.vue, website/src/components/belai/BelaiLaunchConfigs.vue]
checked: [vdb-site@1a06d67, website@ad775f3]
updated: 02 Nov 2026
---

A launch configuration is a named, versioned JSON document in your library, of kind `launch`. It lists library and registry items, each pinned to a version or following the latest, the machine settings a Pix Sandbox launches with, and the provider keys to send. Build one once and put it on any number of sandboxes or hosts.

It lives only in the library. No host ever holds one: a host cannot report, back up, sync or be asked to install a `launch` item. Applying it turns into ordinary requests: a draft for a sandbox, install requests for a host.

Resolve Platform: **Hosts › Launch configs** (`/resolve/belai-hosts?tab=launch`). Pick a configuration to edit it, see its versions, and apply it. Saving makes a new version and never touches a machine.

## Example

```json
{
  "name": "payments-node",
  "description": "Node service work: release-notes skill, the payments agent, npm and PyPI egress",
  "items": [
    {"kind": "skill", "id": "0b5c2f4e-8d1a-4c3e-9f27-6a1d2e3b4c5d", "version": "latest"},
    {"kind": "profile", "id": "7e9a1c3b-2d4f-4a6b-8c0d-1e2f3a4b5c6d", "version": "202610281415"},
    {"kind": "crew", "id": "c1d2e3f4-a5b6-4c7d-8e9f-0a1b2c3d4e5f", "version": "latest", "source": "registry", "name": "triage-crew"}
  ],
  "keys": ["anthropic-prod"],
  "machine": {
    "packs": ["node", "python"],
    "extensions": [{"name": "ripgrep", "registry": "nixpkgs", "version": ""}],
    "version_policy": {"strategy": "safest"},
    "egress_mode": "deny_except_allow",
    "egress_allow": ["registry.npmjs.org", "*.pythonhosted.org", "pypi.org"]
  }
}
```

## Fields

Only the keys listed are accepted; any other key is refused as `<where>: unknown field "<key>"`.

### Document

| Key | Required | Type | Rule |
|---|---|---|---|
| `name` | yes | string | `^[a-z0-9][a-z0-9._-]{0,63}$`: lowercase letters, digits, `.`, `_`, `-`, starting with a letter or digit, 64 characters at most. It names the library item: saving a document whose name is already in the library adds a version to that item. |
| `description` | no | string | One line, at most 300 bytes. Absent: the library shows `N items` (`1 item`). |
| `items` | yes | list | At most 128 entries. May be empty. |
| `keys` | no | list of strings | At most 16 provider slugs, `^[a-z0-9][a-z0-9._-]{0,63}$`, each once. The stored keys for these providers are sent to the machine. |
| `machine` | no | object | Sandbox machine settings. Ignored when applied to your own host. |

The whole canonical document is at most 16 KiB.

### items[]

| Key | Required | Rule |
|---|---|---|
| `kind` | yes | `skill`, `prompt`, `command`, `hook`, `process`, `mcp`, `repo`, `budget`, `provider`, `rewrite`, `profile` (an agent) or `crew` |
| `id` | yes | A library item id (a UUID). For a registry item, the registry's id (lowercase UUID). |
| `version` | yes | `latest`, or one library version, 12 digits `YYYYMMDDHHMM`. A registry item must be `latest`. |
| `source` | no | Absent for the library, or `registry` for an item of the public registry |
| `name` | no | Only for a registry item: its registry name, `^[a-z0-9][a-z0-9._-]{0,63}$`. A label for the editor; nothing installs by it. |

Each `source`, `kind` and `id` combination appears once. Ids are not looked up when you save; an item deleted from the library later is reported when the configuration is applied.

**Registry items.** Only `skill`, `prompt`, `command`, `hook`, `profile` and `crew` can come from the registry, at most 32 per configuration. A registry item is not copied into your library: each sandbox launch installs the registry's latest version at that moment, unless your library has an item of the same name.

### machine

| Key | Rule | Absent means |
|---|---|---|
| `packs` | Up to 32 pack ids, `^[a-z0-9][a-z0-9-]{0,31}$`, each once | Keep the product's packs. Present, even `[]`, replaces them. |
| `extensions` | Up to 64 `{name, registry, version, checksum?}`, each registry and name once. Same rules as a [sandbox extension](/pix/sandboxes/overview/#extensions). A bare string is a nixpkgs attribute. | No extensions |
| `version_policy` | `{strategy, pins?}`, as a [sandbox version policy](/pix/sandboxes/overview/#version-policy). `null` is refused: leave the key out for no policy. | The sandbox keeps its own policy |
| `egress_mode` | `inherit`, `allow_all_logged` or `deny_except_allow` | `inherit`: keep the sandbox's own mode |
| `egress_allow` | Up to 64 hosts, each a DNS name or `*.` wildcard of at most 253 characters (the [egress host pattern](/pix/sandboxes/egress/#host-patterns)), each once | No hosts are allowed |

When saved from the Resolve Platform, empty optional parts are left out so two equal configurations hash alike: no empty `description`, `keys` or `extensions`, no `egress_mode: inherit`, and version pins sorted.

## Validation messages

A refused save answers `400` with `{"error": "invalid launch", "detail": "<message>"}`. The messages:

| Detail | Cause |
|---|---|
| `name is required` / `name "<x>" is not valid: start with a lowercase letter or digit, ...` | Missing or badly formed `name` |
| `launch.description must be one line` | A newline in `description` |
| `launch.items is required` | No `items` key |
| `launch.items has N entries; the most is 128` | Too many items (same form for `keys`, `packs`, `extensions`, `egress_allow`) |
| `launch.items[i].kind must be skill, prompt, command, hook, process, mcp, repo, budget, provider, rewrite, profile or crew` | Unknown kind |
| `launch.items[i].source must be registry, or absent for the library` | Any other source |
| `launch.items[i].id must be a library id` / `must be a registry id` | Not a UUID of the right form |
| `launch.items[i].version must be latest or a library version` | Not `latest` or 12 digits |
| `launch.items[i].version must be latest for a registry item` | A pinned registry item |
| `launch.items[i].kind must be skill, prompt, command, hook, profile or crew for a registry item` | A registry item of another kind |
| `launch.items[i].name is only for a registry item, and is its registry name` | `name` on a library item, or a bad name |
| `launch.items: at most 32 registry items` | Too many registry items |
| `launch.items[i]: that <kind> is already in the configuration` | A duplicate |
| `launch.keys[i] must be a provider slug` / `launch.keys[i]: <slug> is already listed` | Bad or duplicate key |
| `launch.machine.egress_mode must be inherit, allow_all_logged or deny_except_allow` | Unknown mode |
| `launch.machine.packs[i] is not valid` / `launch.machine.egress_allow[i] is not valid` | Bad pack id or host |
| `launch.machine.extensions[i]: <reason>` | An extension rule, for example `a nixhub extension needs a version` |
| `launch.machine.version_policy must not be null: leave it out for no policy` | `null` policy |
| `launch.machine.version_policy: <reason>` | For example `the pinned strategy needs at least one pin` |
| `the document is N bytes; the most is 16384` | Over 16 KiB |

Other answers: `409` when a new version names a different item's name (`an item with that name is already in the library`) or the library already holds 200 launch configurations (`the library holds the most items of this kind it may`); `413 invalid or oversized body` when the request is not JSON or is too large; `404` for an unknown kind.

## Versions

Every save is a new version, numbered by time as `YYYYMMDDHHMM`. A configuration has versions, rewind and the keep-N trim like every library item: the library keeps the newest **3** versions of each item by default, settable from 1 to 50 (`PUT /v1/belai/library/settings {"keepVersions": N}`). The latest version cannot be deleted.

Items inside a configuration follow the same rule: `latest` means the item's latest library version at the moment you apply, and a pin stays on that version.

## Applying it

Applying always uses the configuration's saved latest version, never an unsaved draft.

### To a Pix Sandbox

The configuration opens in the sandbox's **Launch** tab, which fills its draft for you to review. Nothing is saved until you press **Save draft**; a relaunch then builds the machine from it on a fresh disk.

| From the configuration | Goes to |
|---|---|
| `machine.packs` | The draft's `packs` (absent: `null`, inherit) |
| `machine.extensions` | The draft's `extensions` |
| `machine.egress_mode` | The draft's `egressMode` (`inherit`: `null`) |
| `machine.version_policy` | The draft's `versionPolicy`, only when the configuration sets one |
| `machine.egress_allow` | An `allow` decision for each host on the sandbox, written when the draft is saved |
| `profile` and `crew` items | `provisioning.agents` and `provisioning.crews`, each pinned to the version it follows now |
| `command`, `skill`, `prompt`, `hook`, `mcp` items | `provisioning.items`, keeping the configuration's pin (`latest` is read at launch) |
| Registry items | `provisioning.registry`, installed at each launch at the registry's latest |
| `repo` items | Skipped: a sandbox clones only the repositories on its Repositories tab |
| `process`, `budget`, `provider`, `rewrite` items | Not part of the draft. Install them from the Launch configs tab once the host is online. |
| The configuration's name and version | The draft's `notes`: `launch config <name>, version <YYYYMMDDHHMM>` |

The draft keeps the sandbox's own web flags and decision model. An agent, crew or item the library no longer has is listed as not part of the draft.

### To your own host

Each item is sent to the host as an ordinary install request, in the editor's order (repositories, agents and crews, hooks, skills and the rest, then providers, budgets and rewrites). The host answers each one and may refuse it. The `machine` part is not used; your machine stays as it is. Registry items are skipped, because they are installed when a sandbox launches.

Provider keys are sent only when you tick **Also send the keys for ...**.

> [!WHY] Why a configuration never lives on a host
> A host holds only what it runs. Kept in the library, a configuration has one version history and rewind like every other item, and the next apply to any machine uses the same saved version. A host cannot report, push or back one up, so nothing on a machine can change what other machines are built from.

## API

| Method | Path | Body | Answer |
|---|---|---|---|
| GET | `/v1/belai/library/items/launches` | | `{items}` |
| POST | `/v1/belai/library/items/launches` | `{"body": <document>}` | `201` new item, `200` new version of the item with that name |
| GET | `/v1/belai/library/items/launches/{id}` | | The item and its versions |
| POST | `/v1/belai/library/items/launches/{id}/versions` | `{"body": <document>}` | A new version; the document's `name` must be the item's |
| GET | `/v1/belai/library/items/launches/{id}/versions/{v}` | | One version |
| DELETE | `/v1/belai/library/items/launches/{id}/versions/{v}` | | Deletes a version other than the latest |
| POST | `/v1/belai/library/items/launches/{id}/rewind` | `{"version": "<v>"}` | Makes an old version the latest |
| DELETE | `/v1/belai/library/items/launches/{id}` | | Deletes the configuration |
| GET | `/v1/belai/library/item-names/check?kind=launch&name=<n>` | | Whether a name is free |

`{kind}` takes `launches` or `launch`. `body` is the JSON object itself, not a string. The Resolve Platform calls these at `https://www.vulnetix.com/api/site` with its session token as a bearer token:

```bash
curl -X POST "https://www.vulnetix.com/api/site/v1/belai/library/items/launches" \
  -H "Authorization: Bearer $VULNETIX_SESSION_JWT" -H "Content-Type: application/json" \
  -d '{"body": {"name": "payments-node", "items": [], "machine": {"packs": ["node"], "egress_allow": ["registry.npmjs.org"]}}}'
```

Declaring launch configurations as `vulnetix.com/v1` documents (`SandboxLaunchProfile`) is planned; see [Platform IaC](/platform-iac/).
