---
title: vulnetix license
nav: vulnetix license
description: How package licences are resolved, the rules and conflict matrix they are evaluated against, the output formats, and how licence checks run inside a scan.
order: 1
sources: [cli/cmd/license.go, cli/cmd/license_policy.go, cli/cmd/stored_licenses.go, cli/cmd/scan.go, cli/internal/license/detect.go, cli/internal/license/evaluate.go, cli/internal/license/category.go, cli/internal/license/policy.go, cli/internal/license/registries.go, cli/internal/license/types.go]
checked: [cli@4c8c3b7]
updated: 02 Nov 2026
---

```bash
vulnetix license [flags]
```

The command finds manifests, resolves each package's licence, and evaluates the set against built-in rules and your [policy](/sca/license/policy/). Findings are merged into `.vulnetix/sbom.cdx.json` next to vulnerability findings and tracked in `.vulnetix/memory.yaml`. When you are signed in the results are recorded as a snapshot. Without credentials nothing is uploaded, but the API, registries, deps.dev and GitHub are still asked about licences the local steps could not resolve.

`vulnetix scan` runs the same pipeline unless `--no-licenses` is passed. `vulnetix sca` does not run it.

## Flags

| Flag | Default | Effect |
|---|---|---|
| `--path` | `.` | Directory to scan |
| `--depth` | `3` | Directory levels |
| `--exclude` | none | Glob to skip, repeatable |
| `--mode` | `inclusive` | `inclusive`: conflicts across the whole project. `individual`: conflicts only within one manifest. |
| `--allow` | none | Comma-separated SPDX allow list |
| `--allow-file` | none | YAML allow list (`licenses:` list) |
| `--policy-file` | `<path>/.vulnetix/license-policy.yaml` if present | [Licence policy](/sca/license/policy/) |
| `--exceptions-file` | `<path>/.vulnetix/license-exceptions.yaml` if present | [Approved exceptions](/sca/license/policy/#exceptions) |
| `--project` | none | Selects the policy's per-project overrides; also labels the SBOM |
| `--cluster`, `--namespace`, `--environment`, `--tag` | none | Deployment labels on the SBOM |
| `--severity` | none | Exit `1` if a finding is at or above `low`, `medium`, `high` or `critical`. Exempted findings never count. |
| `-o, --output` | pretty | `json` (CycloneDX), `json-spdx` (SPDX 2.3) |
| `--results-only` | `false` | Summary and issues only; no package table |
| `--from-memory` | `false` | Rebuild the output from `.vulnetix/memory.yaml` without scanning |
| `--dry-run` | `false` | Detect and parse only: no evaluation and no API calls |
| `--disable-memory` | `false` | Global flag: no memory reads or writes, and no resolved-finding VEX |

## Resolution order

Each step runs only for packages still unknown.

| Step | Source | `LicenseSource` |
|---|---|---|
| 1 | Licence fields in manifests: `package.json` `license`, `Cargo.toml` `[package] license`, `pyproject.toml` `[project] license`, `composer.json` `license` | `manifest` |
| 2 | LICENSE and COPYING files in the Go module cache (`~/go/pkg/mod/`), classified by text, plus `SPDX-License-Identifier` headers | `filesystem` |
| 3 | Containers and IaC: OCI image labels via `podman inspect` or `docker inspect`, well-known images, Docker Hub; Terraform Registry; `nix eval` | `container` |
| 4 | Embedded mapping of popular packages to SPDX ids | `embedded-db` |
| 5 | Licences earlier Vulnetix scans stored, one `POST /v2/cli.licenses` request (10 second limit) | `vulnetix` |
| 6 | Package registries: RubyGems, Hex, pub, Hackage, CRAN, Packagist, CocoaPods, Julia, Crystal, opam | `registry` |
| 7 | deps.dev for Go, npm, PyPI, Cargo, Maven, NuGet | `deps.dev` |
| 8 | GitHub: the repository's licence via `gh` when signed in, else the REST API with `GITHUB_TOKEN` or `GH_TOKEN` | `github` |

Results from steps 6 to 8 are cached under `~/.vulnetix/cache/licenses/` for seven days. Set `VULNETIX_NO_LICENSE_CACHE=1` to turn the cache off.

## Rules

| Rule | Severity | Raised when |
|---|---|---|
| `unknown-license` | Policy `unknown: warn` gives the `unknown` category severity (`medium` by default); `fail` gives `high` or a stricter category severity; `ignore` gives none | No source resolved a licence |
| `non-standard-license` | `low` | A licence exists but is not an SPDX id |
| `deprecated-license` | `low` | The SPDX id is deprecated |
| `not-osi-approved` | `low` | Not OSI-approved (public-domain licences exempt) |
| `copyleft-in-production` | The policy's severity for the category | A category the policy gives a severity, in a scope the policy evaluates. By default only strong copyleft, at `high`. |
| `not-in-allowlist` | `high` | An allow list is set and the licence is not on it |
| `license-conflict` | From the matrix below | Two licences in scope are incompatible |

Dependencies in a scope the policy ignores (for example `dev`, `test`) produce no findings at all.

### Categories

| Category | Examples |
|---|---|
| `permissive` | MIT, Apache-2.0, BSD-3-Clause, ISC |
| `weak-copyleft` | LGPL-2.1, MPL-2.0, EPL-2.0, CDDL-1.0 |
| `strong-copyleft` | GPL-3.0, AGPL-3.0, EUPL-1.2 |
| `proprietary` | BUSL-1.1, PolyForm, CC-BY-NC |
| `public-domain` | CC0-1.0, Unlicense, 0BSD |
| `unknown` | Unresolved |

### Conflicts

| Pair | Severity |
|---|---|
| strong copyleft + proprietary | `critical` |
| weak copyleft + proprietary | `high` |
| Apache-2.0 + GPL-2.0-only | `high` |
| Apache-2.0 + GPL-2.0-or-later | `medium` |
| AGPL-3.0-only + GPL-2.0-only | `high` |
| GPL-2.0-only + GPL-3.0-only | `high` |

## Output

| `-o` | Output |
|---|---|
| (none) | Package count, licence and category breakdown, OSI, FSF and deprecated badges, the package table by manifest, conflicts, findings by severity |
| `json` | The full CycloneDX BOM after the merge. Each finding is a `vulnerabilities` entry with source `vulnetix-license-analyzer` and properties `vulnetix:license-category` (the rule), `vulnetix:license-spdx-id`, `vulnetix:license-severity`, `vulnetix:source-file`, `vulnetix:evidence-N:rule`, `vulnetix:evidence-N:result`. |
| `json-spdx` | A standalone SPDX 2.3 document: `packages[]` with `licenseConcluded` and `licenseDeclared`, `relationships[]`, `extractedLicensingInfos[]`, purls as external references |

The merge into `.vulnetix/sbom.cdx.json` is keyed by source, so `scan` and `license` runs never overwrite each other's findings. The licence pass appends `vulnetix-license-analyzer` with its version to `metadata.tools` and leaves the document's `serialNumber`, `timestamp` and `manufacturer` alone. A finding that disappears on a later run (package removed, or licence changed) is marked resolved and written as VEX in the same SBOM.

## Inside `vulnetix scan`

`scan` uses the same detection, policy, exceptions and memory path, so both reach the same verdict.

| `license` flag | Scan-family flag |
|---|---|
| `--allow` | `--allow` |
| `--allow-file` | `--allow-file` |
| `--mode` | `--license-mode` |
| `--policy-file` | `--policy-file` |
| `--exceptions-file` | `--exceptions-file` |

```bash
vulnetix license --allow MIT,Apache-2.0 --mode individual
vulnetix scan --allow MIT,Apache-2.0 --license-mode individual      # same findings
vulnetix scan --evaluate-sca --evaluate-licenses --allow MIT        # licences need SCA's packages
```

`--evaluate-licenses` alone resolves nothing, because licences are evaluated on the packages the SCA pass resolves.

## Exit codes

| Code | Meaning |
|---|---|
| `0` | Finished; `--severity` not breached |
| `1` | `--severity` breached, or an error |

`vulnetix license exceptions check` also exits `1` when any exception has expired.
