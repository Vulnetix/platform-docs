---
title: Signing documents
description: How cdx --sign and bom enrich --sign sign a CycloneDX document with the runner's OIDC identity through Fulcio and Rekor, and the sidecar files they write.
order: 1
sources: [cli/internal/cdxsign/sign.go, cli/cmd/cdx.go, cli/cmd/bom_enrich.go, vdb-cyclonedx/fulcio.go]
checked: [cli@4c8c3b71c, vdb-cyclonedx@eaf787c]
updated: 02 Nov 2026
---

Two commands take `--sign`:

```bash
vulnetix cdx --sign
vulnetix bom enrich vendor.cdx.json --out enriched.cdx.json --sign
```

The signature uses the identity of the machine running the command: a workflow reference in CI. It is not a Vulnetix credential. A scan run in your pipeline is better attested by you than by the tool vendor, and the result verifies with `cosign verify-blob` against public Sigstore.

## Where the identity comes from

| Order | Source | Notes |
|---|---|---|
| 1 | `SIGSTORE_ID_TOKEN` | Any OIDC token Fulcio accepts. Use this on GitLab CI, mapping an `id_tokens` entry with `aud: sigstore` into it. |
| 2 | The GitHub Actions OIDC token | Only present when the job has `permissions: id-token: write` |

With neither, signing is skipped with the reason `no OIDC identity in this environment, so there is nothing to sign as`. The document is still written and the command still succeeds: losing an SBOM over a missing signature would be worse than an unsigned SBOM.

## Endpoints

| Variable | Default | Effect |
|---|---|---|
| `SIGSTORE_FULCIO_URL` | `https://fulcio.sigstore.dev` | Certificate authority |
| `SIGSTORE_REKOR_URL` | `https://rekor.sigstore.dev` | Transparency log. `-` skips logging. |

Point both at a private Sigstore to keep signatures off the public log, and give verifiers its root with `--trusted-root` (see [Trust roots and signer pinning](/attestation/verify/trust-and-pinning/)).

## Files written

| File | Contents |
|---|---|
| `<file>` | The document, with an embedded JSF signature. The detached signatures cover these bytes. |
| `<file>.sig` | Base64 signature |
| `<file>.pem` | The short-lived Fulcio certificate binding the signature to the identity |
| `<file>.intoto.jsonl` | The same claim as a DSSE envelope |

These are the names `cosign verify-blob` expects and the names the Vulnetix release workflows publish.

## Verifying

```bash
vulnetix attest verify .vulnetix/sbom.cdx.json
```

Or with cosign:

```bash
cosign verify-blob \
  --certificate-identity "https://github.com/acme/repo/.github/workflows/release.yml@refs/heads/main" \
  --certificate-oidc-issuer https://token.actions.githubusercontent.com \
  --bundle .vulnetix/sbom.cdx.json.intoto.jsonl \
  .vulnetix/sbom.cdx.json
```

## Enriching a signed document

`bom enrich --sign` signs the output with this machine's identity, because this machine made the new claims. A signature that was on the input is kept as `vulnetix:bom/original-signature`, since it still attests the input. See [Enrich an SBOM](/sbom/read/enrich/).
