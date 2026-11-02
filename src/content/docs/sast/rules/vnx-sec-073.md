---
title: "VNX-SEC-073: URL with embedded credentials"
nav: "VNX-SEC-073"
description: "Reports an http(s), ws(s), ftp(s) or sftp URL that embeds a literal user:password pair, excluding interpolated and placeholder passwords, loopback and example hosts, database schemes, docs and test files."
order: 967
sources: ["cli/internal/sast/rules/vnx-sec-073.rego", "cli/website/content/docs/sast-rules/vnx-sec-073.md"]
checked: ["cli@4c8c3b7"]
updated: "01 Nov 2026"
generated: true
---

| Field | Value |
|---|---|
| Rule ID | `VNX-SEC-073` |
| Severity | High |
| SARIF level | `error` |
| Kind | `secrets` |
| Languages | Any file |
| CWE | [CWE-798](https://cwe.mitre.org/data/definitions/798.html) |
| CAPEC | [CAPEC-191](https://capec.mitre.org/data/definitions/191.html) |
| ATT&CK | [T1552.001](https://attack.mitre.org/techniques/T1552/001/) |
| CWSS vector | `CWSS:1.0/TI:H/AP:A/AL:A/IC:N/FC:LT/RP:N/RL:A/AV:I/AS:N/IN:A/SC:A/BI:H/DI:H/EX:H/EC:N/P:H` |
| Tags | `secrets` `url` `credentials` |
| Source | [`internal/sast/rules/vnx-sec-073.rego`](https://github.com/Vulnetix/cli/blob/main/internal/sast/rules/vnx-sec-073.rego) |

## Overview

This rule reports a web or file-transfer URL (`http://`, `https://`, `ws://`, `wss://`, `ftp://`, `ftps://`, `sftp://`, also `git+https://`) whose user-info segment carries a literal password. The password is masked in the finding's snippet.

## Why This Matters

Hardcoded url with embedded credentials values are routinely scraped by automated bots within minutes of a public push, and then used to access the account, exfiltrate data, or pivot into downstream services. Once the credential is in git history it is permanently in third-party hands.

## What Gets Flagged

```python
# FLAGGED: password inside a package-index URL
resp = requests.get("https://ci-bot:<password>@nexus.acme-corp.io/repository/raw/build.tgz")
```

```ini
# FLAGGED: pip.conf
index-url = https://pypi-reader:<password>@pypi.acme-corp.io/simple/
```

Not flagged:

- Interpolated or templated passwords: `f"https://{user}:{password}@host"`, `${GIT_TOKEN}`, `$CI_TOKEN`, `%GIT_TOKEN%`, `{{ .Password }}`, `%s`, string concatenation.
- Default or placeholder words (`password`, `changeme`, `admin`, the user name repeated, an upper-case name such as `API_KEY`), `***` masks and passwords shorter than four characters.
- Hosts on `localhost`/`127.0.0.1`/`::1` and placeholder hosts (`example.com`, `host`).
- Database and broker schemes (`postgres://`, `mysql://`, `mongodb://`, `redis://`, `amqp://`): VNX-SEC-008, VNX-SEC-061 to VNX-SEC-064 and VNX-SEC-578 report those.
- Markdown and `*.example`/`*.sample`/`*.template` files, and test, fixture, vendored and generated files.

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
# nosec vnx-sec-073
// nosec vnx-sec-073
```

Or record an ignore rule: `vulnetix ignore add --rule vnx-sec-073 --reason "..."`. See [Suppressing findings](/sast/guides/suppressing-findings/).
