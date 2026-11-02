---
title: "VNX-BASH-007: Unquoted command substitution in shell script"
nav: "VNX-BASH-007"
description: "Reports an unquoted $(...) or backtick substitution used as a command argument, or a for loop over a file or text listing, where word splitting and globbing break its output into extra arguments. Quoted, assigned, arithmetic, command-position and single-token outputs are not reported."
order: 668
sources: ["cli/internal/sast/rules/vnx-bash-007.rego", "cli/website/content/docs/sast-rules/vnx-bash-007.md"]
checked: ["cli@4c8c3b7"]
updated: "01 Nov 2026"
generated: true
---

| Field | Value |
|---|---|
| Rule ID | `VNX-BASH-007` |
| Severity | Medium |
| SARIF level | `warning` |
| Kind | `sast` |
| Languages | Shell, Any file |
| CWE | [CWE-88](https://cwe.mitre.org/data/definitions/88.html) |
| CAPEC | [CAPEC-88](https://capec.mitre.org/data/definitions/88.html) |
| ATT&CK | [T1059.004](https://attack.mitre.org/techniques/T1059/004/) |
| CWSS vector | `CWSS:1.0/TI:M/AP:A/AL:A/IC:N/FC:LT/RP:N/RL:A/AV:I/AS:N/IN:A/SC:A/BI:M/DI:H/EX:M/EC:N/P:C` |
| Tags | `word-splitting` `bash` `command-substitution` `shell` |
| Source | [`internal/sast/rules/vnx-bash-007.rego`](https://github.com/Vulnetix/cli/blob/main/internal/sast/rules/vnx-bash-007.rego) |

## Overview

This rule reports a command substitution, `$(...)` or a backtick pair, used outside double quotes as an argument of a command in a Bash script (`.sh`, `.bash` and extensionless files with a sh/bash/dash/ksh shebang): `cd $(dirname "$f")`, `chmod 600 $(find ...)`, `tar czf out.tgz $(cat list)`, `export $(grep -v '^#' .env | xargs)`, the first word of a continued command line, and a `for` loop over a file or text listing (`$(ls ...)`, `$(find ...)`, `$(cat ...)`, `$(grep ...)`, `$(git ls-files)`). Not reported: substitutions inside double quotes (including nested ones and multi-line strings), assignments and `${VAR:-$(...)}` defaults, `[[ ]]`, `(( ))` and `$(( ))` arithmetic, `case` words, here-strings and here-document bodies, a substitution in command position (`if ! $(grep -q ...)`), commands whose output is a number or a single token (`seq`, `nproc`, `jobs -p`, `id`, `date`, `wc`, `uname`, `whoami`, `hostname`, `git rev-parse`), `for` loops over other tool output, comments, `echo`/`printf` text, test paths and `.bats` files.

When command output is captured without double-quotes, the shell applies word splitting (splitting on whitespace or the current `IFS`) and glob expansion (expanding `*`, `?`, and `[...]` patterns) to the result before passing it to the enclosing command. A command that produces a filename with spaces, a path with glob characters, or newline-separated output will be split into multiple unexpected arguments.

If the output of the substituted command is at all influenced by attacker-controlled data, a filename from a directory listing, a value from a configuration file, or the output of a tool that processes user input, word splitting can turn that single value into multiple shell arguments, potentially injecting additional flags or operands.

## Why This Matters

Argument injection via unquoted command substitution is a common source of bugs in shell scripts, and it becomes a security issue whenever the substituted command's output can be influenced by an external party. Consider a script that passes the output of a `basename` or `git rev-parse` call into another command without quoting, an attacker who can create a file or branch with a specially crafted name containing spaces or shell metacharacters can inject extra arguments into the receiving command.

Real-world attacks of this form have been demonstrated in CI/CD pipelines where attacker-controlled branch names or tag names flow through shell scripts. GitHub Actions workflows that pass `${{ github.head_ref }}` or similar values into shell scripts are particularly vulnerable when the script then uses unquoted command substitutions that incorporate those values. ATT&CK T1059.004 covers Unix shell interpreter abuse including this injection class.

The fix is mechanical and has zero performance cost: simply add double-quotes around every `$(...)`. If the script genuinely needs to split the output of a command into an array, use `mapfile -t arr < <(command)` or `read -ra arr <<< "$(command)"` instead of relying on unquoted word splitting.

## What Gets Flagged

```bash
chmod 600 $(find /etc/app -name '*.key')       # FLAGGED: a name with a space becomes two
export $(grep -v '^#' .env | xargs)            # FLAGGED: values split and globbed
cp `ls -t backups/*.sql | head -1` /restore/   # FLAGGED: backtick form
for f in $(ls /var/log/app/*.log); do gzip "$f"; done   # FLAGGED
rsync -a \
  $(sed 's/^/--exclude=/' excludes.txt) src/ dst/      # FLAGGED: continued line
```

Not flagged:

```bash
echo "size: $(wc -c < "$f") bytes"
CLI_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
chown $(id -u):$(id -g) /data
make -j$(nproc)
for i in $(seq 1 5); do echo "$i"; done
if (( $(wc -l < file.txt) > 10 )); then :; fi
```

## Remediation

1. Always wrap `$(...)` in double-quotes: `"$(command)"`.
2. When you need the output split into an array, use `mapfile` or `read -ra` rather than relying on unquoted word splitting.
3. Enable ShellCheck in your editor and CI pipeline to catch unquoted substitutions automatically.
4. Prefer `[[ ]]` over `[ ]` for conditional tests, while quoting is still recommended, `[[ ]]` does not perform word splitting.

```bash
# SAFE: command substitution double-quoted
files="$(find /tmp -maxdepth 1 -name '*.log')"
echo "Found: $files"

# SAFE: owner assignment with quoted substitutions
chown "$(id -u)":"$(id -g)" /some/path

# SAFE: comparison with quoted substitution
if [ "$(whoami)" = "root" ]; then echo ok; fi

# SAFE: split into array explicitly instead of relying on word splitting
mapfile -t log_files < <(find /var/log -name "*.log")
for f in "${log_files[@]}"; do
    process "$f"
done
```

## References

- [CWE-88: Improper Neutralisation of Argument Delimiters in a Command](https://cwe.mitre.org/data/definitions/88.html)
- [ShellCheck SC2046 – Quote this to prevent word splitting](https://www.shellcheck.net/wiki/SC2046)
- [BashFAQ/050 – I'm trying to put a command in a variable, but the complex cases always fail](https://mywiki.wooledge.org/BashFAQ/050)
- [OWASP – Command Injection](https://owasp.org/www-community/attacks/Command_Injection)
- [CAPEC-88: OS Command Injection](https://capec.mitre.org/data/definitions/88.html)

## Suppressing this rule

Put a `nosec` comment on the line, or on line 1 to cover the whole file. Use the comment marker of the file's language (`#`, `//`, `--` or `;`):

```text
# nosec vnx-bash-007
// nosec vnx-bash-007
```

Or record an ignore rule: `vulnetix ignore add --rule vnx-bash-007 --reason "..."`. See [Suppressing findings](/sast/guides/suppressing-findings/).
