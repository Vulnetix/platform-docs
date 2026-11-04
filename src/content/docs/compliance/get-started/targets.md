---
title: Compliance targets
nav: Targets
description: Run a compliance report on a cadence, or measure a SLSA level, NIST SSDF practices or a CEL cryptography policy over your CBOM, and declare targets as code.
order: 3
sources: [vdb-site/api/internal/compliancetarget/compliancetarget.go, vdb-site/api/internal/handler/compliance_targets.go, vdb-site/api/internal/handler/compliance_report_create.go, vdb-site/api/internal/config/compliancetarget.go, vdb-site/docs/compliance-targets.md, saas/prisma/models/compliance-target.prisma, saas/prisma/migrations/20261228040000_compliance_target/migration.sql, config-schemas/cel/variables.go, website/src/pages/resolve/compliance-targets.vue]
checked: [vdb-site@7b71e88, saas@0b6936a9, config-schemas@v1.11.1]
updated: 03 Nov 2026
---

A **compliance target** is an obligation your organisation holds itself to and how often Vulnetix measures it. Open **Reports › Compliance Targets** (`/resolve/compliance-targets`).

## Report targets

For any of the ten [report frameworks](/compliance/#frameworks), each run creates a compliance report for the period, scoped to the repositories you name (or the whole organisation). It is an ordinary report: you add evidence and notes to it, and export it as PDF, [OSCAL](/compliance/exports/oscal/) or an evidence bundle, exactly as for a report you create by hand.

The report is named from the target, with the end of the period appended. For `eu_ai_act`, the report's context text is where you describe the AI system, your role (provider or deployer) and its risk class.

## Evaluated targets

Three targets make no report. Each run stores an evaluation and its checks, and the page shows pass, fail or unknown with the history.

| Target | What it checks |
|---|---|
| `slsa` | The evidence for a SLSA Build level, 1 to 3. Level 1: build provenance exists. Level 2 adds provenance verified against the source repository and commit, and signed published artifacts. Level 3 adds signatures recorded in a transparency log and verified attestations. Every level also checks that the Software Factory's minimum SLSA level is at least the target. Vulnetix cannot inspect a build platform, so a pass means the evidence a hardened platform leaves is present. |
| `ssdf` | Fourteen practices of NIST SP 800-218 that Vulnetix holds evidence for, in the groups PO, PS, PW and RV: for example branch protection, signed releases, SBOMs, threat models, code review, scanning, a remediation policy and triage. A practice with no evidence is shown as not evidenced and is left out of the percentage. You set which groups count and the percentage that must be met. It measures what Vulnetix can see and is not a conformance claim. |
| `crypto-policy` | A cryptography policy you write as a [CEL](/platform-iac/reference/cel/) expression over the components of your Cryptography Bill of Materials. |

### Cryptography policy

`crypto.allow` is true for a component the policy permits, and is evaluated for each component of the newest CBOM (`vulnetix cbom`) of each repository in scope, except components an ignore rule covers. `crypto.appliesTo` chooses what is judged and defaults to `category == 'algorithm'`. `crypto.maxViolations` is how many violations still pass (default 0).

```cel
quantumSafe || (primitive in ['block-cipher', 'hash', 'mac'] && classicalSecurityLevel >= 128)
```

A component the policy is false for, or cannot be evaluated for, is a violation. A policy fails closed because an algorithm nobody assessed should not pass. A run with no components to judge is `unknown`, not a pass. The first 100 violations are listed with the repository, the algorithm and its parameter set.

The variables are the `cbom` context: `name`, `category`, `assetType`, `oid`, `primitive`, `parameterSetIdentifier`, `classicalSecurityLevel`, `nistQuantumSecurityLevel`, `pqcStatus`, `quantumSafe` and `deprecated` (derived from `pqcStatus`), `standards` (each standards body's verdict, such as `standards['NIST']`), `provider`, `purl`, `confidence`, `repo`, `branch` and `now`.

## Cadence

`weekly`, `monthly`, `quarterly` (the default) or `yearly`. A run covers the period before it, so a quarterly run on 3 November covers 3 August to 3 November. The first run happens soon after you create the target, and each run schedules the next one cadence later. A run that fails is tried again in an hour. **Run now** runs a target outside its schedule without moving it. Turning a target off keeps it and its history.

## As code

`ComplianceTarget` is a [Platform IaC kind](/platform-iac/):

```yaml
apiVersion: vulnetix.com/v1
kind: ComplianceTarget
metadata:
  name: pqc-readiness
spec:
  framework: crypto-policy
  cadence: monthly
  scope:
    repositories: [acme/payments-api]
  crypto:
    allow: quantumSafe || (primitive == 'block-cipher' && classicalSecurityLevel >= 128)
    maxViolations: 0
```

Download as code on the page produces the document. Deleting a target removes it and its runs and keeps the reports it created.

## Who and what plan

Owners and admins can create, run and delete targets; every member can see them. Targets are part of compliance reporting, which needs the Pro plan.

## Before the database migration

Targets need the database migration `20261228040000_compliance_target`. Until it is applied the page says so, saving or applying a target is refused with the migration's name, and nothing runs.
