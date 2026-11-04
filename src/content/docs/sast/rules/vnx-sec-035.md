---
title: "VNX-SEC-035: DigitalOcean personal access token"
nav: "VNX-SEC-035"
description: "Reports a DigitalOcean API token: a standalone dop_v1_ personal access token, doo_v1_ OAuth access token or dor_v1_ OAuth refresh token followed by exactly 64 hex characters. Placeholder values and test or fixture paths are not reported."
order: 929
sources: ["cli/internal/sast/rules/vnx-sec-035.rego", "cli/internal/sast/docs/vnx-sec-035.md"]
checked: ["cli@1700795"]
updated: "05 Nov 2026"
generated: true
---

| Field | Value |
|---|---|
| Rule ID | `VNX-SEC-035` |
| Severity | Critical |
| SARIF level | `error` |
| Kind | `secrets` |
| Languages | Any file |
| CWE | [CWE-798](https://cwe.mitre.org/data/definitions/798.html) |
| CAPEC | [CAPEC-191](https://capec.mitre.org/data/definitions/191.html) |
| ATT&CK | [T1552.001](https://attack.mitre.org/techniques/T1552/001/) |
| CWSS vector | `CWSS:1.0/TI:C/AP:A/AL:A/IC:N/FC:LT/RP:N/RL:A/AV:I/AS:N/IN:A/SC:A/BI:C/DI:H/EX:H/EC:N/P:W` |
| Tags | `secrets` `digitalocean` `credentials` |
| Source | [`internal/sast/rules/vnx-sec-035.rego`](https://github.com/Vulnetix/cli/blob/main/internal/sast/rules/vnx-sec-035.rego) |

## Overview

This rule detects DigitalOcean personal access tokens (`dop_v1_<64 hex>`) and OAuth tokens (`doo_v1_<64 hex>`) hardcoded in source files. These tokens grant full API access to the user's DigitalOcean account, including the ability to create and destroy droplets, modify load balancers, and read state databases.

## Why this matters

DigitalOcean tokens are commonly leaked via `.env` files committed to GitHub. The compromise pattern is well-documented: bots scan for `dop_v1_` / `doo_v1_` prefixes, validate the token, and immediately spin up cryptomining droplets billed to the victim.

## What gets flagged

Flagged (`dop_v1_`, `doo_v1_` or `dor_v1_` followed by exactly 64 lower-case hex characters):

```hcl
provider "digitalocean" {
  token = "dop_v1_<64 hex characters>"
}
```

Not flagged: `token = var.do_token`, `dop_v1_xxxx…` placeholders, truncated examples such as `dop_v1_abc123`, and test or fixture files.

## Remediation

1. **Revoke the token in the DigitalOcean control panel** → API → Tokens/Revoke.
2. **Replace with an OAuth application** where possible, or a scoped token with read-only access.
3. **Store new tokens in a secrets manager** (Doppler, Vault, AWS SSM, GitHub Actions secrets).
4. **Audit Droplet, Volume, and Snapshot creation events** in the DigitalOcean activity log.
5. **Purge from git history** with `git filter-repo` and re-scan.

## References

- [DigitalOcean API Tokens](https://docs.digitalocean.com/reference/api/digitalocean/)
- [CWE-798: Use of Hard-coded Credentials](https://cwe.mitre.org/data/definitions/798.html)
- [gitleaks `digitalocean-pat`](https://github.com/gitleaks/gitleaks)
- [MITRE ATT&CK T1552.001](https://attack.mitre.org/techniques/T1552/001/)

## Suppressing this rule

Put a `nosec` comment on the line, or on line 1 to cover the whole file. Use the comment marker of the file's language (`#`, `//`, `--` or `;`):

```text
# nosec vnx-sec-035
// nosec vnx-sec-035
```

Or record an ignore rule: `vulnetix ignore add --rule vnx-sec-035 --reason "..."`. See [Suppressing findings](/sast/guides/suppressing-findings/).
