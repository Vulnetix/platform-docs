---
title: vulnetix attest verify
description: Verify an artefact's DSSE envelope or cosign signature pair against Sigstore, report who signed it and what its in-toto provenance claims, and fail CI when a required check did not pass.
order: 1
sources: [cli/cmd/attest.go, cli/internal/attest/verify.go, cli/internal/attest/roots.go]
checked: [cli@4c8c3b71c]
updated: 02 Nov 2026
---

```bash
vulnetix attest verify <artifact> [flags]
```

With no flags it checks the signature and the certificate chain against the built-in Sigstore public-good root, and reports the identity it found:

```text
[OK] sbom.cdx.json is signed, and the signature is valid.

Signed by
  https://github.com/acme/repo/.github/workflows/release.yml@refs/heads/main
  authenticated by https://token.actions.githubusercontent.com
  certificate issued by Sigstore public-good
  this is the repository you are in

This check is looser than it could be
  any identity this CA will issue to would also pass, not just this one
    vulnetix attest verify sbom.cdx.json --identity https://github.com/acme/repo/.github/workflows/release.yml@refs/heads/main

  any OIDC provider this CA accepts would also pass
    vulnetix attest verify sbom.cdx.json --issuer github
```

Every suggestion is a complete command with the values filled in from the certificate.

## Sidecars

Found beside the artefact unless you name them:

| Flag | Default |
|---|---|
| `--envelope` | `<artifact>.intoto.jsonl` (DSSE envelope) |
| `--signature` | `<artifact>.sig` (detached signature) |
| `--certificate` | `<artifact>.pem` (signing certificate) |

These are the suffixes `cdx --sign` writes and cosign expects.

## Checks

| Check | Runs by default | Notes |
|---|---|---|
| `signature` | always | Over the DSSE pre-authentication encoding, not the bare payload |
| `certificate-chain` | yes | Against the [resolved trust root](/attestation/verify/trust-and-pinning/) |
| `certificate-validity` | always | An expired keyless certificate passes, with a caveat. See below. |
| `identity` | when `--identity` or `--identity-regex` is set | The identity is always read and reported |
| `issuer` | when `--issuer` is set | |
| `strict` | when `--strict` is set | Fails if the signer is not pinned |
| transparency log | never | Not checked. See below. |

A passing run shows only the verdict. `-v` (the global `--verbose`), or any failure, prints the full check table.

### Expired certificates

A Fulcio certificate lives about ten minutes. Failing every signature older than that would make verification useless, so an expired certificate passes and the detail says so: only a transparency-log entry proves the signature was made before the certificate expired.

### The transparency log

The sidecars carry no Rekor entry, so proving inclusion means querying the log by artefact hash and checking its signed tree head. `attest verify` does not do that. It prints a complete `cosign verify-blob` command that does:

```bash
cosign verify-blob --certificate-identity https://github.com/acme/repo/.github/workflows/release.yml@refs/heads/main \
  --certificate-oidc-issuer https://token.actions.githubusercontent.com \
  --bundle sbom.cdx.json.intoto.jsonl sbom.cdx.json
```

> [!CAREFUL] `--require transparency-log` always fails
> Because no transparency-log check exists, requiring it fails every run. Use cosign for that assurance.

## Provenance

When the payload is an in-toto statement, its predicate is read and reported, SLSA v0.2 and v1 both. It is labelled claimed, not verified, because it is what the payload says about itself. The report lists which fields are present rather than a SLSA level: a level is a property of the build platform, which nobody can determine from a document the build produced.

## Flags

| Flag | Default | Description |
|---|---|---|
| `--identity` | | Require this exact signer. Paste the value the command printed. |
| `--identity-regex` | | Require the signer to match this RE2 pattern |
| `--issuer` | | Require this OIDC issuer: a URL or a [shortcut](/attestation/verify/trust-and-pinning/#issuer-shortcuts) |
| `--strict` | `false` | Require the signer to be pinned. Fails naming the flags to add. |
| `--trusted-root` | resolved | Root certificate of a private Sigstore deployment |
| `--require` | | Fail when this check did not run. Repeatable. |
| `--envelope`, `--signature`, `--certificate` | beside the artefact | Sidecar paths |
| `-o`, `--output` | `pretty` | `pretty` (alias `table`) or `json` |

The same verification flags, except the sidecar paths and `-o`, are on `bom import --verify-attestation`.

> [!CAREFUL] `--identity` is exact
> The command's own help shows `--identity 'https://github.com/acme/.*'`. That is a pattern and will not match; use `--identity-regex` for patterns.

## In CI

```yaml
- name: Verify the SBOM came from our release workflow
  run: |
    vulnetix attest verify sbom.cdx.json \
      --identity "https://github.com/${{ github.repository }}/.github/workflows/release.yml@refs/heads/main" \
      --issuer github
```

At the point of use:

```bash
vulnetix bom import vendor-sbom.cdx.json --verify-attestation --strict \
  --identity https://github.com/vendor/product/.github/workflows/release.yml@refs/heads/main --issuer github
```

## Exit codes

| Code | Meaning |
|---|---|
| `0` | Every check that ran passed |
| `1` | A check failed, a `--require`d check did not run, `--strict` found no pin, a sidecar was missing, or a flag was invalid |
