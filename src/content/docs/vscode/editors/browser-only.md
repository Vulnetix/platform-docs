---
title: Browser-only editors
description: vscode.dev and github.dev have no Node extension host and no filesystem, so the extension does not run there.
order: 3
sources: [vulnetix-vscode/package.json, vulnetix-vscode/src/constants.ts]
checked: [vulnetix-vscode@9ad08fa]
updated: 02 Nov 2026
status: planned
---

`vscode.dev` and `github.dev` run the whole editor inside a browser tab. There is no Node process, no way to start a child process, and files come from a virtual filesystem.

The extension has a `main` (Node) entry point and no `browser` entry point, so these editors cannot load it at all. Nothing runs: no findings, no status bar item, no commands.

> [!CAREFUL] The old docs described a reduced web mode
> They said threat intelligence lookups and organisation policy would work in the browser. That mode is not built. The context key `vulnetix.mode` reserves the value `web` for it, and nothing sets it.

## What to do instead

- On a GitHub repository page, press <kbd>.</kbd> to open `github.dev`, then **Continue Working On...** to move into a Codespace or a local clone. Both have a filesystem and run the extension.
- For a browser UI with a real extension host, use code-server, OpenVSCode Server, Gitpod, Coder or Firebase Studio: [Remote workspaces and containers](/vscode/editors/remote-and-containers/).
- To look up a vulnerability identifier on any web page, use the [browser extension](/browser-extension/).

> [!WHY] Why there is no WebAssembly scanner
> A second, smaller engine compiled for the browser would give different results from the CLI that CI runs. One engine producing one answer is the design.
