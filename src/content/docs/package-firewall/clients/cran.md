---
title: CRAN
description: Point R's repos option at the Package Firewall, which serves PACKAGES unchanged and gates source tarball downloads.
order: 12
sources: [cli/pkg/packagefirewall/config.go, package-firewall/internal/ecosystem/cran/cran.go, package-firewall/internal/ecosystem/ecosystem.go]
checked: [cli@4c8c3b7, package-firewall@333285f]
updated: 02 Nov 2026
---

| | |
|---|---|
| Repository URL | `https://packages.vulnetix.com/cran` |
| Ecosystem ID | `cran` |
| Plan | Pro |
| Mode | gate: `src/contrib/PACKAGES` is streamed unchanged; `<name>_<version>.tar.gz` downloads are checked |
| Cooldown | no |
| Default mirror | `https://cran.r-project.org` |

`PACKAGES` lists every package in CRAN (about 7 MB), which is too large to policy-check per request, so CRAN is gated at the tarball.

## Automatic setup

```bash
vulnetix package-firewall cran
```

`~/.Rprofile` gets a managed block:

```r
options(repos = c(CRAN = "https://YOUR_ORG_UUID:YOUR_API_KEY@packages.vulnetix.com/cran"))
options(download.file.method = "libcurl")
```

`libcurl` is set because it honours credentials in the URL.

## Use and verify

```r
getOption("repos")
install.packages("jsonlite")
```

## Notes

- A project `.Rprofile` replaces the user one. Add the two lines there too.
- `renv` and `pak` read `repos` from the session, so they pick up the same option.
