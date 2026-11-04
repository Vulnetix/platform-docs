---
title: Detection rule feeds
description: Curate rules into a feed, publish it to a stable public URL, and point a WAF, IDS, SIEM or the Vulnetix sensor at it.
order: 1
nav: Feeds
sources: [vdb-site/docs/addons.md, saas/prisma/models/detection-rule-feeds.prisma, vdb-site/api/internal/handler/detection_rule_feeds.go, vdb-site/api/internal/handler/detection_rule_feeds_publish.go, vdb-site/api/internal/handler/defence_formats.go, website/src/pages/resolve/virtual-patching.vue]
checked: [vdb-site@1a06d67, saas@50cedf3, website@ad775f3]
updated: 05 Nov 2026
---

A detection rule feed is a set of rules your organisation picks, published as files under one URL. Third-party tools fetch the files without authentication. The Vulnetix runtime sensor fetches the same feed and verifies its signature.

Feeds are on the **Your Feeds** tab of `/resolve/virtual-patching` in the console.

## One format per feed

A feed is homogeneous: Suricata loads a `.rules` file, a SIEM loads Sigma, a threat intelligence platform loads a STIX bundle, and none of them can read the others. Pick the `feedType` when you create the feed. It cannot be changed.

| `feedType` | Lane | Accepts rules of type | Published file |
|---|---|---|---|
| `SNORT` | block | `SNORT` | `local.rules` |
| `SURICATA` | block | `SURICATA` | `suricata.rules` |
| `MODSECURITY` | block | `MODSECURITY` | `modsecurity.conf` |
| `NGINX` | block | `NGINX` | `nginx-waf.conf` |
| `AWS_WAF` | block | `AWS_WAF` | `wafv2-rules.json` |
| `CLOUDFLARE_WAF` | block | `CLOUDFLARE_WAF` | `cloudflare-expressions.txt` |
| `REGEX_L7` | block | `REGEX_L7` | `patterns.txt` |
| `SIGMA` | detect | `SIGMA` | `sigma.yml` |
| `YARA` | detect | `YARA` | `rules.yar` |
| `STIX` | detect | `STIX` | `bundle.json` |
| `OPENIOC` | detect | `OPENIOC` | `openioc/<rule-uuid>.ioc` per rule, and `openioc/index.txt` |
| `SNORT_YARA` | legacy | `SNORT` and `YARA` from the third-party catalogue | `snort.rules`, `rules.yar` |

`SNORT_YARA` is the original mixed type. Existing feeds of that type keep publishing; the console no longer offers it. A `POST` without `feedType` is refused with `400 feedType is required`.

What each file looks like, and how a disabled rule appears in it, is on [Feed formats](/virtual-patching/feeds/formats/).

## Lifecycle

| Status | Means |
|---|---|
| `DRAFT` | Created, not published. Nothing is served. |
| `PUBLISHED` | The files are live at `publicBaseUrl`. |
| `REVOKED` | Every file was deleted; the URLs answer 404. |

1. **Create** the feed (name, optional description, `feedType`).
2. **Add rules.** From the Virtual Patches, Snort Rules or Countermeasures catalogue, add rules to the feed. A rule of a type the feed does not accept is skipped with the reason. A feed holds at most **500** rules.
3. **Disable** a rule to keep it in the feed but inert. It is commented out, set to `Count`, marked `revoked` or left out, depending on the format.
4. **Publish.** Every rule body is read again at publish time. If a rule was removed from the catalogue since you added it, publish fails with `400 remove or replace rules no longer available: <names>`. Publishing clears the feed's previous files first, so a removed rule never lingers.
5. **Republish** after any change. An unchanged rule set publishes byte-identical files, so a subscriber that compares hashes sees no change.
6. **Revoke** to take the feed down at once.

## The URL

```text
https://vulnetix.com/feeds/<org-uuid>/<feed-uuid>/
```

This is `publicBaseUrl`, shown on the feed after publishing. Under it:

| Path | What |
|---|---|
| `<file>` | The format's file, from the table above |
| `<file>.sha256` | The file's SHA-256, lower-case hex, no filename |
| `manifest.json` | Every file with its URL, SHA-256 and rule count |
| `manifest.json.sig` | Ed25519 signature over `manifest.json`, base64 |
| `rules.json` | Every rule as its own object with its start mode, for the Vulnetix sensor |

See [Manifest and signature](/virtual-patching/feeds/manifest-and-signature/) to verify a download.

## Fetching on a schedule

Every runtime page has the exact commands. The pattern is the same for every tool: fetch the file, check it against its `.sha256`, swap it in, reload.

```bash
#!/bin/sh
set -eu
FEED="https://vulnetix.com/feeds/<org-uuid>/<feed-uuid>"
FILE="suricata.rules"
DEST="/etc/suricata/rules/vulnetix.rules"
TMP="$(mktemp)"
curl -fsSL "$FEED/$FILE" -o "$TMP"
WANT="$(curl -fsSL "$FEED/$FILE.sha256")"
GOT="$(sha256sum "$TMP" | cut -d' ' -f1)"
[ "$WANT" = "$GOT" ] || { echo "checksum mismatch for $FILE" >&2; rm -f "$TMP"; exit 1; }
install -m 0644 "$TMP" "$DEST"
rm -f "$TMP"
```

## Plan and add-on

Feeds come with the SOC Intelligence add-on, which works on any plan, Community included. An organisation without it sees the add-on in place of **Your feeds**, whatever its plan, and the feed API answers `planLocked: true` with `addon: "soc_intelligence"` (`402` for a write). Enterprise includes the add-on. An owner or admin adds it on **Billing**, under Add-ons (`/resolve/billing#addons`); the price is on [pricing](https://www.vulnetix.com/pricing).

The rule catalogues a feed is curated from (virtual patches, countermeasures, the Snort and YARA catalogues) are part of Pro, and they also open for an organisation on Community that holds SOC Intelligence, so its feeds can be filled.

## Plan limits

| Plan | Feeds of each type |
|---|---|
| Community with SOC Intelligence | 1, as on Pro |
| Pro | 1 |
| Business | 50 |
| Enterprise | no cap |

The cap is per type, so a Pro organisation can hold one Suricata feed and one Sigma feed at once. Creating one more is refused with `403 <plan> plan allows <n> <type> feed(s); you already have <n>`; a Community organisation reads `pro` there, the plan whose cap it has.

The API routes are on [API reference](/virtual-patching/reference/api/).
