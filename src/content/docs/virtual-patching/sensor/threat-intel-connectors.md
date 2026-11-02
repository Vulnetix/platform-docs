---
title: Threat intel connectors
description: Connect a threat intelligence provider once, then load its streams or collections as org feeds that sensors use. What each provider needs, and what Vulnetix fetches from it.
order: 7
nav: Threat intel connectors
sources: [vdb-site/docs/sensor-feeds-api.md, vdb-site/api/internal/handler/sensor_feed_connectors.go, vdb-site/api/internal/handler/sensor_feeds.go]
updated: 02 Nov 2026
---

A connector holds one provider's key on the site. From it you load streams or collections, and each one becomes an [org feed](/virtual-patching/sensor/feeds/#org-feeds) with reference `org:<uuid>` that any profile in the org can pick. Sensors fetch the parsed list from the site with their own credential.

> [!WHY] Keys stay on the site
> The provider key is sealed with KMS when you save it and is never returned by any route, shown in the console, or sent to a device. A sensor only ever receives the indicator list. The key is sent only to the connector's own host, pagination links included.

Indicators from a connector report and never block, like every other `org:` feed ([why](/virtual-patching/sensor/feeds/#signed-feeds-block-indicator-lists-report)).

## Connect a provider

Creating, editing and deleting a connector needs an org owner or admin.

1. Open **Integrations** (`/resolve/integrations`) and the **Threat intelligence** category.
2. Pick the provider card, paste the key, and fill in the URL where the provider needs one.
3. Load a stream or collection. Each one you load becomes an org feed.
4. In the profile editor's feed picker, turn the new feed on under **Connected providers**.

A connector's status reads **Working** when the last fetch through it succeeded, **Failing** with the error, or **Not used yet**. Leaving the key empty when you edit a connector keeps the stored one. The provider cannot be changed after creation. Deleting a connector deletes the org feeds made from it and removes them from every profile. Connector writes answer `503` while the site has no KMS key configured.

Each fetch reads at most 100 pages or 250,000 indicators. The site caches the result for 15 minutes, as for every [indicator list](/virtual-patching/sensor/feeds/#limits-and-caching).

## feedly

Feedly Threat Intelligence.

| | |
|---|---|
| Provider value | `feedly` |
| You need | A Feedly Enterprise API token, sent as `Authorization: Bearer` |
| Streams | Entered by id: the `enterprise/...` stream id of a Folder, Web Alert or Board, from its URL in Feedly. The connector does not list streams. |
| Vulnetix fetches | `GET https://api.feedly.com/v3/enterprise/ioc?streamId=<id>`, a STIX 2.1 bundle, following `continuation` |
| Covers | IPs, domains, URLs, file hashes |

## abusech

abuse.ch: URLhaus, ThreatFox and MalwareBazaar. abuse.ch retired the anonymous URLhaus hostfile and ThreatFox CSV export, which is why those two are [unavailable](/virtual-patching/sensor/feeds/#unavailable) in the catalog.

| | |
|---|---|
| Provider value | `abusech` |
| You need | A free Auth-Key from the [abuse.ch Authentication Portal](https://auth.abuse.ch/), sent as the `Auth-Key` header |
| Streams | Fixed: `urlhaus-recent`, `threatfox-recent`, `malwarebazaar-recent` |
| Vulnetix fetches | URLhaus `https://urlhaus-api.abuse.ch/v1/urls/recent/`; ThreatFox `https://threatfox-api.abuse.ch/api/v1/` with `{"query":"get_iocs","days":1}`; MalwareBazaar `https://mb-api.abuse.ch/api/v1/` with `query=get_recent&selector=time` |
| Covers | Malware URLs, C2 IPs and domains, file hashes |

## taxii

Any TAXII 2.1 server.

| | |
|---|---|
| Provider value | `taxii` |
| You need | The server's discovery URL, and a token sent as `Bearer`, or a username and password sent as Basic |
| Streams | The server's collections, read from discovery, then the API root, then `/collections/`. A stream id is `<api root URL>\|<collection id>`. The API root must be on the connector's host. |
| Vulnetix fetches | `GET {apiRoot}/collections/{id}/objects/` with `Accept: application/taxii+json;version=2.1`, following `next` |
| Covers | Whatever the collection holds |

## crowdsec

CrowdSec CTI, beyond the free blocklist that is in the catalog as `catalog:crowdsec`.

| | |
|---|---|
| Provider value | `crowdsec` |
| You need | A CrowdSec CTI API key with TAXII access. CrowdSec documents TAXII as a premium feature that needs a dedicated CTI key from CrowdSec sales ([CrowdSec TAXII docs](https://docs.crowdsec.net/u/cti_api/taxii/)). The key is sent as the Basic password; the username is the connector's username, or `crowdsec` when empty. |
| URL | Required: the TAXII URL from your CrowdSec console. CrowdSec documents discovery at `https://taxii.cti.api.crowdsec.net/v1/taxii2/`. |
| Streams | The server's collections, as for `taxii` |
| Vulnetix fetches | As for `taxii` |
| Covers | Attacking IPs |

## pulsedive

| | |
|---|---|
| Provider value | `pulsedive` |
| You need | A Pulsedive API key, sent as Basic with username `taxii2` and the key as password ([Pulsedive TAXII setup](https://docs.pulsedive.com/taxii/quick-setup)). Pulsedive documents TAXII access on its Pro and Feed plans; a free key gets a test collection. |
| URL | Optional. Empty uses Pulsedive's own server, `https://pulsedive.com/taxii2/`. |
| Streams | The server's collections, as for `taxii` |
| Vulnetix fetches | As for `taxii` |
| Covers | IPs, domains, URLs |

## opencti

Your own OpenCTI platform.

| | |
|---|---|
| Provider value | `opencti` |
| You need | An OpenCTI user API token, sent as `Bearer`, for a user that can read the collections |
| URL | Required: your platform's TAXII root, such as `https://opencti.example.org/taxii2/root` |
| Streams | The platform's TAXII collections, as for `taxii` |
| Vulnetix fetches | As for `taxii` |
| Covers | Whatever your collections hold |

## misp

Your MISP instance.

| | |
|---|---|
| Provider value | `misp` |
| You need | A MISP auth key, sent as the `Authorization` header |
| URL | Required: your instance, such as `https://misp.example.org` |
| Streams | `default` (every event), plus one per tag you enter, with id `tag:<tag>` (for example `tag:tlp:white`) |
| Vulnetix fetches | `POST {baseUrl}/events/restSearch` with `{"returnFormat":"stix2","last":"7d","to_ids":true}`, narrowed to the tag for a tag stream |
| Covers | IPs, domains, URLs, hashes |

## otx

AlienVault OTX (LevelBlue Open Threat Exchange). The free AlienVault reputation lists are in the catalog separately.

| | |
|---|---|
| Provider value | `otx` |
| You need | An OTX API key from your OTX account, sent as the `X-OTX-API-KEY` header |
| Streams | `subscribed`: the pulses you subscribe to |
| Vulnetix fetches | `GET https://otx.alienvault.com/api/v1/pulses/subscribed?modified_since=<30 days ago>`, every page, indicators by type ([OTX API](https://otx.alienvault.com/assets/static/external_api.html)) |
| Covers | IPs, domains, URLs, hashes |

## trend

Trend Vision One threat intelligence.

| | |
|---|---|
| Provider value | `trend` |
| You need | A Vision One API token, sent as `Bearer` |
| URL | Required: the TAXII URL for your Vision One region |
| Streams | The server's collections, as for `taxii` |
| Vulnetix fetches | As for `taxii` |
| Covers | IPs, domains, URLs, hashes |

## Not confirmed

These have a card on Integrations marked as not yet available. Their export format has not been confirmed from the vendor's documentation, so there is no connector for them.

| Provider | Use meanwhile |
|---|---|
| Recorded Future | The `taxii` connector, if your contract includes TAXII 2.1 |
| Mandiant (Google Threat Intelligence) | The `taxii` connector, if your contract includes TAXII 2.1 |
| GreyNoise | The `taxii` connector, if your contract includes TAXII 2.1 |
