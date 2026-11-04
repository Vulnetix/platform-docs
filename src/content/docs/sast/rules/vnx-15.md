---
title: "VNX-15: External Control of System or Configuration Setting"
nav: "VNX-15"
description: "A value read from an HTTP request is written into a process-wide setting."
order: 100
sources: ["cli/internal/sast/rules/vnx-15.rego", "cli/internal/sast/docs/vnx-15.md"]
checked: ["cli@308165d"]
updated: "05 Nov 2026"
generated: true
---

| Field | Value |
|---|---|
| Rule ID | `VNX-15` |
| Severity | Medium |
| SARIF level | `warning` |
| Kind | `sast` |
| Languages | Go, Java, JavaScript / TypeScript, PHP, Python |
| CWE | [CWE-15](https://cwe.mitre.org/data/definitions/15.html) |
| CAPEC | [CAPEC-66](https://capec.mitre.org/data/definitions/66.html) |
| ATT&CK | [T1190](https://attack.mitre.org/techniques/T1190/) |
| CWSS vector | `CWSS:1.0/TI:M/AP:A/AL:A/IC:N/FC:LT/RP:N/RL:A/AV:I/AS:N/IN:A/SC:A/BI:M/DI:H/EX:M/EC:N/P:C` |
| Tags | `config` `external-control` `injection` `cwe-15` |
| Source | [`internal/sast/rules/vnx-15.rego`](https://github.com/Vulnetix/cli/blob/main/internal/sast/rules/vnx-15.rego) |

## Overview

VNX-15 maps to [CWE-15: External Control of System or Configuration Setting](https://cwe.mitre.org/data/definitions/15.html). It reports a request value written into a setting that governs the whole process, either directly on the setting line or through a variable assigned from the request in the 15 lines above.

## Why this matters

Environment variables, include paths, runtime configuration and the database catalog are read by every later request, library and child process. A caller who can set `HTTP_PROXY`, `include_path`, `sys.path` or the active catalog can redirect outbound traffic, load code from a directory they choose, switch databases or silence logging for everybody, not just for their own request.

## What gets flagged

```go
os.Setenv("TZ", r.FormValue("tz"))

level := r.URL.Query().Get("level")
viper.Set("log.level", level)
```

```python
os.environ["LANG"] = request.form.get("lang", "C")
sys.path.insert(0, request.args["dir"])
```

```javascript
process.env[req.body.key] = req.body.value;
Object.assign(process.env, req.body.overrides);
```

```java
System.setProperty("http.proxyHost", request.getParameter("proxy"));
conn.setCatalog(request.getParameter("catalog"));
```

```php
ini_set('include_path', $_GET['path']);
putenv("TZ=" . $_POST['tz']);
```

Not flagged: constant values, settings taken from the environment or a configuration file, reading the environment next to request data, a request value checked against an allow-list (`not in ALLOWED`, `includes`, `in_array`, a regex match) before the write, and the same text in comments or string literals.

## Remediation

1. Do not let a request choose a process-wide setting. If the feature needs it, map the request to one of a fixed set of values on the server.
2. Keep per-request preferences (locale, time zone, log verbosity) in the request or session, not in the process environment.
3. For JDBC, choose the catalog from the authenticated tenant, never from a parameter.

## References

- [CWE-15: External Control of System or Configuration Setting](https://cwe.mitre.org/data/definitions/15.html)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)

## Suppressing this rule

Put a `nosec` comment on the line, or on line 1 to cover the whole file. Use the comment marker of the file's language (`#`, `//`, `--` or `;`):

```text
# nosec vnx-15
// nosec vnx-15
```

Or record an ignore rule: `vulnetix ignore add --rule vnx-15 --reason "..."`. See [Suppressing findings](/sast/guides/suppressing-findings/).
