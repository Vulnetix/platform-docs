---
title: "VNX-JAVA-022: Java insecure temporary file creation"
nav: "VNX-JAVA-022"
description: "Detects File.createTempFile() in the shared temp directory (created with umask permissions, often world-readable) and fixed or user-derived file names under /tmp or java.io.tmpdir, which are open to symlink and pre-creation attacks."
order: 770
sources: ["cli/internal/sast/rules/vnx-java-022.rego", "cli/internal/sast/docs/vnx-java-022.md"]
checked: ["cli@de9b52a"]
updated: "02 Nov 2026"
generated: true
---

| Field | Value |
|---|---|
| Rule ID | `VNX-JAVA-022` |
| Severity | Medium |
| SARIF level | `warning` |
| Kind | `sast` |
| Languages | Java |
| CWE | [CWE-377](https://cwe.mitre.org/data/definitions/377.html) |
| CAPEC | [CAPEC-29](https://capec.mitre.org/data/definitions/29.html) |
| ATT&CK | [T1036](https://attack.mitre.org/techniques/T1036/) |
| CWSS vector | `CWSS:1.0/TI:M/AP:RU/AL:S/IC:N/FC:LT/RP:RU/RL:S/AV:L/AS:N/IN:A/SC:A/BI:M/DI:H/EX:M/EC:N/P:C` |
| Tags | `file` `tempfile` `race-condition` `java` |
| Source | [`internal/sast/rules/vnx-java-022.rego`](https://github.com/Vulnetix/cli/blob/main/internal/sast/rules/vnx-java-022.rego) |

## Overview

Temporary files created with `File.createTempFile()` are world-readable by default on many Unix-like systems. Any local user or process can read or overwrite the file between the moment it is created and the moment the application writes sensitive content to it, a classic Time-of-Check to Time-of-Use (TOCTOU) race condition described by CWE-377 (Insecure Temporary File). Constructing a predictable path such as `new File("/tmp/" + username + ".tmp")` is even more dangerous because an attacker can pre-create the path as a symlink pointing to an arbitrary file, causing the application to write to or overwrite that target.

This rule flags two patterns: direct calls to `File.createTempFile()`, and string concatenations that build a path starting with `/tmp/`. Both patterns indicate that the safer `Files.createTempFile()` NIO2 API has not been used, and that restrictive POSIX permissions have not been applied.

The secure replacement, `Files.createTempFile()` in a restricted temporary directory combined with `PosixFilePermissions` set to `OWNER_READ | OWNER_WRITE`, creates the file with a randomly generated name and restricts access to the owning process from the moment of creation, leaving no window for race conditions.

## Why this matters

Local privilege escalation and data exfiltration attacks frequently exploit insecure temporary file handling. On a multi-tenant server, a shared hosting environment, a CI runner, or any container where multiple processes share a filesystem, an unprivileged attacker can monitor `/tmp` with `inotifywait`, detect newly created files matching predictable name patterns, and race to read or replace them before the application writes sensitive content.

Symlink attacks are particularly reliable: the attacker pre-creates `/tmp/app-export.csv -> /etc/cron.d/backdoor` before the application runs. When the application creates and writes to that path, it silently writes to the symlink target instead, potentially with elevated privileges if the application runs as a service account.

The same class of vulnerability affects automated pipelines and build tools that write intermediate artifacts to `/tmp` with predictable names. Build systems running as the CI service account are high-value targets precisely because they often have elevated repository or deployment permissions.

## What gets flagged

```java
// FLAGGED: File.createTempFile() without restrictive permissions
File tmp = File.createTempFile("export-", ".csv");
try (FileWriter fw = new FileWriter(tmp)) {
    fw.write(sensitiveData);
}

// FLAGGED: predictable path constructed under /tmp/
File report = new File("/tmp/" + userId + "-report.pdf");
report.createNewFile();
```

## Remediation

1. **Use `Files.createTempFile()` with explicit POSIX permissions.** The NIO2 API creates the file atomically with a randomly generated name and allows you to set permissions at creation time.

2. **Create temp files inside a private temporary directory** when writing multiple related files, so the directory itself is the access-controlled container.

3. **Delete temp files in a `finally` block or register a shutdown hook** to avoid leaving sensitive data on disk.

```java
// SAFE: NIO2 temp file with owner-only permissions
import java.nio.file.*;
import java.nio.file.attribute.*;
import java.util.Set;

Set<PosixFilePermission> ownerOnly = PosixFilePermissions.fromString("rw-------");
FileAttribute<Set<PosixFilePermission>> attrs = PosixFilePermissions.asFileAttribute(ownerOnly);

Path tmpFile = Files.createTempFile("export-", ".csv", attrs);
try {
    Files.writeString(tmpFile, sensitiveData);
    // process file
} finally {
    Files.deleteIfExists(tmpFile);
}
```

```java
// SAFE: private temp directory for multiple files
Path tmpDir = Files.createTempDirectory("app-work-");
tmpDir.toFile().setReadable(false, false);
tmpDir.toFile().setReadable(true, true);  // owner only
```

## References

- [CWE-377: Insecure Temporary File](https://cwe.mitre.org/data/definitions/377.html)
- [OWASP File Upload Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html)
- [Java SE: Files.createTempFile()](https://docs.oracle.com/en/java/docs/api/java.base/java/nio/file/Files.html#createTempFile(java.lang.String,java.lang.String,java.nio.file.attribute.FileAttribute...))
- [Java SE: PosixFilePermissions](https://docs.oracle.com/en/java/docs/api/java.base/java/nio/file/attribute/PosixFilePermissions.html)
- [CAPEC-29: Leveraging Time-of-Check and Time-of-Use (TOCTOU) Race Conditions](https://capec.mitre.org/data/definitions/29.html)

## Suppressing this rule

Put a `nosec` comment on the line, or on line 1 to cover the whole file. Use the comment marker of the file's language (`#`, `//`, `--` or `;`):

```text
# nosec vnx-java-022
// nosec vnx-java-022
```

Or record an ignore rule: `vulnetix ignore add --rule vnx-java-022 --reason "..."`. See [Suppressing findings](/sast/guides/suppressing-findings/).
