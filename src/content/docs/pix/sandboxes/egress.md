---
title: Egress policy
description: How a Pix Sandbox decides each outbound request by hostname, the two modes, allow and deny rules with *. wildcards, rule order, and the hosts you cannot deny.
order: 3
sources: [website/sandbox-worker/src/egress.ts, website/sandbox-worker/src/gateways.ts, website/sandbox-worker/src/sandbox.ts, website/sandbox-worker/src/launch.ts, website/sandbox-worker/src/nix-extension.ts, website/sandbox-worker/src/db.ts, website/src/components/belai/BelaiSandboxEgress.vue, vdb-site/api/internal/handler/pix_sandbox_store.go, vdb-site/api/internal/handler/pix_sandbox_prefs.go, vdb-site/api/internal/handler/factory_sightings.go, vdb-site/api/internal/handler/factory_settings_store.go, saas/prisma/models/pix-sandbox.prisma, saas/prisma/migrations/20261007000001_add_pix_sandboxes/migration.sql]
checked: [website@ad775f3, vdb-site@1a06d67, saas@50cedf3]
updated: 02 Nov 2026
---

A Pix Sandbox's container starts with the internet off. Every HTTP and HTTPS request a process makes is intercepted and handed to the sandbox Worker's egress gateway, which reads **the hostname and nothing else**, decides, counts the request, and forwards it unchanged or refuses it. Headers and bodies are never read, except on the two model hosts the Worker answers itself (`api.typesafe.ai` for Jev and `api.cloudflare.com` for Workers AI). With no route out, other protocols and ports do not leave the container.

## Modes

| `egressMode` | A host with no decision is | Every request is |
|---|---|---|
| `allow_all_logged` | Allowed | Counted on the Egress tab |
| `deny_except_allow` | Refused | Counted, refusals included |

The mode is the sandbox draft's `egressMode`, or the product default when the draft has none. The product default is seeded as `allow_all_logged`; the sandbox's Egress tab shows the mode in force as "allow all, logged", "deny everything except allowed hosts" or "product default".

> [!CAREFUL] The Software Factory setting `pix.egressMode` does not set this today
> Settings lists `pix.egressMode` with a default of `deny_except_allow`, but sandbox settings are only kept in the settings document and reported as pending; the factory writes through only its own store. A sandbox follows its launch draft, then the product default, `allow_all_logged`. To deny by default, set **Egress** on the sandbox's Launch tab (or `machine.egress_mode` in a [launch configuration](/pix/sandboxes/launch-configurations/)) and relaunch.

## How a request is decided

The first rule that matches wins.

| Order | Rule | Result | Recorded reason |
|---|---|---|---|
| 1 | The hostname is not a DNS name with a letter in its last label (an IP literal, for example) | Refused | `bad_host` |
| 2 | A system host, or a host this launch needs | Allowed | `system` |
| 3 | A clone or install host, while the sandbox is cloning or installing | Allowed | `phase` |
| 4 | Your exact `deny` or `allow` for the hostname | That decision | `user_deny`, `user_allow` |
| 5 | Your most specific matching `*.` wildcard decision | That decision | `user_deny`, `user_allow` |
| 6 | The mode | `allow_all_logged`: allowed. `deny_except_allow`: refused. | `mode_allow`, `mode_deny` |

The hostname is lowercased and a trailing dot removed first. A refused request gets an empty `403`. If the gateway cannot read the sandbox's policy it answers `503`.

An exact host beats any wildcard. Between wildcards, the longest pattern wins, so `deny *.example.com` with `allow *.api.example.com` allows `v1.api.example.com` and refuses `www.example.com`.

> [!CAREFUL] You cannot deny the hosts in rules 2 and 3
> They are checked before your decisions. A `deny` on `www.vulnetix.com`, or a wildcard such as `*.github.com`, does not stop the sandbox syncing or cloning.

## Host patterns

A decision, and each entry of a launch configuration's `egress_allow`, is a DNS name or a wildcard, at most 253 characters:

```
^(\*\.)?[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)*\.[a-z][a-z0-9-]{0,61}$
```

| Pattern | Matches | Does not match |
|---|---|---|
| `registry.npmjs.org` | `registry.npmjs.org` | `npmjs.org`, `www.registry.npmjs.org` |
| `*.pythonhosted.org` | `files.pythonhosted.org`, `a.b.pythonhosted.org` | `pythonhosted.org` |
| `*.example.com` and `example.com` | Both together cover the apex and every subdomain | |

Only a leading `*.` is a wildcard; `api.*.com`, `*example.com` and a bare `*` are refused (`400 host must be a DNS name`). IP addresses and CIDR ranges cannot be written: the last label must start with a letter.

