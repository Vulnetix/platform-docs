---
title: "VNX-PY-015: Python ReDoS via user-controlled regular expression"
nav: "VNX-PY-015"
description: "Detect request data (Flask, Django, DRF or a Flask/FastAPI route parameter) used as the pattern of re or regex compile, match, search, findall, sub or split without re.escape(), which lets an attacker submit a catastrophically backtracking pattern (ReDoS)."
order: 869
sources: ["cli/internal/sast/rules/vnx-py-015.rego", "cli/internal/sast/docs/vnx-py-015.md"]
checked: ["cli@1700795"]
updated: "05 Nov 2026"
generated: true
---

| Field | Value |
|---|---|
| Rule ID | `VNX-PY-015` |
| Severity | High |
| SARIF level | `error` |
| Kind | `sast` |
| Languages | Python |
| CWE | [CWE-1333](https://cwe.mitre.org/data/definitions/1333.html) |
| CAPEC | [CAPEC-197](https://capec.mitre.org/data/definitions/197.html) |
| ATT&CK | [T1499.004](https://attack.mitre.org/techniques/T1499/004/) |
| CWSS vector | `CWSS:1.0/TI:H/AP:A/AL:A/IC:N/FC:LT/RP:N/RL:A/AV:I/AS:N/IN:A/SC:A/BI:H/DI:H/EX:H/EC:N/P:H` |
| Tags | `redos` `regex` `dos` `python` |
| Source | [`internal/sast/rules/vnx-py-015.rego`](https://github.com/Vulnetix/cli/blob/main/internal/sast/rules/vnx-py-015.rego) |

## Overview

This rule detects Python code that uses a value read from the request as the *pattern* of a regular expression: `re` or `regex` (or an alias such as `import re as rx`) calling `compile`, `match`, `search`, `fullmatch`, `findall`, `finditer`, `sub`, `subn` or `split`. The value may be read inline (`request.args`, `request.form`, `request.values`, `request.json`, `request.GET`, `request.POST`), assigned to a variable first (up to two assignments, including f-strings and concatenation), or be a route parameter such as `<pat>` in `@app.route("/grep/<pat>")`. When an attacker can control the regex pattern, they can craft a pathological expression that causes catastrophic backtracking, consuming CPU and memory until the application becomes unresponsive.

Not reported: a pattern passed through `re.escape()`, a fixed or configured pattern, user text used only as the subject being searched (`EMAIL.match(email)`), argparse and settings values, and comments or strings that merely mention the call.

## Why this matters

Regular Expression Denial of Service (ReDoS) is a practical, low-effort attack. A single HTTP request with a carefully crafted regex pattern can:

- Pin a CPU core at 100% for seconds, minutes, or longer
- Block the event loop or worker thread handling the request, causing cascading timeouts
- Bring down an entire application if enough malicious requests arrive in parallel
- Bypass rate limiters, since the attack payload is tiny but the compute cost is enormous

Python's `re` module uses a backtracking NFA engine, which is inherently vulnerable to patterns with nested quantifiers or ambiguous alternations. Even patterns that look harmless, like `(a+)+b`, can exhibit exponential backtracking.

## What gets flagged

This rule flags lines where a request parameter is passed directly to a `re` function:

```python
# Flagged: user-controlled regex pattern from Flask request
pattern = re.compile(request.args.get("q"))

# Flagged: search with request form data
result = re.search(request.form["pattern"], text)

# Flagged: match with request data
if re.match(request.data, some_string):
    ...

# Flagged: fullmatch with JSON body
re.fullmatch(request.json["regex"], input_text)
```

The rule applies only to `.py` files.

## Remediation

1. **Never let users supply raw regex patterns.** If you need user-driven search, use literal string matching (`str.find()`, `str.count()`, or `fnmatch` for glob patterns) instead of regex:

   ```python
   # Safe: literal substring search
   results = [item for item in items if query in item.lower()]
   ```

2. **Use the `google-re2` library for linear-time matching.** The RE2 engine guarantees O(n) execution regardless of pattern complexity, eliminating catastrophic backtracking entirely:

   ```python
   import re2

   # Safe: RE2 guarantees linear-time matching
   pattern = re2.compile(user_input)
   result = pattern.search(text)
   ```

   Install with: `pip install google-re2`

3. **If you must use Python's `re` module, validate and constrain the pattern.** Escape user input with `re.escape()` if it should be treated as a literal:

   ```python
   import re

   # Safe: escape treats the input as a literal string, not a pattern
   safe_pattern = re.escape(request.args.get("q", ""))
   results = re.findall(safe_pattern, text)
   ```

4. **Set a timeout for regex operations.** Python 3.11+ supports the `timeout` parameter:

   ```python
   import re

   try:
       result = re.search(fixed_pattern, text, timeout=1.0)
   except re.error:
       # Pattern evaluation exceeded timeout
       abort(400, "Search pattern too complex")
   ```

5. **Reject patterns that contain dangerous constructs.** If users must supply patterns, reject those with nested quantifiers like `(a+)+`, `(a*)*`, or `(a|b)*` before compilation.

## References

- [CWE-1333: Inefficient Regular Expression Complexity](https://cwe.mitre.org/data/definitions/1333.html)
- [OWASP: Regular Expression Denial of Service (ReDoS)](https://owasp.org/www-community/attacks/Regular_expression_Denial_of_Service_-_ReDoS)
- [CAPEC-197: Exponential Data Expansion](https://capec.mitre.org/data/definitions/197.html)
- [MITRE ATT&CK T1499.004 – Application or System Exploitation](https://attack.mitre.org/techniques/T1499/004/)
- [google-re2 Python Library](https://github.com/google/re2)
- [Python re Module Documentation](https://docs.python.org/3/library/re.html)
- [OWASP ASVS V5 – Validation, Sanitization, and Encoding](https://owasp.org/www-project-application-security-verification-standard/)

## Suppressing this rule

Put a `nosec` comment on the line, or on line 1 to cover the whole file. Use the comment marker of the file's language (`#`, `//`, `--` or `;`):

```text
# nosec vnx-py-015
// nosec vnx-py-015
```

Or record an ignore rule: `vulnetix ignore add --rule vnx-py-015 --reason "..."`. See [Suppressing findings](/sast/guides/suppressing-findings/).
