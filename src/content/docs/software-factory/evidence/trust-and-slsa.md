---
title: Trust and SLSA
description: What you can prove about factory work, with SLSA levels per repository, the scanner matrix, firewall, gate and security settings, and the attestation export.
order: 2
sources: [vdb-site/docs/factory.md, vdb-site/api/internal/handler/factory_trust.go, vdb-site/api/internal/handler/factory_trust_store.go]
checked: [vdb-site@284f1d6, website@a31d470]
updated: 28 Oct 2026
---

The Trust page (`/resolve/factory-trust`) gathers what you would show an auditor. It is read-only. Changes happen on the Package Firewall, AI Firewall, Release Jails and Quality Gate pages, which it links to. Nothing on it calls GitHub.

![The Trust page with SLSA levels, the scanner matrix and firewall settings](/img/sf-trust-dark.webp)

## SLSA levels

Each managed repository gets a SLSA build level from 0 to 3, with the reason:

| Level | Reason | Means |
|---|---|---|
| 0 | `no_factory_build` | The factory has not built it |
| 1 | `unsigned_provenance` | Built in a Pix Sandbox whose launch evidence is not attestation verified |
| 2 | `hosted_signed` | Built on a hosted builder, provenance signed. Nothing assigns this level yet. |
| 3 | `sandbox_isolated` | Built in an isolated Pix Sandbox whose latest launch evidence is attestation verified |

`security.slsa_min` (default `L3`) is the level the factory aims for.

## The scanner matrix

One row per managed repository, one column per scanner, over the last 30 days:

`sca`, `sast`, `secrets`, `iac`, `containers`, `license`, `malscan`, `eol`, `cbom`, `aibom`, `scorecard`

Each cell is `clean`, `findings` or `not_run` (`blocking` is reserved and not set yet). The row also shows the SLSA level and the latest TEA release and how stale it is.

Scanner names have accepted aliases when you configure them: `secret` for `secrets`, `malware` for `malscan`, `container` and `oci` for `containers`, `infra` for `iac`, `licence` for `license`, `ai` for `aibom`, `openssf` for `scorecard`.

## What is in force

| Panel | Shows |
|---|---|
| Package Firewall | The ecosystems covered; whether malware, known exploited (KEV) and weaponised packages are blocked; how end-of-life is treated; the CVSS and EPSS thresholds; the cooldown in days; enforce or warn; blocks in the last 24 hours |
| AI Firewall | Guardrails in force, how secrets and personal data in prompts are handled, prompt injection, MCP servers allowed, tools allowed to crews, and decisions in the last 24 hours |
| Egress | The sandbox's egress mode, how many hosts are allowed, and the 50 most recently seen hosts with their decision |
| Gate | The severity that blocks, whether unpinned dependencies block, the largest major version bump an autofix may make, version lag, release jail mode, stale SBOM rule, and exemptions |

The Package Firewall covers these ecosystems: alpine, arch, aur, cargo, chef, composer, conan, conda, cran, debian, gem, go, helm, hex, homebrew, homebrew-bottle, julia, maven, npm, nuget, oci, pub, pypi, rpm and terraform.

## Security settings

Settings › Security and provenance. These apply to every factory change and cannot be switched off per workflow.

| Setting | Values | Default | Effect |
|---|---|---|---|
| `security.scanners` | `minimum` (sca, malscan, secrets), `all`, `custom` | `minimum` | Which scanners run on factory work |
| `security.scanners.custom` | a list of scanners | | Required with `custom` |
| `security.slsa_min` | `L1`, `L2`, `L3` | `L3` | The SLSA level to reach |
| `security.evidence` | `cdx_slsa`, `sbom_only` | `cdx_slsa` | A CycloneDX SBOM with SLSA provenance, or the SBOM alone |
| `tea.publish` | `on_release_tag`, `on_merge_main`, `never` | `on_release_tag` | When releases are published to TEA |
| `jail.enforcementMode` | `enforce`, `warn` | `enforce` | Whether the release jail blocks or only warns. Stored with your release jails. |
| `approve.sensitive_paths` | path globs | none | Paths that stop the factory approving a pull request |

Choosing `custom` without a list is refused with `custom_required`.

## Export

**Export attestation bundle** downloads a zip that indexes the evidence for your managed repositories, optionally limited to some: `manifest.json` has one entry per Pix Sandbox launch evidence pack (its hash, size, attestation state, image digest and storage key) and `slsa.json` the SLSA summary. The packs themselves stay in storage.

## API

| Method | Path |
|---|---|
| GET | `/v1/factory/trust` |
| GET | `/v1/factory/trust/scanners?q=&sarif=1` |
| GET | `/v1/factory/trust/export?repo=` |

## Related

- [Firewalls](/software-factory/evidence/firewalls/)
- [VEX and TEA](/software-factory/evidence/vex-and-tea/)
