---
title: completion
description: Generate and install tab completion for bash, zsh, fish and PowerShell, including completion of flag values such as --fail-on, --view and --store.
order: 8
sources: [cli/cmd/completion.go, cli/cmd/root.go, cli/internal/scanopts/surface.go, cli/cmd/auth.go]
checked: [cli@24498404a]
updated: 02 Nov 2026
---

```sh
vulnetix completion bash|zsh|fish|powershell
```

Prints a completion script for the shell to stdout. It completes commands, subcommands, flags and, where the CLI knows them, flag values: `--fail-on`, `--view`, `--filter`, `--show`, `--hide`, `--sort`, `--color`, `--min-severity`, `--reachability`, `--sca-autofix-strategy`, `--license-mode`, `--only`, `--skip`, `--output` (`json-cyclonedx`, `json-sarif`, `json-report`), and `auth login --store`. Comma-separated values complete element by element.

Homebrew and Scoop do not install completions; add them yourself.

| Shell | This session | Permanently |
|---|---|---|
| bash (bash-completion v2, bash 4.1+) | `source <(vulnetix completion bash)` | `vulnetix completion bash > ~/.local/share/bash-completion/completions/vulnetix` |
| bash, Homebrew on macOS | | `vulnetix completion bash > "$(brew --prefix)/etc/bash_completion.d/vulnetix"` |
| zsh | `source <(vulnetix completion zsh)` | `vulnetix completion zsh > "${fpath[1]}/_vulnetix"`, then `compinit` |
| zsh, Oh My Zsh | | `vulnetix completion zsh > ~/.oh-my-zsh/completions/_vulnetix` |
| zsh, Homebrew | | `vulnetix completion zsh > "$(brew --prefix)/share/zsh/site-functions/_vulnetix"` |
| fish | `vulnetix completion fish \| source` | `vulnetix completion fish > ~/.config/fish/completions/vulnetix.fish` |
| PowerShell | `vulnetix completion powershell \| Out-String \| Invoke-Expression` | `vulnetix completion powershell >> $PROFILE` |

For zsh, `compinit` must run in `.zshrc` (frameworks such as Oh My Zsh do this). If completions do not appear, check that the directory is on `fpath` before `compinit`:

```sh
echo $fpath | tr ' ' '\n' | grep -n completions
rm -f ~/.zcompdump && compinit
```

For PowerShell, loading `$PROFILE` may need `Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser`.

The scripts ask the installed binary for candidates each time you press Tab, so new commands and flags complete after `vulnetix update` without regenerating the script. Each candidate shows its description.
