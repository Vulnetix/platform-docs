---
title: Attestation
nav: Overview
description: Sign the SBOMs the Vulnetix CLI writes with your CI runner's own OIDC identity, and verify signatures and in-toto provenance on any artefact with vulnetix attest verify.
order: 1
sources: [cli/cmd/attest.go, cli/internal/attest/verify.go, cli/internal/attest/roots.go, cli/internal/cdxsign/sign.go, vdb-cyclonedx/fulcio.go]
checked: [cli@4c8c3b71c, vdb-cyclonedx@eaf787c]
updated: 02 Nov 2026
---

The CLI signs documents with the identity of the machine that ran it, using public Sigstore, and verifies signatures and provenance on artefacts you consume. Nothing here uses a Vulnetix credential, and the results verify with stock `cosign`.

| Task | Command | Page |
|---|---|---|
| Sign an SBOM you generate | `vulnetix cdx --sign` | [Signing documents](/attestation/sign/signing-documents/) |
| Sign an SBOM you enriched | `vulnetix bom enrich --sign` | [Signing documents](/attestation/sign/signing-documents/) |
| Verify a signature and read provenance | `vulnetix attest verify <artifact>` | [attest verify](/attestation/verify/attest-verify/) |
| Verify at the point of import | `vulnetix bom import --verify-attestation` | [Import and validate](/sbom/read/import-and-validate/) |
| Pin the signer, or trust a private Sigstore | `--identity`, `--issuer`, `--trusted-root` | [Trust roots and signer pinning](/attestation/verify/trust-and-pinning/) |

## Quick start

```yaml
jobs:
  sbom:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      id-token: write          # lets the job sign as itself
    steps:
      - uses: actions/checkout@v4
      - run: vulnetix cdx --sign
      - run: |
          vulnetix attest verify .vulnetix/sbom.cdx.json \
            --identity "https://github.com/${{ github.workflow_ref }}" \
            --issuer github
```

The job assumes `vulnetix` is on the runner's `PATH`; see [installing the CLI](/cli/). `github.workflow_ref` is `owner/repo/.github/workflows/<file>@<ref>`, which is the certificate identity Fulcio issues to a GitHub Actions job.

## What is signed with what

| Piece | Value |
|---|---|
| Identity | The ambient OIDC token: `SIGSTORE_ID_TOKEN` if set, otherwise the GitHub Actions token (needs `id-token: write`) |
| Certificate authority | Fulcio, default `https://fulcio.sigstore.dev`, override with `SIGSTORE_FULCIO_URL` |
| Transparency log | Rekor, default `https://rekor.sigstore.dev`, override with `SIGSTORE_REKOR_URL`, or `-` to skip |
| Sidecars | `<file>.sig`, `<file>.pem`, `<file>.intoto.jsonl`, plus a JSF signature embedded in the document |
| Verification root | The built-in Sigstore public-good root, or yours |

## Related

- [SBOM](/sbom/) produces the documents.
- [TEA](/tea/) publishes them, with their signatures, for consumers.
- [Software Factory trust and SLSA](/software-factory/evidence/trust-and-slsa/) covers the factory's own provenance.

## Platform IaC

There is no config-as-code for signing or verification today: trust is set with flags, `SIGSTORE_ROOT_FILE`, or a committed `.vulnetix/trusted-root.pem`. Config-as-code for this product is planned and is described on [Platform IaC](/platform-iac/).
