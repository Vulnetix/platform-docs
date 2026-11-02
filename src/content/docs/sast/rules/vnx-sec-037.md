---
title: "VNX-SEC-037: HashiCorp Vault token"
nav: "VNX-SEC-037"
description: "Reports a HashiCorp Vault token: a standalone hvs. service token (24 or more base62 characters, so root and namespaced tokens are included), an hvb. batch token (138 to 300 characters), or a legacy s. service token (24 characters) only where it is assigned to a Vault token setting (VAULT_TOKEN=, vault_token:, X-Vault-Token:) or passed to vault login. A bare s.-prefixed word, a short hvs. run with no digit (a property access on a variable named hvs), a token = line inside a multi-line vault block, placeholders and test or fixture paths are not reported."
order: 931
sources: ["cli/internal/sast/rules/vnx-sec-037.rego", "cli/website/content/docs/sast-rules/vnx-sec-037.md"]
checked: ["cli@4c8c3b7"]
updated: "01 Nov 2026"
generated: true
---

| Field | Value |
|---|---|
| Rule ID | `VNX-SEC-037` |
| Severity | Critical |
| SARIF level | `error` |
| Kind | `secrets` |
| Languages | Any file |
| CWE | [CWE-798](https://cwe.mitre.org/data/definitions/798.html) |
| CAPEC | [CAPEC-191](https://capec.mitre.org/data/definitions/191.html) |
| ATT&CK | [T1552.001](https://attack.mitre.org/techniques/T1552/001/) |
| CWSS vector | `CWSS:1.0/TI:C/AP:A/AL:A/IC:N/FC:LT/RP:N/RL:A/AV:I/AS:N/IN:A/SC:A/BI:C/DI:H/EX:H/EC:N/P:W` |
| Tags | `secrets` `vault` `hashicorp` `credentials` |
| Source | [`internal/sast/rules/vnx-sec-037.rego`](https://github.com/Vulnetix/cli/blob/main/internal/sast/rules/vnx-sec-037.rego) |

## Overview

This rule detects HashiCorp Vault tokens in three formats:
- `hvb.<138-300 chars>`: batch token
- `hvs.<24+ chars>`: service token (root tokens are the short form)
- `s.<24 chars>`: legacy service token, reported only where it is assigned to a Vault token setting

Vault tokens grant the ability to read every secret the token's policy allows, which often includes database credentials, API keys, and signing keys for downstream services.

## Why This Matters

A leaked Vault token is the keys to the kingdom for whatever secrets Vault is managing. Unlike cloud-issued tokens, Vault policies are entirely under your control, a token with `database/creds/read` grants the ability to issue short-lived database credentials on demand, which can then be used to exfiltrate the entire database.

## What Gets Flagged

Flagged:

```bash
VAULT_TOKEN=hvs.<24+ characters>                     # service or root token
export VAULT_TOKEN=s.<24 characters>                 # legacy token, in a Vault setting
curl -H "X-Vault-Token: s.<24 characters>" ...
```

```yaml
vault:
  token: hvb.<138-300 characters>                    # batch token
```

Not flagged: an `s.` word outside a Vault token setting (`s.abcdefghijklmnopqrstuvwx` in JavaScript), `os.environ["VAULT_TOKEN"]`, `hvs.xxxx…` placeholders, and test or fixture files.

## Remediation

1. **Revoke the token in Vault** with `vault token revoke <token>` or via the UI.
2. **Audit the token's accessor in the Vault audit log** to see what secrets were read.
3. **Rotate every secret the token's policy allowed**, since the attacker may have already read them.
4. **Use short-lived tokens** (Kubernetes auth, AWS IAM, GCP IAM) with a 1-hour TTL instead of long-lived ones.
5. **Purge from git history** with `git filter-repo`.

## References

- [Vault Tokens](https://developer.hashicorp.com/vault/docs/concepts/tokens)
- [Vault Audit Devices](https://developer.hashicorp.com/vault/docs/audit)
- [CWE-798: Use of Hard-coded Credentials](https://cwe.mitre.org/data/definitions/798.html)
- [gitleaks `vault-batch-token`, `vault-service-token`](https://github.com/gitleaks/gitleaks)
- [truffleHog HashiCorp Vault detector](https://github.com/trufflesecurity/trufflehog)
- [MITRE ATT&CK T1552.001](https://attack.mitre.org/techniques/T1552/001/)

## Suppressing this rule

Put a `nosec` comment on the line, or on line 1 to cover the whole file. Use the comment marker of the file's language (`#`, `//`, `--` or `;`):

```text
# nosec vnx-sec-037
// nosec vnx-sec-037
```

Or record an ignore rule: `vulnetix ignore add --rule vnx-sec-037 --reason "..."`. See [Suppressing findings](/sast/guides/suppressing-findings/).
