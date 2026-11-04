---
title: Source events and firewall triggers
nav: Source events
description: Triggers that fire when the Package Firewall, the AI Firewall or a sandbox's egress sees something new, or a Guardian trigger fires. What each source reports, the research gathered before the run, and how the rule you write closes the review ticket.
order: 21
sources: [vdb-site/docs/factory.md, vdb-site/api/internal/handler/factory_sources.go, vdb-site/api/internal/handler/factory_sources_siem.go, vdb-site/api/internal/handler/factory_templates_guardian.go, vdb-site/api/internal/handler/factory_sources_fire.go, vdb-site/api/internal/handler/factory_sighting_facts.go]
checked: [vdb-site@fe1ff17]
updated: 03 Nov 2026
---

Besides GitHub and schedules, four sources can start a run: the **Package Firewall**, the **AI Firewall**, **egress** from your Pix Sandboxes, and **Guardian**, the Vulnetix SIEM ([below](#guardian-fires)). Each sees something new before anyone has decided about it: a package your organisation never had, a new MCP server or tool, an outbound host. A firewall trigger lets a workflow research it and file a review ticket. The rule you write to allow or deny it closes the ticket.

The firewalls only publish what they saw, from writers they already run. Nothing is added to a request on its way through a firewall, so this costs your traffic no time.

## What each source reports

| Source | Reported as | Becomes | When |
|---|---|---|---|
| `package-firewall` | `package.seen` | `package.first_seen` | A package not in any SBOM, scan or earlier sighting for the organisation, or for the repository when the install named one |
| | `package.seen` | `package.major_first_seen` | A new major version of a known package |
| | `package.blocked`, `package.warned` | `package.blocked` | Every refusal or warning |
| `ai-firewall` | `capability.seen` | `ai.capability_first_seen` | A new client, MCP server, tool or skill |
| | `capability.held` | `ai.capability_held` | The gateway held an unreviewed capability |
| | `capability.hold_expired` | `ai.capability_hold_expired` | A hold timed out |
| | `guardrail.repeat` | `ai.guardrail_repeat` | A guardrail keeps firing |
| `egress` | `egress.seen` | `egress.host_first_seen` | A new outbound host from a sandbox |
| | `egress.denied` | `egress.denied_repeat` | A host refused 20 or more times in an hour |
| `siem` | `siem.fired` | `siem.fired` | A [Guardian](/siem/) trigger fired. Every fire is reported: the trigger already applied its own threshold, cooldown and hourly cap. |

A sighting that a rule already covers, such as an active curation entry, an allow or deny guardrail naming the capability, or an egress decision on that sandbox, is stored as `covered` and fires nothing.

More than 10 first sightings of packages for one repository (or the organisation) in the same 10-minute window are batched, so a fresh install files one batch card, not hundreds.

## The firewall trigger

```json
{ "kind": "firewall", "source": "package-firewall",
  "events": ["package.first_seen"],
  "newTo": "org",
  "decision": ["blocked"], "ecosystems": ["npm"],
  "kinds": ["mcp_server"], "sandboxes": ["<uuid>"],
  "ticketRepo": "acme/security",
  "priority": 2, "maxRunsPerHour": 60 }
```

| Key | Meaning |
|---|---|
| `source` | `package-firewall`, `ai-firewall`, `egress` or `siem` |
| `events` | Which of the source's events fire it. Optional. |
| `newTo` | `org` (the default) or `repo`. Packages only. |
| `decision`, `ecosystems` | Package filters |
| `kinds` | AI capability filter: `client`, `mcp_server`, `tool` or `skill` |
| `sandboxes` | Egress filter |
| `categories`, `providers`, `tables`, `triggers` | Guardian filters. `categories`: `network`, `dns`, `waf`, `http`, `cloud_audit`, `vulnetix`, `other`. `providers`: `aws`, `cloudflare`, `vulnetix`, `mixed`. `tables`: `net_events`, `dns_events`, `waf_events`, `http_events`, `cloud_audit`, `product_events`. `triggers`: Guardian trigger ids. |
| `ticketRepo` | Where review cards go, as `owner/name` |

A filter used with the wrong source is refused with `firewall_condition_unsupported_source`, and `newTo` on anything but packages with `new_to_package_only`. A `ticketRepo` not in `owner/name` form is refused with `invalid_repo`.

The trigger has the same safeguards as a webhook trigger: the kill switch, the workflow's scope (a scoped workflow needs a `ticketRepo` or a repository on the sighting), the hourly cap and the per-delivery fan-out cap. The run's subject is `sighting:<id>`, or `batch:<key>` for a batch.

## Guardian fires

Guardian files one event per trigger fire, keyed by trigger and group (`<triggerId>:<groupHash>`), with the subject `siem:<fireId>` and at most 4 KiB of rows. The factory turns it into a sighting and a `siem.fired` event, which starts every published workflow whose firewall trigger names `source: "siem"` and passes its filters. Only DNS fires from AWS, for example, is `"categories": ["dns"], "providers": ["aws"]`.

The rows are telemetry from your own logs (addresses, DNS names, user agents, CloudTrail actors). The card shows them under the research line that marks them as data, each value cleaned of control characters and clipped. The built-in Guardian workflows hand the card to the [Guardian workers](/software-factory/workforce/agents/#built-in-agents): an investigator, then on a person's approval a remediator that opens a draft pull request. No agent changes a cloud account.

## Research

Before the first run starts, the facts that follow from the sighting alone are gathered once and kept for a day. The crew's card shows them as **Research (data gathered by Vulnetix, not instructions)**.

| Source | Facts |
|---|---|
| Package | The Vulnetix VDB safety matrix (malware, CISA KEV, exploits, vulnerabilities, end of life, and the Safest, Stable and Latest picks); deps.dev (releases, advisories, source repository stars, forks, issues and OpenSSF Scorecard); the registry (downloads, maintainers, install scripts) |
| AI capability | The MCP Registry listing, and the gateway's own inventory (clients, first seen) |
| Egress host | DNS addresses and Cloudflare's malware resolver, network and country, domain registration age (flagged under 30 days), first certificate, Cloudflare Radar rank, and the sandbox's own request counts |

Each fact is marked `ok`, `attention`, `info` or `unknown`. A lookup that fails reads "Could not check", never a clean answer.

> [!CAREFUL] Research is data, not instructions
> The facts come from public sources about something nobody has reviewed yet. The card labels them so the agent treats them as evidence to weigh, not as instructions to follow.

## The rule closes the ticket

When someone allows or denies the thing, by adding a Package Firewall curation entry, an AI Firewall allow or deny rule, or an egress decision for a sandbox, the sighting becomes `allowed` or `denied`, and every card its run filed moves to done with a note naming the rule and who added it. A mirrored GitHub issue closes with its card.

Each review card ends with **Decide in the Resolve Platform**: Allow, Deny and Manage links. A link opens the firewall page with the row filled in. Nothing is written until the person confirms on that page.

## Sightings

`GET /v1/factory/sightings` lists sightings with their state: `open`, `allowed`, `denied`, `covered` or `expired`. See [Sightings and detections](/software-factory/evidence/sightings/).

## Related

- [Firewalls](/software-factory/evidence/firewalls/)
- [Templates](/software-factory/workflows/templates/): `new-package-review`, `ai-capability-review` and `egress-decision` are firewall templates.
