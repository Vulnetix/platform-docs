---
title: Attestation quickstart
nav: Quickstart
description: Sign an SBOM in GitHub Actions with the runner's OIDC identity, then verify it with vulnetix attest verify pinned to that workflow and issuer.
order: 1.5
sources: [cli/sbom/action.yml, cli/attest/action.yml, cli/cmd/attest.go, cli/internal/attest/verify.go, cli/internal/cdxsign/sign.go]
checked: [cli@v4.17.1]
updated: 04 Nov 2026
---

This page signs the SBOM a workflow generates and checks that signature in the same job, pinned to the workflow that made it. Signing uses public Sigstore and the runner's own identity, not a Vulnetix credential.

## Prerequisites

- A GitHub repository where you can add a workflow.
- A job that may request an OIDC token: `permissions: id-token: write`.
- No Vulnetix plan or credentials. Both actions run in community mode without them.

## 1. Sign the SBOM

Add `.github/workflows/sbom.yml`:

```yaml
name: SBOM
on: [push]
jobs:
  sbom:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      id-token: write          # lets the job sign as itself
    steps:
      - uses: actions/checkout@v5
      - uses: Vulnetix/cli/sbom@v4
        with:
          sign: true
```

The action runs `vulnetix cdx --sign` and writes, in `.vulnetix/`:

| File | Contents |
|---|---|
| `sbom.cdx.json` | The SBOM, with an embedded JSF signature |
| `sbom.cdx.json.sig` | Base64 signature |
| `sbom.cdx.json.pem` | The short-lived Fulcio certificate |
| `sbom.cdx.json.intoto.jsonl` | The same claim as a DSSE envelope |

> [!CAREFUL] No identity, no signature
> Without `id-token: write` the step still succeeds and writes an unsigned SBOM. Signing is skipped with `no OIDC identity in this environment, so there is nothing to sign as`.

## 2. Verify it, pinned to this workflow

Add a step after the sbom step:

```yaml
      - uses: Vulnetix/cli/attest@v4
        with:
          subject: .vulnetix/sbom.cdx.json
          args: --identity https://github.com/${{ github.workflow_ref }} --issuer github
```

`github.workflow_ref` is `owner/repo/.github/workflows/<file>@<ref>`, the identity Fulcio issues to the job. `--identity` is an exact match. `--issuer github` means `https://token.actions.githubusercontent.com`.

## 3. Read the result

A passing run prints the verdict and the signer:

```text
[OK] sbom.cdx.json is signed, and the signature is valid.

Signed by
  https://github.com/acme/repo/.github/workflows/sbom.yml@refs/heads/main
  authenticated by https://token.actions.githubusercontent.com
  certificate issued by Sigstore public-good
  this is the repository you are in
```

A failed check exits `1`, prints the check table under `Why it failed`, and fails the job.

## 4. Verify a copy elsewhere

Anyone holding the four files can run the same check:

```bash
vulnetix attest verify sbom.cdx.json \
  --identity https://github.com/acme/repo/.github/workflows/sbom.yml@refs/heads/main \
  --issuer github
```

## Next

- [Signing documents](/attestation/sign/signing-documents/) for GitLab CI and private Sigstore endpoints.
- [vulnetix attest verify](/attestation/verify/attest-verify/) for every check and flag.
- [Trust roots and signer pinning](/attestation/verify/trust-and-pinning/) for `--identity-regex` and `--strict`.
- [The attest action](/attestation/github-actions/attest/) for verifying release assets.
