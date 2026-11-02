---
title: "VNX-ANDROID-007: AES cipher in ECB mode (Java/Kotlin)"
nav: "VNX-ANDROID-007"
description: "Detects Java and Kotlin Cipher.getInstance() calls that select AES in ECB mode: an AES/ECB transformation, bare \"AES\" or KeyProperties.KEY_ALGORITHM_AES (the provider default is ECB), a KeyProperties concatenation or template with BLOCK_MODE_ECB, or a constant holding one of those."
order: 661
sources: ["cli/internal/sast/rules/vnx-android-007.rego", "cli/internal/sast/docs/vnx-android-007.md"]
checked: ["cli@de9b52a"]
updated: "02 Nov 2026"
generated: true
---

| Field | Value |
|---|---|
| Rule ID | `VNX-ANDROID-007` |
| Severity | High |
| SARIF level | `error` |
| Kind | `sast` |
| Languages | Java, Kotlin |
| CWE | [CWE-327](https://cwe.mitre.org/data/definitions/327.html) |
| CAPEC | [CAPEC-97](https://capec.mitre.org/data/definitions/97.html) |
| ATT&CK | [T1600](https://attack.mitre.org/techniques/T1600/) |
| CWSS vector | `CWSS:1.0/TI:H/AP:A/AL:A/IC:N/FC:LT/RP:N/RL:A/AV:I/AS:N/IN:A/SC:A/BI:H/DI:H/EX:H/EC:N/P:H` |
| Tags | `android` `weak-crypto` `aes-ecb` `mobile-security` |
| Source | [`internal/sast/rules/vnx-android-007.rego`](https://github.com/Vulnetix/cli/blob/main/internal/sast/rules/vnx-android-007.rego) |

## Overview

This rule identifies Java and Kotlin code that calls `Cipher.getInstance()` with a transformation string of either `"AES"` (bare, which defaults to `AES/ECB/PKCS5Padding` on Android's Bouncy Castle provider) or any string starting with `"AES/ECB"`. ECB (Electronic Codebook) mode encrypts each 16-byte block of plaintext independently using the same key, producing the same ciphertext block for identical plaintext blocks. This deterministic property means that patterns in the plaintext are visible in the ciphertext, the canonical example being the "ECB Penguin", where encrypting a bitmap image in ECB mode preserves the visible outline of the image. This vulnerability maps to CWE-327 (Use of a Broken or Risky Cryptographic Algorithm).

## Why This Matters

ECB mode is dangerous in practice, not just in theory. Any data with repeated structure, user IDs padded to a block boundary, repeated headers in a file format, sequences of similar records, will reveal that repetition through identical ciphertext blocks. An attacker observing ECB-encrypted database rows can detect when two rows contain the same field value without decrypting anything.

Beyond pattern leakage, ECB mode is also vulnerable to block-rearrangement attacks: an attacker can reorder, duplicate, or delete 16-byte blocks in the ciphertext without detection, as there is no authentication tag. This can be exploited to manipulate encrypted data in predictable ways, for example, moving a privilege field from one record into another.

The correct choices for symmetric encryption on Android are AES-GCM (authenticated encryption, nonce-based, provides both confidentiality and integrity) or AES-CBC with PKCS5Padding paired with a separate HMAC for authentication. AES-GCM is preferred because it combines encryption and authentication into a single primitive, reducing implementation surface.

## What Gets Flagged

```java
// FLAGGED: ECB mode explicitly specified
Cipher cipher = Cipher.getInstance("AES/ECB/PKCS5Padding");

// FLAGGED: bare "AES" defaults to ECB
Cipher cipher = Cipher.getInstance("AES");

// FLAGGED: built from KeyProperties
Cipher.getInstance(KeyProperties.KEY_ALGORITHM_AES + "/" + KeyProperties.BLOCK_MODE_ECB + "/" + KeyProperties.ENCRYPTION_PADDING_PKCS7);
```

```kotlin
// FLAGGED: a constant declared in a companion object below the call
val cipher = Cipher.getInstance(TRANSFORMATION)
companion object { private const val TRANSFORMATION = "AES/ECB/PKCS5Padding" }
```

Not flagged: `AES/GCM/NoPadding`, `AES/CBC/PKCS5Padding`, `RSA/ECB/OAEPWithSHA-256AndMGF1Padding`, `KeyGenerator.getInstance("AES")`, or a transformation passed in as a parameter.

## Remediation

1. **Replace ECB with AES/GCM/NoPadding** for all new encryption. GCM mode provides authenticated encryption, meaning any tampering of the ciphertext is detected on decryption.

2. **Generate a fresh random IV (nonce) for every encryption operation.** A 12-byte random nonce is required for GCM. Store the nonce alongside the ciphertext, it is not secret.

3. **Migrate existing data** encrypted under ECB by re-encrypting it under GCM at the next access opportunity, after verifying the decrypted plaintext is valid.

```java
// SAFE: AES/GCM with a fresh random nonce per encryption
import javax.crypto.Cipher;
import javax.crypto.spec.GCMParameterSpec;
import java.security.SecureRandom;

public byte[] encrypt(byte[] plaintext, SecretKey key) throws Exception {
    byte[] iv = new byte[12];
    new SecureRandom().nextBytes(iv);

    Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
    cipher.init(Cipher.ENCRYPT_MODE, key, new GCMParameterSpec(128, iv));

    byte[] ciphertext = cipher.doFinal(plaintext);
    // Prepend iv to ciphertext for storage
    byte[] result = new byte[iv.length + ciphertext.length];
    System.arraycopy(iv, 0, result, 0, iv.length);
    System.arraycopy(ciphertext, 0, result, iv.length, ciphertext.length);
    return result;
}
```

## References

- [CWE-327: Use of a Broken or Risky Cryptographic Algorithm](https://cwe.mitre.org/data/definitions/327.html)
- [OWASP MASTG – MASTG-TEST-0061: Testing the Configuration of Cryptographic Standard Algorithms](https://mas.owasp.org/MASTG/tests/android/MASVS-CRYPTO/MASTG-TEST-0061/)
- [OWASP MASVS – MASVS-CRYPTO-1: Cryptography](https://mas.owasp.org/MASVS/controls/MASVS-CRYPTO-1/)
- [Android Developer Docs – Cryptography](https://developer.android.com/privacy-and-security/cryptography)
- [NIST SP 800-38D – Recommendation for GCM](https://csrc.nist.gov/publications/detail/sp/800-38d/final)
- [MITRE ATT&CK T1600 – Weaken Encryption](https://attack.mitre.org/techniques/T1600/)

## Suppressing this rule

Put a `nosec` comment on the line, or on line 1 to cover the whole file. Use the comment marker of the file's language (`#`, `//`, `--` or `;`):

```text
# nosec vnx-android-007
// nosec vnx-android-007
```

Or record an ignore rule: `vulnetix ignore add --rule vnx-android-007 --reason "..."`. See [Suppressing findings](/sast/guides/suppressing-findings/).
