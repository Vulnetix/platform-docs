---
title: "VNX-SEC-028: npm access token hardcoded"
nav: "VNX-SEC-028"
description: "Detect npm access tokens (npm_ followed by exactly 36 letters or digits) in any file, and legacy UUID auth tokens written literally in .npmrc, .yarnrc or .yarnrc.yml (or echoed into one as //registry/:_authToken=), ignoring ${NPM_TOKEN} references, npm_config_* names and placeholders."
order: 922
sources: ["cli/internal/sast/rules/vnx-sec-028.rego", "cli/website/content/docs/sast-rules/vnx-sec-028.md"]
checked: ["cli@4c8c3b7"]
updated: "01 Nov 2026"
generated: true
---

| Field | Value |
|---|---|
| Rule ID | `VNX-SEC-028` |
| Severity | High |
| SARIF level | `error` |
| Kind | `secrets` |
| Languages | Any file |
| CWE | [CWE-798](https://cwe.mitre.org/data/definitions/798.html) |
| CAPEC | [CAPEC-191](https://capec.mitre.org/data/definitions/191.html) |
| ATT&CK | [T1552.001](https://attack.mitre.org/techniques/T1552/001/) |
| CWSS vector | `CWSS:1.0/TI:H/AP:A/AL:A/IC:N/FC:LT/RP:N/RL:A/AV:I/AS:N/IN:A/SC:A/BI:H/DI:H/EX:H/EC:N/P:H` |
| Tags | `secret` `npm` `registry` `credentials` |
| Source | [`internal/sast/rules/vnx-sec-028.rego`](https://github.com/Vulnetix/cli/blob/main/internal/sast/rules/vnx-sec-028.rego) |

## Overview

This rule flags source files containing a string that matches the npm access token format: the prefix `npm_` followed by exactly 36 alphanumeric characters. npm access tokens are used to authenticate with the npm registry for operations such as publishing packages, reading private packages, and modifying organization or team settings. The token's capabilities depend on its type: automation tokens and publish tokens allow package publishing, while read-only tokens are limited to package downloads.

A publish token hardcoded in source code represents one of the most serious supply chain risks in the JavaScript ecosystem. An attacker who obtains a publish token for a widely-used package can release a malicious version that runs arbitrary code on the machines of every developer who installs or updates that package.

This rule corresponds to [CWE-798: Use of Hard-coded Credentials](https://cwe.mitre.org/data/definitions/798.html).

## Why This Matters

npm package supply chain attacks are a well-documented attack vector with real-world impact. High-profile incidents have demonstrated how a single compromised publish token can result in malicious code being distributed to tens of thousands of downstream projects within hours of a release. The malicious code runs during `npm install` (via lifecycle scripts) or at runtime, exfiltrating secrets, establishing reverse shells, or installing cryptocurrency miners.

Even read-only tokens hardcoded in source represent a risk if the organization uses a private npm registry for proprietary packages. An attacker with read access to the registry can download proprietary code, examine dependencies for further vulnerabilities, and use the registry as a staging point for further attacks.

Token exposure in source code is especially dangerous because npm tokens do not expire by default. A token committed years ago and never rotated remains valid until explicitly revoked.

## What Gets Flagged

The rule reports `npm_` followed by exactly 36 letters or digits, delimited on both sides, in any file, and a legacy UUID token assigned to `_authToken` or `npmAuthToken` in `.npmrc` or `.yarnrc.yml`:

```text
# FLAGGED
//registry.npmjs.org/:_authToken=npm_<36 characters>
//registry.npmjs.org/:_authToken=<uuid>                (in .npmrc)
NODE_AUTH_TOKEN: npm_<36 characters>                  (workflow env)
RUN echo "//registry.npmjs.org/:_authToken=npm_<36 characters>" > .npmrc
```

Not flagged: `${NPM_TOKEN}` references, `process.env.npm_package_version` and other `npm_*` identifiers, `npm_xxxx...` or all-zero placeholders, and test or fixture paths.

## Remediation

1. **Revoke the token immediately** at [npmjs.com/settings/tokens](https://www.npmjs.com/settings/tokens). Delete the exposed token and generate a new one with the minimum required scope.

2. **Use an environment variable to provide the token in `.npmrc`.** The standard pattern for CI publishing is to reference an environment variable:

```ini
# SAFE: .npmrc references an environment variable
//registry.npmjs.org/:_authToken=${NPM_TOKEN}
```

3. **Use granular automation tokens.** When publishing from CI/CD, use an automation token rather than a full-access token. Automation tokens bypass 2FA requirements for CI but are otherwise scoped to publishing only:

```bash
# SAFE: generate an automation token with minimal scope
npm token create --type=automation --cidr-whitelist=203.0.113.0/24
```

4. **Enable npm Provenance.** When publishing from GitHub Actions, use npm's provenance feature to link published packages to the CI run, reducing the value of a stolen token since publications can be attributed and audited:

```yaml
# SAFE: publish with provenance from GitHub Actions
- name: Publish to npm
  run: npm publish --provenance
  env:
    NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

## References

- [CWE-798: Use of Hard-coded Credentials](https://cwe.mitre.org/data/definitions/798.html)
- [npm – Access tokens documentation](https://docs.npmjs.com/about-access-tokens)
- [npm – Generating and using access tokens](https://docs.npmjs.com/creating-and-viewing-access-tokens)
- [OWASP Secrets Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html)
- [npm – Provenance and package signing](https://docs.npmjs.com/generating-provenance-statements)

## Suppressing this rule

Put a `nosec` comment on the line, or on line 1 to cover the whole file. Use the comment marker of the file's language (`#`, `//`, `--` or `;`):

```text
# nosec vnx-sec-028
// nosec vnx-sec-028
```

Or record an ignore rule: `vulnetix ignore add --rule vnx-sec-028 --reason "..."`. See [Suppressing findings](/sast/guides/suppressing-findings/).
