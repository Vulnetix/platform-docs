---
title: "VNX-GO-024: Request parameter reaches a dangerous sink without validation"
nav: "VNX-GO-024"
description: "Detects an HTTP request parameter reaching a command, SQL query text, file path, outbound request, redirect or raw response in the same function, inline or through one or two assignments, with no conversion, escaping, allowlist or validation on the way. Bind arguments and values only logged or compared are not reported."
order: 726
sources: ["cli/internal/sast/rules/vnx-go-024.rego", "cli/internal/sast/docs/vnx-go-024.md"]
checked: ["cli@1700795"]
updated: "05 Nov 2026"
generated: true
---

| Field | Value |
|---|---|
| Rule ID | `VNX-GO-024` |
| Severity | Medium |
| SARIF level | `warning` |
| Kind | `sast` |
| Languages | Go |
| CWE | [CWE-20](https://cwe.mitre.org/data/definitions/20.html) |
| CAPEC | [CAPEC-101](https://capec.mitre.org/data/definitions/101.html) |
| ATT&CK | [T1195](https://attack.mitre.org/techniques/T1195/) |
| CWSS vector | `CWSS:1.0/TI:M/AP:A/AL:A/IC:N/FC:LT/RP:N/RL:A/AV:I/AS:N/IN:A/SC:A/BI:M/DI:H/EX:M/EC:N/P:C` |
| Tags | `input-validation` `http` `request` |
| Source | [`internal/sast/rules/vnx-go-024.rego`](https://github.com/Vulnetix/cli/blob/main/internal/sast/rules/vnx-go-024.rego) |

## Overview

This rule flags instances where HTTP request parameters (from form data, query strings, headers, or context values) are used directly without apparent validation or sanitization. This pattern can lead to various security vulnerabilities including injection attacks, bypass of business logic, and other input validation issues.

This maps to [CWE-20: Improper Input Validation](https://cwe.mitre.org/data/definitions/20.html).

## Why this matters

HTTP request parameters are controlled by users and can contain malicious input. When applications use this input directly without validation, attackers can inject malicious payloads that exploit vulnerabilities in downstream systems (databases, command shells, etc.) or bypass intended business logic.

Common attacks that result from missing input validation include SQL injection, command injection, cross-site scripting (XSS), path traversal, and business logic bypass.

## What gets flagged

Reading a request parameter is not a finding; the rule reports the sink the
parameter reaches.

```go
// FLAGGED: a query parameter into a command, through one intermediate variable
host := r.URL.Query().Get("host")
script := "ping -c 1 " + host
out, err := exec.Command("sh", "-c", script).CombinedOutput()

// FLAGGED: a router parameter into SQL text and a file path
id := chi.URLParam(r, "id")
rows, err := db.Query("SELECT * FROM users WHERE id = " + id)
name := mux.Vars(r)["name"]
f, err := os.Open(filepath.Join("/srv/files", name))

// FLAGGED: a header into an outbound request, inline
req, _ := http.NewRequest(http.MethodGet, r.Header.Get("X-Upstream"), nil)

// NOT FLAGGED: a bind argument, a checked value, a converted value
db.Query("SELECT id FROM users WHERE name = $1", name)
if !hostRE.MatchString(host) { return }
id, err := strconv.Atoi(r.URL.Query().Get("id"))

// NOT FLAGGED HERE: request data marked as trusted markup is reported by VNX-GO-020
data["Message"] = template.HTML(r.FormValue("msg"))
```

An html/template trusted-content conversion (`template.HTML`, `template.JS`,
`template.URL`) of a request value is a cross-site scripting finding, and it is
reported by [VNX-GO-020](/sast/rules/vnx-go-020/), which judges that sink more precisely
(sanitisers, constant markup, numeric formatting). This rule does not report the
same line a second time.

## Remediation

1. **Validate all input:** Implement validation for all HTTP request parameters based on expected format, type, and business rules:
   ```go
   // SAFE: Validate input before use
   func searchHandler(w http.ResponseWriter, r *http.Request) {
       query := r.URL.Query().Get("q")
       if !isValidSearchQuery(query) {
           http.Error(w, "Invalid search query", http.StatusBadRequest)
           return
       }
       // Now safe to use
       results := searchDatabase(query)
   }
   
   func isValidSearchQuery(s string) bool {
       // Implement validation logic: length, allowed characters, etc.
       return len(s) <= 100 && !containsDangerousChars(s)
   }
   ```

2. **Use allowlists where possible:** For inputs with known valid values:
   ```go
   // SAFE: Use allowlist for known values
   func sortHandler(w http.ResponseWriter, r *http.Request) {
       sortBy := r.URL.Query().Get("sort")
       allowed := map[string]bool{
           "name": true, "date": true, "price": true,
       }
       if !allowed[sortBy] {
           sortBy = "name" // Default safe value
       }
       // Now safe to use
   }
   ```

3. **Sanitize when appropriate:** For inputs that need to allow a range of values:
   ```go
   // SAFE: Sanitize input for specific contexts
   func redirectHandler(w http.ResponseWriter, r *http.Request) {
       url := r.URL.Query().Get("url")
       if isSafeURL(url) { // Validate it's a safe, allowed URL
           http.Redirect(w, r, url, http.StatusFound)
           return
       }
       http.Error(w, "Invalid redirect URL", http.StatusBadRequest)
   }
   ```

4. **Use context validation:** For context values, ensure they're properly set and validated:
   ```go
   // SAFE: Validate context values
   func apiHandler(ctx context.Context, w http.ResponseWriter, r *http.Request) {
       userIDVal := ctx.Value("userID")
       if userIDVal == nil {
           http.Error(w, "Unauthorized", http.StatusUnauthorized)
           return
       }
       userID, ok := userIDVal.(string)
       if !ok || !isValidUUID(userID) {
           http.Error(w, "Invalid user ID", http.StatusBadRequest)
           return
       }
       // Now safe to use
   }
   ```

## References

- [CWE-20: Improper Input Validation](https://cwe.mitre.org/data/definitions/20.html)
- [OWASP Application Security Verification Standard v4.0 – V5.2 Input Validation](https://owasp.org/www-project-application-security-verification-standard/)
- [OWASP Input Validation Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Input_Validation_Cheat_Sheet.html)
- [Go net/http package documentation](https://pkg.go.dev/net/http)

## Suppressing this rule

Put a `nosec` comment on the line, or on line 1 to cover the whole file. Use the comment marker of the file's language (`#`, `//`, `--` or `;`):

```text
# nosec vnx-go-024
// nosec vnx-go-024
```

Or record an ignore rule: `vulnetix ignore add --rule vnx-go-024 --reason "..."`. See [Suppressing findings](/sast/guides/suppressing-findings/).
