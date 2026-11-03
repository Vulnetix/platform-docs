---
title: Regex reference
description: The Go RE2 syntax used by blocked_pattern and pii_redact rules, what it does not support, the errors you will see, and how each surface validates a pattern.
order: 21
sources:
  - ai-firewall/internal/policy/engine.go
  - cli/pkg/aifirewall/policy.go
  - cli/pkg/aifirewall/checks.go
  - vdb-api/internal/handler/v2_cli_ai_firewall.go
  - vdb-site/api/internal/handler/ai_firewall_guardrails.go
  - website/src/components/ai-firewall/guardrails-model.ts
checked: [ai-firewall@339de55, cli@4c8c3b7, vdb-api@4145f0a, vdb-site@1a06d67, website@ad775f3]
updated: 02 Nov 2026
---

`blocked_pattern` and `pii_redact` patterns are compiled with Go's `regexp` package, which implements RE2. Capability rules use [globs](/ai-firewall/reference/glob-reference/) instead.

RE2 matches in time linear in the input, whatever the pattern. Every guardrail runs on every request against text an attacker can choose, so a backtracking engine there would let a crafted prompt stall the gateway. RE2 removes that risk, at the cost of the features below.

## Not supported

| Feature | Example | Error from `regexp.Compile` |
|---|---|---|
| Lookahead | `foo(?=bar)`, `foo(?!bar)` | `invalid or unsupported Perl syntax: (?=` (or `(?!`) |
| Lookbehind | `(?<=orgUuid=)\S+`, `(?<!test-)key` | `invalid named capture: ...` |
| Backreferences | `(\w+)\s+\1` | `invalid escape sequence: \1` |
| Possessive quantifiers, atomic groups | `a++`, `(?>a)` | `invalid nested repetition operator`, `invalid or unsupported Perl syntax` |

## Supported

| Feature | Example |
|---|---|
| Character classes | `[a-z]`, `[^0-9]`, `\d`, `\w`, `\s`, `[[:alpha:]]` |
| Quantifiers | `*`, `+`, `?`, `{3}`, `{2,5}`, `{13,}` |
| Lazy quantifiers | `*?`, `+?`, `{2,5}?` |
| Grouping | `(abc)+`, `(?:abc)+` |
| Named groups | `(?P<name>\w+)`, `(?<name>\w+)` |
| Anchors | `^`, `$`, `\A`, `\z`, `\b`, `\B` |
| Flags | `(?i)` case-insensitive, `(?m)` multi-line, `(?s)` dot matches newline, `(?U)` ungreedy |
| Unicode | `\p{L}`, `\p{Han}`, `\pN` |

Alternation with the vertical bar works as usual, for example `(?:postgres|mysql)://`.

Matching is unanchored: a pattern matches anywhere in a text unit unless you anchor it. Each text unit is the text of one message (or the system prompt) joined by newlines, so `^` and `$` without `(?m)` mean the start and end of the whole message.

## Redaction replaces the whole match

`redact` replaces every non-overlapping match with `[REDACTED]`. Capture groups are not used; the full match is replaced. To keep context around a value, match only the value: `\bEMP-[0-9]{6}\b` keeps the sentence around the id.

## Porting from PCRE

| PCRE | RE2 |
|---|---|
| `(?<=orgUuid=)\S+` | `orgUuid=\S+`. It blocks the same requests; with `redact` it also replaces the `orgUuid=` prefix. |
| `(?<!example\.)api\.internal` | Match the forms you do mean (see below), or accept the broader match and run the rule at `flag`. |
| `(\w+)\s+\1` | Not expressible. Match the specific literal instead. |
| `\Z` (fails with `invalid escape sequence`) | `\z` |

A negative lookbehind that excludes a known-safe prefix becomes an alternation of the prefixes you do mean:

```text
\b(?:prod|staging)\.api\.internal
```

## Validation

| Surface | When | Result for a pattern that does not compile |
|---|---|---|
| Resolve Platform editor | as you type | Flags lookarounds before saving |
| Resolve Platform API (`POST` and `PUT /v1/ai-firewall/guardrails`) | on save, when the request includes `ruleType` | `400 pattern is not a valid regex (Go RE2 syntax ...)` |
| CLI API (`vulnetix ai-firewall policy guardrail`) | on create, and on update when `--rule-type` is also passed | `400 pattern is not a valid regex: ...` |
| `vulnetix ai-firewall apply` | before any server call | refuses the file, with a hint when the pattern has `(?=`, `(?!` or `(?<` |
| `vulnetix ai-firewall status` | on demand | `guardrail_pattern_invalid` warning for stored rules |
| Gateway | at request time | the rule is skipped |

> [!CAREFUL] An update that changes only the pattern is not validated
> Both APIs judge a pattern against its rule type, and an update that sends a new pattern without the rule type skips the check. `vulnetix ai-firewall policy guardrail <name> --uuid <uuid> --pattern <p>` can therefore store a pattern the gateway will skip. Pass `--rule-type` with every pattern change, or change patterns through `apply`, which always validates.

A `blocked_pattern` with an empty pattern is refused at write time. A `pii_redact` with an empty pattern is valid and selects the built-in detectors.

## Testing a pattern

Go's own implementation is the reference. Save as `check.go` and run `go run check.go '<pattern>' '<sample text>'`:

```go
package main

import (
	"fmt"
	"os"
	"regexp"
)

func main() {
	re, err := regexp.Compile(os.Args[1])
	if err != nil {
		fmt.Println("does not compile:", err)
		os.Exit(1)
	}
	fmt.Println("matches:", re.FindAllString(os.Args[2], -1))
	fmt.Println("redacted:", re.ReplaceAllString(os.Args[2], "[REDACTED]"))
}
```

To test against the organisation's live rules, send a sample to the evaluate endpoint; see [Custom filters](/ai-firewall/policy/custom-filters/#testing-a-pattern-before-it-touches-traffic).

## Related

- [Content guardrails](/ai-firewall/policy/guardrails/)
- [Glob reference](/ai-firewall/reference/glob-reference/)
- [Rollout and tuning](/ai-firewall/policy/rollout/)
