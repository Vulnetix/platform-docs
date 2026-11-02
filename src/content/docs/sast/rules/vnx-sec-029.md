---
title: "VNX-SEC-029: PyPI upload token hardcoded"
nav: "VNX-SEC-029"
description: "Detect PyPI and TestPyPI API tokens (pypi-AgEIcHlwaS5vcmc or pypi-AgENdGVzdC5weXBpLm9yZw followed by the macaroon body) hardcoded in .pypirc, workflows, Makefiles and scripts."
order: 923
sources: ["cli/internal/sast/rules/vnx-sec-029.rego", "cli/website/content/docs/sast-rules/vnx-sec-029.md"]
checked: ["cli@4c8c3b7"]
updated: "01 Nov 2026"
generated: true
---

| Field | Value |
|---|---|
| Rule ID | `VNX-SEC-029` |
| Severity | High |
| SARIF level | `error` |
| Kind | `secrets` |
| Languages | Any file |
| CWE | [CWE-798](https://cwe.mitre.org/data/definitions/798.html) |
| CAPEC | [CAPEC-191](https://capec.mitre.org/data/definitions/191.html) |
| ATT&CK | [T1195.001](https://attack.mitre.org/techniques/T1195/001/) |
| CWSS vector | `CWSS:1.0/TI:H/AP:A/AL:A/IC:N/FC:LT/RP:N/RL:A/AV:I/AS:N/IN:A/SC:A/BI:H/DI:H/EX:H/EC:N/P:H` |
| Tags | `secret` `pypi` `registry` `supply-chain` `credentials` |
| Source | [`internal/sast/rules/vnx-sec-029.rego`](https://github.com/Vulnetix/cli/blob/main/internal/sast/rules/vnx-sec-029.rego) |

## Overview

This rule flags source files containing a string that matches the PyPI upload token format: the prefix `pypi-AgEIcHlwaS5vcmc` (which is the base64 encoding of the PyPI Macaroon header) followed by at least 50 additional base64url characters. PyPI upload tokens authenticate the `twine upload` and `pip` publish commands. They are scoped either to all packages owned by an account or to a specific project, but any valid token allows publishing new versions to the associated packages.

Publishing a malicious version of an existing package is one of the most impactful supply chain attacks available. Python packages are executed during installation (via `setup.py`) and at import time, giving an attacker arbitrary code execution on every machine that installs the compromised version, including developer workstations, build servers, and production containers.

This rule corresponds to [CWE-798: Use of Hard-coded Credentials](https://cwe.mitre.org/data/definitions/798.html).

## Why This Matters

The Python package ecosystem is particularly exposed to supply chain attacks because of how widely packages are consumed and how automatically updates are applied. A hardcoded PyPI token gives an attacker the ability to publish a new version of any package the token has access to, with code that runs during `pip install` via `setup.py` entry points or during normal application use.

High-profile supply chain attacks against popular packages have demonstrated that even packages with millions of weekly downloads can be compromised through credential theft. Automated dependency update tools like Dependabot and Renovate can cause malicious versions to be pulled into downstream projects within hours.

PyPI tokens are also particularly dangerous because, unlike some credentials, they are long-lived by default and do not expire unless explicitly revoked. A token embedded in a Dockerfile or CI configuration file that was public even briefly could have been harvested and retained by a malicious actor.

## What Gets Flagged

The rule reports the PyPI macaroon prefix (`pypi-AgEIcHlwaS5vcmc`, or `pypi-AgENdGVzdC5weXBpLm9yZw` for test.pypi.org) followed by at least 50 base64url characters with the entropy of a real token:

```text
# FLAGGED
password = pypi-AgEIcHlwaS5vcmc<token body>           (.pypirc)
TWINE_PASSWORD: "pypi-AgEIcHlwaS5vcmc<token body>"    (workflow env)
poetry config pypi-token.pypi pypi-AgEIcHlwaS5vcmc<token body>
```

Not flagged: the bare prefix used as a constant, `pypi-AgEIcHlwaS5vcmcxxxx...` placeholders, `${{ secrets.PYPI_API_TOKEN }}`, and test or fixture paths.

## Remediation

1. **Revoke the token immediately** at [pypi.org/manage/account/token](https://pypi.org/manage/account/token). Delete the exposed token, then audit recent package releases for unexpected versions.

2. **Use Trusted Publishing (OIDC) for CI/CD.** PyPI's Trusted Publishing feature allows GitHub Actions, GitLab CI, and Google Cloud Build to publish without any long-lived credentials. The publisher is authenticated via short-lived OIDC tokens that cannot be stolen from source code:

```yaml
# SAFE: GitHub Actions Trusted Publishing, no token required
- name: Publish to PyPI
  uses: pypa/gh-action-pypi-publish@release/v1
  # No password needed, authentication via OIDC
```

3. **Use environment variables for token-based publishing.** If Trusted Publishing is not available, load the token from a CI secret rather than hardcoding it:

```bash
# SAFE: token injected from CI secret
TWINE_USERNAME=__token__ TWINE_PASSWORD="$PYPI_TOKEN" twine upload dist/*
```

4. **Scope tokens to specific projects.** When creating a new token at pypi.org, scope it to only the specific project it needs to publish rather than granting account-wide access.

## References

- [CWE-798: Use of Hard-coded Credentials](https://cwe.mitre.org/data/definitions/798.html)
- [PyPI – API tokens](https://pypi.org/help/#apitoken)
- [PyPI – Trusted Publishers (OIDC)](https://docs.pypi.org/trusted-publishers/)
- [OWASP Secrets Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html)
- [GitHub Actions – Encrypted secrets](https://docs.github.com/en/actions/security-guides/encrypted-secrets)

## Suppressing this rule

Put a `nosec` comment on the line, or on line 1 to cover the whole file. Use the comment marker of the file's language (`#`, `//`, `--` or `;`):

```text
# nosec vnx-sec-029
// nosec vnx-sec-029
```

Or record an ignore rule: `vulnetix ignore add --rule vnx-sec-029 --reason "..."`. See [Suppressing findings](/sast/guides/suppressing-findings/).
