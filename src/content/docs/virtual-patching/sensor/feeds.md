---
title: Rule feeds for a profile
description: How a provisioning profile picks its sensors' feeds, the three reference forms, which feeds can block, every built-in catalogue feed, and org-added feeds.
order: 6
nav: Rule feeds
sources: [vdb-site/docs/sensor-feeds-api.md, vdb-site/api/internal/handler/sensor_feed_catalog.go, vdb-site/api/internal/handler/sensor_feeds.go, vdb-site/api/internal/handler/sensor_feed_fetch.go, cli/internal/sensor/feed/indicators.go, cli/internal/sensor/engine/ioc.go, cli/deploy/sensor/README.md]
checked: [cli@4c8c3b7, vdb-site@1a06d67]
updated: 02 Nov 2026
---

A profile's `feeds` field is the list of feeds every sensor under it loads. You edit it with the feed picker in the profile editor on **Sensor Provisioning** (`/resolve/sensor-provisioning`). Creating or editing a profile, and adding or changing an org feed, needs an org owner or admin. Members can view both.

## The feed picker

The picker lists every feed a profile can name, in groups:

| Group | What it holds |
|---|---|
| Vulnetix STIX | The 21 Vulnetix malware STIX bundles, one for domains and one for URLs per ecosystem |
| Your org | The org's published Virtual Patching rule feeds, and feeds the org added by URL |
| Connected providers | Feeds made from a [threat intel connector](/virtual-patching/sensor/threat-intel-connectors/) stream |
| Community | Public blocklists the site fetches and parses |
| Unavailable | Well-known feeds that cannot load today, with the reason |

The scope switch (All, Vulnetix STIX, Your org, Providers, Community, Selected) and the filter narrow the list. Each row carries a badge: **Signed, can block**, **Vulnetix, report only**, **Report only** or **Unavailable**. **Add a feed by URL** in the picker takes either a signed Vulnetix feed URL or any `https://` URL with its format, and saves the second kind as an org feed.

A new profile saved without any feeds gets every catalog feed marked as a default: the 21 Vulnetix STIX bundles. An explicit empty list means no feeds. Profiles that existed before the catalog are not changed. The picker's reset puts the defaults back; org and provider feeds are off by default.

## Reference forms

Each entry in `feeds` is one of three strings. Anything else is refused with `400`.

