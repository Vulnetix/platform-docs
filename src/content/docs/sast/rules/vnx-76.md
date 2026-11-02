---
title: "VNX-76: Improper Neutralization of Equivalent Special Elements"
nav: "VNX-76"
description: "A dangerous multi-character sequence (an HTML tag other than script, vbscript:, &&, $(, a SQL or script keyword) is neutralised by deleting it once, so input that rebuilds it after the deletion passes through. Traversal, script-tag and javascript: removals are reported by VNX-182."
order: 106
sources: ["cli/internal/sast/rules/vnx-76.rego", "cli/internal/sast/docs/vnx-76.md"]
checked: ["cli@de9b52a"]
updated: "02 Nov 2026"
generated: true
---

| Field | Value |
|---|---|
| Rule ID | `VNX-76` |
| Severity | Medium |
| SARIF level | `warning` |
| Kind | `sast` |
| Languages | Java, JavaScript / TypeScript, PHP, Python |
| CWE | [CWE-76](https://cwe.mitre.org/data/definitions/76.html) |
| CAPEC | [CAPEC-66](https://capec.mitre.org/data/definitions/66.html) |
| ATT&CK | [T1190](https://attack.mitre.org/techniques/T1190/) |
| CWSS vector | `CWSS:1.0/TI:M/AP:RU/AL:S/IC:N/FC:LT/RP:RU/RL:S/AV:L/AS:N/IN:A/SC:A/BI:M/DI:H/EX:M/EC:N/P:C` |
| Tags | `equivalent-elements` `sanitization` `blacklist` `cwe-76` |
| Source | [`internal/sast/rules/vnx-76.rego`](https://github.com/Vulnetix/cli/blob/main/internal/sast/rules/vnx-76.rego) |

## Overview

VNX-76 maps to [CWE-76: Improper Neutralization of Equivalent Special Elements](https://cwe.mitre.org/data/definitions/76.html). It reports a single-pass removal, a replacement with the empty string, of a sequence that an attacker can reassemble from the pieces left behind.

## Why This Matters

Deleting a sequence once does not remove it from the input, only from one spelling of it. `....//` becomes `../`, `<scr<script>ipt>` becomes `<script>`, `&;&` becomes `&&` once `;` is also stripped, and `hthttp://tp://` becomes `http://`. The filter gives the appearance of protection and the attack still lands.

## What Gets Flagged

```python
return q.replace("UNION", "").replace(" ", "")
```

```javascript
return html.replace(/<iframe/g, '');
return url.replaceAll('vbscript:', '');
return cmd.replace('&&', '').replace('||', '');
```

```java
userId = userId.toUpperCase().replace("FROM", "").replace("SELECT", "");
```

```php
$target = str_replace(array('&&', ';'), '', $target);
```

Not flagged: a removal repeated in a loop until the sequence is gone, removal of a single character (it cannot be rebuilt), a replacement with a non-empty string (`&lt;`, `_`), a URL scheme stripped to get a host name with no other removal nearby, test code, comments and strings.

Not flagged here because [VNX-182](/sast/rules/vnx-182/) reports the same collapse on that line: a removal of a path-traversal sequence (`../`, `..\`, `..`), a script tag or element pattern (`<script>`, `</script>`, `<script[^>]*>`) or `javascript:`, and an `http://`/`https://` strip beside one of them, such as `str_replace( array( "../", "..\\" ), "", $file )` or `str_replace( '<script>', '', $name )`.

## Remediation

1. Reject input that contains the sequence instead of editing it.
2. For output, encode for the context (HTML-escape, a templating engine's autoescape) rather than strip tags.
3. For paths, take the basename or canonicalise and check containment.
4. For SQL, use parameterised queries; keyword filters are never sufficient.

## References

- [CWE-76: Improper Neutralization of Equivalent Special Elements](https://cwe.mitre.org/data/definitions/76.html)
- [CWE-182: Collapse of Data into Unsafe Value](https://cwe.mitre.org/data/definitions/182.html)

## Suppressing this rule

Put a `nosec` comment on the line, or on line 1 to cover the whole file. Use the comment marker of the file's language (`#`, `//`, `--` or `;`):

```text
# nosec vnx-76
// nosec vnx-76
```

Or record an ignore rule: `vulnetix ignore add --rule vnx-76 --reason "..."`. See [Suppressing findings](/sast/guides/suppressing-findings/).
