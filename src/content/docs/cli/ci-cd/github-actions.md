---
title: GitHub Actions
description: The Vulnetix GitHub Actions, the root action's inputs, outputs, credentials and permissions, and complete workflows for scanning, gating and publishing.
order: 2
sources: [cli/action.yml, cli/action-lib/run.sh, cli/action-lib/install.sh, cli/action-lib/finish.sh, cli/action-lib/config.sh, cli/action-lib/publish.sh, cli/tools/actiongen/spec.go, cli/docs/github-actions.md, cli/cmd/gha.go, cli/cmd/upload.go, cli/cmd/gha_submit.go, cli/install.sh]
checked: [cli@v4.24.2]
updated: 03 Nov 2026
---

There are three ways to run the CLI in a workflow:

| Approach | Use it for |
|---|---|
| A per-command action, `uses: Vulnetix/cli/<name>@v4` | One command, with publishing to GitHub, an artifact upload, attestation and release assets in the same step. [Table below](#an-action-for-each-command). |
| The root action, `uses: Vulnetix/cli@v4` with `task:` | The same commands behind one action reference. |
| The install script in a `run:` step | Any command or flag the actions do not expose. |

All three install the released binary; none needs a Go toolchain. The per-command actions and the root action share the same scripts, so the same inputs behave the same way.

```yaml
name: Vulnetix
on: [push, pull_request]
permissions:
  contents: read
jobs:
  vulnetix:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5
      - uses: Vulnetix/cli@v4
        with:
          org-id: ${{ secrets.VULNETIX_ORG_ID }}
          api-key: ${{ secrets.VULNETIX_API_KEY }}
```

With the default `task: info` the root action installs the CLI and runs `vulnetix`, the authentication health check. Without `org-id` and a credential the CLI runs in community mode.

## The catalogue

<!-- catalogue:start -->
| Action | What it does |
|---|---|
| [`ai-firewall-apply`](/cli/github-actions/ai-firewall-apply/) | Reconcile the organisation's AI Firewall policy from a file (vulnetix ai-firewall apply). |
| [`aibom`](/sbom/github-actions/aibom/) | Write an AI bill of materials (vulnetix aibom). |
| [`analyze`](/cli/github-actions/analyze/) | Report the repository's tech stack, ownership and risk (vulnetix analyze). |
| [`api-discover`](/cli/github-actions/api-discover/) | Find OpenAPI and Swagger descriptions in the working tree and upload them (vulnetix api discover). |
| [`api-upload`](/cli/github-actions/api-upload/) | Upload one OpenAPI or Swagger file (vulnetix api upload). |
| [`attest`](/attestation/github-actions/attest/) | Verify an artefact's signature, identity and provenance (vulnetix attest verify). |
| [`bom-diff`](/sbom/github-actions/bom-diff/) | Compare two SBOM documents and fail on the changes you name (vulnetix bom diff). |
| [`bom-enrich`](/sbom/github-actions/bom-enrich/) | Resolve licences and attach vulnerabilities and VEX to a supplied SBOM (vulnetix bom enrich). |
| [`bom-merge`](/sbom/github-actions/bom-merge/) | Combine SBOM documents into one, such as the fragments of scoped sca jobs (vulnetix bom merge). |
| [`bom-validate`](/sbom/github-actions/bom-validate/) | Check an SBOM's structure and field completeness (vulnetix bom validate). |
| [`cbom`](/sbom/github-actions/cbom/) | Write a cryptography bill of materials (vulnetix cbom). |
| [`config-apply`](/platform-iac/github-actions/config-apply/) | Apply Platform IaC documents through the config engine (vulnetix config apply). Authenticate with org-id and the api-key of an owner, an admin or an admin service account, or with api-token. |
| [`config-export`](/platform-iac/github-actions/config-export/) | Write the organisation's configuration as code, for a drift job or a backup (vulnetix config export). |
| [`config-plan`](/platform-iac/github-actions/config-plan/) | Plan Platform IaC documents against the config engine and comment the plan on the pull request (vulnetix config plan). Authenticate with org-id and the api-key of an owner, an admin or an admin service account, or with api-token. |
| [`containers`](/sca/github-actions/containers/) | Scan container files and images (vulnetix containers). |
| [`fix`](/cli/github-actions/fix/) | Resolve vulnerable dependencies to safe versions and write the change as a patch artifact; it never commits (vulnetix fix --yes). |
| [`gha-actions`](/cli/github-actions/gha-actions/) | Check the actions and images this repository's workflows run (vulnetix gha actions). |
| [`gha-audit`](/cli/github-actions/gha-audit/) | Run every GitHub posture check: workflows, actions, settings and organisation (vulnetix gha audit). |
| [`gha-org`](/cli/github-actions/gha-org/) | Check organisation settings (vulnetix gha org). Needs a token that can read them. |
| [`gha-settings`](/cli/github-actions/gha-settings/) | Check the repository settings that protect the code and CI (vulnetix gha settings). |
| [`gha-status`](/cli/github-actions/gha-status/) | Report what this workflow run published to Vulnetix (vulnetix gha status). |
| [`gha-upload`](/cli/github-actions/gha-upload/) | Upload every artifact of this workflow run to Vulnetix (vulnetix gha upload). |
| [`gha-workflows`](/cli/github-actions/gha-workflows/) | Find injection, privilege and trust flaws in this repository's GitHub Actions workflows (vulnetix gha workflows). |
| [`github-advisories`](/cli/github-actions/github-advisories/) | Draft GitHub repository security advisories for this repository's SAST findings (vulnetix gha publish advisories). |
| [`github-publish`](/cli/github-actions/github-publish/) | Publish existing results into GitHub: code scanning, the dependency graph, release assets and security campaigns (vulnetix gha publish). |
| [`iac`](/iac-scanning/github-actions/iac/) | Scan infrastructure as code (vulnetix iac). |
| [`ignore-sync`](/cli/github-actions/ignore-sync/) | Pull the organisation's suppression rules into .vulnetix/memory.yaml before a scan (vulnetix ignore sync). |
| [`image`](/cli/github-actions/image/) | Inventory a container image for container curation (vulnetix image). |
| [`jail-explain`](/quality-gates/github-actions/jail-explain/) | Show why the repository is or is not jailed, rule by rule (vulnetix jail explain). |
| [`jail`](/quality-gates/github-actions/jail/) | Assess the repository against the organisation's jail policy (vulnetix jail). |
| [`license-exceptions-check`](/sca/github-actions/license-exceptions-check/) | Report licence exceptions expiring soon (vulnetix license exceptions check). |
| [`license-policy-validate`](/sca/github-actions/license-policy-validate/) | Check a licence policy document for problems (vulnetix license policy validate). |
| [`license`](/sca/github-actions/license/) | Evaluate dependency licences against the licence policy (vulnetix license). |
| [`malscan`](/malware/github-actions/malscan/) | Scan installed dependencies for malicious code (vulnetix malscan). |
| [`package-firewall`](/cli/github-actions/package-firewall/) | Point a package manager on this runner at the Vulnetix Package Firewall, so later install steps go through it (vulnetix package-firewall <ecosystem>). |
| [`report`](/cli/github-actions/report/) | Render the stored scan results of an earlier step without rescanning (vulnetix report). |
| [`sast`](/sast/github-actions/sast/) | Scan source code with the SAST rules (vulnetix sast). |
| [`sast/c-cpp`](/sast/github-actions/c-cpp/) | Scan the C and C++ files of a repository with the SAST rules (vulnetix sast --language c-cpp). |
| [`sast/csharp`](/sast/github-actions/csharp/) | Scan the C# files of a repository with the SAST rules (vulnetix sast --language csharp). |
| [`sast/go`](/sast/github-actions/go/) | Scan the Go files of a repository with the SAST rules (vulnetix sast --language go). |
| [`sast/java`](/sast/github-actions/java/) | Scan the Java files of a repository with the SAST rules (vulnetix sast --language java). |
| [`sast/javascript`](/sast/github-actions/javascript/) | Scan the JavaScript files of a repository with the SAST rules (vulnetix sast --language javascript). |
| [`sast/kotlin`](/sast/github-actions/kotlin/) | Scan the Kotlin files of a repository with the SAST rules (vulnetix sast --language kotlin). |
| [`sast/php`](/sast/github-actions/php/) | Scan the PHP files of a repository with the SAST rules (vulnetix sast --language php). |
| [`sast/python`](/sast/github-actions/python/) | Scan the Python files of a repository with the SAST rules (vulnetix sast --language python). |
| [`sast/ruby`](/sast/github-actions/ruby/) | Scan the Ruby files of a repository with the SAST rules (vulnetix sast --language ruby). |
| [`sast/rust`](/sast/github-actions/rust/) | Scan the Rust files of a repository with the SAST rules (vulnetix sast --language rust). |
| [`sast/shell`](/sast/github-actions/shell/) | Scan the Shell files of a repository with the SAST rules (vulnetix sast --language shell). |
| [`sast/typescript`](/sast/github-actions/typescript/) | Scan the TypeScript files of a repository with the SAST rules (vulnetix sast --language typescript). TypeScript is JavaScript to the CLI: this is the same scan, with the same files, category and tool name as sast/javascript, so use one of them. |
| [`sbom`](/sbom/github-actions/sbom/) | Write a CycloneDX SBOM (vulnetix cdx). |
| [`sca`](/sca/github-actions/sca/) | Scan dependencies for known vulnerabilities (vulnetix sca). |
| [`sca/bun`](/sca/github-actions/bun/) | Scan the Bun dependencies of a repository for known vulnerabilities (vulnetix sca --package-manager bun). |
| [`sca/bundler`](/sca/github-actions/bundler/) | Scan the Bundler dependencies of a repository for known vulnerabilities (vulnetix sca --package-manager bundler). |
| [`sca/cargo`](/sca/github-actions/cargo/) | Scan the Cargo dependencies of a repository for known vulnerabilities (vulnetix sca --package-manager cargo). |
| [`sca/cocoapods`](/sca/github-actions/cocoapods/) | Scan the CocoaPods dependencies of a repository for known vulnerabilities (vulnetix sca --package-manager cocoapods). |
| [`sca/composer`](/sca/github-actions/composer/) | Scan the Composer dependencies of a repository for known vulnerabilities (vulnetix sca --package-manager composer). |
| [`sca/go`](/sca/github-actions/go/) | Scan the Go modules dependencies of a repository for known vulnerabilities (vulnetix sca --package-manager go). |
| [`sca/gradle`](/sca/github-actions/gradle/) | Scan the Gradle dependencies of a repository for known vulnerabilities (vulnetix sca --package-manager gradle). |
| [`sca/hex`](/sca/github-actions/hex/) | Scan the Hex dependencies of a repository for known vulnerabilities (vulnetix sca --package-manager hex). |
| [`sca/maven`](/sca/github-actions/maven/) | Scan the Maven dependencies of a repository for known vulnerabilities (vulnetix sca --package-manager maven). |
| [`sca/npm`](/sca/github-actions/npm/) | Scan the npm dependencies of a repository for known vulnerabilities (vulnetix sca --package-manager npm). |
| [`sca/nuget`](/sca/github-actions/nuget/) | Scan the NuGet dependencies of a repository for known vulnerabilities (vulnetix sca --package-manager nuget). |
| [`sca/pip`](/sca/github-actions/pip/) | Scan the pip dependencies of a repository for known vulnerabilities (vulnetix sca --package-manager pip). |
| [`sca/pipenv`](/sca/github-actions/pipenv/) | Scan the Pipenv dependencies of a repository for known vulnerabilities (vulnetix sca --package-manager pipenv). |
| [`sca/pnpm`](/sca/github-actions/pnpm/) | Scan the pnpm dependencies of a repository for known vulnerabilities (vulnetix sca --package-manager pnpm). |
| [`sca/poetry`](/sca/github-actions/poetry/) | Scan the Poetry dependencies of a repository for known vulnerabilities (vulnetix sca --package-manager poetry). |
| [`sca/pub`](/sca/github-actions/pub/) | Scan the pub dependencies of a repository for known vulnerabilities (vulnetix sca --package-manager pub). |
| [`sca/swift`](/sca/github-actions/swift/) | Scan the Swift Package Manager dependencies of a repository for known vulnerabilities (vulnetix sca --package-manager swift). |
| [`sca/uv`](/sca/github-actions/uv/) | Scan the uv dependencies of a repository for known vulnerabilities (vulnetix sca --package-manager uv). |
| [`sca/yarn`](/sca/github-actions/yarn/) | Scan the Yarn dependencies of a repository for known vulnerabilities (vulnetix sca --package-manager yarn). |
| [`scan`](/cli/github-actions/scan/) | Run every scanner in one job (vulnetix scan). For a monorepo with three or more languages; otherwise use the granular actions. |
| [`secrets`](/secrets/github-actions/secrets/) | Scan for committed secrets (vulnetix secrets). |
| [`setup`](/cli/github-actions/setup/) | Install the Vulnetix CLI and put it on PATH for later steps. |
| [`surface-liveness`](/cli/github-actions/surface-liveness/) | Check that registered routes and hosts still answer, from inside your network (vulnetix surface liveness). |
| [`tea-release`](/tea/github-actions/tea-release/) | Publish a product release and its artifacts to the Transparency Exchange API (vulnetix tea release). |
| [`triage`](/cli/github-actions/triage/) | Triage this repository's GitHub or Vulnetix alerts into a report (vulnetix triage --format json). |
| [`upload`](/cli/github-actions/upload/) | Upload one artifact file to Vulnetix (vulnetix upload). |
| [`vex`](/vex/github-actions/vex/) | Work with VEX documents: validate, list, merge or apply (vulnetix vex <vex-command>). |
<!-- catalogue:end -->

## Secrets

Add under **Settings > Secrets and variables > Actions**:

| Secret | Value |
|---|---|
| `VULNETIX_ORG_ID` | Organisation UUID |
| `VULNETIX_API_KEY` | ApiKey |

`api-token` is an alternative to `org-id` plus `api-key`: the server resolves the organisation from the token. Store it as `VULNETIX_API_TOKEN` if you use it.

## Credentials

The actions pass credentials to the CLI only as environment variables of the step that runs the command:

| Input | Environment variable |
|---|---|
| `org-id` | `VULNETIX_ORG_ID` |
| `api-key` | `VULNETIX_API_KEY` |
| `api-token` | `VULNETIX_API_TOKEN` |
| `github-token` | `GITHUB_TOKEN` |

The CLI reads these before any stored file. The actions never run `vulnetix auth login`, so no `.vulnetix/credentials.json` is written into the workspace and no credential appears on a command line or in an uploaded artifact. If a credentials file is present in the workspace anyway, the run step prints a warning.

`org-id` is optional. Every input reaches the scripts as an environment variable, never as a `${{ }}` expression inside a script, and commands are built as argument arrays and never evaluated, so an input containing quotes or `$(...)` stays data.

> [!WHY] Why the actions do not log in
> Before v3.159.0 the root action ran `vulnetix auth login --store project` with the key on the command line. That wrote the key into the checkout, where a later `upload-artifact` or cache step could ship it. Reading the environment first, which the CLI already does, removes the file. See [Precedence](/cli/authentication/precedence/).

## An action for each command

Each command has an action in a subdirectory of `Vulnetix/cli`. Its page lists the inputs, outputs, permissions and a complete workflow.

| Action | Runs | Page |
|---|---|---|
| `setup` | Installs the CLI | [setup](/cli/github-actions/setup/) |
| `sca` | `vulnetix sca` | [sca](/sca/github-actions/sca/) |
| `sast` | `vulnetix sast` | [sast](/sast/github-actions/sast/) |
| `secrets` | `vulnetix secrets` | [secrets](/secrets/github-actions/secrets/) |
| `iac` | `vulnetix iac` | [iac](/iac-scanning/github-actions/iac/) |
| `containers` | `vulnetix containers` | [containers](/sca/github-actions/containers/) |
| `license` | `vulnetix license` | [license](/sca/github-actions/license/) |
| `malscan` | `vulnetix malscan` | [malscan](/malware/github-actions/malscan/) |
| `analyze` | `vulnetix analyze` | [analyze](/cli/github-actions/analyze/) |
| `cbom` | `vulnetix cbom` | [cbom](/sbom/github-actions/cbom/) |
| `aibom` | `vulnetix aibom` | [aibom](/sbom/github-actions/aibom/) |
| `sbom` | `vulnetix cdx` | [sbom](/sbom/github-actions/sbom/) |
| `upload` | `vulnetix upload` | [upload](/cli/github-actions/upload/) |
| `gha-upload` | `vulnetix gha upload` | [gha-upload](/cli/github-actions/gha-upload/) |
| `tea-release` | `vulnetix tea release` | [tea-release](/tea/github-actions/tea-release/) |
| `config-plan` | `vulnetix config plan` or `config validate` | [config-plan](/platform-iac/github-actions/config-plan/) |
| `config-apply` | `vulnetix config apply` | [config-apply](/platform-iac/github-actions/config-apply/) |
| `attest` | `vulnetix attest verify` | [attest](/attestation/github-actions/attest/) |
| `jail` | `vulnetix jail` | [jail](/quality-gates/github-actions/jail/) |
| `vex` | `vulnetix vex <vex-command>` | [vex](/vex/github-actions/vex/) |
| `github-publish` | `vulnetix gha publish` | [github-publish](/cli/github-actions/github-publish/) |

Every action does the same things around its command, in this order:

1. Installs the CLI (skipped when an earlier Vulnetix action in the job already installed the same version).
2. Runs the command with `--artifact-manifest`, so the files it wrote are known. The step itself exits `0` when the command ran.
3. Publishes to GitHub when asked: `github-code-scanning`, `dependency-graph`.
4. Uploads the written files as a workflow artifact when `artifact-name` is set.
5. Attests them when `attest` is `true`.
6. Attaches them to the release named by `release-tag`.
7. Fails the job with the command's exit code, unless `fail-on-findings` is `false`.

Steps 3 to 6 run whether or not the command failed, so a breached gate still leaves the SARIF, the artifact and the attestation. A later step in the same job needs `if: ${{ !cancelled() }}` to run after the failure. A publish failure is a warning: publishing to GitHub never fails a scan, and a pull request from a fork has a read-only token.

> [!CAREFUL] fail-on-findings: false hides every non-zero exit code
> The last step re-raises the command's exit code only when `fail-on-findings` is `true`, the default. With `false`, a breached gate, a command error and, for `jail`, an undecided verdict (exit code 3) all become a warning. Read the `exit-code` output in a later step if you need to tell them apart.

### Scan, publish, upload and attest

```yaml
name: Vulnetix
on:
  push:
    branches: [main]
  pull_request:
jobs:
  sca:
    runs-on: ubuntu-latest
    permissions:
      contents: write          # dependency graph
      security-events: write   # code scanning
      actions: read            # code scanning on a private repository
      id-token: write          # attestation
      attestations: write
    steps:
      - uses: actions/checkout@v5
      - uses: Vulnetix/cli/sca@v4
        id: sca
        with:
          org-id: ${{ secrets.VULNETIX_ORG_ID }}
          api-key: ${{ secrets.VULNETIX_API_KEY }}
          args: --fail-on high,kev,malware
          artifact-name: vulnetix-sca
          attest: true
      - uses: Vulnetix/cli/github-publish@v4
        if: ${{ !cancelled() }}
        with:
          sarif: .vulnetix/sca.sarif
          sbom: .vulnetix/sbom.cdx.json
          github-code-scanning: true
          dependency-graph: true
  sast:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      security-events: write
      actions: read
      id-token: write
      attestations: write
    steps:
      - uses: actions/checkout@v5
      - uses: Vulnetix/cli/sast@v4
        with:
          org-id: ${{ secrets.VULNETIX_ORG_ID }}
          api-key: ${{ secrets.VULNETIX_API_KEY }}
          args: --fail-on high
          github-code-scanning: true
          artifact-name: vulnetix-sast
          attest: true
```

`vulnetix sca` does not accept `--github-publish` in v3.165.0 and earlier, so the `sca` job publishes in a second step. The `sast` action publishes itself. Each job publishes under its own code scanning category (`vulnetix/sca/`, `vulnetix/sast/`), so one job never closes the other's alerts. To verify an attestation: `gh attestation verify <file> --repo <owner>/<repo>`.

To publish results a scan already produced, or to publish from a different job than the scan, use [github-publish](/cli/github-actions/github-publish/) or [`vulnetix gha publish`](/cli/commands/gha-publish/).

## Scan with the install script

The install script gives access to every flag. This is the pattern for any command:

```yaml
name: Vulnetix
on:
  push:
    branches: [main]
  pull_request:
permissions:
  contents: read
  security-events: write
jobs:
  scan:
    runs-on: ubuntu-latest
    env:
      VULNETIX_ORG_ID: ${{ secrets.VULNETIX_ORG_ID }}
      VULNETIX_API_KEY: ${{ secrets.VULNETIX_API_KEY }}
    steps:
      - uses: actions/checkout@v5
      - name: Install Vulnetix CLI
        run: |
          curl -fsSL --retry 5 --retry-all-errors -o "$RUNNER_TEMP/vulnetix-install.sh" https://cli.vulnetix.com/install.sh
          sh "$RUNNER_TEMP/vulnetix-install.sh" --install-dir "$HOME/.local/bin" --version v4
          echo "$HOME/.local/bin" >> "$GITHUB_PATH"
      - run: vulnetix auth verify
      - name: Scan
        run: vulnetix scan --fail-on high,kev,malware --github-publish code-scanning -o dist/sbom.cdx.json -o dist/results.sarif
      - uses: actions/upload-artifact@v7
        if: ${{ !cancelled() }}
        with:
          name: vulnetix
          path: dist/
          if-no-files-found: warn
```

`--github-publish code-scanning` uploads the scan's SARIF at its end, so the separate `github/codeql-action/upload-sarif` step is not needed. `--version v4` installs the newest v4 release; see [Versions and release channels](/cli/ci-cd/versions-and-channels/). Under Actions, `scan` prints the plain view, adds workflow-command annotations on the manifest lines, and appends a Markdown summary to the job summary.

To report without blocking the merge, add `continue-on-error: true` to the scan step rather than removing the gate.

## One job per scanner

Every scanner runs on its own and publishes its own results:

```yaml
jobs:
  scanner:
    strategy:
      fail-fast: false
      matrix:
        run:
          - "sca --fail-on high -o dist/sbom.cdx.json"
          - "sast --fail-on high -o dist/sast.sarif"
          - "secrets -o dist/secrets.sarif"
          - "iac -o dist/iac.sarif"
          - "containers -o dist/containers.sarif"
          - "license --allow MIT,Apache-2.0,BSD-3-Clause"
          - "cbom --output-file dist/cbom.cdx.json"
          - "aibom --output-file dist/aibom.cdx.json"
    runs-on: ubuntu-latest
    env:
      VULNETIX_ORG_ID: ${{ secrets.VULNETIX_ORG_ID }}
      VULNETIX_API_KEY: ${{ secrets.VULNETIX_API_KEY }}
    steps:
      - uses: actions/checkout@v5
      - name: Install Vulnetix CLI
        run: |
          curl -fsSL https://cli.vulnetix.com/install.sh | sh -s -- --install-dir "$HOME/.local/bin"
          echo "$HOME/.local/bin" >> "$GITHUB_PATH"
      - run: mkdir -p dist && vulnetix ${{ matrix.run }}
```

`malscan` reads installed dependencies, so run it after your install step (`npm ci`, `pip install`, ...). Each scanner's flags are in its segment: [SCA](/sca/), [SAST](/sast/), [Secrets](/secrets/), [IaC scanning](/iac-scanning/), [Malware](/malware/), [SBOM](/sbom/).

## Posture and metrics

```yaml
      - name: GitHub posture
        env:
          GITHUB_TOKEN: ${{ github.token }}
        run: vulnetix gha audit --format sarif --output dist/gha.sarif --fail-on high
      - name: Repository metrics
        env:
          GITHUB_TOKEN: ${{ github.token }}
        run: vulnetix analyze
```

`analyze` needs `pull-requests: read` and `issues: read` in `permissions`, and `fetch-depth: 0` on checkout for history. See [GitHub posture commands](/cli/commands/gha/) and [analyze](/cli/commands/analyze/).

## Third-party scanners

`vulnetix gha setup` writes a workflow that runs gosec, Trivy, Semgrep, Checkov and others as separate jobs, and one publish job that sends every report to Vulnetix under the tool that produced it. See [Third-party scanners](/cli/ci-cd/third-party-scanners/) and [gha upload and status](/cli/ci-cd/gha-command/).

## Release artifacts

The `release-tag` input of any per-command action attaches the files the command wrote to a release. Put it in a job of its own, so `contents: write` is not held by the scanning job:

```yaml
on:
  release:
    types: [published]
jobs:
  sbom:
    runs-on: ubuntu-latest
    permissions:
      contents: write
      id-token: write
      attestations: write
    steps:
      - uses: actions/checkout@v5
      - uses: Vulnetix/cli/sbom@v4
        with:
          org-id: ${{ secrets.VULNETIX_ORG_ID }}
          api-key: ${{ secrets.VULNETIX_API_KEY }}
          sign: true
          attest: true
          artifact-name: sbom
          release-tag: ${{ github.event.release.tag_name }}
```

The release must already exist. `release-tag` runs [`gha publish release-assets`](/cli/commands/gha-publish/#release-assets) with `--clobber`, so a re-run replaces assets of the same name.

To publish a release to the Transparency Exchange API instead, use the [`tea-release` action](/tea/github-actions/tea-release/) or `vulnetix tea release`; see [TEA](/tea/).

## The root action

```yaml
      - uses: Vulnetix/cli@v4
        with:
          org-id: ${{ secrets.VULNETIX_ORG_ID }}
          api-key: ${{ secrets.VULNETIX_API_KEY }}
          task: sast
          github-code-scanning: true
```

The action installs the CLI with the install script (checking its checksum and, by default, its signed provenance), verifies authentication when `api-key` or `api-token` is set, and runs the task. `@v4` is a moving major tag, and `@v3` still works: it keeps a v3 binary. Pin an exact release tag or a commit SHA for a reproducible workflow. The `version` input chooses the CLI release separately from the action ref.

### Inputs

| Input | Required | Default | Meaning |
|---|---|---|---|
| `org-id` | No | | Organisation UUID, used with `api-key`. Passed as `VULNETIX_ORG_ID`. Without credentials the CLI runs in community mode. |
| `api-key` | No | | ApiKey. Passed as `VULNETIX_API_KEY`, never on the command line. |
| `api-token` | No | | API token. The server resolves the organisation. Passed as `VULNETIX_API_TOKEN`. |
| `version` | No | `v4` | CLI release to install: an exact tag (`v4.0.0`), a major channel (`v4`, the newest v4 release) or `latest`. A `v` is added if missing. |
| `binary-path` | No | | Use this already-built binary instead of downloading a release, for example one built earlier in the job. |
| `verify-provenance` | No | `true` | Install cosign and require the release's signed SLSA provenance to verify for the downloaded binary (`install.sh --require-provenance`; see [Verify a download](/cli/get-started/install/#verify-a-download)). Every v4 release is signed. Set `false` for a v3 release without `provenance.sigstore.json`. Skipped with `binary-path`. The SHA-256 checksum is checked either way. Every subdirectory action takes the same input. |
| `task` | No | `info` | What to run. See [Tasks](#tasks). |
| `path` | No | `.` | Directory to scan, for the scanning tasks |
| `args` | No | | Extra arguments for the command, separated by spaces or newlines. No shell quoting is applied. |
| `vex` | No | | VEX documents to apply before the gates, one path, directory or `https` URL per line, each passed as its own `--vex`. For the `sca`, `sast`, `secrets`, `iac` and `containers` tasks (CLI v4.3.0). `license` and `jail` take none. Not needed for the organization's own VEX: the `VexSource` documents under `.vulnetix/config` and, for an authenticated scan (CLI v4.4.0), the statements the Resolve Platform holds apply without it. Use it for extra or local documents. |
| `fail-on-findings` | No | `true` | Fail the step when the command exits non-zero. Publishing runs either way. |
| `github-code-scanning` | No | `false` | Upload SARIF to GitHub code scanning. Needs `security-events: write`. |
| `dependency-graph` | No | `false` | Submit the SBOM to the GitHub dependency graph. Needs `contents: write`. |
| `github-token` | No | `github.token` | Token for GitHub publishing and for the `config-plan` comment. Passed as `GITHUB_TOKEN`. |
| `upload-file` | With `upload` | | Report to publish |
| `upload-format` | No | detected | `cyclonedx`, `spdx`, `sarif`, `openvex`, `csaf_vex` |
| `tea-files` | With `tea-release` | | Files to publish, one path or glob per line |
| `tea-product` | No | the repository | TEA product name |
| `tea-purl` | No | `pkg:github/<tea-product>` | Package URL identifying the product |
| `tea-version` | No | the tag, on a tag run | Release version |
| `tea-date` | No | | Release date (RFC 3339). Set it for a version that is not a git tag, so a re-run republishes the same release. |
| `tea-pre-release` | No | `false` | Mark as a pre-release |
| `tea-visibility` | No | private | `private`, `shared` or `public`. Public cannot be undone. |
| `tea-dry-run` | No | `false` | Print what would be published, publish nothing |
| `config-path` | No | `.vulnetix/config` | Documents, one file or directory per line |
| `config-manager` | No | `gitops:<owner/repo>` | Manager the documents are declared by |
| `config-prune` | No | `false` | Delete objects this manager owns that the documents no longer declare |
| `validate-only` | No | `false` | `config-plan` only: validate the documents offline instead of planning |

The default `version` is the major channel that matches the action ref, so `Vulnetix/cli@v4` installs the newest v4 release and a workflow still pinned to `@v3` keeps a v3 binary, which is unchanged since v3.169.2. Change the ref to `@v4` to move; see [Migrating from v3 to v4](/cli/get-started/migrating-to-v4/). See [Versions and release channels](/cli/ci-cd/versions-and-channels/).

### Tasks

| Task | Runs |
|---|---|
| `info` | `vulnetix` (the authentication health check) |
| `sca`, `sast`, `secrets`, `iac`, `containers`, `license`, `malscan`, `analyze`, `cbom`, `aibom`, `jail` | The command of the same name, with `--path <path>` where the command takes one |
| `sbom` | `vulnetix cdx --path <path>` |
| `upload` | `vulnetix upload --json --file <upload-file> [--format <upload-format>]` |
| `gha` (or `gha-upload`) | `vulnetix gha upload --json`. Needs `actions: read`. |
| `tea-release` | `vulnetix tea release <tea-files> [--product] [--purl] [--version] [--date] [--visibility] [--pre-release] [--dry-run]`. Needs a Pro plan. |
| `config-plan` | `vulnetix config plan -o json [-f <config-path>]... [--manager] [--prune]`, then the plan to the job summary and, on `pull_request`, to a PR comment. With `validate-only`, `vulnetix config validate`. |
| `config-apply` | `vulnetix config apply --auto-approve [-f <config-path>]... [--manager] [--prune]`, with its output in the job summary |
| `attest`, `vex` | `vulnetix attest verify` and `vulnetix vex`. The root action has no `subject` or `vex-command` input: put the artefact or the subcommand and file in `args`. |

The scan-family tasks add `--github-publish code-scanning` and `--github-publish dependency-graph` for the inputs set to `true`. `vulnetix sca` does not accept `--github-publish` in v3.165.0 and earlier, so use `sast`, `secrets`, `iac` or `containers` for this, or the [github-publish action](/cli/github-actions/github-publish/) after `sca`. `license` does not publish itself, so for that task the action runs `gha publish code-scanning` afterwards. The root action does not publish after `sbom`: use the [sbom action](/sbom/github-actions/sbom/) for `dependency-graph` on an SBOM.

### Outputs

| Output | Value |
|---|---|
| `result` | `success` or `failure` for the command. For `config-plan` and `config-apply`: `success`, `blocked` (exit code 3) or `failure`. |
| `summary` | One line saying what ran and how it ended. For `config-plan`, the plan's counts: `0 to create, 1 to update, 0 to delete, 0 unchanged`. |
| `files` | Every file the command wrote, one per line, from the [artifact manifest](/cli/reference/artifact-manifest/) |
| `sarif` | The SARIF files it wrote, one per line |
| `sbom` | The CycloneDX SBOM it wrote, if any |
| `manifest` | The path of the artifact manifest (JSON Lines) |
| `exit-code` | The command's exit code |
| `upload-uuid` | Meant to be the uploaded report's ID (`task: upload`) |

> [!CAREFUL] upload-uuid is always empty
> The action reads `.pipelineRecord.uuid` from `vulnetix upload --json`, which prints `snapshotUuid` and `pipelineId` instead, so the output is never set. Read the snapshot from the step log, or run `vulnetix upload --json` in a `run:` step and parse `snapshotUuid` yourself.

### config-plan and config-apply

Plan on pull requests, apply on the default branch:

```yaml
on:
  pull_request:
    paths: ['.vulnetix/**']
  push:
    branches: [main]
    paths: ['.vulnetix/**']

jobs:
  config:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      pull-requests: write
    steps:
      - uses: actions/checkout@v5
      - uses: Vulnetix/cli@v4
        with:
          org-id: ${{ secrets.VULNETIX_ORG_ID }}
          api-key: ${{ secrets.VULNETIX_API_KEY }}
          task: ${{ github.event_name == 'pull_request' && 'config-plan' || 'config-apply' }}
```

`config-plan`:

- The job summary gets the plan as a table: one row per object with its action, `(adopt)` or `(drift)`, and the field changes, then any blocking conditions and warnings, then the counts.
- On `pull_request`, the same text goes to one PR comment, found by a hidden `<!-- vulnetix-config-plan -->` marker and updated on each push rather than added again. A fork's read-only token cannot comment; that is a warning, and the summary still has the plan.
- The step fails with the CLI's exit code: 3 when the plan has blocking conditions. The summary and the comment are written first.

`config-apply` runs `vulnetix config apply --auto-approve`. Each run plans again and applies only that fresh plan, so a push that races another push fails with a 409 rather than applying something nobody planned. Its exit codes are those of [apply](/platform-iac/cli/apply/#exit-codes).

`--manager` defaults to `gitops:<owner/repo>` from `GITHUB_REPOSITORY`, lowercased. `api-key` is not needed for these tasks; the token is read only from the environment. Both tasks need `jq` on the runner, as `upload` does. The same behaviour is available as the [config-plan](/platform-iac/github-actions/config-plan/) and [config-apply](/platform-iac/github-actions/config-apply/) actions.

## Permissions

| Permission | Needed for |
|---|---|
| `contents: read` | Checkout |
| `security-events: write` | Code scanning upload (`github-code-scanning`, `gha publish code-scanning`, `github/codeql-action/upload-sarif`) |
| `actions: read` | Code scanning on a private repository; `gha upload` and the `gha` task, to list the run's artifacts |
| `contents: write` | Dependency graph submission (`dependency-graph`); release assets (`release-tag`) |
| `id-token: write`, `attestations: write` | `attest: true`, and `sbom` with `sign: true` for `id-token` |
| `pull-requests: write` | The `config-plan` comment |
| `pull-requests: read`, `issues: read` | `analyze` |
| Repository advisories write | `gha publish advisories`. A fine-grained PAT or GitHub App token; the workflow token cannot. See [gha publish](/cli/commands/gha-publish/#advisories). |

Give each job only what it uses. The permissions of a workflow's top-level `permissions:` block apply to every job without its own.

## Troubleshooting

| Symptom | Fix |
|---|---|
| `GITHUB_TOKEN environment variable is required` | Add `env: { GITHUB_TOKEN: ${{ github.token }} }` to the step running `gha upload` or `gha audit`. The actions set it from `github-token`. |
| `Resource not accessible by integration` on a publish | The job lacks the permission in the [table above](#permissions). The warning names it. |
| A publish warns on a pull request from a fork | A fork's token is read-only. The scan still ran, and the artifact and attestation steps still ran. |
| The SARIF upload step fails on a clean `scan -o results.sarif` | That file is written only when there are findings: guard with `hashFiles(...)` or `if-no-files-found: warn`. `sca.sarif` and `license.sarif` are always written; see [SARIF reference](/cli/reference/sarif/). |
| `gha upload` finds nothing | It sees only artifacts already uploaded in this run: put it in a job that `needs:` every producer, with `if: ${{ !cancelled() }}`. |
| Results look unauthenticated | A secret name is wrong or the secret is not available to forks. Assert the source: [Precedence](/cli/authentication/precedence/#asserting-the-source-in-a-pipeline) |
| The install step fails | The runner must reach `cli.vulnetix.com` and `github.com` release downloads. Behind a proxy, set `HTTPS_PROXY` at job level. |
| A step after the action does not run | The action fails the job with the command's exit code. Add `if: ${{ !cancelled() }}` to later steps, or set `fail-on-findings: false`. |
