---
title: Attestation troubleshooting
nav: Troubleshooting
description: Why --sign wrote no signature, and what each attest verify failure means, from missing sidecars to chain, identity, issuer and strict checks.
order: 50
sources: [cli/cmd/attest.go, cli/internal/attest/verify.go, cli/internal/attest/roots.go, cli/internal/cdxsign/sign.go, cli/cmd/cdx.go, cli/cmd/bom.go, vdb-cyclonedx/fulcio.go]
checked: [cli@v4.17.1, vdb-cyclonedx@eaf787ce2]
updated: 04 Nov 2026
---

The problems people hit most often when signing a document with `--sign` or checking one with `vulnetix attest verify`. Errors print as `Error: <message>` on stderr and exit `1`. A failed check prints `<artifact> could not be verified.`, the check table, and a `Why it failed` section with one line per failed check, then exits `1`.

## Signing

Signing never fails the command. A problem is printed as a warning and the document is written unsigned.

| Symptom or message | Cause | Fix |
|---|---|---|
| `not signed: no OIDC identity in this environment, so there is nothing to sign as` | No `SIGSTORE_ID_TOKEN`, and no GitHub Actions OIDC token. Expected on a laptop. | In GitHub Actions add `permissions: id-token: write` to the job (also needed for `sign: true` on the actions). Elsewhere, set `SIGSTORE_ID_TOKEN`; on GitLab CI map an `id_tokens` entry with `aud: sigstore` into it. See [Where the identity comes from](/attestation/sign/signing-documents/#where-the-identity-comes-from). |
| `warning: signing: ...` (or `signing: ...` in the `cdx` summary) | An identity was found, but Fulcio or Rekor refused or could not be reached | Check `SIGSTORE_FULCIO_URL` and `SIGSTORE_REKOR_URL` are unset, or point at a reachable instance. See [Endpoints](/attestation/sign/signing-documents/#endpoints). |

## Finding the signature

| Message | Cause | Fix |
|---|---|---|
| `no signature found for <file>` with `expected <file>.intoto.jsonl or <file>.sig beside it, or name one with --envelope / --signature` | No sidecar next to the artefact, usually because nothing signed it | Sign it with `vulnetix cdx --sign --output-file <file>`, or name the sidecars. See [Sidecars](/attestation/verify/attest-verify/#sidecars). |
| `signature: no certificate accompanies the signature, so there is no key to verify it with` | A `.sig` with no `.pem` beside it | Put the certificate next to the artefact, or pass `--certificate` |

## Failed checks

Each line under `Why it failed` starts with the check name.

| Message | Cause | Fix |
|---|---|---|
| `signature: signature does not verify against the certificate's public key` | The signature does not match. For a detached `.sig`, the artefact's bytes changed after signing. | Use the artefact exactly as published. Re-sign after any change. |
| `certificate-chain: does not chain to Sigstore public-good (...). If this was signed by a private Sigstore instance, pass --trusted-root with its root certificate.` | The certificate came from a CA other than the resolved root | Pass `--trusted-root`, set `SIGSTORE_ROOT_FILE`, or commit `.vulnetix/trusted-root.pem`. See [Trust root resolution](/attestation/verify/trust-and-pinning/#trust-root-resolution). |
| `identity: signed by "<subject>", not "<expected>"` | `--identity` is an exact match and the signer differs | Paste the subject the command printed under `Signed by`. For a pattern use `--identity-regex`. |
| `identity: signed by "<subject>", which does not match "<pattern>"` | The signer does not match `--identity-regex` | Check the pattern is a Go RE2 expression and escape each `.` |
| `issuer: authenticated by "<issuer>", not "<expected>"` | The certificate came from another OIDC provider | Use the [issuer shortcut](/attestation/verify/trust-and-pinning/#issuer-shortcuts) or URL that matches the signer |
| `strict: --strict requires the signer to be pinned; add: --identity ... --issuer ...` | `--strict` without both an identity pin and `--issuer` | Add the flags the message prints. See [`--strict`](/attestation/verify/trust-and-pinning/#--strict). |
| `transparency-log: required, but this run did not perform it` | `--require transparency-log`. `attest verify` never checks the log, so this always fails. | Drop it, and run the `cosign verify-blob` command the output prints. See [The transparency log](/attestation/verify/attest-verify/#the-transparency-log). |

> [!CAREFUL] The help example for `--identity` is a pattern
> `vulnetix attest verify --help` shows `--identity 'https://github.com/acme/.*'`. `--identity` is exact, so that value never matches. Use `--identity-regex` for patterns.

## Results look wrong

| Symptom | Cause | Fix |
|---|---|---|
| `carries no signature this CLI could check` | No check ran to a pass or a failure | Run with `-v` to see the check table and why each was skipped |
| `This check is looser than it could be` after a pass | No identity or issuer was pinned, so any signer Sigstore trusts would pass | Run the suggested commands, which are filled in from the certificate. See [Pinning the signer](/attestation/verify/trust-and-pinning/#pinning-the-signer). |
| The attest action passes after a failed verification | `fail-on-findings: false` turns the failure into a warning | Leave `fail-on-findings` at `true`. See the [attest action](/attestation/github-actions/attest/#behaviour). |

## Still stuck

Collect the CLI version from `vulnetix version`, the exact command, the output of the same command with `-v` (which prints every check), `-o json` output, and which sidecar files sit next to the artefact (`ls -la <file>*`). Note whether `SIGSTORE_ROOT_FILE`, `SIGSTORE_FULCIO_URL` or `SIGSTORE_REKOR_URL` are set, and whether the repository has a `.vulnetix/trusted-root.pem`.
