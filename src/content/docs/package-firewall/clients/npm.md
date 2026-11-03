---
title: npm, pnpm, Yarn and Bun
nav: npm
description: Configure npm, pnpm, Bun and both Yarn generations to resolve through the Package Firewall's npm registry.
order: 3
sources: [cli/pkg/packagefirewall/config.go, package-firewall/internal/ecosystem/npm/npm.go, package-firewall/internal/handler/root_dispatch.go, package-firewall/internal/ecosystem/ecosystem.go]
checked: [cli@4c8c3b7, package-firewall@77cd1a5]
updated: 03 Nov 2026
---

| | |
|---|---|
| Registry URL | `https://packages.vulnetix.com/npm/` |
| Ecosystem ID | `npm` |
| Plan | Add-on |
| Mode | filter: blocked and cooldown versions are removed from the packument |
| Cooldown | yes, from the packument's `time` map |
| Default mirror | `https://registry.npmjs.org` |

## Automatic setup

```bash
vulnetix package-firewall npm
```

| File | Read by |
|---|---|
| `~/.npmrc` | npm, pnpm, Bun, Yarn Classic (v1) |
| `~/.yarnrc.yml` | Yarn Berry (v2 and later), which ignores `.npmrc` |

`~/.npmrc` gets a managed block:

```ini
# Vulnetix Package Firewall
registry=https://packages.vulnetix.com/npm/
//packages.vulnetix.com/npm/:_auth=BASE64_OF_ORGUUID_COLON_APIKEY
# End Vulnetix Package Firewall
```

`~/.yarnrc.yml` gets:

```yaml
npmRegistryServer: "https://packages.vulnetix.com/npm/"
npmRegistries:
  "//packages.vulnetix.com/npm/":
    npmAlwaysAuth: true
    npmAuthIdent: "YOUR_ORG_UUID:YOUR_API_KEY"
```

To build `_auth` by hand, see [Authentication](/package-firewall/get-started/authentication/#header-forms). For a single project, put the same lines in the project's `.npmrc` or `.yarnrc.yml`.

## Use and verify

```bash
npm config get registry
npm cache clean --force
npm install lodash
```

## Notes

- Scoped packages use the default registry. A `@scope:registry=` line in any `.npmrc` sends that scope elsewhere and around the firewall.
- npm fetches tarballs from the registry origin without the `/npm` path. The firewall routes those root `.tgz` requests to the npm handler, so they are checked the same way.
- A lockfile that pins a blocked version fails at the tarball fetch with the block status. Update the lockfile to an allowed version.
- An allow entry that covers every version, such as `@acme/*` or `@acme/widget` with version `*`, turns the cooldown off for those packages, so a fresh `@acme` release installs at once. An entry for one exact version does not. See [Allow and deny lists](/package-firewall/curation/lists/#what-an-allow-entry-waives).
