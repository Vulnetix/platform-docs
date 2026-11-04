---
title: "VNX-GO-025: Potential open redirect via HTTP redirect"
nav: "VNX-GO-025"
description: "Detects a redirect (http.Redirect, gin/echo/fiber Redirect, a Location header) whose target is a query, form or route parameter, directly or through one variable built from it, with no allowlist or host check first."
order: 727
sources: ["cli/internal/sast/rules/vnx-go-025.rego", "cli/internal/sast/docs/vnx-go-025.md"]
checked: ["cli@de9b52a"]
updated: "02 Nov 2026"
generated: true
---

| Field | Value |
|---|---|
| Rule ID | `VNX-GO-025` |
| Severity | Medium |
| SARIF level | `warning` |
| Kind | `sast` |
| Languages | Go |
| CWE | [CWE-601](https://cwe.mitre.org/data/definitions/601.html) |
| CAPEC | [CAPEC-610](https://capec.mitre.org/data/definitions/610.html) |
| ATT&CK | [T1046](https://attack.mitre.org/techniques/T1046/) |
| CWSS vector | `CWSS:1.0/TI:M/AP:A/AL:A/IC:N/FC:LT/RP:N/RL:A/AV:I/AS:N/IN:A/SC:A/BI:M/DI:H/EX:M/EC:N/P:C` |
| Tags | `open-redirect` `http` `redirect` |
| Source | [`internal/sast/rules/vnx-go-025.rego`](https://github.com/Vulnetix/cli/blob/main/internal/sast/rules/vnx-go-025.rego) |

## Overview

This rule flags instances where HTTP redirect functions (like `http.Redirect`) use user-controlled input to determine the redirect destination without proper validation. This pattern can lead to open redirect vulnerabilities where attackers can redirect users to malicious websites.

This maps to [CWE-601: URL Redirection to Untrusted Site ('Open Redirect')](https://cwe.mitre.org/data/definitions/601.html).

## Why this matters

Open redirect vulnerabilities occur when an application accepts user-controlled input to determine the destination of a redirect without proper validation. Attackers can craft URLs that appear to link to a trusted site but actually redirect victims to malicious sites for phishing, malware distribution, or credential theft.

These vulnerabilities are often overlooked but can be highly effective in social engineering attacks because the initial URL appears legitimate.

## What gets flagged

A redirect whose target the requester chooses: a query, form or route parameter that reaches `http.Redirect`, a framework `Redirect`, or a `Location` header, directly or through one variable built from it.

```go
// FLAGGED: ?next= is sent straight back as the redirect target
next := r.URL.Query().Get("next")
http.Redirect(w, r, next, http.StatusFound)

// FLAGGED: gin, with the value inline
c.Redirect(http.StatusFound, c.Query("return_to"))

// FLAGGED: a host built from the parameter
host := r.URL.Query().Get("tenant")
u := fmt.Sprintf("https://%s/home", host)
http.Redirect(w, r, u, http.StatusFound)

// FLAGGED: a Location header
w.Header().Set("Location", r.URL.Query().Get("RelayState"))
```

Not flagged: a target checked first (`strings.HasPrefix`, a map or switch allowlist, `url.Parse` followed by a `Host`/`IsAbs` test, a helper named `isSafeRedirect`), a value placed after a fixed path (`"/users/" + id`) or a fixed `https://host/`, values passed through `url.QueryEscape`, constant targets, and the `Referer`/`Host` headers.

## Remediation

1. **Validate redirect URLs against an allowlist:** Only allow redirects to trusted domains or paths:
   ```go
   // SAFE: Validate against allowlist
   func loginHandler(w http.ResponseWriter, r *http.Request) {
       redirectURL := r.FormValue("redirect")
       if isAllowedRedirectURL(redirectURL) {
           http.Redirect(w, r, redirectURL, http.StatusFound)
           return
       }
       // Default to safe location
       http.Redirect(w, r, "/", http.StatusFound)
   }
   
   func isAllowedRedirectURL(url string) bool {
       // Parse URL and check host against allowed domains
       u, err := url.Parse(url)
       if err != nil {
           return false
       }
       allowed := map[string]bool{
           "example.com": true,
           "www.example.com": true,
       }
       return allowed[u.Host] && u.IsAbs() // Only absolute URLs to allowed domains
   }
   ```

2. **Use relative paths for internal redirects:** When redirecting within your own site:
   ```go
   // SAFE: Use relative paths that you control
   func handler(w http.ResponseWriter, r *http.Request) {
       // Validate it's a relative path without dangerous elements
       redirectPath := r.FormValue("redirect")
       if strings.HasPrefix(redirectPath, "/") && 
          !strings.Contains(redirectPath, "..") &&
          !strings.Contains(redirectPath, "//") {
           http.Redirect(w, r, redirectPath, http.StatusFound)
           return
       }
       http.Error(w, "Invalid redirect path", http.StatusBadRequest)
   }
   ```

3. **Implement redirect validation middleware:** Create reusable validation logic:
   ```go
   // SAFE: Middleware for redirect validation
   func redirectValidator(next http.Handler) http.Handler {
       return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
           if r.URL.Path == "/redirect" {
               target := r.URL.Query().Get("url")
               if !isSafeRedirectTarget(target) {
                   http.Error(w, "Invalid redirect URL", http.StatusBadRequest)
                   return
               }
           }
           next.ServeHTTP(w, r)
       })
   }
   ```

4. **Use URL parsing and validation:** Always parse and validate URLs properly:
   ```go
   // SAFE: Proper URL validation
   func isSafeRedirectTarget(input string) bool {
       if input == "" {
           return false
       }
       
       // Prevent protocol-relative URLs that could be dangerous
       if strings.HasPrefix(input, "//") {
           return false
       }
       
       u, err := url.Parse(input)
       if err != nil {
           return false
       }
       
       // Allow only relative paths or known safe absolute URLs
       if !u.IsAbs() {
           // Relative path - additional validation
           return strings.HasPrefix(u.Path, "/") && 
                  !strings.Contains(u.Path, "..")
       }
       
       // Absolute URL - check against allowlist
       allowedHosts := map[string]bool{
           "example.com": true,
           "trusted-partner.com": true,
       }
       return allowedHosts[u.Hostname()]
   }
   ```

## References

- [CWE-601: URL Redirection to Untrusted Site ('Open Redirect')](https://cwe.mitre.org/data/definitions/601.html)
- [OWASP Application Security Verification Standard v4.0 – V4.1.2 Redirect Validation](https://owasp.org/www-project-application-security-verification-standard/)
- [OWASP Open Redirect Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Open_Redirect_Cheat_Sheet.html)
- [Go net/http package documentation](https://pkg.go.dev/net/http)
- [Go net/url package documentation](https://pkg.go.dev/net/url)

## Suppressing this rule

Put a `nosec` comment on the line, or on line 1 to cover the whole file. Use the comment marker of the file's language (`#`, `//`, `--` or `;`):

```text
# nosec vnx-go-025
// nosec vnx-go-025
```

Or record an ignore rule: `vulnetix ignore add --rule vnx-go-025 --reason "..."`. See [Suppressing findings](/sast/guides/suppressing-findings/).
