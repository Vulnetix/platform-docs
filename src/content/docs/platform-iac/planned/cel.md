---
title: "Planned: CEL rule expressions"
nav: CEL rules
description: Planned, not available. Custom rule conditions written in CEL, and the variables each rule context is planned to offer.
order: 4
sources: [config-schemas/schemas/common.schema.json]
checked: [config-schemas@9bda9e1]
updated: 02 Nov 2026
---

> [!CAREFUL] Planned
> No released kind has a CEL field, and neither the CLI nor the server evaluates CEL today. `common.schema.json` already defines `celExpression` (a string of 1 to 4096 characters) so the format is fixed in advance.

[CEL](https://cel.dev) is the Common Expression Language, also used by Kubernetes ValidatingAdmissionPolicy. Rules in gate, jail, prioritisation, suppression, package firewall, AI guardrail, factory trigger and feed selector kinds are planned to gain an optional `when:` field holding a CEL expression that returns `bool`, beside the typed fields they have now.

```yaml
# Planned shape, not accepted by any released schema
when: finding.kev && finding.reachable && finding.epss > 0.5
```

Planned rule contexts:

| Variable | Planned fields |
|---|---|
| `finding` | `severity`, `cvss`, `epss`, `kev`, `exploitMaturity`, `reachable`, `internetExposed`, `eol`, `purl`, `cwe`, `repo`, `path` |
| `package` | `purl`, `ecosystem`, `ageDays`, `malware`, `versionLag` |
| `request` | AI firewall: `provider`, `model`, `client`, `tool`, `mcp` |
| `event` | Software Factory trigger events |
| `cve` | Detection rule feed selectors |

Planned guarantees: expressions are type-checked at plan time, run under cost limits, and give the same result in the CLI gate and on the server, checked by shared test vectors.
