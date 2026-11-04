---
title: "VNX-CRYPTO-002: SHA-1 usage detected"
nav: "VNX-CRYPTO-002"
description: "Reports SHA-1 computed through a hash or signature API in Python, Node.js, Go, Java, Ruby and PHP (hashlib.sha1, createHash('sha1'), sha1.Sum, x509.SHA1WithRSA."
order: 676
sources: ["cli/internal/sast/rules/vnx-crypto-002.rego", "cli/internal/sast/docs/vnx-crypto-002.md"]
checked: ["cli@308165d"]
updated: "05 Nov 2026"
generated: true
---

| Field | Value |
|---|---|
| Rule ID | `VNX-CRYPTO-002` |
| Severity | Medium |
| SARIF level | `warning` |
| Kind | `sast` |
| Languages | Python, JavaScript / TypeScript, Go, Java, Ruby, PHP |
| CWE | [CWE-328](https://cwe.mitre.org/data/definitions/328.html) |
| CAPEC | [CAPEC-97](https://capec.mitre.org/data/definitions/97.html) |
| ATT&CK | [T1557](https://attack.mitre.org/techniques/T1557/) |
| CWSS vector | `CWSS:1.0/TI:M/AP:A/AL:A/IC:N/FC:LT/RP:N/RL:A/AV:I/AS:N/IN:A/SC:A/BI:M/DI:H/EX:M/EC:N/P:C` |
| Tags | `weak-crypto` `sha1` `hash` |
| Source | [`internal/sast/rules/vnx-crypto-002.rego`](https://github.com/Vulnetix/cli/blob/main/internal/sast/rules/vnx-crypto-002.rego) |

## Overview

This rule detects invocations of the SHA-1 hashing algorithm across six languages (Python, Node.js, Go, Java, Ruby, and PHP). SHA-1 produces a 160-bit digest and was the dominant cryptographic hash function through the 2000s, appearing in TLS certificates, code signing, and Git object IDs. However, practical chosen-prefix collision attacks have been demonstrated (SHAttered in 2017, SHA-1 is a Shambles in 2020), making it unsuitable for any new security application. This maps to CWE-328 (Use of Weak Hash).

## Why this matters

The 2017 SHAttered attack by Google and CWI Amsterdam produced the first real-world SHA-1 collision: two PDF files with the same SHA-1 digest but different content. The cost dropped further with the 2020 "SHA-1 is a Shambles" paper, which demonstrated a chosen-prefix collision for approximately $45,000 in cloud compute, well within the budget of organized criminal groups and nation-state actors.

The practical implication is that any system using SHA-1 for certificate fingerprinting, code-signing validation, or file integrity verification can be fooled into accepting a maliciously crafted substitute document. All major certificate authorities stopped issuing SHA-1 certificates in 2016, browsers distrust SHA-1 TLS certificates, and NIST formally deprecated SHA-1 for digital signatures in 2011. If your code still calls SHA-1 today, it is carrying technical debt that creates exploitable risk. MITRE ATT&CK T1557 (Adversary-in-the-Middle) covers the interception scenarios enabled by weak MAC and signature schemes.

## What gets flagged

The rule matches SHA-1 invocations in source files across multiple languages:

```python
# FLAGGED: Python hashlib SHA-1
import hashlib
digest = hashlib.sha1(data).hexdigest()
```

```javascript
// FLAGGED: Node.js crypto SHA-1
const hash = crypto.createHash('sha1').update(data).digest('hex');
```

```java
// FLAGGED: Java MessageDigest SHA-1
MessageDigest sha1 = MessageDigest.getInstance("SHA-1");
```

```go
// FLAGGED: Go sha1 package
import "crypto/sha1"
checksum := sha1.Sum(data)
```

```ruby
# FLAGGED: Ruby SHA-1
digest = OpenSSL::Digest::SHA1.hexdigest("#{salt}:#{id}")
```

Not flagged: HMAC-SHA1 and PBKDF2-HMAC-SHA1 (`hmac.new(k, m, hashlib.sha1)`, `createHmac('sha1')`, `hash_hmac('sha1', ...)`), the RFC 6455 WebSocket accept key, the Have I Been Pwned range lookup, Python calls with `usedforsecurity=False`, a hash constructor passed by reference (`digestmod=hashlib.sha1`), a field or column merely named `sha1`, the import alone, comments, strings, documentation and test files.

## Remediation

1. **Migrate to SHA-256 as the minimum standard.** SHA-256 is part of the SHA-2 family, is hardware-accelerated on all modern processors via dedicated CPU instructions (Intel SHA Extensions, ARMv8 SHA), and has no known practical weaknesses.

   ```python
   # SAFE: SHA-256 replaces SHA-1
   import hashlib
   digest = hashlib.sha256(data).hexdigest()
   ```

   ```java
   // SAFE: SHA-256 in Java
   MessageDigest sha256 = MessageDigest.getInstance("SHA-256");
   byte[] digest = sha256.digest(data);
   ```

2. **For new systems, prefer SHA-3 (Keccak).** SHA-3 is a fundamentally different construction (sponge vs. Merkle-Damgård) and is the NIST-standardized alternative for environments where algorithm diversity matters.

3. **For password hashing, use Argon2id or bcrypt.** Even SHA-256 is not appropriate for passwords, use a slow, memory-hard KDF.

4. **For HMACs, use HMAC-SHA256 or HMAC-SHA512.** SHA-1 HMACs are also deprecated; NIST SP 800-107 Rev 1 covers approved MAC constructions.

5. **Update TLS configurations.** Ensure your TLS servers and clients reject SHA-1 in cipher suites and certificate chains. Most TLS libraries (OpenSSL 1.1+, Go's crypto/tls, Java's JSSE) have disabled SHA-1 certificates by default, but verify your configuration explicitly.

6. **Audit Git usage.** Git historically used SHA-1 for object IDs; Git 2.29+ supports SHA-256 object format. This is a separate concern from application code but worth tracking.

## References

- [CWE-328: Use of Weak Hash](https://cwe.mitre.org/data/definitions/328.html)
- [CAPEC-97: Cryptanalysis](https://capec.mitre.org/data/definitions/97.html)
- [NIST SP 800-131A Rev 2 – Disallows SHA-1 for digital signatures after 2013](https://csrc.nist.gov/publications/detail/sp/800-131a/rev-2/final)
- [SHAttered – First SHA-1 collision (2017)](https://shattered.io/)
- [SHA-1 is a Shambles – Chosen-prefix collision (2020)](https://sha-mbles.github.io/)
- [OWASP Cryptographic Storage Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cryptographic_Storage_Cheat_Sheet.html)
- [OWASP Transport Layer Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Transport_Layer_Security_Cheat_Sheet.html)

## Suppressing this rule

Put a `nosec` comment on the line, or on line 1 to cover the whole file. Use the comment marker of the file's language (`#`, `//`, `--` or `;`):

```text
# nosec vnx-crypto-002
// nosec vnx-crypto-002
```

Or record an ignore rule: `vulnetix ignore add --rule vnx-crypto-002 --reason "..."`. See [Suppressing findings](/sast/guides/suppressing-findings/).
