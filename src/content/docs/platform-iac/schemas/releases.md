---
title: Schema releases and URLs
nav: Releases and URLs
description: Where the config kind JSON Schemas are published, the pinned and latest URL forms, and what each release asset contains.
order: 1
sources: [config-schemas/README.md, config-schemas/.github/workflows/release.yml, config-schemas/cmd/schemacheck/main.go, config-schemas/schemas.go]
checked: [config-schemas@9bda9e1, cli@4c8c3b7]
updated: 02 Nov 2026
---

The schemas live in the public repository [`Vulnetix/config-schemas`](https://github.com/Vulnetix/config-schemas). It holds one JSON Schema (draft 2020-12) per kind, the shared definitions in `common.schema.json`, and example documents. Each release publishes every schema as a GitHub Release asset, and the asset URL is the schema's `$id`.

## Releases

| Tag | Kinds | Notes |
|---|---|---|
| [`v1.0.0`](https://github.com/Vulnetix/config-schemas/releases/tag/v1.0.0) | `QualityGate` | First release. |
| [`v1.0.1`](https://github.com/Vulnetix/config-schemas/releases/tag/v1.0.1) | `QualityGate` | Same schemas. The Go module now requires Go 1.25 rather than a newer local toolchain version. |

The CLI embeds a release through the Go module `github.com/vulnetix/config-schemas`. CLI v3.153.0 and later embed `v1.0.1`.

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
