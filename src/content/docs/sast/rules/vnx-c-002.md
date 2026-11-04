---
title: "VNX-C-002: Format string injection via non-literal format argument"
nav: "VNX-C-002"
description: "Reports C and C++ printf-family calls whose format argument is not a string literal."
order: 670
sources: ["cli/internal/sast/rules/vnx-c-002.rego", "cli/internal/sast/docs/vnx-c-002.md"]
checked: ["cli@308165d"]
updated: "05 Nov 2026"
generated: true
---

| Field | Value |
|---|---|
| Rule ID | `VNX-C-002` |
| Severity | High |
| SARIF level | `error` |
| Kind | `sast` |
| Languages | C, C++ |
| CWE | [CWE-134](https://cwe.mitre.org/data/definitions/134.html) |
| CAPEC | [CAPEC-135](https://capec.mitre.org/data/definitions/135.html) |
| ATT&CK | [T1203](https://attack.mitre.org/techniques/T1203/) |
| CWSS vector | `CWSS:1.0/TI:H/AP:A/AL:A/IC:N/FC:LT/RP:N/RL:A/AV:I/AS:N/IN:A/SC:A/BI:H/DI:H/EX:H/EC:N/P:H` |
| Tags | `format-string` `c` `injection` `memory-safety` |
| Source | [`internal/sast/rules/vnx-c-002.rego`](https://github.com/Vulnetix/cli/blob/main/internal/sast/rules/vnx-c-002.rego) |

## Overview

This rule reports a printf-family call whose format argument is not a string literal, in two shapes. First, the non-literal is the only thing after the format position, so a string is printed as a format: `printf(buf)`, `fprintf(fp, msg)`, `syslog(LOG_ERR, msg)`, `snprintf(buf, n, s)`, `dprintf`, `wprintf`, `swprintf`, `wsprintf`, `printk`, and BSD `warn`/`warnx`/`err`/`errx` in files that include `<err.h>`. This is the shape `-Wformat-security` warns about. Second, the format, with further arguments, is `argv[...]` or `getenv(...)` directly, or a variable assigned from `getenv`/`argv` or filled by `fgets`/`read`/`recv`/`fread`/`getline`/`scanf` in the 25 lines above (including `asprintf`, `vprintf`, `vfprintf`, `vsnprintf`, `vsyslog` and the other v-forms). It does not report literal formats (adjacent literals, macro prefixes such as `KERN_INFO "..."`, literal ternaries, gettext `_("...")`), upper-case macro formats, a variable initialised from a literal or a literal table in the same file, a format that is a parameter of the enclosing variadic wrapper, macro definitions, prototypes, methods named `printf`, string literals and comments.

A format string vulnerability occurs when attacker-controlled data is used as the format string itself. The `printf` family parses the format string for specifiers (`%s`, `%d`, `%x`, `%n`, etc.) and pulls corresponding arguments off the call stack. If the attacker controls the format string, they can read arbitrary stack values using `%x` or `%s`, or write the count of bytes printed to an attacker-chosen address using `%n`, enabling arbitrary memory writes with no overflow required.

## Why this matters

Format string vulnerabilities were a defining vulnerability class of the early 2000s and remain in production code today, particularly in logging paths and error-handling code where a variable message is passed directly to a print function for convenience.

Real-world examples demonstrate the full severity:

- **CVE-2000-0573 (wu-ftpd)**, The `lreply()` function in wu-ftpd 2.6.0 and earlier passed user-supplied FTP `SITE EXEC` and `SITE INDEX` command arguments directly as the format string to a `*printf` call. Exploitation allowed remote, unauthenticated attackers to overwrite the saved return address on the stack and execute arbitrary code as root. Anonymous FTP access was sufficient to trigger the vulnerability. A Metasploit module for this CVE exists and remains functional against unpatched systems.
- **CVE-2000-0666 (rpc.statd)**, The `rpc.statd` daemon's logging code passed a hostname from an untrusted NFS NOTIFY message directly to `syslog()` as the format string, allowing remote root exploitation.
- **CVE-2000-0733 (SGI IRIX telnetd)**, `telnetd` on IRIX called `syslog()` with an attacker-controlled environment variable used directly as the format argument.

Even where `%n` is disabled by the platform's libc (Microsoft's CRT disables it by default; some Linux configurations restrict it via `PRINTF_FORTIFY`), `%s` with a misaligned stack layout can still read confidential memory, leaking cryptographic keys, session tokens, or password hashes. This maps to CAPEC-135 (Format String Injection) and ATT&CK T1203.

**SEI CERT C rule:** FIO30-C, Exclude user input from format strings.

**OWASP ASVS v4.0:** V5.2.1, Verify that the application uses memory-safe string, safer memory copy, and pointer arithmetic to detect or prevent stack, buffer, or heap overflows.

## What gets flagged

```c
// FLAGGED: a received or composed string printed as the format
syslog(LOG_ERR, peer_message);
fprintf(out, peer_message);
snprintf(line, sizeof(line), "client %d: %s\n", id, reason);
printf(line);

// FLAGGED: format read from input, argv or the environment
if (fgets(user_msg, sizeof(user_msg), stdin) == NULL)
    return 1;
printf(user_msg);
fprintf(stderr, argv[1], user);
const char *log_format = getenv("LOG_FORMAT");
vfprintf(stderr, log_format, ap);

// FLAGGED: Windows variant with a caller-supplied format
wsprintfA(text, caption);
```

Not flagged: `printf("%s", msg)`, `printf(COLOR "done\n")`, `printf(_("Saved %d files"), n)`, a format variable initialised from a literal table in the same file, and a variadic wrapper that forwards its own `fmt` parameter with `va_list`.

## Remediation

The fix is always the same: **use a string literal as the format argument** and pass dynamic values as subsequent arguments.

```c
// SAFE: literal format string; user data is an argument, not the format
char user_msg[256];
fgets(user_msg, sizeof(user_msg), stdin);
printf("%s", user_msg);

// SAFE: syslog with literal format
syslog(LOG_ERR, "%s", log_buffer);

// SAFE: fputs/fputc for simple string output, no format parsing at all
fputs(error_message, stderr);
fputc('\n', stderr);

// SAFE: sprintf with a literal format
sprintf(output, "%d: %s", code, dynamic_format);
```

For logging frameworks that accept a format string parameter, audit every call site to ensure the format argument is a string literal. Linters and code review checklists should treat any `printf`-family call where the format position is not a `"` as a defect.

**Compiler flags that help catch this at build time:**

```sh
# -Wformat and -Wformat-security are included in -Wall for GCC/Clang
-Wall -Wformat-security
-Werror=format-security    # turn format-security warnings into build errors
-D_FORTIFY_SOURCE=2        # adds runtime detection for some format-string misuse
```

`-Wformat-security` causes GCC and Clang to warn (and with `-Werror=format-security`, to fail the build) whenever a `printf`-family call is made with a non-literal format string where the function accepts a format argument. This flag catches many instances at compile time; this SAST rule catches patterns in cases where the compiler does not have enough context.

## References

- [CWE-134: Use of Externally-Controlled Format String](https://cwe.mitre.org/data/definitions/134.html)
- [SEI CERT C – FIO30-C: Exclude user input from format strings](https://wiki.sei.cmu.edu/confluence/display/c/FIO30-C.+Exclude+user+input+from+format+strings)
- [CAPEC-135: Format String Injection](https://capec.mitre.org/data/definitions/135.html)
- [OWASP – Format String Attack](https://owasp.org/www-community/attacks/Format_string_attack)
- [CVE-2000-0573 – wu-ftpd lreply format string (NVD)](https://nvd.nist.gov/vuln/detail/CVE-2000-0573)
- [Metasploit: WU-FTPD SITE EXEC/INDEX Format String module](https://www.rapid7.com/db/modules/exploit/multi/ftp/wuftpd_site_exec_format/)
- [Acunetix – Uncontrolled Format String](https://www.acunetix.com/vulnerabilities/web/uncontrolled-format-string/)

## Suppressing this rule

Put a `nosec` comment on the line, or on line 1 to cover the whole file. Use the comment marker of the file's language (`#`, `//`, `--` or `;`):

```text
# nosec vnx-c-002
// nosec vnx-c-002
```

Or record an ignore rule: `vulnetix ignore add --rule vnx-c-002 --reason "..."`. See [Suppressing findings](/sast/guides/suppressing-findings/).