## Hosts that are always allowed

| Host | Why | When |
|---|---|---|
| `www.vulnetix.com` | `belai rc` sync | Always |
| `api.vdb.vulnetix.com` | The Vulnetix CLI, and the Package Firewall's sign-in check | Always |
| `guardrails.vulnetix.com` | The Vulnetix AI Firewall | Always |
| `packages.vulnetix.com` | The Package Firewall | Always |
| `api.typesafe.ai` | Jev, through the Worker's key-swapping gateway | Always |
| `api.together.xyz` | Tev1, when the launch's decision model is `tev1` | That launch |
| `flakehub.com`, `api.flakehub.com`, `cache.flakehub.com` | When the launch has a FlakeHub extension | That launch |
| `github.com`, `api.github.com`, `codeload.github.com`, `objects.githubusercontent.com` | Cloning repositories | While cloning |
| `cache.nixos.org`, `channels.nixos.org`, `github.com`, `codeload.github.com` | Installing packs and extensions | While installing |

The instance-metadata address `169.254.169.254` is answered by the Worker itself with the sandbox's own facts; it is listed as a system row.

## Decisions

Each host the sandbox reached is a row on the sandbox's **Egress** tab, with first and last seen, requests, refused requests and a decision:

| Decision | Resolve Platform label | Means |
|---|---|---|
| `allow` | Allow | Allowed whatever the mode |
| `deny` | Deny | Refused whatever the mode |
| `unset` | Default | Follows the mode |

- **Allow ahead of time.** Type a host or `*.domain` that has not been seen yet; it gets a row with your decision.
- **System rows** (the hosts above, marked `system`) cannot be changed: `409 this host is needed by the sandbox and cannot be changed`.
- The list holds up to 500 rows, system rows first, then most recently seen.
- Only an owner or admin of the organisation can change a decision.

> [!CAREFUL] A new decision takes effect at the next launch
> A decision is saved at once, but a running sandbox reads the decision list when it launches, and again only if its Durable Object restarts. No Resolve Platform or API action refreshes a running sandbox's decisions today. Relaunch the sandbox for a new allow or deny to apply. The mode, too, changes only at relaunch.

### From a launch configuration

When a sandbox's Launch tab is filled from a launch configuration, saving the draft writes an `allow` for each host in `machine.egress_allow` (up to 64), one request each. A host that is refused is reported (`Saved, but could not allow <host>`). Software bundles suggested on the Launch tab add their hosts the same way. A launch configuration cannot carry a `deny`.

## Software Factory events

| Event | Fires | Payload |
|---|---|---|
| `egress.seen` | The first time a non-system host is seen on a sandbox | `host`, `sandbox`, `mode`, `decision` (`blocked` or `allowed_logged`), `hits` |
| `egress.denied` | Each further 20 refused requests to one host | The same |

A [workflow](/software-factory/workflows/source-events/) can react to them, for example to research a new host and file a review card. An `allow` or `deny` you set is recorded as a decision on the host's [sighting](/software-factory/evidence/sightings/), and a review card that links to the Egress tab (`?host=<h>&decision=allow`) closes when you decide.

## API

| Method | Path | Body | Answer |
|---|---|---|---|
| GET | `/v1/belai/sandboxes/{id}/egress` | | `{hosts: [{host, firstSeenAt, lastSeenAt, hits, blockedHits, decision, system}]}` |
| PATCH | `/v1/belai/sandboxes/{id}/egress/{host}` | `{"decision": "allow"\|"deny"\|"unset"}` | The updated list |
| PUT | `/v1/belai/sandboxes/{id}/launch-config` | The draft with `egressMode` | `{config}` |

Times are milliseconds since the epoch. URL-encode a wildcard host (`%2A.pythonhosted.org`).

```bash
curl -X PATCH "https://www.vulnetix.com/api/site/v1/belai/sandboxes/$SANDBOX_ID/egress/%2A.pythonhosted.org" \
  -H "Authorization: Bearer $VULNETIX_SESSION_JWT" -H "Content-Type: application/json" \
  -d '{"decision": "allow"}'
```

| Status | Body `error` | Cause |
|---|---|---|
| `400` | `host must be a DNS name` | The host does not match the pattern |
| `400` | `decision must be allow, deny or unset` | |
| `403` | `only an owner or admin can change sandboxes` | |
| `404` | | Not your sandbox |
| `409` | `this host is needed by the sandbox and cannot be changed` | A system row |

Declaring the egress policy as a `vulnetix.com/v1` document (`SandboxEgressPolicy`) is planned; see [Platform IaC](/platform-iac/).
