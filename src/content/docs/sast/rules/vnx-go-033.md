---
title: "VNX-GO-033: JWT missing audience validation"
nav: "VNX-GO-033"
description: "Detects Go JWT verification (golang-jwt Parse/ParseWithClaims/NewParser, jwx Parse, go-jose ParseSigned) with no audience check in its arguments or its file, and go-oidc configs with SkipClientIDCheck: true."
order: 735
sources: ["cli/internal/sast/rules/vnx-go-033.rego", "cli/internal/sast/docs/vnx-go-033.md"]
checked: ["cli@1700795"]
updated: "05 Nov 2026"
generated: true
---

| Field | Value |
|---|---|
| Rule ID | `VNX-GO-033` |
| Severity | Medium |
| SARIF level | `warning` |
| Kind | `sast` |
| Languages | Go |
| CWE | [CWE-347](https://cwe.mitre.org/data/definitions/347.html) |
| CAPEC | [CAPEC-64](https://capec.mitre.org/data/definitions/64.html) |
| ATT&CK | [T1059.007](https://attack.mitre.org/techniques/T1059/007/) |
| CWSS vector | `CWSS:1.0/TI:M/AP:A/AL:A/IC:N/FC:LT/RP:N/RL:A/AV:I/AS:N/IN:A/SC:A/BI:M/DI:H/EX:M/EC:N/P:C` |
| Tags | `jwt` `token` `audience` `authentication` |
| Source | [`internal/sast/rules/vnx-go-033.rego`](https://github.com/Vulnetix/cli/blob/main/internal/sast/rules/vnx-go-033.rego) |

## Overview

This rule flags Go code that parses JWTs without validating the `aud` (audience) claim, either by not calling `VerifyAudience`, by omitting `RegisteredClaims.Audience` from the claims struct, or by not passing an expected audience to the parser. The `aud` claim identifies the intended recipients of a JWT. Without audience validation, a token legitimately issued for service A can be replayed against service B, which may grant unintended access if both services share the same signing key. This maps to [CWE-347: Improper Verification of Cryptographic Signature](https://cwe.mitre.org/data/definitions/347.html).

Audience validation is a mandatory check in multi-service or multi-tenant architectures. It ensures that even a cryptographically valid, unexpired token cannot be used outside of its intended context. This is particularly important in microservice deployments where many services may share a common identity provider and signing infrastructure.

## Why this matters

In a typical microservice deployment, an API gateway issues JWTs scoped to specific backend services. If a downstream service does not validate the `aud` claim, an attacker who obtains a token intended for a low-privilege service (e.g., a public-facing read-only API) can replay it against a high-privilege internal service (e.g., an admin management API) if both share the same JWT signing key. The token is cryptographically valid and unexpired, the only distinguishing factor is the audience claim.

This attack is subtle because it requires no token forgery, only token replay across service boundaries. It is especially prevalent in platforms where developers share JWT secrets across environments or services for operational convenience, unknowingly enabling cross-service token replay. RFC 7519 requires that recipient systems validate the `aud` claim when it is present, and OAuth 2.0 frameworks mandate it for bearer tokens.

## What gets flagged

A JWT verification whose own arguments carry no `jwt.WithAudience`, in a file where nothing else checks the audience, and an OIDC verifier with the client-ID check turned off:

```go
// FLAGGED: issuer checked, audience not
tok, err := jwt.Parse(raw, keyFunc, jwt.WithIssuer("https://id.example.com"))

// FLAGGED: v4 ParseWithClaims with no VerifyAudience anywhere in the file
_, err := jwt.ParseWithClaims(
    raw,
    claims,
    keyFunc,
)

// FLAGGED: a parser built without WithAudience
var parser = jwt.NewParser(jwt.WithValidMethods([]string{"RS256"}))

// FLAGGED: the same call through an import alias (jwtlib "github.com/golang-jwt/jwt/v5")
tok, err := jwtlib.ParseWithClaims(raw, claims, keyFunc, jwtlib.WithIssuer(iss))

// FLAGGED: go-jose token validated against an Expected with no audience
tok, err := jwt.ParseSigned(raw, []jose.SignatureAlgorithm{jose.ES256})

// FLAGGED: go-oidc skips the aud check
provider.Verifier(&oidc.Config{SkipClientIDCheck: true})
```

Not flagged: `jwt.Parse(raw, kf, jwt.WithAudience("api.example.com"))`, a file that calls `claims.VerifyAudience(aud, true)` or validates `jwt.Expected{AnyAudience: ...}`, `jwt.NewParser().ParseUnverified(...)` (no verification at all, a different weakness), a custom claims struct whose `Aud` field is compared, a wrapper that forwards its caller's `opts...`, test files, comments and strings. An audience check made in a different file is not seen.

## Remediation

1. **Pass the expected audience to the parser** using `jwt.WithAudience` in golang-jwt/jwt v5, which automatically enforces the `aud` claim:
   ```go
   // SAFE: audience validated by parser option
   import (
       "errors"
       "github.com/golang-jwt/jwt/v5"
   )

   const expectedAudience = "https://api.myservice.example.com"

   type AppClaims struct {
       UserID string `json:"user_id"`
       jwt.RegisteredClaims
   }

   func parseToken(tokenStr string) (*AppClaims, error) {
       token, err := jwt.ParseWithClaims(tokenStr, &AppClaims{}, keyFunc,
           jwt.WithAudience(expectedAudience),
           jwt.WithExpirationRequired(),
       )
       if err != nil {
           return nil, err
       }
       claims, ok := token.Claims.(*AppClaims)
       if !ok || !token.Valid {
           return nil, errors.New("invalid token")
       }
       return claims, nil
   }
   ```

2. **When issuing tokens**, always set the `aud` claim to the specific service or set of services the token is valid for:
   ```go
   // SAFE: audience set at issuance
   func issueToken(userID string) (string, error) {
       claims := AppClaims{
           UserID: userID,
           RegisteredClaims: jwt.RegisteredClaims{
               Audience:  jwt.ClaimStrings{"https://api.myservice.example.com"},
               ExpiresAt: jwt.NewNumericDate(time.Now().Add(15 * time.Minute)),
               IssuedAt:  jwt.NewNumericDate(time.Now()),
               Issuer:    "https://auth.myservice.example.com",
           },
       }
       token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
       return token.SignedString(jwtSecret)
   }
   ```

3. **Use separate signing keys per service** as an additional defense-in-depth measure. Even if audience validation is accidentally omitted, a token for service A cannot be cryptographically verified by service B if the keys differ.

## References

- [CWE-347: Improper Verification of Cryptographic Signature](https://cwe.mitre.org/data/definitions/347.html)
- [OWASP JSON Web Token Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/JSON_Web_Token_for_Java_Cheat_Sheet.html)
- [OWASP Top 10 A07:2021 – Identification and Authentication Failures](https://owasp.org/Top10/A07_2021-Identification_and_Authentication_Failures/)
- [RFC 7519 Section 4.1.3 – "aud" (Audience) Claim](https://datatracker.ietf.org/doc/html/rfc7519#section-4.1.3)
- [golang-jwt/jwt v5 – WithAudience parser option](https://pkg.go.dev/github.com/golang-jwt/jwt/v5#WithAudience)
- [OAuth 2.0 Bearer Token Usage – RFC 6750](https://datatracker.ietf.org/doc/html/rfc6750)
- [CAPEC-64: Using Slashdot Effect](https://capec.mitre.org/data/definitions/64.html)

## Suppressing this rule

Put a `nosec` comment on the line, or on line 1 to cover the whole file. Use the comment marker of the file's language (`#`, `//`, `--` or `;`):

```text
# nosec vnx-go-033
// nosec vnx-go-033
```

Or record an ignore rule: `vulnetix ignore add --rule vnx-go-033 --reason "..."`. See [Suppressing findings](/sast/guides/suppressing-findings/).
