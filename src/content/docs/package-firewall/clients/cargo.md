---
title: Cargo
description: Replace crates.io with the Package Firewall's sparse registry and give Cargo the token it sends.
order: 5
sources: [cli/pkg/packagefirewall/config.go, package-firewall/internal/ecosystem/cargo/cargo.go, package-firewall/internal/ecosystem/ecosystem.go]
checked: [cli@4c8c3b7, package-firewall@333285f]
updated: 03 Nov 2026
---

| | |
|---|---|
| Registry | `sparse+https://packages.vulnetix.com/cargo/` |
| Ecosystem ID | `cargo` |
| Plan | Add-on |
| Mode | filter: blocked versions are dropped from the sparse index |
| Cooldown | yes |
| Default mirror | `https://index.crates.io` |

## Automatic setup

```bash
vulnetix package-firewall cargo
```

`~/.cargo/config.toml` gets a managed block:

```toml
[source.crates-io]
replace-with = "vulnetix"

[source.vulnetix]
registry = "sparse+https://packages.vulnetix.com/cargo/"

[registries.vulnetix]
index = "sparse+https://packages.vulnetix.com/cargo/"
credential-provider = ["cargo:token"]
```

`~/.cargo/credentials.toml` gets the token Cargo sends verbatim as the `Authorization` header (Cargo does not read netrc):

```toml
[registries.vulnetix]
token = "Basic BASE64_OF_ORGUUID_COLON_APIKEY"
```

The firewall rewrites the registry's `config.json` to set `auth-required`, so Cargo sends the token on every index and download request.

## Use and verify

```bash
rm -rf ~/.cargo/registry/index
cargo build
cargo add serde
```

## Notes

- Sparse registries with token auth need Cargo 1.74 or later.
- A `Cargo.lock` pinned to a blocked version fails at download. Run `cargo update -p <crate>`.
- In CI, `CARGO_REGISTRIES_VULNETIX_TOKEN` can carry the token instead of `credentials.toml`.
