---
title: "VNX-SEC-077: Mapbox access token"
nav: "VNX-SEC-077"
description: "Reports a whole Mapbox public access token (pk.eyJ... with its signature) in any file, excluding secret sk. tokens, placeholders, environment references, minified and test files."
order: 971
sources: ["cli/internal/sast/rules/vnx-sec-077.rego", "cli/website/content/docs/sast-rules/vnx-sec-077.md"]
checked: ["cli@4c8c3b7"]
updated: "01 Nov 2026"
generated: true
---

| Field | Value |
|---|---|
| Rule ID | `VNX-SEC-077` |
| Severity | High |
| SARIF level | `error` |
| Kind | `secrets` |
| Languages | Any file |
| CWE | [CWE-798](https://cwe.mitre.org/data/definitions/798.html) |
| CAPEC | [CAPEC-191](https://capec.mitre.org/data/definitions/191.html) |
| ATT&CK | [T1552.001](https://attack.mitre.org/techniques/T1552/001/) |
| CWSS vector | `CWSS:1.0/TI:H/AP:A/AL:A/IC:N/FC:LT/RP:N/RL:A/AV:I/AS:N/IN:A/SC:A/BI:H/DI:H/EX:H/EC:N/P:H` |
| Tags | `secrets` `mapbox` `credentials` |
| Source | [`internal/sast/rules/vnx-sec-077.rego`](https://github.com/Vulnetix/cli/blob/main/internal/sast/rules/vnx-sec-077.rego) |

## Overview

This rule reports a Mapbox public access token: `pk.`, its base64url payload (`eyJ...`), a dot and a 22-character signature, quoted, assigned to `mapboxgl.accessToken`, in a tile URL (`?access_token=pk...`) or in a `.env` file. Public tokens are meant for browser code, so the finding asks you to confirm the token is URL- and scope-restricted, and to rotate it if it is not.

## Why This Matters

Hardcoded mapbox access token values are routinely scraped by automated bots within minutes of a public push, and then used to access the account, exfiltrate data, or pivot into downstream services. Once the credential is in git history it is permanently in third-party hands.

## What Gets Flagged

```javascript
// FLAGGED
mapboxgl.accessToken = 'pk.eyJ<payload>.<22-character signature>';
```

```python
# FLAGGED: token in a tile URL
TILE_URL = "https://api.mapbox.com/styles/v1/mapbox/streets-v12/tiles/{z}/{x}/{y}?access_token=pk.eyJ<payload>.<signature>"
```

Not flagged:

- Secret `sk.` tokens, which VNX-SEC-904 reports.
- Environment references (`import.meta.env.VITE_MAPBOX_TOKEN`) and the bare `pk.eyJ` prefix.
- Placeholder, truncated or low-entropy tokens.
- Test, fixture, vendored, minified and generated files.

## Remediation

1. **Revoke the leaked credential** in the provider's console immediately.
2. **Replace with a short-lived alternative**, OAuth 2.0 access tokens, IAM role assumption, OIDC federation, wherever the platform supports it.
3. **Store the new credential in a secrets manager** (AWS Secrets Manager, HashiCorp Vault, GitHub Actions secrets, Doppler).
4. **Audit the provider's access logs** for activity you did not initiate between the leak and the revocation.
5. **Purge from git history** with `git filter-repo` or BFG, then re-scan with gitleaks/truffleHog to confirm no other secrets remain.
6. **Enable push protection** so future commits are blocked at the developer machine.

## References

- [CWE-798: Use of Hard-coded Credentials](https://cwe.mitre.org/data/definitions/798.html)
- [gitleaks](https://github.com/gitleaks/gitleaks)
- [truffleHog](https://github.com/trufflesecurity/trufflehog)
- [OWASP Credentials Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Credentials_Management_Cheat_Sheet.html)
- [MITRE ATT&CK T1552.001 – Credentials In Files](https://attack.mitre.org/techniques/T1552/001/)
- [git-filter-repo](https://github.com/newren/git-filter-repo)

## Suppressing this rule

Put a `nosec` comment on the line, or on line 1 to cover the whole file. Use the comment marker of the file's language (`#`, `//`, `--` or `;`):

```text
# nosec vnx-sec-077
// nosec vnx-sec-077
```

Or record an ignore rule: `vulnetix ignore add --rule vnx-sec-077 --reason "..."`. See [Suppressing findings](/sast/guides/suppressing-findings/).
