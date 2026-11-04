---
title: "VNX-SEC-067: Curl command with embedded credentials"
nav: "VNX-SEC-067"
description: "Detects curl invocations that pass a literal user:password (or an API key as the user) with -u/--user."
order: 961
sources: ["cli/internal/sast/rules/vnx-sec-067.rego", "cli/internal/sast/docs/vnx-sec-067.md"]
checked: ["cli@1700795"]
updated: "05 Nov 2026"
generated: true
---

| Field | Value |
|---|---|
| Rule ID | `VNX-SEC-067` |
| Severity | High |
| SARIF level | `error` |
| Kind | `secrets` |
| Languages | Any file |
| CWE | [CWE-798](https://cwe.mitre.org/data/definitions/798.html) |
| CAPEC | [CAPEC-191](https://capec.mitre.org/data/definitions/191.html) |
| ATT&CK | [T1552.001](https://attack.mitre.org/techniques/T1552/001/) |
| CWSS vector | `CWSS:1.0/TI:H/AP:A/AL:A/IC:N/FC:LT/RP:N/RL:A/AV:I/AS:N/IN:A/SC:A/BI:H/DI:H/EX:H/EC:N/P:H` |
| Tags | `secrets` `curl` `credentials` |
| Source | [`internal/sast/rules/vnx-sec-067.rego`](https://github.com/Vulnetix/cli/blob/main/internal/sast/rules/vnx-sec-067.rego) |

## Overview

This rule reports a curl command that passes a literal credential with `-u user:password`, `-uuser:password`, `--user user:password` or `--user=user:password`: on the curl line, on a backslash-continued line of the same command, or as the argument after `"-u"` in an argv list (`subprocess.run(["curl", "-u", ...])`, `exec.Command("curl", "-u", ...)`, including a list split over lines up to six lines below its `"curl"` element). An API key passed as the user with an empty password (`-u sk_xxx:`) is reported when it is long and high-entropy. The password is masked in the snippet.

It does not report credentials taken from variables or commands (`$USER:$PASS`, `${NEXUS_PASS}`, `$(cat ...)`), a user with no password (curl prompts for it), `--negotiate -u :`, default or placeholder pairs (`user:password`, `admin:admin`, `changeme`), the `-u` of another command (`sudo -u`, `docker run -u`, a command after a pipe), comment lines, Markdown/reStructuredText/AsciiDoc, and test, fixture, vendored and generated files.

## What gets flagged

```sh
curl -fsS -u backup:Tq8vL2mZp9Wx -T dump.sql.gz https://files.acme-corp.io/backups/
curl -fsS \
  -u 'uploader:Kp4wQ8zN2rTx' \
  https://maven.acme-corp.io/releases/app.jar
```

```python
subprocess.run(["curl", "-fsS", "-u", "svc:Mn4Bv7Cx2Lk9", url], check=True)
```

Not flagged:

```sh
curl -u "${NEXUS_USER}:${NEXUS_PASS}" https://nexus.acme-corp.io/
curl -u deployer https://nexus.acme-corp.io/
```

## Why this matters

Hardcoded curl command with embedded credentials values are routinely scraped by automated bots within minutes of a public push, and then used to access the account, exfiltrate data, or pivot into downstream services. Once the credential is in git history it is permanently in third-party hands.

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
# nosec vnx-sec-067
// nosec vnx-sec-067
```

Or record an ignore rule: `vulnetix ignore add --rule vnx-sec-067 --reason "..."`. See [Suppressing findings](/sast/guides/suppressing-findings/).
