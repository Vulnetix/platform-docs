---
title: Secret detection
nav: Overview
description: What vulnetix secrets finds, where it looks, what it sends to Vulnetix, and which pages cover each part.
order: 1
sources: [cli/cmd/specialized_scans.go, cli/cmd/scan.go, cli/internal/sast/kinds.go, cli/internal/sast/engine.go, cli/internal/sast/input.go, cli/internal/secretscan/inspect.go, cli/cmd/sarif_persist.go, cli/cmd/config_documents.go]
checked: [cli@2449840]
updated: 02 Nov 2026
---

`vulnetix secrets` looks for hard-coded credentials: cloud keys, source-control and CI tokens, AI provider keys, payment keys, database connection strings with passwords, private keys, webhook URLs and about 400 SaaS API tokens. It runs the 1,092 built-in Rego rules of kind `secrets` over your working tree, the printable strings inside binary files, image metadata, decoded Kubernetes `Secret` values and the files changed in your recent git history. It runs on your machine. Credentials are optional.

The command is the secrets stage of `vulnetix scan` on its own. These two run the same rules:

```bash
vulnetix secrets
vulnetix scan --only secrets
```

`vulnetix secrets` locks the rule set to kind `secrets`: SAST, IaC, container, SCA and licence analysis do not run, and an external pack passed with `--rule` contributes only its rules of kind `secrets`.

## What a run does

1. Walks `--path` (default `.`) to `--depth` (default `3`) levels, skipping `.git`, `node_modules`, `vendor`, `.venv`, `.tox`, `__pycache__`, `.cargo`, `.hg`, `.vulnetix`, anything matched by `--exclude` or `--ignore`, and anything your `.gitignore` files match.
2. Loads each text file up to 1 MiB. A binary file is reduced to its printable strings, and an image's EXIF, IPTC and XMP metadata is read out. The `data:` values of Kubernetes `Secret` documents are base64-decoded.
3. Reads up to 500 commits of git history, newest first, and adds up to 5,000 past file versions of up to 4 MiB each.
4. Evaluates the rules. Each rule checks for a keyword or prefix first, extracts the token with a regular expression, drops documented example and placeholder values, and for most rules requires a minimum Shannon entropy.
5. Prints the report grouped by credential, writes `.vulnetix/sast.sarif` and `.vulnetix/memory.yaml`, and exits `1` if a `--fail-on` gate is breached.
6. When you are authenticated, submits the findings to Vulnetix and prints a snapshot link.

[What gets scanned](/secrets/guides/what-gets-scanned/) has the detail and the known blind spots.

> [!CAREFUL] Default depth is 3
> A file more than three directories below `--path` (`a/b/c/creds.json`) is never read. Monorepos and deep config trees need `--depth 10` or more. The git-history pass is not depth-limited.

> [!CAREFUL] Gitignored files are skipped
> `.env` and similar files are usually in `.gitignore`, so a default run does not read them. They are not in git, so they are not in the history either. Pass `--secrets-include-ignored` to scan them on a developer machine.

## What leaves your machine

Nothing, unless you are authenticated. When you are, the CLI posts one SARIF submission to `/v2/cli.secrets` with each finding's rule, file, line and a code snippet. The snippet is read from the file with three to five lines of context on each side, so it holds the credential line as written. Pass `--snippet-context 0` to send only the rule's own snippet, which most rules mask. [Output and exit codes](/secrets/reference/output/#what-is-uploaded) lists the rules that do not mask.

## Find the page for your task

| I want to | Read |
|---|---|
| Run my first scan and gate CI on it | [Quickstart](/secrets/get-started/quickstart/) |
| Know whether binaries, history or `.env` files are covered | [What gets scanned](/secrets/guides/what-gets-scanned/) |
| Read the ROTATE NOW, NOT COMMITTED and CAN WAIT groups | [Reading the report](/secrets/guides/reading-the-report/) |
| Silence a test fixture or a false positive | [Suppressing findings](/secrets/guides/suppression/) |
| Look up a flag | [Flags](/secrets/reference/flags/) |
| See which providers are covered | [Rules](/secrets/reference/rules/) |
| Feed SARIF to a code-scanning dashboard | [Output and exit codes](/secrets/reference/output/) |

## Related

- [SAST](/sast/) runs the rules of kind `sast` over the same files.
- [IaC scanning](/iac-scanning/) runs the rules of kind `iac`. `VNX-TF-008` (AWS keys in Terraform) is a secrets rule and runs here, not there.
- [Malware](/malware/) inspects installed dependencies, which this command skips.

## GitHub Actions

Run it in a workflow with the [secrets GitHub Action](/secrets/github-actions/secrets/): it uploads the findings to code scanning under the `vulnetix/secrets/` category, keeps the files as an artifact and attests them.

## Platform IaC

Secret detection has no config-as-code document today. Its pass or fail threshold can come from the organisation's quality gate, which you set with `vulnetix config set quality-gate` and validate offline as a `QualityGate` document (`apiVersion: vulnetix.com/v1`) with `vulnetix config validate`. Config-as-code for secret detection itself is planned and described on [Platform IaC](/platform-iac/).
