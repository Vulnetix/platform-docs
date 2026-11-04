---
title: tea release
description: Publish a whole release to TEA from a pipeline in one idempotent command, with the product, component, collection, artifacts, download links and visibility.
order: 2
sources: [cli/cmd/tea_release.go, cli/pkg/tea/objects.go]
checked: [cli@4c8c3b71c]
updated: 02 Nov 2026
---

```bash
vulnetix tea release [files...] [flags]
```

After a release is cut, `tea release` publishes everything about it, in order:

1. the product (idempotent on its name)
2. the product release
3. the component of the same name and its component release, which the product release points to
4. the collection: `INITIAL_RELEASE` for a new release, `ARTIFACT_ADDED` when the release already existed, unless `--reason` says otherwise
5. every file given, each registered and uploaded with its SHA-256 checked by the server
6. every distribution from `--checksums` and `--channel`, on the component release
7. the visibility, when `--visibility` is given, on both the product and the component

Arguments may be file paths or globs (`dist/*.cdx.json`); globs are expanded by the CLI, directories are skipped and duplicates are dropped. Each file's name decides its media type and TEA artifact type; see [the mapping](/tea/cli/publishing/#media-type-and-artifact-type-from-the-file-name).

## In GitHub Actions

```yaml
on:
  push:
    tags: ['v*']

jobs:
  tea:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      # ... your build steps write dist/, and vulnetix is installed
      - name: Publish transparency data
        run: |
          vulnetix tea release dist/*.cdx.json dist/*.openvex.json \
            --checksums-from-release \
            --exclude checksums.txt \
            --channel "name=Homebrew: brew install owner/tap/tool,url=https://github.com/owner/homebrew-tap" \
            --visibility public
        env:
          VULNETIX_ORG_ID: ${{ secrets.VULNETIX_ORG_ID }}
          VULNETIX_API_KEY: ${{ secrets.VULNETIX_API_KEY }}
          GITHUB_TOKEN: ${{ github.token }}
```

Inside GitHub Actions these are read from the environment unless you pass them:

| Value | From |
|---|---|
| Product name | `GITHUB_REPOSITORY` |
| Product purl | `pkg:github/<GITHUB_REPOSITORY>` |
| Version | `GITHUB_REF_NAME`, only when `GITHUB_REF_TYPE` is `tag` |
| Release date | The committer date of the tagged commit. `fetch-depth: 0` makes it available. |
| `--base-url` for `--checksums` | `<GITHUB_SERVER_URL>/<repo>/releases/download/<tag>` |
| `--checksums-from-release` | The release's asset whose name contains `checksums`, fetched with `GITHUB_TOKEN` from `GITHUB_API_URL` (default `https://api.github.com`) |

On a branch run there is no tag, so `--version` is required, or pass `--auto-version` to use `git describe` and mark the release a pre-release.

## Flags

| Flag | Default | Description |
|---|---|---|
| `--product` | `GITHUB_REPOSITORY` | Product name. Required outside GitHub Actions. |
| `--purl` | `pkg:github/<product>` when the product is `owner/repo` | Package URL for the product. Set it when the product is not a GitHub repository. |
| `--version` | the tag | Release version |
| `--auto-version` | `false` | Outside a tag run, derive the version from `git describe` and mark it a pre-release |
| `--date` | tagged commit's date, else now | Release date, RFC 3339 |
| `--pre-release` | `false` | Mark the release a pre-release |
| `--reason` | derived | Collection update reason |
| `--checksums` | | `sha256sum` manifest whose files become distributions |
| `--checksums-from-release` | `false` | On a tag run, take `--checksums` from the GitHub release's checksums asset |
| `--base-url` | the GitHub release download URL | Where the files in `--checksums` are served |
| `--exclude` | | File name in `--checksums` to skip. Repeatable. |
| `--channel` | | Install channel with no single file, as `name=…[,url=…][,purl=…]`. Repeatable. |
| `--visibility` | none | `private`, `shared` or `public`, set on the product and the component |
| `--org` | | Organisation UUID to share with, with `--visibility shared`. Repeatable; at least one is required for `shared`. |
| `--dry-run` | `false` | Print what would be published, download links included, and exit |

## Re-running

Every step is idempotent on the identity it derives: an `Idempotency-Key` per object, and the release date from the tag rather than the clock. A failed job can be re-run and republishes rather than duplicating. Outside a git checkout the date falls back to now, so a re-run there is not guaranteed to match.

## Visibility spans two roots

A release lives under two roots: the product holds the evidence and the component holds the distributions. `--visibility` sets both. Without it nothing is readable outside your organisation, and the command prints the two `tea share` commands that would publish each:

```text
  vulnetix tea share <product-uuid> --visibility public     # evidence
  vulnetix tea share <component-uuid> --visibility public   # downloads
```

> [!CAREFUL] Set both, or a public SBOM describes a release nobody can reach
> Setting one root public by hand and not the other leaves either evidence with no download links, or downloads with no evidence.

## Exit codes

| Code | Meaning |
|---|---|
| `0` | Published, or `--dry-run` printed the plan |
| `1` | No version could be determined, `--product` missing outside Actions, `--visibility shared` without `--org`, a server error, or `403` because the plan does not include publishing |
