---
title: "VNX-GO-008: Go weak PRNG for security"
nav: "VNX-GO-008"
description: "Reports a math/rand or math/rand/v2 call (Read, Intn, Int63, Uint64, IntN...) whose line, the line its value flows into, or the enclosing function name says the value is a token, password, secret, nonce, salt, OTP, PIN, CSRF value, session id, key or reset code. crypto/rand, jitter, backoff, sampling and shuffling outside secret-named functions, and test code are not reported."
order: 710
sources: ["cli/internal/sast/rules/vnx-go-008.rego", "cli/internal/sast/docs/vnx-go-008.md"]
checked: ["cli@1700795"]
updated: "05 Nov 2026"
generated: true
---

| Field | Value |
|---|---|
| Rule ID | `VNX-GO-008` |
| Severity | Medium |
| SARIF level | `warning` |
| Kind | `sast` |
| Languages | Go |
| CWE | [CWE-338](https://cwe.mitre.org/data/definitions/338.html) |
| CAPEC | [CAPEC-112](https://capec.mitre.org/data/definitions/112.html) |
| ATT&CK | [T1110](https://attack.mitre.org/techniques/T1110/) |
| CWSS vector | `CWSS:1.0/TI:M/AP:A/AL:A/IC:N/FC:LT/RP:N/RL:A/AV:I/AS:N/IN:A/SC:A/BI:M/DI:H/EX:M/EC:N/P:C` |
| Tags | `prng` `randomness` `crypto` |
| Source | [`internal/sast/rules/vnx-go-008.rego`](https://github.com/Vulnetix/cli/blob/main/internal/sast/rules/vnx-go-008.rego) |

## Overview

This rule flags `math/rand` values used as secrets. While `math/rand` is appropriate for non-security uses such as shuffling a playlist or randomizing test data, it is a pseudo-random number generator seeded deterministically and its output sequence can be predicted or reconstructed by an attacker. Any security-sensitive value, session tokens, password reset links, CSRF nonces, API keys, or one-time codes, that is generated with `math/rand` is potentially guessable. This maps to [CWE-338: Use of Cryptographically Weak Pseudo-Random Number Generator (PRNG)](https://cwe.mitre.org/data/definitions/338.html).

## Why this matters

The output of `math/rand` is fully determined by its seed. In Go 1.20 and earlier, `math/rand` defaulted to a constant seed of 1 unless explicitly seeded, meaning the same sequence of numbers appeared in every process that forgot to call `rand.Seed`. Even with a time-based seed, an attacker who can observe a few generated values (or who knows approximately when the process started) can reconstruct the internal state and predict all future outputs. A session token with only 32 bits of effective entropy drawn from `math/rand` can be brute-forced in seconds. Token guessing attacks (MITRE ATT&CK T1110 – Brute Force) targeting predictable session identifiers or password reset tokens are well-documented and actively exploited.

## What gets flagged

The rule fires on a call to `math/rand` or `math/rand/v2` (`Read`, `Int`, `Intn`/`IntN`, `Int31`/`Int63` and their `n` forms, `Uint32`/`Uint64`, `N`, `Float64`, `Perm`, `Shuffle`), under the package's import alias or on a generator made with `rand.New` in the same file, when the line, a line within the next four that the assigned value flows into (`n := rand.Int63()` then `token := strconv.FormatInt(n, 36)`), or the enclosing function's name says the value is a token, password, secret, nonce, salt, OTP, PIN, CSRF value, session id, API or signing key, password-reset or verification code, or credential. OTP and PIN must sit at a word or camelCase boundary, so `rootPath` and `hotPartition` are not secrets, and a bare `Reset()` is state, not a reset code. The import alone is not reported.

```go
// FLAGGED: a one-time code from math/rand/v2
otp := fmt.Sprintf("%06d", mrand.IntN(1000000))

// FLAGGED: inside a function named for a password
func GenerateTemporaryPassword(n int) string {
    out := make([]byte, n)
    for i := range out {
        out[i] = charset[rand.Intn(len(charset))]
    }
    return string(out)
}
```

Not reported: `crypto/rand` calls, `math/rand` used for timing (jitter, backoff, `time.Duration`), sampling, load spreading or shuffling in functions not named for a secret, `rand.Seed`, test code, comments and strings.

## Remediation

1. **Replace `math/rand` with `crypto/rand` for all security-sensitive random values.** The `crypto/rand` package reads from the operating system's cryptographically secure entropy source (`/dev/urandom` on Linux, `BCryptGenRandom` on Windows).

```go
import (
    "crypto/rand"
    "encoding/base64"
    "fmt"
)

// SAFE: cryptographically secure random token
func generateToken() (string, error) {
    b := make([]byte, 32) // 256 bits of entropy
    if _, err := rand.Read(b); err != nil {
        return "", fmt.Errorf("failed to generate token: %w", err)
    }
    return base64.URLEncoding.EncodeToString(b), nil
}
```

2. **Generate secure random integers using `crypto/rand` with `big.Int`.** For cases where you need a random integer in a range:

```go
import (
    "crypto/rand"
    "math/big"
)

// SAFE: cryptographically secure random integer in [0, max)
func secureRandInt(max int64) (int64, error) {
    n, err := rand.Int(rand.Reader, big.NewInt(max))
    if err != nil {
        return 0, err
    }
    return n.Int64(), nil
}
```

3. **Keep `math/rand` only for non-security use cases.** If your codebase legitimately uses `math/rand` for things like test data generation, simulations, or non-security shuffles, ensure those uses are clearly separated from security functions. Add a comment to make the intent explicit and avoid accidental reuse for security purposes.

4. **Audit all token, key, and nonce generation in your codebase.** Search for all call sites that produce values used in authentication, authorization, or cryptographic operations, and confirm each uses `crypto/rand`.

## References

- [CWE-338: Use of Cryptographically Weak Pseudo-Random Number Generator (PRNG)](https://cwe.mitre.org/data/definitions/338.html)
- [OWASP Cryptographic Storage Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cryptographic_Storage_Cheat_Sheet.html)
- [Go crypto/rand package documentation](https://pkg.go.dev/crypto/rand)
- [Go math/rand package documentation](https://pkg.go.dev/math/rand)
- [CAPEC-112: Brute Force](https://capec.mitre.org/data/definitions/112.html)
- [MITRE ATT&CK T1110 – Brute Force](https://attack.mitre.org/techniques/T1110/)

## Suppressing this rule

Put a `nosec` comment on the line, or on line 1 to cover the whole file. Use the comment marker of the file's language (`#`, `//`, `--` or `;`):

```text
# nosec vnx-go-008
// nosec vnx-go-008
```

Or record an ignore rule: `vulnetix ignore add --rule vnx-go-008 --reason "..."`. See [Suppressing findings](/sast/guides/suppressing-findings/).
