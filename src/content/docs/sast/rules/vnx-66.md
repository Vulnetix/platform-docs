---
title: "VNX-66: Improper Handling of File Names that Identify Virtual Resources"
nav: "VNX-66"
description: "An uploaded file is stored under the name the client sent, so a name such as CON, NUL, AUX."
order: 104
sources: ["cli/internal/sast/rules/vnx-66.rego", "cli/internal/sast/docs/vnx-66.md"]
checked: ["cli@308165d"]
updated: "05 Nov 2026"
generated: true
---

| Field | Value |
|---|---|
| Rule ID | `VNX-66` |
| Severity | Medium |
| SARIF level | `warning` |
| Kind | `sast` |
| Languages | C#, Go, Java, Python |
| CWE | [CWE-66](https://cwe.mitre.org/data/definitions/66.html) |
| CAPEC | [CAPEC-66](https://capec.mitre.org/data/definitions/66.html) |
| ATT&CK | [T1190](https://attack.mitre.org/techniques/T1190/) |
| CWSS vector | `CWSS:1.0/TI:M/AP:RU/AL:S/IC:N/FC:LT/RP:RU/RL:S/AV:L/AS:N/IN:A/SC:A/BI:M/DI:H/EX:M/EC:N/P:C` |
| Tags | `filename` `virtual-resource` `windows` `upload` `cwe-66` |
| Source | [`internal/sast/rules/vnx-66.rego`](https://github.com/Vulnetix/cli/blob/main/internal/sast/rules/vnx-66.rego) |

## Overview

VNX-66 maps to [CWE-66: Improper Handling of File Names that Identify Virtual Resources](https://cwe.mitre.org/data/definitions/66.html). It reports a client-supplied upload file name used as the on-disk file name, on the write line or through a variable assigned from it in the 15 lines above.

## Why this matters

On Windows, `CON`, `PRN`, `AUX`, `NUL`, `COM1`-`COM9` and `LPT1`-`LPT9` name devices in every directory, with or without an extension. An upload called `aux.png` or `con.txt` does not create a file: the write blocks the worker, vanishes into `NUL`, or goes to a serial port. `Path.GetFileName`, `basename` and `FilenameUtils.getName` remove directories but leave the device name intact.

## What gets flagged

```python
f = request.files["document"]
f.save(os.path.join(UPLOAD_DIR, f.filename))
```

```java
file.transferTo(new File(dir, file.getOriginalFilename()));
```

```csharp
var path = Path.Combine(_env.WebRootPath, "uploads", file.FileName);

string filename = Path.GetFileName(FileUpload1.FileName);
FileUpload1.SaveAs(Server.MapPath("~/uploads/") + filename);
```

```go
dst, err := os.Create(filepath.Join("uploads", header.Filename))
```

Not flagged: a name passed through `secure_filename` or a sanitize function, a generated name on the write line (UUID, GUID, `GetRandomFileName`, a hash or timestamp), a project that checks names against the reserved device list, a name that is only logged or stored as data, and test code.

## Remediation

1. Store uploads under a generated name (a UUID plus a validated extension) and keep the original name as metadata.
2. If the original name must be used, run it through `werkzeug.utils.secure_filename` or an equivalent that rejects reserved device names, and reject names whose stem is `CON`, `PRN`, `AUX`, `NUL`, `COM1`-`COM9` or `LPT1`-`LPT9`.

## References

- [CWE-66: Improper Handling of File Names that Identify Virtual Resources](https://cwe.mitre.org/data/definitions/66.html)
- [Microsoft: Naming Files, Paths, and Namespaces](https://learn.microsoft.com/windows/win32/fileio/naming-a-file)

## Suppressing this rule

Put a `nosec` comment on the line, or on line 1 to cover the whole file. Use the comment marker of the file's language (`#`, `//`, `--` or `;`):

```text
# nosec vnx-66
// nosec vnx-66
```

Or record an ignore rule: `vulnetix ignore add --rule vnx-66 --reason "..."`. See [Suppressing findings](/sast/guides/suppressing-findings/).
