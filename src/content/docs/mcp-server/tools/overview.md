---
title: Tools by question
description: Which of the 31 tools answers which question, how they are grouped, and the shaped response sizes measured for a large advisory.
order: 1
nav: Overview
sources:
  - mcp-server/src/mcp/server.ts
  - mcp-server/src/tools/
  - mcp-server/README.md
checked: [mcp-server@1725a04]
updated: 02 Nov 2026
---

Each tool is built around a question rather than an endpoint. Several call more than one vdb-api route and compose the result, and all of them shape the response before it reaches the model. Every parameter and default is on the [Tool reference](/mcp-server/reference/tools/).

## Which tool for which question

| You want to know | Tool |
|---|---|
| Everything decision-relevant about one advisory | `vulnetix_vuln` |
| Is it being exploited | `vulnetix_exploits`, then `vulnetix_sightings` |
| Is there a KEV deadline on it | `vulnetix_kev_status` |
| What was added to KEV recently | `vulnetix_kev` |
| How do I fix it | `vulnetix_remediation` |
| Can I mitigate without patching | `vulnetix_workarounds` |
| Can I detect it without patching | `vulnetix_detection_rules` |
| Which vendor advisory applies to what I run | `vulnetix_advisories` |
| Has the vendor declared it not affected | `vulnetix_vex` |
| How fast did it get weaponised | `vulnetix_timeline` |
| Who is using it, and from where | `vulnetix_threat_actors`, `vulnetix_iocs` |
| Which ATT&CK techniques | `vulnetix_attack_techniques` |
| Is the upstream project maintained | `vulnetix_scorecard` |
| Should I add this package | `vulnetix_package_search` |
| Which advisories affect this package | `vulnetix_package_vulns` |
| Which versions exist | `vulnetix_package_versions` |
| Risk of this exact coordinate from my SBOM | `vulnetix_purl` |
| What to look at today | `vulnetix_soc_triage` |
| I remember the nickname, not the id | `vulnetix_search` |
| Is this runtime still supported | `vulnetix_eol_products` |
| What is happening in the landscape | `vulnetix_threat_feed` |
| Patch now or defer, with reasons | `vulnetix_triage_reason` |
| How not to write this bug | `vulnetix_secure_code_write` |
| Did the fix close it | `vulnetix_exploit_test` |
| The exact manifest edit and commands | `vulnetix_fix_plan` |
| A VDB endpoint no tool covers yet | `vdb_request` |
| Which organisation am I connected as | `vulnetix_auth_status` |

## Groups

| Page | Tools |
|---|---|
| [Vulnerability intelligence](/mcp-server/tools/vulnerability/) | `vulnetix_vuln`, `vulnetix_kev_status`, `vulnetix_kev`, `vulnetix_remediation`, `vulnetix_timeline`, `vulnetix_advisories`, `vulnetix_workarounds`, `vulnetix_vex` |
| [Exploits and threat](/mcp-server/tools/exploits-and-threat/) | `vulnetix_exploits`, `vulnetix_sightings`, `vulnetix_iocs`, `vulnetix_threat_actors`, `vulnetix_attack_techniques`, `vulnetix_scorecard` |
| [Package risk](/mcp-server/tools/packages/) | `vulnetix_package_search`, `vulnetix_package_vulns`, `vulnetix_package_versions`, `vulnetix_purl` |
| [Feeds and search](/mcp-server/tools/feeds-and-search/) | `vulnetix_soc_triage`, `vulnetix_search`, `vulnetix_eol_products`, `vulnetix_threat_feed` |
| [AI analysis](/mcp-server/tools/ai-analysis/) | `vulnetix_triage_reason`, `vulnetix_secure_code_write`, `vulnetix_detection_rules`, `vulnetix_exploit_test`, `vulnetix_fix_plan` |
| [vdb_request](/mcp-server/tools/vdb-request/) | `vdb_request` |
| [Authentication](/mcp-server/get-started/authentication/) | `vulnetix_auth_status`, `vulnetix_auth_start`, `vulnetix_auth_poll` |

## Measured sizes

Measured by the maintainers against `CVE-2021-44228` with a Community credential, in bytes. Records grow over time, so your numbers will differ.

| Tool | Raw | Shaped |
|---|---|---|
| `vulnetix_vuln` (`summary`) | 2,606,571 | 10,613 |
| `vulnetix_vuln` (`full`) | 2,606,571 | 207,604 |
| `vulnetix_remediation` | 467,156 | 27,288 |
| `vulnetix_timeline` | 288,080 | 9,051 |
| `vulnetix_advisories` | 277,149 | 8,190 |
| `vulnetix_workarounds` | 161,222 | 198 |
| `vulnetix_package_search` (`express`) | 100,125 | 5,435 |
| `vulnetix_package_vulns` (`express`) | 84,274 | 11,899 |
| `vulnetix_threat_feed` (five sections) | 145,318 | 18,371 |

Every result reports its own numbers in `_meta["vulnetix/shaping"]`. See [Result metadata](/mcp-server/reference/result-metadata/).

## Errors are results

A tool that cannot answer returns a normal result with `isError: true` and a message aimed at the agent. A quota error says not to retry; a credential error says which header to set. See [Errors](/mcp-server/reference/errors/).
