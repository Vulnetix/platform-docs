---
title: Prompt injection
description: The gateway's two injection controls, regex rules over request text including tool results and delimiter_integrity over sealed harness blocks, and their limits.
order: 9
sources:
  - ai-firewall/internal/policy/engine.go
  - ai-firewall/internal/delimiters/delimiters.go
  - ai-firewall/internal/api/handlers.go
  - vdb-api/internal/handler/v2_cli_ai_firewall_baseline.go
checked: [ai-firewall@339de55, vdb-api@4145f0a]
updated: 02 Nov 2026
---

The gateway has no machine-learning injection classifier and no semantic detector. It has two deterministic controls:

| Control | Rule type | Catches | Misses |
|---|---|---|---|
| Phrase matching | `blocked_pattern` | Known injection phrasing in any inspected text, including tool results | Paraphrase, encodings, anything not in the pattern |
| Sealed block verification | `delimiter_integrity` | Forged or edited harness blocks in a request from a client that seals its blocks with gateway nonces | Injection that does not touch a sealed block; clients that do not seal |

Use both as one layer. Least privilege for the agent and human approval for consequential actions are the controls that limit what a successful injection can do.

## Direct and indirect injection

Direct injection is a user typing instructions meant to override the system prompt. Indirect injection arrives in content the agent reads: a web page, an issue comment, a README, a code comment. The gateway inspects tool results, which is where indirect injection enters an agent's conversation, so phrase rules apply to both.

## Phrase rules in the baseline

The [recommended baseline](/ai-firewall/policy/recommended-baseline/) ships seven phrase rules, all `blocked_pattern` with action `flag`. Six are enabled.

| Baseline id | Priority | Enabled | Flags |
|---|---|---|---|
| `injection-ignore-instructions` | 30 | yes | "ignore / disregard / forget ... previous / prior / above ... instructions / prompts / rules" |
| `injection-system-prompt-exfil` | 31 | yes | "reveal / print / repeat / show / output / display / dump ... system prompt / your instructions / developer message" |
| `injection-exfil-to-url` | 32 | yes | "send / post / upload / exfiltrate / leak ..." followed by an `http(s)://` URL |
| `injection-role-override` | 33 | yes | "you are now / pretend to be ..." followed by "DAN / unfiltered / jailbroken / no restrictions" |
| `injection-developer-mode` | 34 | yes | "developer mode", "DAN mode", "do anything now", "jailbreak" |
| `injection-encoded-payload` | 35 | yes | "base64 / rot13 / hex decode ... then execute / run / follow" |
| `injection-delimiter-spoof` | 36 | no | Fake role tags such as `<system>` and `[INST]`. Off because it fires on ordinary source code. |

They flag rather than block because people discuss prompt injection legitimately, security teams most of all. Look at what they flag for a few weeks before promoting any to `block`; see [Rollout and tuning](/ai-firewall/policy/rollout/).

## Adding your own phrases

Each of these compiles under RE2. Start every one at `flag`.

ChatML control tokens:

```text
<\|(?:im_start|im_end|endoftext|system|user|assistant)\|>
```

Llama instruction tags:

```text
\[/?INST\]|<<SYS>>|<</SYS>>
```

Safety bypass requests:

```text
(?i)\b(?:bypass|circumvent|disable|turn\s+off)\s+(?:your\s+)?(?:safety|content|security)\s+(?:filters?|guidelines?|policies|rules?)
```

```bash
vulnetix ai-firewall policy guardrail flag-chatml-tokens \
  --rule-type blocked_pattern --action flag \
  --pattern='<\|(?:im_start|im_end|endoftext|system|user|assistant)\|>' \
  --priority 37
```

## Sealed harness blocks

A harness such as Belai wraps the parts of a prompt it wrote itself (system text, plans, attachments, diagnostics) in sealed blocks:

```text
<attachment nonce="..." integrity="<sha256 hex of content>">content</attachment>
```

When the harness takes its nonces from the gateway (`GET /{provider}/{orgUuid}/v1/nonces`), the gateway can tell a block the harness sealed from one that text in the conversation forged, because a forged block cannot carry a nonce issued to this principal. A block is tampered when its integrity hash does not match its content, or when an `attachment`, `directive` or `diagnostics` block has no hash.

A `delimiter_integrity` rule acts on tampered blocks:

| Action | Effect |
|---|---|
| `block` | `403` with code `delimiter_tampered` |
| `flag` | recorded, request forwarded |

It takes no pattern and accepts no other action. The baseline's `injection-delimiter-tampered` rule (priority 25, `block`) ships disabled, because it only means something once your clients take their nonces from the gateway. Enable it, or a copy at `flag`, after that is true. Stripping unverifiable blocks is a separate client choice, the `X-Vulnetix-Nonce-Mode: enforce` or `canonical` request header. Both are covered on [Nonces and sealed blocks](/ai-firewall/reference/nonces/).

## What none of this catches

- Rewording. "Kindly set aside the guidance you were given earlier" matches none of the patterns above.
- Encoding: base64, homoglyphs, zero-width characters, spaced-out letters. There is no normalisation before matching.
- Meaning. Patterns match strings; an injection that achieves its goal without the matched phrases passes.
- Output. Responses are not inspected, so the gateway does not see what an injected model says or does next.
- Tool calls. The arguments the model generates for a tool are not inspected. [Tool rules](/ai-firewall/policy/tools/) control which tools are offered, not what is passed to them.

## Related

- [Recommended baseline](/ai-firewall/policy/recommended-baseline/)
- [Nonces and sealed blocks](/ai-firewall/reference/nonces/)
- [Limitations](/ai-firewall/policy/limitations/)
