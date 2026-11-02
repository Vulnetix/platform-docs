---
title: Virtual patching
description: Block rules and detections Vulnetix builds from public exploits, for a vulnerability you cannot patch yet, and the ways to run them.
order: 1
nav: Overview
sources: [vdb-site/api/internal/handler/defence_formats.go, vdb-site/api/internal/handler/defences.go, vdb-site/api/internal/handler/detection_rule_feeds.go, cli/cmd/defend.go, cli/deploy/sensor/README.md]
checked: [vdb-site@1a06d67, cli@4c8c3b7, saas@50cedf3]
updated: 02 Nov 2026
---

Vulnetix reads the public proofs of concept for each vulnerability and builds rules from them. A rule is one of two kinds, and the two are never mixed:

| | Virtual patch (lane `block`) | Countermeasure (lane `detect`) |
|---|---|---|
| Does | Stops the exploit request | Tells you it happened |
| Runs in | A WAF, an IDS/IPS, a web server, the Vulnetix sensor | A SIEM, an EDR, a threat intelligence platform, the Vulnetix sensor |
| Formats | Snort, Suricata, ModSecurity, nginx, AWS WAF, Cloudflare WAF, layer 7 regex | Sigma, YARA, STIX 2.1, OpenIOC |

Neither replaces the patch. A virtual patch buys time until a fixed version exists and you can upgrade.

Every rule states:

- the mode it is safe to start in (`deployMode`: `block` or `log`; anything not explicitly `block` is `log`);
- its confidence (`HIGH`, `MEDIUM`, `LOW`) and false-positive risk;
- what it does not cover, such as encoded variants of the exploit.

## Three ways to get a rule into production

| Route | For | Page |
|---|---|---|
| `vulnetix defend <advisory-id>` | One finding, saved into your repository and recorded as a compensating control | [defend command](/virtual-patching/defend/command/) |
| A detection rule feed | A curated, published set of rules that your WAF, IDS or SIEM fetches from a stable URL | [Detection rule feeds](/virtual-patching/feeds/detection-rule-feeds/) |
| The Vulnetix runtime sensor | Running the rules inside your workload, with a person deciding on each hold | [Runtime sensor](/virtual-patching/runtime/sensor/) |

Then deploy the rules to the system that runs them:

| System | Formats it loads | Page |
|---|---|---|
| AWS WAF | `AWS_WAF` | [AWS WAF](/virtual-patching/runtime/aws-waf/) |
| Cloudflare | `CLOUDFLARE_WAF` | [Cloudflare WAF](/virtual-patching/runtime/cloudflare/) |
| ModSecurity, Coraza, nginx | `MODSECURITY`, `NGINX` | [ModSecurity and Coraza](/virtual-patching/runtime/modsecurity/) |
| Suricata, Snort | `SURICATA`, `SNORT` | [Suricata and Snort](/virtual-patching/runtime/suricata-snort/) |
| Vulnetix sensor | `MODSECURITY`, `REGEX_L7`, `SIGMA`, `YARA`, `STIX`, `OPENIOC` | [Sidecar](/virtual-patching/runtime/sensor-sidecar/), [DaemonSet](/virtual-patching/runtime/sensor-daemonset/), [Lambda layer](/virtual-patching/runtime/sensor-lambda/), [EC2 and EMR](/virtual-patching/runtime/sensor-hosts/) |
| Tetragon | Rendered from `SIGMA` | [Tetragon](/virtual-patching/runtime/tetragon/) |
| A Sigma-capable SIEM | `SIGMA` | [Guardian Sigma rules](/siem/detection/sigma/) |

## Plans

| What | Needs |
|---|---|
| How many rules exist for a finding, and in which formats | Any plan, including Community |
| Rule bodies, downloads, `defend --for` | Pro |
| Detection rule feeds | Pro: 1 feed of each type. Business: 50 of each type. Enterprise: no cap |

Below the plan, the API answers `200` with `planLocked: true` and an empty list rather than an error, so the console can show what exists.

## In the console

| Page | Path |
|---|---|
| Virtual Patching: Your Feeds, Virtual Patches, Snort Rules, Web App Firewalls | `/resolve/virtual-patching` |
| Countermeasures | `/resolve/countermeasures` |
| Sensors: fleet, holds, decisions | `/resolve/sensor` |

## Platform IaC

Config-as-code for virtual patching (feeds, their entries and sensor policy as `apiVersion: vulnetix.com/v1` documents) is planned and described on [Platform IaC](/platform-iac/). Today feeds are managed in the console or through the [feeds API](/virtual-patching/reference/api/), and a recorded control lives in `.vulnetix/controls.json` in your repository.
