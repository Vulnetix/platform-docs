---
title: Triage a CVE
description: Take a bare advisory id to a defensible decision using KEV, EPSS, SSVC, exploit counts, sightings and the timeline, then check exposure and fix locally.
order: 2
sources:
  - mcp-server/src/tools/vuln.ts
  - mcp-server/src/tools/intel.ts
  - mcp-server/src/tools/threat.ts
  - mcp-server/src/tools/analysis.ts
  - mcp-server/src/prompts/generated.ts
checked: [mcp-server@1725a04]
updated: 02 Nov 2026
---

A ticket arrives with an identifier. CVSS already said how bad it could be. The question is whether to act now, and how to justify the answer either way.

## 1. What is true

```text
Look up CVE-2021-44228. Is it in KEV, what is the EPSS score, and what is the SSVC decision?
```

`vulnetix_vuln` returns, among about 10 KB:

```json
{
  "id": "CVE-2021-44228",
  "kev": { "vendorProject": "Apache", "product": "Log4j2", "dueDate": "2021-12-24T00:00:00Z", "knownRansomware": "Known" },
  "epss": { "score": 0.99999, "percentile": 1.0 },
  "ssvc": { "decision": "Act", "priority": "immediate" },
  "exploitationMaturity": { "level": "ACTIVE" },
  "affected": { "total": 676 }
}
```

Four independent signals agree: a CISA deadline, near-certain exploitation probability, SSVC `Act`, and known ransomware use.

> The more common case is the opposite: CVSS 9.8 with EPSS 0.0004, no KEV entry, exploitation maturity `NONE` and no recent sightings. CVSS alone cannot tell the two apart.

## 2. Exploited, or only exploitable

```text
Is it being exploited, and is that current?
```

`vulnetix_exploits` gives `exploitCount` and `activeSources`; `vulnetix_sightings` gives `lastObservation` and `daysSinceLastSeen`. A sighting two days ago, five years after disclosure, settles the question. On Community, check the counts: an empty record list with a `note` means withheld, not none.

## 3. How fast this class moves

`vulnetix_timeline` returns `meta.publicationToFirstExploitDays`, `publicationToKevDays` and `insights`. "Weaponised within 20 days of disclosure" is the sentence for whoever asks for a two-week deferral.

## 4. Does it reach your code

A tool cannot answer this; it needs your repository. `affectedRoutines` from step 1 lists what to look for. Run the local prompt:

```text
/mcp__vulnetix__vulnetix_repo_impact CVE-2021-44228
```

It finds which manifest declares the package, at what version, whether the version is in range, and whether the vulnerable code is reachable.

## 5. Decide, with the reasoning attached

On Pro and above, `vulnetix_triage_reason` with deployment context:

```json
{ "identifier": "CVE-2021-44228", "context": "internal batch service, no untrusted input, Java 8, behind a WAF" }
```

It returns `priority` (`P1` to `P4`), `rationale`, `dominantFactors` and `wouldChangeIf`. The last makes the decision reviewable. On Community the tool returns the same inputs with `analysisSkipped`, and you reason it through.

## 6. Fix and verify

```text
Give me the remediation plan for CVE-2021-44228 and say which action to take first.
```

`vulnetix_remediation` returns ranked `actions`, distribution patches and registry fixes. Then locally:

```text
/mcp__vulnetix__vulnetix_fix CVE-2021-44228
/mcp__vulnetix__vulnetix_verify_fix CVE-2021-44228
```

`verify_fix` re-scans, gates on the result and writes the verdict to `.vulnetix/memory.yaml`.

## If you cannot patch

`vulnetix_workarounds` for mitigations that need no patch, and `vulnetix_detection_rules` for Snort, YARA and Nuclei content to deploy while you are exposed. Record the position with `/mcp__vulnetix__vulnetix_vex_publish`.
