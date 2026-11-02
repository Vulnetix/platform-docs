---
title: "VNX-JAVA-027: Java Spring security headers disabled or absent (clickjacking, CSP)"
nav: "VNX-JAVA-027"
description: "Detects Spring Security configurations that disable all default security headers, X-Frame-Options, HSTS or X-Content-Type-Options, in the chained, lambda and method-reference DSL forms. xssProtection().disable(), sameOrigin()/deny() and test code are not reported."
order: 775
sources: ["cli/internal/sast/rules/vnx-java-027.rego", "cli/website/content/docs/sast-rules/vnx-java-027.md"]
checked: ["cli@4c8c3b7"]
updated: "01 Nov 2026"
generated: true
---

| Field | Value |
|---|---|
| Rule ID | `VNX-JAVA-027` |
| Severity | Medium |
| SARIF level | `warning` |
| Kind | `sast` |
| Languages | Java |
| CWE | [CWE-693](https://cwe.mitre.org/data/definitions/693.html) |
| CAPEC | [CAPEC-103](https://capec.mitre.org/data/definitions/103.html) |
| ATT&CK | [T1185](https://attack.mitre.org/techniques/T1185/) |
| CWSS vector | `CWSS:1.0/TI:M/AP:RU/AL:S/IC:N/FC:LT/RP:RU/RL:S/AV:L/AS:N/IN:A/SC:A/BI:M/DI:H/EX:M/EC:N/P:C` |
| Tags | `security-headers` `clickjacking` `spring` `java` |
| Source | [`internal/sast/rules/vnx-java-027.rego`](https://github.com/Vulnetix/cli/blob/main/internal/sast/rules/vnx-java-027.rego) |

## Overview

Spring Security automatically adds a set of defensive HTTP response headers, `X-Frame-Options`, `X-Content-Type-Options`, `X-XSS-Protection`, `Strict-Transport-Security`, and `Content-Security-Policy`, when the `headers()` configuration is active (the default). Calling `frameOptions().disable()` disables the `X-Frame-Options` header specifically, while calling `headers().disable()` removes all security headers entirely. Both patterns leave the application exposed to clickjacking and related UI-redressing attacks. This is captured by CWE-693 (Protection Mechanism Failure).

This rule flags `headers().disable()`, `frameOptions().disable()`, `httpStrictTransportSecurity().disable()` and `contentTypeOptions().disable()` in every form the Spring Security DSL accepts: the chained form (also when `.headers()`, `.frameOptions()` and `.disable()` sit on separate lines), the lambda form (`headers(h -> h.disable())`, `frameOptions(f -> { f.disable(); })`) and the method-reference form (`headers(AbstractHttpConfigurer::disable)`, `frameOptions(FrameOptionsConfig::disable)`). It does not report `xssProtection().disable()` (the X-XSS-Protection header is deprecated and disabling it is current advice), `csrf()`/`cors()` disable calls, `sameOrigin()`/`deny()`, test code, comments or string literals.

The `X-Frame-Options` header is the primary defence against clickjacking: it prevents the application from being embedded in an `<iframe>` on a third-party page. Without it, an attacker can overlay an invisible iframe of the legitimate application over a deceptive page, tricking users into performing authenticated actions (transferring funds, changing account settings, approving access) without their knowledge.

## Why This Matters

Clickjacking attacks are difficult for users to detect because the malicious page looks entirely legitimate, the attacker's visible UI element is placed precisely over a hidden, transparent iframe of the target application. The user interacts with what appears to be a harmless button or link but is actually submitting an authenticated request to the target application.

When `headers().disable()` is used, the application also loses `Strict-Transport-Security` (HSTS) and `X-Content-Type-Options`. Without HSTS, an active network attacker can downgrade HTTPS to HTTP on the user's first visit. Without `X-Content-Type-Options: nosniff`, MIME-type sniffing attacks become possible in older browsers.

Spring Security's default header configuration is safe and suitable for most applications. The `headers().disable()` call is most often introduced by developers following outdated tutorials or copying configurations from non-security-sensitive internal tools. The fix is always to restore the default or configure the headers explicitly rather than disable them.

## What Gets Flagged

```java
// FLAGGED: X-Frame-Options explicitly disabled
http
    .headers()
        .frameOptions().disable()
    ...

// FLAGGED: all HTTP security headers disabled
http
    .headers().disable()
    ...

// FLAGGED: lambda and method-reference DSL
.headers(headers -> headers.disable())
.headers(h -> h.frameOptions(HeadersConfigurer.FrameOptionsConfig::disable))
.httpStrictTransportSecurity(hsts -> hsts.disable())
```

## Remediation

1. **Remove `frameOptions().disable()`** and replace it with `frameOptions().deny()` (prevents all framing) or `frameOptions().sameOrigin()` (allows framing only from the same origin).

2. **Remove `headers().disable()`** entirely. Spring Security's default header set is appropriate for production use in virtually all applications.

3. **If embedding in a specific partner domain is required**, configure a Content-Security-Policy `frame-ancestors` directive rather than disabling `X-Frame-Options`.

```java
// SAFE: explicit header configuration using Spring Security 6 lambda DSL
@Bean
public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
    http
        .headers(headers -> headers
            .frameOptions(frame -> frame.deny())
            .contentSecurityPolicy(csp -> csp
                .policyDirectives("default-src 'self'; frame-ancestors 'none'"))
            .httpStrictTransportSecurity(hsts -> hsts
                .includeSubDomains(true)
                .maxAgeInSeconds(31536000))
        )
        // ... rest of configuration
    ;
    return http.build();
}
```

```java
// SAFE: allowing same-origin framing (e.g. for a dashboard with iframes)
http
    .headers(headers -> headers
        .frameOptions(frame -> frame.sameOrigin())
    );
```

## References

- [CWE-693: Protection Mechanism Failure](https://cwe.mitre.org/data/definitions/693.html)
- [OWASP Clickjacking Defence Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Clickjacking_Defense_Cheat_Sheet.html)
- [Spring Security Reference – HTTP Security Headers](https://docs.spring.io/spring-security/reference/servlet/exploits/headers.html)
- [MDN: X-Frame-Options](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/X-Frame-Options)
- [CAPEC-103: Clickjacking](https://capec.mitre.org/data/definitions/103.html)

## Suppressing this rule

Put a `nosec` comment on the line, or on line 1 to cover the whole file. Use the comment marker of the file's language (`#`, `//`, `--` or `;`):

```text
# nosec vnx-java-027
// nosec vnx-java-027
```

Or record an ignore rule: `vulnetix ignore add --rule vnx-java-027 --reason "..."`. See [Suppressing findings](/sast/guides/suppressing-findings/).
