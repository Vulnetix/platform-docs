---
title: Sightings and detections
nav: Sightings
description: The record of each new package, AI capability and outbound host the firewalls saw, its state, the research gathered on it, and the review card that decides it.
order: 9
sources: [vdb-site/docs/factory.md, vdb-site/api/internal/handler/factory_sightings.go, vdb-site/api/internal/handler/factory_sighting_facts.go, vdb-site/api/internal/handler/factory_links.go]
checked: [vdb-site@284f1d6]
updated: 28 Oct 2026
---

A **sighting** is something a firewall saw for the first time and nobody has decided about yet: a package, an AI capability (a client, MCP server, tool or skill), or an outbound host from a sandbox. Sightings are what [firewall triggers](/software-factory/workflows/source-events/) fire on.

## States

| State | Means |
|---|---|
| `open` | Nobody has decided |
| `allowed` | A rule allows it |
| `denied` | A rule denies it |
| `covered` | A rule already covered it when it was seen. It fired nothing. |
| `expired` | A hold timed out |

One sighting is kept per source, scope (organisation or repository), repository and key. Many first sightings at once from one source and repository are grouped into a batch.

## Research

Before its first run starts, a sighting gets research from public sources, kept for a day: for a package, the Vulnetix vulnerability database, deps.dev and the registry; for an AI capability, the MCP Registry and the gateway's inventory; for a host, DNS, network, registration age, first certificate and the sandbox's own request counts. See [Source events](/software-factory/workflows/source-events/) for the full list.

## The review card

A workflow that answers a sighting files a review card. The card shows the sighting, its facts and its research, and ends with **Decide in the Resolve Platform**: Allow, Deny and Manage links.

| Source | The link opens |
|---|---|
| Package | the Package Firewall's curation, with the package and version filled in |
| AI capability | the AI Firewall's MCP, tools, skills or clients list, with the capability filled in |
| Egress host | the sandbox's egress view on Pix Sandboxes, with the host filled in |

Nothing is written until you confirm on that page. When you add the rule, the sighting becomes allowed or denied, and every card its run filed moves to done with a note naming the rule.

## API

| Method | Path |
|---|---|
| GET | `/v1/factory/sightings?source=&state=&card=&q=` (most recently seen first, up to 200; with `card`, each carries its research) |
| POST | `/v1/factory/sightings/lookup` with `{source, keys}` (up to 200 keys, one sighting each) |

The firewall pages call the lookup for the rows on screen, to show which have a sighting and a card.
