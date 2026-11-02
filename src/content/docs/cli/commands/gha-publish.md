---
title: "vulnetix gha publish"
nav: gha publish
description: Publish scan results into GitHub in GitHub's own formats, code scanning, the dependency graph, release assets, repository security advisories and security campaigns. Flags, tokens, permissions, markers and limits.
order: 6
sources: [cli/cmd/gha_publish.go, cli/cmd/gha_publish_advisories.go, cli/cmd/gha_publish_campaigns.go, cli/cmd/scan.go, cli/internal/github, cli/internal/sast/github.go, cli/docs/github-publishing.md]
checked: [cli@3e6fd831d]
updated: 03 Nov 2026
---

`vulnetix gha publish` sends results the CLI already wrote into GitHub, in the formats GitHub reads itself. It is independent of sending them to Vulnetix: it needs no Vulnetix credentials, and [`gha upload`](/cli/ci-cd/gha-command/) and the scan's own upload are unaffected by it.

| Subcommand | Publishes | Since |
|---|---|---|
| [`code-scanning`](#code-scanning) | SARIF to code scanning, one category per scanner | v3.161.0 |
| [`dependency-graph`](#dependency-graph) | A CycloneDX SBOM as a dependency graph snapshot | v3.161.0 |
| [`release-assets`](#release-assets) | Files, or everything in the artifact manifest, to a release | v3.162.0 |
| [`advisories`](#advisories) | Draft repository security advisories for SAST findings | v3.163.0 |
| [`campaigns`](#campaigns) | Vulnetix remediation campaigns as GitHub security campaigns | Not released yet |

The GitHub Actions use these commands: the `github-code-scanning`, `dependency-graph` and `release-tag` inputs of every action, and the [github-publish action](/cli/github-actions/github-publish/).

## GitHub token

The token is `GITHUB_TOKEN`, then `GH_TOKEN`, then `gh auth token`. Set `GITHUB_API_URL` to publish to GitHub Enterprise Server. The repository, commit and ref come from `--repo`, `--sha` and `--ref`, then `GITHUB_REPOSITORY`, `GITHUB_SHA` and `GITHUB_REF`, then the git checkout.

| Target | Permission | Token |
|---|---|---|
| Code scanning | `security-events: write`, and `actions: read` on a private repository | The workflow `GITHUB_TOKEN` |
| Dependency graph | `contents: write` | The workflow `GITHUB_TOKEN` |
| Release assets | `contents: write` | The workflow `GITHUB_TOKEN` |
| Repository advisories | Repository security advisories write | A fine-grained PAT or a GitHub App installation token. The workflow `GITHUB_TOKEN` cannot create advisories. |
| Security campaigns | Organisation owner or security manager, on an organisation with GitHub Advanced Security | A PAT or GitHub App. The workflow `GITHUB_TOKEN` cannot manage campaigns. |

A 401, 403 or 404 is reported with the permission the token lacks. A pull request from a fork has a read-only token, so its publish step warns and the job goes on.

## Publishing from a scan

`scan`, `sast`, `secrets`, `iac` and `containers` take `--github-publish` with `code-scanning`, `dependency-graph`, or both, comma-separated or repeated:

```sh
vulnetix scan --github-publish code-scanning,dependency-graph
```

At the end of the scan it publishes the scan's own results. It uploads an empty result set for each scanner that ran clean, so alerts that were fixed close. `code-scanning` forces `--no-cache`, because a cached run must never close an alert that is still real. A failure prints a warning only: the scan's exit code and its upload to Vulnetix are unaffected, and a community run with no Vulnetix credentials still publishes to GitHub.

> [!CAREFUL] sca does not accept --github-publish yet
> In v3.165.0 and earlier, `vulnetix sca --github-publish ...` exits with `unknown flag`, so the [sca action](/sca/github-actions/sca/) fails when `github-code-scanning` or `dependency-graph` is `true`. Run `vulnetix scan` or `vulnetix sast`, or publish `sca.sarif` and the SBOM with the [github-publish action](/cli/github-actions/github-publish/), which calls the subcommands below.

## code-scanning

```sh
vulnetix gha publish code-scanning [--path .] [--sarif <file>]... [--out-dir <dir>] [--wait 2m] [--checkout-uri <uri>] [--dry-run] [--repo] [--sha] [--ref]
```

Uploads every `.vulnetix/*.sarif` under `--path`, or each `--sarif`. The files are merged and split into one upload per scanner kind, with the category `vulnetix/<kind>/`, so a secrets upload never closes a SAST alert. Results get GitHub's line hash fingerprint where they lack one. The files that were uploaded are written to `.vulnetix/code-scanning/<kind>.sarif`.

| Flag | Default | Meaning |
|---|---|---|
| `--path` | `.` | Repository root the SARIF locations are relative to |
| `--sarif` | every `.vulnetix/*.sarif` | A SARIF file to upload. Repeatable. |
| `--out-dir` | `<path>/.vulnetix/code-scanning` | Where to write the per-kind SARIF that is uploaded |
| `--wait` | `2m` | How long to wait for GitHub to process each upload. `0` does not wait. |
| `--checkout-uri` | | URI of the checkout the SARIF paths are relative to, when it is not the repository root |
| `--dry-run` | `false` | Write the per-kind SARIF and upload nothing |
| `--repo`, `--sha`, `--ref` | from the environment | Target repository, commit and ref |

A run keeps its 25,000 most severe results, because code scanning rejects more, and says how many it dropped. The gzipped document may not exceed 10 MB. The result lines are `code scanning sast: 12 result(s) complete (vulnetix/sast/, refs/heads/main)`. The command exits non-zero when any upload fails. What the SARIF carries is in the [SARIF reference](/cli/reference/sarif/).

## dependency-graph

```sh
vulnetix gha publish dependency-graph [--path .] [--sbom <file>] [--correlator <id>] [--dry-run] [--repo] [--sha] [--ref]
```

Builds a dependency graph snapshot from a CycloneDX SBOM (default `<path>/.vulnetix/sbom.cdx.json`) and posts it to the repository.

| Snapshot field | Taken from |
|---|---|
| Manifests | Each component's `vulnetix:source-file` property. Components without it go under the SBOM's own path. |
| `scope` | `vulnetix:scope`, or the CycloneDX scope: development and test are `development`, the rest `runtime` |
| `relationship` | `direct` when the root component's dependencies name it, else `indirect`. Omitted when the SBOM has no root dependencies. |
| `dependencies` | The component's own `dependsOn`, as purls |
| `job.correlator` | `vulnetix/<workflow>/<job>`, or `--correlator`. The next run with the same correlator replaces this snapshot. |

Components without a purl cannot be named to the dependency graph and are skipped. `--dry-run` prints the snapshot as JSON and submits nothing.

## release-assets

```sh
vulnetix gha publish release-assets [file...] [--tag <tag>] [--manifest <file>] [--clobber] [--create] [--repo]
```

Attaches the named files to the release for `--tag`. With no files named, it attaches every file in the artifact manifest (`--manifest`, else `--artifact-manifest` or `VULNETIX_ARTIFACT_MANIFEST`), including the `.sig`, `.pem` and `.intoto.jsonl` files of a signed SBOM. See [Artifact manifest](/cli/reference/artifact-manifest/).

| Flag | Default | Meaning |
|---|---|---|
| `--tag` | the tag of a tag push | Release tag. Required otherwise. |
| `--manifest` | the global manifest | Artifact manifest whose files to attach |
| `--clobber` | `false` | Replace an asset of the same name. Without it, an existing asset is an error. |
| `--create` | `false` | Create the release as a draft when there is none. Without it, a missing release is an error. |
| `--repo` | from the environment | Target repository |

Two files with the same base name in one run: the second is skipped with a message. The upload host comes from the release's `upload_url`, so GitHub Enterprise Server works.

```sh
vulnetix sca --artifact-manifest "$RUNNER_TEMP/vx.jsonl"
vulnetix gha publish release-assets --tag "$GITHUB_REF_NAME" --manifest "$RUNNER_TEMP/vx.jsonl" --clobber
```

## advisories

```sh
GITHUB_TOKEN=$ADVISORY_PAT vulnetix gha publish advisories [--path .] [--sarif <file>]... [--min-severity high] [--max 10] [--dry-run] [--repo]
```

Drafts GitHub repository security advisories for this repository's own SAST findings.

| Flag | Default | Meaning |
|---|---|---|
| `--path` | `.` | Repository root. Its manifest names the affected package. |
| `--sarif` | `<path>/.vulnetix/sast.sarif` | SARIF to read. Repeatable. |
| `--min-severity` | `high` | Lowest severity that gets an advisory: `critical`, `high`, `medium` or `low` |
| `--max` | `10` | Most advisories to draft or update in one run |
| `--dry-run` | `false` | Print what would be drafted and call nothing |
| `--repo` | from the environment | Target repository |

| Rule | Detail |
|---|---|
| Scope | Findings of kind `sast` at or above `--min-severity`. Suppressed findings, test-suite findings and findings with a confidence gap are left out. |
| Grouping | One advisory per rule and CWE set, worst severity first, then most locations, at most `--max` |
| Fields | Summary `[Vulnetix] <rule>`, a description listing up to 25 locations, `cwe_ids` and `severity`. A CVSS vector is never set. |
| Package | The repository's own, from `package.json`, `go.mod`, `Cargo.toml`, `pyproject.toml` or `composer.json`. Otherwise ecosystem `other` with the repository name. |
| Lifecycle | Always a draft. The update body has no `state`, so publishing stays a maintainer's decision. |

## campaigns

```sh
VULNETIX_CONFIG_TOKEN=vmt_... GH_TOKEN=$ORG_PAT vulnetix gha publish campaigns --org acme [--recreate-on-scope-change] [--default-days 90] [--dry-run]
```

> [!CAREFUL] campaigns is not in a release yet
> The command is in the CLI source and ships in a release after v3.165.0. Flags may change before then. It needs a Pro plan.

Mirrors each active Vulnetix remediation campaign as a GitHub security campaign named `[Vulnetix] <name>`. A campaign's open items are matched to the organisation's open code scanning alerts: an alert belongs to an item when its rule ID is the item's finding ID and, for a package, the alert names it. Publish code scanning first so the alerts exist. The campaign ends at the Vulnetix deadline, or `--default-days` days from creation, and its contact link points back at the Vulnetix campaign. A completed or archived Vulnetix campaign closes its GitHub campaign.

| Flag | Default | Meaning |
|---|---|---|
| `--org` | `GITHUB_REPOSITORY_OWNER` | GitHub organisation that owns the repositories |
| `--token` | `VULNETIX_CONFIG_TOKEN` | Vulnetix config management token (`vmt_...`) with the campaigns read scope. The token only reads. |
| `--recreate-on-scope-change` | `false` | Close and recreate a GitHub campaign whose Vulnetix cohort changed |
| `--default-days` | `90` | Days until a campaign with no Vulnetix deadline ends |
| `--dry-run` | `false` | Read from Vulnetix and GitHub, print what would change, write nothing |

Two credentials are needed: the Vulnetix token above, and a GitHub token of an organisation owner or security manager, as a PAT or GitHub App, on an organisation with GitHub Advanced Security. GitHub cannot change the alerts of a campaign once it exists, so a changed cohort is reported and the campaign is left alone unless `--recreate-on-scope-change` is set. Run it as an organisation-level scheduled job, not on every push.

## Markers

The commands find their earlier work by a hidden marker, so a re-run updates instead of adding.

| Marker | Where | Meaning |
|---|---|---|
| Category `vulnetix/<kind>/` | Code scanning run (`automationDetails.id`) | One category per scanner. An upload replaces that category's alerts only. |
| `job.correlator` `vulnetix/<workflow>/<job>` | Dependency graph snapshot | The next snapshot with the same correlator replaces this one |
| `<!-- vulnetix-advisory:<hash> -->` | End of an advisory description | Hash of the rule and CWE set. A later run updates the matching draft with `PATCH` and leaves a published or closed advisory alone. |
| `<!-- vulnetix-campaign:<uuid> -->` | End of a campaign description | Ties the GitHub campaign to the Vulnetix campaign |
| `<!-- vulnetix-scope:<hash> -->` | End of a campaign description | The frozen cohort the campaign was created from |
| `<!-- vulnetix-config-plan -->` | First line of the `config-plan` pull request comment | One comment per pull request, updated on each push |

## Limits

| Limit | Value | What happens |
|---|---|---|
| Results per code scanning run | 25,000 | The most severe 25,000 are kept and the rest dropped, with a message |
| Gzipped SARIF per upload | 10 MB | The upload fails with the size in the message |
| Processing wait | `--wait`, default 2 minutes | A timeout counts as a failed upload |
| Rate limits | | Waited out when the reset is within 90 seconds (`Retry-After`, then `X-RateLimit-Reset`) |
| Advisories per run | `--max`, default 10 | The rest are left for the next run |
| Campaign name, description, alerts | 50 characters, 255 characters, 1,000 alerts | Longer names and descriptions are cut with the markers kept whole. The first 1,000 alerts are included. |

## Both destinations

Sending to Vulnetix and publishing to GitHub are separate. With Vulnetix credentials, a scan stores its results in Vulnetix and, with `--github-publish`, also publishes them to GitHub. Without credentials the scan runs against the community tier, stores nothing in Vulnetix, and still publishes to GitHub. A GitHub failure never changes the scan's exit code or its Vulnetix upload.

## Related

- [GitHub Actions](/cli/ci-cd/github-actions/)
- [SARIF reference](/cli/reference/sarif/)
- [Artifact manifest](/cli/reference/artifact-manifest/)
- [gha upload and status](/cli/ci-cd/gha-command/)
