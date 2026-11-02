---
title: Schema releases and URLs
nav: Releases and URLs
description: Where the config kind JSON Schemas are published, the pinned and latest URL forms, and what each release asset contains.
order: 1
sources: [config-schemas/README.md, config-schemas/.github/workflows/release.yml, config-schemas/cmd/schemacheck/main.go, config-schemas/schemas.go]
checked: [config-schemas@v1.8.0, cli@v3.166.0]
updated: 03 Nov 2026
---

The schemas live in the public repository [`Vulnetix/config-schemas`](https://github.com/Vulnetix/config-schemas). It holds one JSON Schema (draft 2020-12) per kind, the shared definitions in `common.schema.json`, and example documents. Each release publishes every schema as a GitHub Release asset, and the asset URL is the schema's `$id`.

## Releases

| Tag | Kinds | Notes |
|---|---|---|
| [`v1.0.0`](https://github.com/Vulnetix/config-schemas/releases/tag/v1.0.0) | 1 | `QualityGate`. First release. |
| [`v1.0.1`](https://github.com/Vulnetix/config-schemas/releases/tag/v1.0.1) | 1 | Same schemas. The Go module now requires Go 1.25 rather than a newer local toolchain version. |
| [`v1.1.0`](https://github.com/Vulnetix/config-schemas/releases/tag/v1.1.0) | 14 | Adds the policy kinds: `AiFirewallPolicy`, `AiGovernanceList`, `AiProvider`, `JailExemption`, `JailPolicy`, `LicensePolicy`, `MalwareIoc`, `PackageFirewallPolicy`, `PackageList`, `RemediationPolicy`, `RiskStrategy`, `Suppression` and `VexSource`. |
| [`v1.1.1`](https://github.com/Vulnetix/config-schemas/releases/tag/v1.1.1) | 14 | Same kinds. |
| [`v1.2.0`](https://github.com/Vulnetix/config-schemas/releases/tag/v1.2.0) | 15 | Adds `ApiSpecSource`, and the `cel` package. |
| [`v1.3.0`](https://github.com/Vulnetix/config-schemas/releases/tag/v1.3.0) | 26 | Adds `LicenseExceptions`, the SIEM kinds (`SavedSearch`, `DetectionRule`, `AlertTrigger`, `ScheduledReport`, `LogSource`), the cloud kinds (`AwsConnection`, `AwsAccount`, `CloudSensors`), `DetectionRuleFeed` and `RuntimeSensorPolicy`. Adds the `x-vulnetix` annotation. |
| [`v1.4.0`](https://github.com/Vulnetix/config-schemas/releases/tag/v1.4.0) | 26 | Same kinds. |
| [`v1.5.0`](https://github.com/Vulnetix/config-schemas/releases/tag/v1.5.0) | 37 | Adds the organization and integration kinds: `Organization`, `Member`, `ServiceAccount`, `NotificationDefaults`, `VaultEntry`, `GitHubInstallation`, `ForgeConnection`, `WizConnection`, `MessagingConnection`, `MessagingRoute` and `MessagingTemplate`. |
| [`v1.6.0`](https://github.com/Vulnetix/config-schemas/releases/tag/v1.6.0) | 56 | Adds the Software Factory, Belai library, Pix, TEA and campaign kinds: `FactorySettings`, `ScannerProfile`, `FactoryManagedOrg`, `RepositorySettings`, `FactoryWorkflow`, `FactoryTrigger`, `FactorySchedule`, `FactoryBudget`, `AgentProfile`, `Crew`, `LibraryItem`, `SandboxLaunchProfile`, `SandboxEgressPolicy`, `TeaProduct`, `TeaComponent`, `TeaCollection`, `TeaAccessPolicy`, `TeaPublicationTarget` and `Campaign`. |
| [`v1.7.0`](https://github.com/Vulnetix/config-schemas/releases/tag/v1.7.0) | 56 | `RepositorySettings` gains `labels`, `owner` and `criticality`, which are also variables of the CEL `finding` context. |
| [`v1.8.0`](https://github.com/Vulnetix/config-schemas/releases/tag/v1.8.0) | 57 | Adds `SsvcPolicy` and the `ssvc` package: the CISA SSVC decision and how a tenant configures it. |

The CLI embeds one release through the Go module `github.com/vulnetix/config-schemas`, and refuses a kind that a later release added. CLI v3.153.0 and later embed `v1.0.1` or newer; each kind's page says from which CLI release it is known, and `vulnetix config kinds` lists what yours knows. The [catalogue](/platform-iac/kinds/catalogue/) is generated from the newest release.

## URLs

| Use | URL |
|---|---|
| One kind, pinned | `https://github.com/Vulnetix/config-schemas/releases/download/v1.0.1/QualityGate.schema.json` |
| One kind, newest release | `https://github.com/Vulnetix/config-schemas/releases/latest/download/QualityGate.schema.json` |
| Any kind, dispatched on `kind` | `https://github.com/Vulnetix/config-schemas/releases/download/v1.0.1/vulnetix-config.schema.json` |
| The kinds in a release | `https://github.com/Vulnetix/config-schemas/releases/download/v1.0.1/index.json` |
| Checksums | `https://github.com/Vulnetix/config-schemas/releases/download/v1.0.1/SHA256SUMS` |

Replace `download/v1.0.1` with `latest/download` for the newest release of any of them.

Pin a version in CI and in anything you need to reproduce. Use `latest` for editor hints, where following new fields is what you want.

> [!CAREFUL] The URLs redirect
> GitHub answers a release asset URL with a `302` to `release-assets.githubusercontent.com`, served as `application/octet-stream`. A `latest` URL takes one more `302` first. Use `curl -L`. The VS Code YAML extension and ajv follow the redirects. Other tools may not.

```sh
curl -fsSL https://github.com/Vulnetix/config-schemas/releases/download/v1.0.1/QualityGate.schema.json | head -3
```

## Assets in a release

| Asset | Contents |
|---|---|
| `<Kind>.schema.json` | The schema for one kind, with `$id` set to its pinned URL. |
| `common.schema.json` | Shared definitions. Kind schemas `$ref` it by a relative path, so it resolves next to them. |
| `vulnetix-config.schema.json` | A bundle for editors. It requires `apiVersion` and `kind`, restricts `kind` to the released kinds, and for each kind applies that kind's schema through `if`/`then`. Bind it to every file in `.vulnetix/config/`. |
| `index.json` | The release version, the `apiVersion`, and each kind with its file name and pinned schema URL. |
| `SHA256SUMS` | SHA-256 of every file above, in `sha256sum` format. |
| `<file>.sigstore.json` | A Sigstore bundle for each file above and for `SHA256SUMS`. See [Verify a release](/platform-iac/schemas/verify/). |

`index.json` for `v1.0.1`:

```json
{
  "version": "v1.0.1",
  "apiVersion": "vulnetix.com/v1",
  "kinds": [
    {
      "kind": "QualityGate",
      "file": "QualityGate.schema.json",
      "schema": "https://github.com/Vulnetix/config-schemas/releases/download/v1.0.1/QualityGate.schema.json"
    }
  ]
}
```

## Download and check a release

```sh
gh release download v1.0.1 -R Vulnetix/config-schemas
sha256sum -c SHA256SUMS
```

## The copy inside the CLI

`vulnetix config schema <Kind>` prints the schema embedded in your CLI. It is the source file, so its `$id` uses the placeholder version `v0.0.0-dev`; the released asset has the real tag in its `$id` and is otherwise the same file. Validation never fetches a schema. See [Validate documents](/platform-iac/cli/validate/).

## How a release is made

Pushing a tag `vMAJOR.MINOR.PATCH` runs `.github/workflows/release.yml`:

1. `go test ./...`: every schema compiles against the 2020-12 meta-schema, every example validates, and every document in `testdata/invalid/` is rejected.
2. The compatibility check against the previous tag. See [Compatibility](/platform-iac/schemas/compatibility/).
3. `go run ./cmd/schemacheck release --version <tag> --out dist` writes the assets with each `$id` rewritten to the tag.
4. `cosign sign-blob` signs each file, keyless.
5. The GitHub Release is created if it does not exist, and the assets are uploaded with `--clobber`.

If the job fails after the tag exists, run the workflow by hand with `workflow_dispatch` and the input `tag`. Every step is safe to repeat.
