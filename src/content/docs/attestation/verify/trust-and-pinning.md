---
title: Trust roots and signer pinning
nav: Trust and pinning
description: How attest verify resolves its trust root, trusts a private Sigstore deployment, and pins the signer with --identity, --identity-regex, --issuer and --strict.
order: 2
sources: [cli/cmd/attest.go, cli/internal/attest/roots.go, cli/internal/attest/verify.go]
checked: [cli@4c8c3b71c]
updated: 02 Nov 2026
---

## Trust root resolution

`--trusted-root` overrides the root for a private Sigstore deployment. It is not a prerequisite. The root resolves most specific first:

| Order | Source | Scope |
|---|---|---|
| 1 | `--trusted-root <pem>` | This run |
| 2 | `SIGSTORE_ROOT_FILE` | This shell or CI job |
| 3 | `.vulnetix/trusted-root.pem` | This repository |
| 4 | Built in | The Sigstore public-good instance |

A team on a private Sigstore commits its root once:

```bash
cp fulcio-root.pem .vulnetix/trusted-root.pem
git add .vulnetix/trusted-root.pem
```

The output names the root that answered:

```text
  certificate issued by .vulnetix/trusted-root.pem
```

A chain that does not reach the resolved root fails, and the message names the fix:

```text
certificate-chain: does not chain to Sigstore public-good
  (x509: certificate signed by unknown authority).
  If this was signed by a private Sigstore instance, pass --trusted-root
  with its root certificate.
```

The built-in root is pinned in the binary, not fetched over TUF. A test in the CLI fails once the pinned root expires, so a stale pin shows up in the CLI's own CI rather than as an unexplained chain error for you.

## Pinning the signer

A valid signature only means somebody Sigstore trusts made it. For GitHub Actions that is any workflow in any repository. Pin the identity to make it an answer.

```bash
# Exact. Paste back what the command printed.
vulnetix attest verify sbom.cdx.json \
  --identity https://github.com/acme/repo/.github/workflows/release.yml@refs/heads/main

# A pattern, for accepting a set on purpose
vulnetix attest verify sbom.cdx.json --identity-regex '^https://github\.com/acme/.*'
```

`--identity` is an exact comparison and `--identity-regex` is a Go RE2 pattern, the same split cosign uses. Passing both is an error. Exact is the safe default: every keyless subject is a URL, and in a regex every `.` matches any character, so `https://github.com/acme/repo` would also match `https://githubXcom/acme/repo`.

### Issuer shortcuts

```bash
vulnetix attest verify sbom.cdx.json --issuer github
```

| Shortcut | Issuer |
|---|---|
| `github` | `https://token.actions.githubusercontent.com` |
| `gitlab` | `https://gitlab.com` |
| `google` | `https://accounts.google.com` |
| `microsoft` | `https://login.microsoftonline.com` |
| `buildkite` | `https://agent.buildkite.com` |
| `codefresh` | `https://oidc.codefresh.io` |

A full URL is also accepted.

### `--strict`

Requires both an identity pin (`--identity` or `--identity-regex`) and `--issuer`. Without them it fails and prints the flags to add, filled in from the certificate:

```text
$ vulnetix attest verify sbom.cdx.json --strict

strict: --strict requires the signer to be pinned; add:
  --identity https://github.com/acme/repo/.github/workflows/release.yml@refs/heads/main
  --issuer https://token.actions.githubusercontent.com
```

### Same repository or not

With no configuration, the signer's repository is compared with the local git remote, and the output says `this is the repository you are in` or `a different repository from the one you are in`. This is a note, not a check: a third-party artefact is expected to come from a third party.
