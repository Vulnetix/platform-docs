---
title: "VNX-GO-039: Missing rate limiting on login endpoint"
nav: "VNX-GO-039"
description: "Detects Go HTTP login handlers (declared Login/SignIn/Authenticate handlers or inline login routes) when nothing in the project's production Go code rate-limits requests or locks accounts after failed attempts."
order: 741
sources: ["cli/internal/sast/rules/vnx-go-039.rego", "cli/internal/sast/docs/vnx-go-039.md"]
checked: ["cli@de9b52a"]
updated: "02 Nov 2026"
generated: true
---

| Field | Value |
|---|---|
| Rule ID | `VNX-GO-039` |
| Severity | Medium |
| SARIF level | `warning` |
| Kind | `sast` |
| Languages | Go |
| CWE | [CWE-307](https://cwe.mitre.org/data/definitions/307.html) |
| CAPEC | [CAPEC-49](https://capec.mitre.org/data/definitions/49.html) |
| ATT&CK | [T1110](https://attack.mitre.org/techniques/T1110/) |
| CWSS vector | `CWSS:1.0/TI:M/AP:A/AL:A/IC:N/FC:LT/RP:N/RL:A/AV:I/AS:N/IN:A/SC:A/BI:M/DI:H/EX:M/EC:N/P:C` |
| Tags | `rate-limiting` `brute-force` `login` |
| Source | [`internal/sast/rules/vnx-go-039.rego`](https://github.com/Vulnetix/cli/blob/main/internal/sast/rules/vnx-go-039.rego) |

## Overview

This rule flags Go HTTP handler functions whose **name** is the login path (`Login`, `handleLogin`, `SignIn`, `Authenticate`) and that take an `http.ResponseWriter` or a framework context (`*gin.Context`, `echo.Context`, `*fiber.Ctx`), when no production Go file in the project references rate limiting, throttling or a limiter (`rate.NewLimiter`, `tollbooth`, `httprate`, a `limiter` or `throttle` identifier). A limiter configured in middleware in another file protects the handler, so the check is project-wide. A method on a type that happens to be called `Login`, a parser, a CLI command and test files are not login handlers and are not reported.

Credential stuffing, the automated testing of username/password pairs from data breaches, is one of the most common attack techniques against web applications, responsible for billions of fraudulent login attempts daily.

## Why this matters

Without rate limiting, an attacker can attempt authentication with unlimited speed, constrained only by network bandwidth and the server's processing capacity. Modern credential-stuffing tools such as Sentry MBA, OpenBullet, and similar frameworks operate against millions of accounts simultaneously using distributed bot networks that rotate IP addresses, defeat simple IP-based rate limits, and appear as legitimate traffic. Even a modest password list of one million common passwords becomes a viable brute-force attack against a single account if there is no lockout.

The consequences range from account takeover and financial fraud to regulatory exposure under GDPR, PCI-DSS, and SOC 2, all of which include requirements around authentication security. MITRE ATT&CK T1110 (Brute Force) specifically covers credential stuffing, password spraying, and password cracking, all of which are directly enabled by the absence of authentication rate limiting. CAPEC-49 (Password Brute Forcing) describes the full attack pattern in detail. Well-implemented rate limiting reduces the practical value of credential stuffing to near zero.

## What gets flagged

A login handler, by declaration or as an inline route, in a project with no rate limiting anywhere in its production Go code:

```go
// FLAGGED
func handleLogin(w http.ResponseWriter, r *http.Request) {
func SignIn(c *gin.Context) {
func Login(c echo.Context) error {
func (h *Handler) Authenticate(w http.ResponseWriter,
func (s *Server) LoginHandler(w http.ResponseWriter, r *http.Request) {
r.POST("/api/login", func(c *gin.Context) {
```

Not flagged: any project that references a limiter (`rate.NewLimiter`, `httprate`, `tollbooth`, a `limiter` or `throttle`; a CSV `Delimiter` does not count) or an account lockout (`lockout`, `failedAttempts`, `maxLoginAttempts`, a `StatusTooManyRequests` response, a CAPTCHA), methods and functions that are not HTTP handlers (`func (c *Client) Login(ctx, user, pass)`, `ParseLogin`, CLI commands), test files, comments and strings.

## Remediation

1. **Apply per-IP rate limiting using `golang.org/x/time/rate`** or a token-bucket middleware library. Store per-IP limiters in a `sync.Map` with periodic cleanup to prevent memory exhaustion.

   ```go
   import (
       "sync"
       "time"

       "golang.org/x/time/rate"
   )

   var (
       loginLimiters sync.Map
   )

   func getLoginLimiter(ip string) *rate.Limiter {
       limiter, _ := loginLimiters.LoadOrStore(ip,
           rate.NewLimiter(rate.Every(10*time.Second), 3)) // 3 attempts per 10s
       return limiter.(*rate.Limiter)
   }

   // SAFE: rate-limited login handler
   func loginHandler(w http.ResponseWriter, r *http.Request) {
       ip := r.RemoteAddr
       limiter := getLoginLimiter(ip)
       if !limiter.Allow() {
           w.Header().Set("Retry-After", "10")
           http.Error(w, "too many login attempts", http.StatusTooManyRequests)
           return
       }
       // ... authentication logic ...
   }
   ```

2. **Implement account lockout** in addition to IP-based rate limiting. After a configurable number of failed attempts (e.g. 10), lock the account and require email verification to unlock. Store failed attempt counts in Redis or your database, keyed by account identifier.

3. **Use a middleware-level rate limiter** (e.g. `github.com/ulule/limiter`) that enforces limits transparently across all authentication routes, integrates with Redis for distributed deployments, and supports multiple rate limit strategies (sliding window, fixed window, token bucket).

## References

- [CWE-307: Improper Restriction of Excessive Authentication Attempts](https://cwe.mitre.org/data/definitions/307.html)
- [OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)
- [OWASP Credential Stuffing Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Credential_Stuffing_Prevention_Cheat_Sheet.html)
- [CAPEC-49: Password Brute Forcing](https://capec.mitre.org/data/definitions/49.html)
- [MITRE ATT&CK T1110 – Brute Force](https://attack.mitre.org/techniques/T1110/)
- [golang.org/x/time/rate package documentation](https://pkg.go.dev/golang.org/x/time/rate)

## Suppressing this rule

Put a `nosec` comment on the line, or on line 1 to cover the whole file. Use the comment marker of the file's language (`#`, `//`, `--` or `;`):

```text
# nosec vnx-go-039
// nosec vnx-go-039
```

Or record an ignore rule: `vulnetix ignore add --rule vnx-go-039 --reason "..."`. See [Suppressing findings](/sast/guides/suppressing-findings/).
