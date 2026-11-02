---
title: Verify a schema release
nav: Verify a release
description: Check that a schema file was published by the Vulnetix/config-schemas release workflow, with cosign keyless verification and SHA256SUMS.
order: 2
sources: [config-schemas/.github/workflows/release.yml, config-schemas/README.md]
checked: [config-schemas@9bda9e1]
updated: 02 Nov 2026
---

Every release asset is signed with [Sigstore](https://www.sigstore.dev/) keyless signing. The release workflow signs with its GitHub Actions OIDC identity, so there is no public key to distribute: you check that the signing certificate names the workflow file and the tag. Each file has a bundle beside it, `<file>.sigstore.json`, holding the signature, the certificate and the Rekor transparency log entry.

You need [cosign](https://docs.sigstore.dev/cosign/system_config/installation/) v2 or later.

## Verify one file

```sh
TAG=v1.0.1
base=https://github.com/Vulnetix/config-schemas/releases/download/$TAG
curl -fsSLO "$base/QualityGate.schema.json"
curl -fsSLO "$base/QualityGate.schema.json.sigstore.json"

cosign verify-blob QualityGate.schema.json \
  --bundle QualityGate.schema.json.sigstore.json \
  --certificate-identity "https://github.com/Vulnetix/config-schemas/.github/workflows/release.yml@refs/tags/$TAG" \
  --certificate-oidc-issuer https://token.actions.githubusercontent.com
```

```text
Verified OK
```

The identity is the workflow path at the tag ref. It proves both that the release workflow signed the file and that it did so for that tag.

> [!CAREFUL] A re-run by hand has a different identity
> A release recovered with `workflow_dispatch` runs from the branch it was dispatched on, so its certificate names `.../release.yml@refs/heads/main`, not the tag. If the exact identity fails for that reason, check it against the repository instead:
>
> ```sh
> cosign verify-blob QualityGate.schema.json \
>   --bundle QualityGate.schema.json.sigstore.json \
>   --certificate-identity-regexp '^https://github.com/Vulnetix/config-schemas/\.github/workflows/release\.yml@' \
>   --certificate-oidc-issuer https://token.actions.githubusercontent.com
> ```

## Verify a whole release

Verify `SHA256SUMS` once, then check every file against it:

```sh
TAG=v1.0.1
gh release download "$TAG" -R Vulnetix/config-schemas
cosign verify-blob SHA256SUMS \
  --bundle SHA256SUMS.sigstore.json \
  --certificate-identity "https://github.com/Vulnetix/config-schemas/.github/workflows/release.yml@refs/tags/$TAG" \
  --certificate-oidc-issuer https://token.actions.githubusercontent.com
sha256sum -c SHA256SUMS
```

```text
Verified OK
QualityGate.schema.json: OK
common.schema.json: OK
index.json: OK
vulnetix-config.schema.json: OK
```

The commands on this page were run against `v1.0.1` on 02 Nov 2026.