| Reference | What it names | How the sensor gets it |
|---|---|---|
| `https://vulnetix.com/feeds/<org-uuid>/<feed-uuid>` | A signed Vulnetix rule feed: one of your org's published [detection rule feeds](/virtual-patching/feeds/detection-rule-feeds/), or a feed the site publishes for every org | Fetched directly: `manifest.json`, `manifest.json.sig` and `rules.json`, verified against the feed key ([Manifest and signature](/virtual-patching/feeds/manifest-and-signature/)) |
| `catalog:<id>` | A built-in feed from the [catalog](#catalog) | `GET /v1/runtime/feeds/catalog/<id>/indicators` on the site, with the sensor's own credential |
| `org:<uuid>` | One of your org's own feeds: a URL feed or a connector stream. It must belong to the profile's org and not be deleted. | `GET /v1/runtime/feeds/org/<uuid>/indicators` |

A raw URL that is exactly a catalog entry's URL is stored as its `catalog:` reference (scheme and host compared without case, path and query exactly). Stored profiles are rewritten the same way when they are read, so their `configEtag` changes once. Duplicates are dropped. An unavailable catalog entry is refused, and the error names the reason.

## Signed feeds block, indicator lists report

Only a signed Vulnetix rule feed that the sensor verifies can hold or block. Every `catalog:` and `org:` feed is an indicator list the site fetches, parses and serves; it loads on the sensor as one `IOC_LIST` rule that is never verified, so a match on it reports in every mode and never holds or blocks.

> [!CAREFUL] The Vulnetix STIX bundles report only
> The 21 Vulnetix STIX bundles are served as `catalog:` indicator lists and are not signed yet. A profile that runs only the defaults reports matches and blocks nothing, even in `enforce`. To block, add a signed rule feed your org published.

> [!WHY] Why the site serves indicator lists
> The site fetches the upstream, so a provider key never reaches a device, an `http`-only upstream still works, and every format is parsed in one place. The sensor fetches only signed Vulnetix rule feeds and lists from the site.

On the sensor, a list line is a kind and a value: `d` a domain, `i` an IPv4 or IPv6 address, `u` a URL, `h` a SHA-256. Domains and addresses are checked by the egress proxy (`--egress-listen`) and the DNS guard (`--dns-listen`); a domain also matches its subdomains at the DNS guard. A URL contributes its host as a domain. Hashes are checked against executables seen through Tetragon or `vulnetix-sensor run`. The sensor polls each list on the feed refresh, every 5 minutes, with the etag it holds, so an unchanged list costs a `304`. A list that fails to fetch keeps the last one the sensor had.

`catalog:` and `org:` feeds need a credential, so `--offline` skips them.

## Catalog

The catalog is built into the Vulnetix API, served at `GET /v1/runtime/feeds/catalog` to a signed-in person or a sensor credential. It has 21 Vulnetix entries, 23 community entries and 5 unavailable entries. The indicator counts for the Vulnetix rows are what `https://vulnetix.com/malscan-stix/index.json` listed when the table was written; the Resolve Platform shows the count from the last fetch.

| Format | Parsed as |
|---|---|
| `stix` | STIX 2.1 bundle. Revoked indicators and those past `valid_until` are skipped. |
| `iplist` | One address per line |
| `netset` | IP ranges; single addresses are kept, CIDR ranges are skipped |
| `hosts` | A hosts file or a domain list |
| `mixed` | Text with addresses and domains |
| `misp` | MISP event JSON |
| `rss` | An RSS feed of addresses |

Domains and addresses from every format pass the same allow-list the malware scanner uses, so a host on that allow-list is dropped even when a list names it. A URL is kept only when its host would be kept.

| Reference | Group | Name | Kind | Format | Upstream | Note |
|---|---|---|---|---|---|---|
| `catalog:vx-cargo-dns` | vulnetix | Cargo: malware domains | DNS | `stix` | `https://vulnetix.com/malscan-stix/cargo/dns.stix.json` | About 2 indicators when the table was written |
| `catalog:vx-cargo-urls` | vulnetix | Cargo: malware URLs | URLs | `stix` | `https://vulnetix.com/malscan-stix/cargo/urls.stix.json` | About 3 indicators when the table was written |
| `catalog:vx-chrome-dns` | vulnetix | Chrome extensions: malware domains | DNS | `stix` | `https://vulnetix.com/malscan-stix/chrome/dns.stix.json` | About 25 indicators when the table was written |
| `catalog:vx-chrome-urls` | vulnetix | Chrome extensions: malware URLs | URLs | `stix` | `https://vulnetix.com/malscan-stix/chrome/urls.stix.json` | About 3 indicators when the table was written |
| `catalog:vx-generic-dns` | vulnetix | Generic: malware domains | DNS | `stix` | `https://vulnetix.com/malscan-stix/generic/dns.stix.json` | About 8,846 indicators when the table was written |
| `catalog:vx-generic-urls` | vulnetix | Generic: malware URLs | URLs | `stix` | `https://vulnetix.com/malscan-stix/generic/urls.stix.json` | About 220 indicators when the table was written |
| `catalog:vx-go-dns` | vulnetix | Go: malware domains | DNS | `stix` | `https://vulnetix.com/malscan-stix/go/dns.stix.json` | About 6 indicators when the table was written |
| `catalog:vx-go-urls` | vulnetix | Go: malware URLs | URLs | `stix` | `https://vulnetix.com/malscan-stix/go/urls.stix.json` | About 8 indicators when the table was written |
| `catalog:vx-maven-urls` | vulnetix | Maven: malware URLs | URLs | `stix` | `https://vulnetix.com/malscan-stix/maven/urls.stix.json` | About 3 indicators when the table was written |
| `catalog:vx-npm-dns` | vulnetix | npm: malware domains | DNS | `stix` | `https://vulnetix.com/malscan-stix/npm/dns.stix.json` | About 334 indicators when the table was written |
| `catalog:vx-npm-urls` | vulnetix | npm: malware URLs | URLs | `stix` | `https://vulnetix.com/malscan-stix/npm/urls.stix.json` | About 367 indicators when the table was written |
| `catalog:vx-openvsx-dns` | vulnetix | Open VSX: malware domains | DNS | `stix` | `https://vulnetix.com/malscan-stix/openvsx/dns.stix.json` | About 9 indicators when the table was written |
| `catalog:vx-openvsx-urls` | vulnetix | Open VSX: malware URLs | URLs | `stix` | `https://vulnetix.com/malscan-stix/openvsx/urls.stix.json` | About 8 indicators when the table was written |
| `catalog:vx-packagist-dns` | vulnetix | Packagist: malware domains | DNS | `stix` | `https://vulnetix.com/malscan-stix/packagist/dns.stix.json` | About 14 indicators when the table was written |
| `catalog:vx-packagist-urls` | vulnetix | Packagist: malware URLs | URLs | `stix` | `https://vulnetix.com/malscan-stix/packagist/urls.stix.json` | About 2 indicators when the table was written |
| `catalog:vx-pypi-dns` | vulnetix | PyPI: malware domains | DNS | `stix` | `https://vulnetix.com/malscan-stix/pypi/dns.stix.json` | About 155 indicators when the table was written |
| `catalog:vx-pypi-urls` | vulnetix | PyPI: malware URLs | URLs | `stix` | `https://vulnetix.com/malscan-stix/pypi/urls.stix.json` | About 174 indicators when the table was written |
| `catalog:vx-rubygems-dns` | vulnetix | RubyGems: malware domains | DNS | `stix` | `https://vulnetix.com/malscan-stix/rubygems/dns.stix.json` | About 1 indicators when the table was written |
| `catalog:vx-rubygems-urls` | vulnetix | RubyGems: malware URLs | URLs | `stix` | `https://vulnetix.com/malscan-stix/rubygems/urls.stix.json` | About 1 indicators when the table was written |
| `catalog:vx-vscode-dns` | vulnetix | VS Code extensions: malware domains | DNS | `stix` | `https://vulnetix.com/malscan-stix/vscode/dns.stix.json` | About 15 indicators when the table was written |
| `catalog:vx-vscode-urls` | vulnetix | VS Code extensions: malware URLs | URLs | `stix` | `https://vulnetix.com/malscan-stix/vscode/urls.stix.json` | About 19 indicators when the table was written |
| `catalog:phishing-army` | community | Phishing Army | DNS | `hosts` | `https://phishing.army/download/phishing_army_blocklist.txt` |  |
| `catalog:blocklistde` | community | blocklist.de: all | IPs | `iplist` | `https://lists.blocklist.de/lists/all.txt` |  |
| `catalog:ipsum3` | community | IPsum level 3 | IPs | `iplist` | `https://raw.githubusercontent.com/stamparm/ipsum/master/levels/3.txt` |  |
| `catalog:dandelion` | community | DandelionSprout Anti-Malware | DNS | `hosts` | `https://raw.githubusercontent.com/DandelionSprout/adfilt/master/Alternate%20versions%20Anti-Malware%20List/AntiMalwareHosts.txt` |  |
| `catalog:firehol3` | community | FireHOL level 3 | IPs | `netset` | `https://raw.githubusercontent.com/firehol/blocklist-ipsets/master/firehol_level3.netset` | Single addresses only; CIDR ranges are skipped. |
| `catalog:greensnow` | community | GreenSnow | IPs | `iplist` | `https://blocklist.greensnow.co/greensnow.txt` |  |
| `catalog:binarydefense` | community | Binary Defense banlist | IPs | `iplist` | `https://binarydefense.com/banlist.txt` |  |
| `catalog:stalkerware` | community | Echap stalkerware indicators | DNS | `hosts` | `https://raw.githubusercontent.com/AssoEchap/stalkerware-indicators/master/generated/hosts` |  |
| `catalog:alienvault-generic` | community | AlienVault reputation: generic | IPs | `iplist` | `https://reputation.alienvault.com/reputation.generic` |  |
| `catalog:alienvault-data` | community | AlienVault reputation: data | IPs | `iplist` | `https://reputation.alienvault.com/reputation.data` |  |
| `catalog:et-compromised` | community | Emerging Threats compromised IPs | IPs | `iplist` | `https://rules.emergingthreats.net/blockrules/compromised-ips.txt` |  |
| `catalog:bfb` | community | BruteForceBlocker | IPs | `iplist` | `https://danger.rulez.sk/projects/bruteforceblocker/blist.php` |  |
| `catalog:openphish` | community | OpenPhish | DNS | `mixed` | `https://openphish.com/feed.txt` | Phishing URLs; served as their domains. |
| `catalog:c2intel-ips` | community | C2IntelFeeds: C2 IPs | IPs | `iplist` | `https://raw.githubusercontent.com/drb-ra/C2IntelFeeds/master/feeds/IPC2s.csv` |  |
| `catalog:c2intel-dns` | community | C2IntelFeeds: C2 domains | DNS | `mixed` | `https://raw.githubusercontent.com/drb-ra/C2IntelFeeds/master/feeds/domainC2s.csv` |  |
| `catalog:dshield-ips` | community | DShield: top attackers | IPs | `iplist` | `https://www.dshield.org/ipsascii.html` |  |
| `catalog:dshield-block` | community | DShield: block list | IPs | `iplist` | `https://www.dshield.org/block.txt` | Network ranges; only single addresses are kept. |
| `catalog:crowdsec` | community | CrowdSec free blocklist | IPs | `misp` | `https://feeds.crowdsec.net/free/2be9a716-39b8-5c18-bc9e-4ba7aefd8831.json` |  |
| `catalog:isc-intel` | community | SANS ISC intelfeed | IPs, DNS | `mixed` | `https://isc.sans.edu/api/intelfeed` |  |
| `catalog:tweetfeed` | community | TweetFeed: last month | IPs, DNS, URLs, hashes | `stix` | `https://raw.githubusercontent.com/0xDanielLopez/TweetFeed/master/stix/month.json` |  |
| `catalog:honeypot-p` | community | Project Honey Pot: harvesters | IPs | `rss` | `https://www.projecthoneypot.org/list_of_ips.php?t=p&rss=1` |  |
| `catalog:honeypot` | community | Project Honey Pot: all | IPs | `rss` | `https://www.projecthoneypot.org/list_of_ips.php?rss=1` |  |
| `catalog:cins` | community | CINS Army | IPs | `iplist` | `http://cinsscore.com/list/ci-badguys.txt` | http only upstream; the site fetches it and serves it over https. |

`catalog:cins` is the one `http` upstream. A profile can still name it, because the site fetches it and serves it over `https`; you cannot add an `http` URL as an org feed.

### Unavailable

These are in the catalog so the picker can say why they are missing. A profile that names one is refused, and its indicators route answers `410`.

| Reference | Name | Kind | Upstream | Why |
|---|---|---|---|---|
| `catalog:urlhaus` | URLhaus hostfile | DNS | `https://urlhaus.abuse.ch/downloads/hostfile/` | abuse.ch retired the public download (410 Gone); connect abuse.ch with an Auth-Key instead. |
| `catalog:threatfox` | ThreatFox recent CSV | IPs, DNS, URLs, hashes | `https://threatfox.abuse.ch/export/csv/recent/` | abuse.ch retired the public export (410 Gone); connect abuse.ch with an Auth-Key instead. |
| `catalog:feodo` | Feodo Tracker recommended | IPs | `https://feodotracker.abuse.ch/downloads/ipblocklist_recommended.txt` | Not updated since 4 March 2026. |
| `catalog:aper` | APER phishing reply addresses | Emails | `https://svn.code.sf.net/p/aper/code/phishing_reply_addresses` | Email addresses; the sensor has no engine that matches them. |
| `catalog:isc-cloud` | SANS ISC cloud IPs | IPs | `https://isc.sans.edu/api/cloudips` | Cloud provider address ranges, not threats. |

## Org feeds

The **Feeds** lens on Sensor Provisioning lists what the org owns: its published Virtual Patching rule feeds (read-only here, signed, can block) and its own feeds (report only). Every profile in the org can use them.

To add one:

1. Open **Sensor Provisioning**, then the **Feeds** lens.
2. Give it a name, an `https://` URL, a format from the table above, and an optional description.
3. Save, then **Check** it. The check fetches the URL once, parses it, and shows how many addresses, domains, URLs and hashes it found, or the error.

Each row shows its last check (`never`, `ok` or `error`, with the error text), the indicator count, and how many profiles use it. Changing the URL or the format resets the status to `never`. A feed made from a connector stream has no URL; you can change its name and description only.

Deleting a feed that a profile uses is refused with the number of profiles, unless you confirm, which also removes the reference from those profiles.

## Limits and caching

| Limit | Value |
|---|---|
| Feeds per profile | 100 |
| Org feeds per org | 200 |
| Connectors per org | 50 |
| Indicators per list | 250,000. Past that the list is cut, keeping domains first, then addresses, URLs and hashes, and its header says `# truncated <n>`. |
| Site cache | 15 minutes per reference, in memory on each site task. A failed refresh is retried after a minute. |
| Upstream failure | The last good list is served with `# stale <unix-ms>` and a `Warning` header, and the error is recorded on the feed. A feed that has never fetched answers `503`. |
| Upstream fetch | Public addresses only, `https` redirects only, no redirect to a Vulnetix host |
