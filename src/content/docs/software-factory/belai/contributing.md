---
title: Developing Belai
nav: Contributing
description: Build Belai from source, run its tests, and how its documentation is kept in step with the code.
order: 22
sources: [belai/docs/development.md, belai/README.md, belai/docs/site.md]
checked: [belai@35506b9]
updated: 28 Oct 2026
---

Belai is pure Go with no cgo, so a build needs only a Go toolchain.

```sh
git clone https://github.com/vulnetix/belai.git
cd belai
go build -o belai ./cmd/belai
./belai -version
```

A binary built this way reports its version as `dev`. With [just](https://just.systems) installed, `just build` stamps the real version, commit and build date.

| Tool | Why |
|---|---|
| Go (see `go.mod`) | Build and test |
| just | The task runner |
| git | Version stamping |

## Documentation kept with the code

Many of Belai's own docs are pinned to tests: a rule in a document has a test named after it, and a test checks that every documented id has a test and every test names a documented id. Flags and help text are checked against the docs the same way. A change that breaks a documented rule fails the build.

The Belai marketing site is in `belai/site` and is published to [belai.vulnetix.com](https://belai.vulnetix.com/).
