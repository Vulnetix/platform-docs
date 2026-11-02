---
title: "VNX-GO-034: OAuth redirect URI without validation against allowlist"
nav: "VNX-GO-034"
description: "Detects Go OAuth flows that redirect to, or configure, a redirect_uri taken from the request without comparing it against the client's registered redirect URIs."
order: 736
sources: ["cli/internal/sast/rules/vnx-go-034.rego", "cli/website/content/docs/sast-rules/vnx-go-034.md"]
checked: ["cli@4c8c3b7"]
updated: "01 Nov 2026"
generated: true
---

| Field | Value |
|---|---|
| Rule ID | `VNX-GO-034` |
| Severity | Medium |
| SARIF level | `warning` |
| Kind | `sast` |
| Languages | Go |
| CWE | [CWE-601](https://cwe.mitre.org/data/definitions/601.html) |
| CAPEC | [CAPEC-610](https://capec.mitre.org/data/definitions/610.html) |
| ATT&CK | [T1046](https://attack.mitre.org/techniques/T1046/) |
| CWSS vector | `CWSS:1.0/TI:M/AP:A/AL:A/IC:N/FC:LT/RP:N/RL:A/AV:I/AS:N/IN:A/SC:A/BI:M/DI:H/EX:M/EC:N/P:C` |
| Tags | `oauth` `redirect-uri` `validation` `allowlist` |
| Source | [`internal/sast/rules/vnx-go-034.rego`](https://github.com/Vulnetix/cli/blob/main/internal/sast/rules/vnx-go-034.rego) |

## Overview

This rule flags Go code where `http.Redirect` or a `Redirect` call receives a redirect destination sourced from user-supplied input, `r.FormValue`, `r.URL.Query().Get`, `r.PostFormValue`, or `r.Header.Get`, without a preceding check against an allowlist, allowed list, or validity function such as `isAllowed`, `isValid`, `allowlist`, or `validRedirects`. OAuth 2.0 authorization endpoints are a high-value target because they are designed to redirect the browser; an attacker who can control the destination can silently redirect authorization codes or tokens to their own server.

This maps to [CWE-601: URL Redirection to Untrusted Site ('Open Redirect')](https://cwe.mitre.org/data/definitions/601.html) and is catalogued under CAPEC-610 (Cellular Traffic Intercept) in its broader redirect-abuse context.

## Why This Matters

Open redirects in OAuth flows are particularly dangerous because the authorization server is explicitly trusted to issue redirects as part of the protocol. An attacker who discovers an unvalidated `redirect_uri` parameter can craft a malicious authorization URL. When a legitimate user clicks it, the authorization code is sent to the attacker's server. The attacker can then exchange that code for access tokens, gaining full access to the victim's account without ever seeing their password.

Beyond OAuth, unvalidated redirects undermine phishing defenses. Users are trained to verify the initial domain before clicking, but a redirect from a trusted domain to a malicious one circumvents that check. Security teams and WAF rules that block external links from reaching sensitive applications are also bypassed because the initial request originates from a legitimate host. This technique is referenced in MITRE ATT&CK T1046 under network service scanning and lateral movement via trusted channels.

## What Gets Flagged

An OAuth redirect URI read from the request and used without comparing it with the client's registered URIs:

```go
// FLAGGED: authorization endpoint sends the code wherever redirect_uri says
redirectURI := q.Get("redirect_uri")
http.Redirect(w, r, redirectURI+"?code="+code+"&state="+state, http.StatusFound)

// FLAGGED: through a variable built from it
target := redirectURI + "?code=" + url.QueryEscape(code)
http.Redirect(w, r, target, http.StatusFound)

// FLAGGED: implicit grant, inline
http.Redirect(w, r, r.FormValue("redirect_uri")+"#access_token="+tok, http.StatusFound)

// FLAGGED: oauth2 client configured from the request
conf := &oauth2.Config{RedirectURL: r.FormValue("redirect_uri")}
u := cfg.AuthCodeURL(state, oauth2.SetAuthURLParam("redirect_uri", r.PostFormValue("redirect_uri")))

// FLAGGED: gin / echo
c.Redirect(http.StatusFound, c.Query("redirect_uri") + "?code=" + code)
```

Not flagged: a value checked first (`slices.Contains(client.RedirectURIs, redirectURI)`, `ru != registered`, `client.RedirectURIs[redirectURI]`, a `switch` over the configured callbacks), constant or configured redirect URLs, comments and strings. Open redirects through other parameter names (`next`, `url`) are reported by VNX-GO-005 and VNX-GO-025.

## Remediation

1. **Maintain a server-side allowlist of permitted redirect URIs** and reject any value not present in it. Never rely on client-supplied values being safe.

   ```go
   var validRedirects = map[string]struct{}{
       "https://app.example.com/oauth/callback": {},
       "https://mobile.example.com/callback":    {},
   }

   func isAllowed(uri string) bool {
       _, ok := validRedirects[uri]
       return ok
   }

   func handleOAuthRedirect(w http.ResponseWriter, r *http.Request) {
       redirectURI := r.FormValue("redirect_uri")
       if !isAllowed(redirectURI) {
           http.Error(w, "redirect_uri not permitted", http.StatusBadRequest)
           return
       }
       http.Redirect(w, r, redirectURI, http.StatusFound)
   }
   ```

2. **Register redirect URIs at client registration time** and look them up by client ID rather than accepting them from the request at all. The OAuth 2.0 specification (RFC 6749 §3.1.2) requires exact URI matching for confidential clients.

3. **For relative redirects** (same-origin only), parse the URI and confirm `Host` is empty and the scheme is absent before issuing the redirect.

   ```go
   import "net/url"

   func isSameOrigin(raw string) bool {
       u, err := url.Parse(raw)
       if err != nil || u.Host != "" || u.Scheme != "" {
           return false
       }
       return true
   }
   ```

## References

- [CWE-601: URL Redirection to Untrusted Site ('Open Redirect')](https://cwe.mitre.org/data/definitions/601.html)
- [OWASP Unvalidated Redirects and Forwards Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Unvalidated_Redirects_and_Forwards_Cheat_Sheet.html)
- [RFC 6749 – The OAuth 2.0 Authorization Framework §3.1.2](https://datatracker.ietf.org/doc/html/rfc6749#section-3.1.2)
- [CAPEC-610: Cellular Traffic Intercept](https://capec.mitre.org/data/definitions/610.html)
- [MITRE ATT&CK T1046 – Network Service Discovery](https://attack.mitre.org/techniques/T1046/)
- [Go net/url package documentation](https://pkg.go.dev/net/url)

## Suppressing this rule

Put a `nosec` comment on the line, or on line 1 to cover the whole file. Use the comment marker of the file's language (`#`, `//`, `--` or `;`):

```text
# nosec vnx-go-034
// nosec vnx-go-034
```

Or record an ignore rule: `vulnetix ignore add --rule vnx-go-034 --reason "..."`. See [Suppressing findings](/sast/guides/suppressing-findings/).
