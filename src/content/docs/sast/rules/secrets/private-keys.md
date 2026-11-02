---
title: "Secret rules: Private Keys & Certificates"
nav: "Private Keys & Certificates"
description: "RSA, EC, OpenSSH, PGP, WireGuard, age and other private-key material."
order: 11
sources: ["cli/internal/sast/secretsgen/catalog.json", "cli/internal/sast/secretsgen/main.go"]
checked: ["cli@4c8c3b7"]
updated: "01 Nov 2026"
generated: true
---

14 rules, kind `secrets`. They run under `vulnetix secrets` and the secrets stage of `vulnetix scan`, not under `vulnetix sast`. Each is generated from one entry in `internal/sast/secretsgen/catalog.json`.

Detection: `keyword` means the pattern is tried only on lines that contain one of the listed keywords (case-insensitive); `entropy` means the matched token must also reach the entry's minimum Shannon entropy. Every catalog rule skips test files, lockfiles, minified and generated files, and paths under `testdata/`, `fixtures/`, `vendor/`, `node_modules/`, `dist/`, `build/` and `src/test/` (the `skip_path` list in `internal/sast/rules/lib_secrets.rego`), and documented example tokens.

| Rule ID | Name | Severity | Detection | Keywords | CWE |
|---|---|---|---|---|---|
| <a id="vnx-sec-641"></a>`VNX-SEC-641` | OpenSSH private key block | Critical | regex | `begin` `private key` `openssh` | CWE-798 |
| <a id="vnx-sec-642"></a>`VNX-SEC-642` | RSA private key block | Critical | regex | `begin` `private key` `rsa` | CWE-798 |
| <a id="vnx-sec-643"></a>`VNX-SEC-643` | EC private key block | Critical | regex | `begin` `private key` `ec` | CWE-798 |
| <a id="vnx-sec-644"></a>`VNX-SEC-644` | DSA private key block | Critical | regex | `begin` `private key` `dsa` | CWE-798 |
| <a id="vnx-sec-645"></a>`VNX-SEC-645` | PKCS8 private key block | Critical | regex | `begin` `private key` | CWE-798 |
| <a id="vnx-sec-646"></a>`VNX-SEC-646` | Encrypted private key block | High | regex | `begin` `private key` `encrypted` | CWE-798 |
| <a id="vnx-sec-647"></a>`VNX-SEC-647` | PuTTY private key file (.ppk) | Critical | regex | `putty-user-key-file` | CWE-798 |
| <a id="vnx-sec-648"></a>`VNX-SEC-648` | SSH2 private key block | Critical | regex | `begin ssh2` `private key` | CWE-798 |
| <a id="vnx-sec-649"></a>`VNX-SEC-649` | PKCS12 keystore reference | High | keyword + regex + entropy | `p12` `pkcs12` `pfx` `keystore` | CWE-798 |
| <a id="vnx-sec-650"></a>`VNX-SEC-650` | Certificate bundled with private key | Medium | keyword + regex + entropy | `begin certificate` `private key` | CWE-798 |
| <a id="vnx-sec-651"></a>`VNX-SEC-651` | JWT HS256 hardcoded signing secret | Critical | keyword + regex + entropy | `jwt_secret` `jwt secret` `signing key` `hmac` | CWE-798 |
| <a id="vnx-sec-697"></a>`VNX-SEC-697` | SSH private key beginning marker (generic) | Critical | regex | `begin` `private key` | CWE-798 |
| <a id="vnx-sec-731"></a>`VNX-SEC-731` | Hardcoded session/cookie signing secret | High | keyword + regex + entropy | `session_secret` `cookie secret` `signing key` `secret_key` | CWE-798 |
| <a id="vnx-sec-732"></a>`VNX-SEC-732` | Hardcoded encryption key (AES/Fernet context) | High | keyword + regex + entropy | `encryption_key` `aes key` `fernet` `secret box` | CWE-798 |

Suppress one with `// nosec <rule-id>` on the line, or `vulnetix ignore add --rule <rule-id>`. See [Suppressing findings](/sast/guides/suppressing-findings/).
