---
title: Continue
description: "`install continue` adds a model entry to `~/.continue/config.yaml` and writes the key to `~/.continue/.env`, since IDE extensions cannot read your shell."
order: 5
sources: [cli/pkg/aifirewall/config.go, cli/pkg/aifirewall/clients.go, cli/cmd/ai_firewall.go, ai-firewall/website/content/docs/coding-agents/continue.md]
checked: [ai-firewall@339de55, cli@4c8c3b7]
updated: 02 Nov 2026
---

Continue runs inside VS Code and JetBrains IDEs and calls whatever model entries its config lists. It speaks the `chat` surface, so the entry can point at any `chat` provider you hold a key for. The CLI wires the `openai` provider.

## With the CLI

```bash
vulnetix ai-firewall key set openai --from-env OPENAI_KEY   # once per organisation
vulnetix ai-firewall install continue --model gpt-4o-mini
```

It writes two files, both user scope:

| File | Content |
|---|---|
| `~/.continue/config.yaml` | One entry in `models`, matched by its `name`. Comments and the other entries are kept. If only a legacy `~/.continue/config.json` exists, the entry goes there, matched by `title`. |
| `~/.continue/.env` | `VULNETIX_API_KEY=<your key>`, mode `600` |

The entry it writes:

```yaml
models:
  - name: Vulnetix AI Firewall (openai)
    provider: openai
    model: gpt-4o-mini
    apiBase: https://guardrails.vulnetix.com/openai/<uuid>/v1
    apiKey: ${{ secrets.VULNETIX_API_KEY }}
    roles:
      - chat
      - edit
      - apply
```

Without `--model` the entry uses `gpt-4o`. Reload the Continue extension, or restart the IDE, after installing.

> [!WHY] Why the key is written to disk here
> Continue resolves `${{ secrets.VULNETIX_API_KEY }}` from `~/.continue/.env`, not from the shell. It is the one client where the CLI writes the literal key without `--embed-key`. The file holds a Vulnetix key, not a provider key: a lost laptop means rotating one Vulnetix key.

## By hand

Add the entry above to `~/.continue/config.yaml`, then:

```bash
printf 'VULNETIX_API_KEY=%s\n' "$VULNETIX_API_KEY" > ~/.continue/.env
chmod 600 ~/.continue/.env
```

`provider: openai` names the wire protocol, not the vendor. To use another `chat` provider, change the slug in `apiBase` and use that provider's own model name, for example `apiBase: https://guardrails.vulnetix.com/openrouter/<uuid>/v1` with `model: openai/gpt-4o-mini`. Keep the `name` if you want `install` and `uninstall` to keep managing the entry.

## Verify

`vulnetix ai-firewall status` should show `continue` as `wired`. `points elsewhere` means the entry's `apiBase` is not the gateway, and raises `bypasses_firewall`. Then send a chat message from the IDE with the wired model selected.

## Limits

- The written entry has the `chat`, `edit` and `apply` roles. A separate autocomplete or embeddings model in your config goes wherever its own entry points. The gateway has no embeddings route.
- Tool-call arguments are not scanned. Tool results are.
- A developer can change `apiBase`. `status` reports it.
