---
title: When analysis runs
description: Which rules and checks run on open, on each keystroke, on save and when a manifest changes on disk, and which of them use the network.
order: 1
sources: [cli/internal/lsp/server.go, cli/internal/lsp/sca.go, cli/internal/sast/kinds.go, vulnetix-vscode/src/lsp/client.ts, vulnetix-vscode/src/shared/manifests.ts]
checked: [cli@4c8c3b7, vulnetix-vscode@9ad08fa]
updated: 02 Nov 2026
---

The server splits work by cost. Rule evaluation is local and fast except for secrets; dependency checks need the VDB.

| Event | What runs | Network |
|---|---|---|
| Server starts | Index the workspace (depth 3, `.gitignore` respected, git history off), load the rules, compile the `sast`, `iac` and `oci` rule kinds, then discover manifests (depth 4) and bulk-check every dependency | Dependency check only |
| A file is opened | Code, infrastructure and container rules on that file. For a manifest, its dependency findings are published and its ranked safe versions are fetched. | Safe versions only |
| You type | After `vulnetix.scan.debounceMs` (default 400 ms) of quiet: code, infrastructure and container rules on that file. In a manifest, dependency findings are re-anchored to the edited text from cached results. | None |
| You save | All four rule kinds, secrets included, on that file. For a manifest, manifests are rediscovered and re-checked in bulk. | Manifest re-check only |
| A watched file changes on disk | A manifest or lockfile: rediscover and bulk re-check. `.vulnetix/memory.yaml`: reload suppressions and republish open files. | Manifest re-check only |
| A file is closed | Its findings are removed | None |
| A setting changes | Validated and applied; every open file is republished from cache, not rescanned | None |

> [!WHY] Why secrets run on save, not as you type
> Secret rules are about 92% of evaluation cost: about 231 ms to check one file against every rule, against about 10 ms for everything except secrets. A credential cannot match until you have finished typing it, so running them per keystroke buys nothing.

## Only open files get code findings

Code, secret, infrastructure and container rules run on documents you have open. A file nobody opens is not checked. Dependency findings are different: the bulk check at startup covers every manifest the server discovers, and findings appear when you open the manifest.

A whole-workspace scan (`vulnetix/scanWorkspace` in the protocol) exists in the server, but the extension has no command that calls it yet. Run `vulnetix scan` in a terminal for a full scan.

## Watched files

The extension watches these names anywhere in the workspace and forwards changes to the server, so a lockfile rewritten by `npm install` is noticed without opening it:

`package.json`, `package-lock.json`, `npm-shrinkwrap.json`, `yarn.lock`, `pnpm-lock.yaml`, `requirements.txt`, `requirements.in`, `pyproject.toml`, `Pipfile`, `Pipfile.lock`, `poetry.lock`, `uv.lock`, `go.mod`, `go.sum`, `Cargo.toml`, `Cargo.lock`, `Gemfile`, `Gemfile.lock`, `pom.xml`, `build.gradle`, `build.gradle.kts`, `composer.json`, `composer.lock`, `packages.lock.json`, `*.csproj`, and `.vulnetix/memory.yaml`.

The server itself recognises every manifest type `vulnetix scan` does. A manifest type outside this list is still checked at startup and on save, but an edit made outside the editor is not noticed until then.

## Settings that are not wired yet

`vulnetix.scan.onStartup`, `vulnetix.scan.onSave`, `vulnetix.scan.onType`, `vulnetix.secrets.onType` and `vulnetix.secrets.gitHistory` are contributed in `package.json` but nothing reads them. The triggers above apply whatever they are set to. See [Settings](/vscode/reference/settings/).
