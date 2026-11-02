---
title: Run an incident
description: A CVE goes hot. Confirm it is exploited now, check exposure, pull indicators and detection content, choose a patch path and record the position.
order: 5
sources:
  - mcp-server/src/tools/threat.ts
  - mcp-server/src/tools/intel.ts
  - mcp-server/src/tools/analysis.ts
  - mcp-server/src/prompts/generated.ts
checked: [mcp-server@1725a04]
updated: 02 Nov 2026
---

Something lands in your feed and you need an answer in ten minutes.

## 1. Confirm it is real

```text
Confirm urgency for CVE-XXXX-XXXXX: KEV status, EPSS, exploitation maturity, and whether it is being seen in the wild now.
```

`vulnetix_vuln` gives KEV, EPSS, SSVC and exploitation maturity. `vulnetix_sightings` separates current from historical:

```json
{ "count": 2568, "firstObservation": "2024-05-01", "lastObservation": "2026-08-08", "daysSinceLastSeen": 2 }
```

Many incidents stop here: coverage often calls "exploitable" "exploited".

## 2. Are you exposed

`vulnetix_package_vulns` maps the package's versions to advisories. Then, against your repository:

```text
/mcp__vulnetix__vulnetix_repo_impact CVE-XXXX-XXXXX
```

## 3. Pull the indicators

```text
Give me IOCs, threat actors and ATT&CK techniques for CVE-XXXX-XXXXX.
```

| Tool | Gives |
|---|---|
| `vulnetix_iocs` | Attacking IPs, ASNs, geography, Shadowserver scan counts |
| `vulnetix_threat_actors` | Actors and campaigns |
| `vulnetix_attack_techniques` | The ATT&CK chain, to check which controls should have caught it |

On Community the counts come back with `gated: true`. `total: 200` with an empty list means 200 indicators exist that your plan does not include.

## 4. Detect while exposed

```text
What detection content exists for CVE-XXXX-XXXXX, and which should I deploy first on Suricata 7?
```

`vulnetix_detection_rules` with `stack` set returns whole Snort, YARA and Nuclei rules, and on Pro an analysis of what to deploy first, false-positive risks and `coverageGaps`. Knowing your detection has a hole is worth more than believing it does not.

## 5. Choose the patch path

`vulnetix_remediation` for ranked actions, distribution patches and registry fixes; `vulnetix_workarounds` for mitigations without a patch. Apply locally:

```text
/mcp__vulnetix__vulnetix_fix CVE-XXXX-XXXXX
```

## 6. Record the position

```text
/mcp__vulnetix__vulnetix_vex_publish
```

Generates OpenVEX or CycloneDX VEX from the triage decisions in `.vulnetix/memory.yaml`, optionally signed and uploaded. Whether the answer was fixed, not affected, or mitigated and monitored, it is now on record.

## Afterwards

| Step | Tool or prompt |
|---|---|
| Prove the fix landed | `/mcp__vulnetix__vulnetix_verify_fix CVE-XXXX-XXXXX` |
| Check the patched target | `vulnetix_exploit_test` with `target`, then run the command yourself |
| How fast this class moves, for the review | `vulnetix_timeline` |
| Whether it is part of a wider pattern | `vulnetix_threat_feed` |
