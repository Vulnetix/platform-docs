---
title: Private registries for scans
nav: Private registries
description: Connect a private npm registry, PyPI index, Maven repository or OCI registry so scans can read private packages, with the credential in the secrets vault.
order: 5
sources: [vdb-site/docs/manifest-curator.md, vdb-lock-runner/README.md, cli/cmd/image_registry.go, cli/internal/imagesrc/tenantauth.go, vdb-site/api/internal/scanregistry/scanregistry.go, vdb-site/api/internal/handler/scan_registries.go, vdb-site/api/internal/handler/config_scanregistry_store.go, vdb-site/api/internal/config/registryconnection.go, vdb-site/docs/scan-registries.md, saas/prisma/models/scan-registry.prisma, saas/prisma/migrations/20261228020000_scan_registry_connection/migration.sql, website/src/pages/resolve/registries.vue]
checked: [vdb-site@9cf42d7, vdb-lock-runner@3a1e09e, saas@29dc0ead, config-schemas@213af1c, cli@v4.6.0]
updated: 03 Nov 2026
---

A scan can only match what it can read. When your dependencies come from a private npm registry, PyPI index, Maven repository or container registry, a **registry connection** tells Vulnetix where that registry is, which packages it serves, and what credential to use.

Open **Configuration › Private Registries** (`/resolve/registries`). This is not the paid container registry logins on the Integrations page: those let Vulnetix catalogue images you use. A registry connection is your own registry.

## A connection

| Field | What it is |
|---|---|
| Name | Unique in your organisation. Lower case letters, digits and hyphens. |
| Ecosystem | `npm`, `pypi`, `maven` or `oci`. |
| URL | For `oci`, the registry host with an optional port, such as `registry.example.com:5000`. For the others, an `https` URL such as `https://npm.pkg.github.com/`. Plain `http` is refused, so a credential is never sent in the clear. |
| Scope | Optional. The packages or repositories this connection serves: an npm scope (`@acme`), an OCI repository path prefix (`acme/payments`), a Maven group id prefix (`com.acme`) or a PyPI project name prefix (`acme-`). Left empty, it serves everything at that registry. When several connections share a registry, the most specific scope wins. |
| Username | Set it for basic authentication, with the secret as the password. Leave it empty and the secret is a bearer token, such as an npm automation token. |
| Secret | The password or token. |
| Enabled | Turn a connection off without deleting it or its credential. |

## The credential

The credential is kept in your [secrets vault](/organization/security/secrets-vault/) as a connector entry, never in the connection. It is not shown again after you save it, not exported, and not returned by any route. Saving a new secret stores a new version of the entry, and deleting the connection revokes it.

Before it stores a new or changed credential, Vulnetix checks it with the registry: npm registries are asked who you are, PyPI and Maven registries are asked for their index, and OCI registries go through the registry's token flow. A credential the registry refuses is not stored, and the message names the registry and whether to check the password or the token. **Test** on a saved connection repeats the check and records when it last passed or why it failed.

The check is made from Vulnetix's side, so the registry must be reachable from the internet. Vulnetix only connects to public addresses and drops the credential on any redirect.

## Who can change them

Owners and admins can add, change and delete connections. Every member can see them, without any secret. Registry connections are part of registry credentials, which need the Pro plan.

## As code

`RegistryConnection` is a [Platform IaC kind](/platform-iac/). The secret is read on your machine from the environment and sent once:

```yaml
apiVersion: vulnetix.com/v1
kind: RegistryConnection
metadata:
  name: acme-artifactory-npm
spec:
  ecosystem: npm
  url: https://artifactory.acme.example/artifactory/api/npm/npm-local/
  scope: ["@acme"]
  username: vulnetix-scanner
  secret: { env: VULNETIX_ARTIFACTORY_PASSWORD }
```

Download as code on the page produces this document for a connection, with a placeholder variable for the secret. Leave `secret` out of a later apply and the stored credential is kept.

## How a scan uses a connection

## How a scan uses a connection

Two consumers read a connection today, and they get the credential in different shapes, because they can do different things with it.

| Consumer | Ecosystems | What it gets | Status |
|---|---|---|---|
| The manifest curator's lockfile resolver, through `vdb-lock-runner` | `npm`, `pypi`, `maven` | The stored login, for one job | In place; the runner side is an operator opt-in |
| `vulnetix image` | `oci` | A short-lived pull token for one repository | In the CLI release after v4.5.0 (see below) |
| Dependency fetches by the SCA processors | any | Would ask for the login by package name | Not connected |

Either way, a credential reaches a process for one request, for the organisation that owns it and for the registry host it was stored for. It is not written to a plan, a job row, a log, an error or a result. Every read of the vault entry is recorded in the vault activity log, and the organisation is limited to 600 such reads an hour.

### Lockfile resolution for the manifest curator

When the manifest curator sends a job to the lock runner, Vulnetix adds your own registries to that one request, so a lockfile can be resolved for packages that are not public. For each job it:

1. does nothing for a package manager that takes no private registry, or for an organisation whose plan lacks registry credentials. Go, Cargo, Bundler and Composer take none, and neither do **Poetry and pip-tools**, which may build a source distribution with the login readable. npm, Yarn, pnpm, Bun, pip, uv and Maven are served;
2. takes the connections of the organisation that made the plan, never a value from the request;
3. keeps enabled connections of the job's ecosystem whose host is a public name: not an address, not a single label, not `localhost`, `.local` or `.internal`;
4. keeps a scoped connection only when a dependency named in the job's manifests falls in its scope, and an unscoped connection as the ecosystem's default registry, of which only the first by name is sent. The manifests it reads are npm `dependencies`, `devDependencies`, `optionalDependencies`, `peerDependencies`, `overrides` and `resolutions`, the words of a Python requirements file or `pyproject.toml`, and the group ids and `group:artifact` pairs of a `pom.xml`;
5. opens each login from the vault as a recorded read.

If a login cannot be opened, the job fails with a `resolver` error naming the host and the reason (`login_unavailable` or `rate_limited`) and the runner is not called, so a private package is never looked up anonymously by mistake. A failed job is retried the next time the plan is sent, and the credential is resolved again. The plan stores the manifests and never the registries, so a rotated or deleted connection takes effect at once.

The runner side is **off by default** and an operator of the runner turns it on:

| Setting of `vdb-lock-runner` | Effect |
|---|---|
| `LOCK_RUNNER_TENANT_REGISTRIES=true` | Accept `registries` in a job. Without it a job that carries them is rejected with `unsupported`, before any tool starts, and `GET /healthz` reports `tenantRegistries`. |
| `LOCK_RUNNER_TENANT_REGISTRY_HOSTS` | Optional. Limit tenant registries to these hosts, such as `npm.acme.example,*.pkg.example`. |

A runner that predates the feature ignores the field and looks packages up anonymously, so a private package then fails with the registry's own 404.

What the runner does with a login:

- The registry URL must be `https` with a host name, and every address it resolves to must be public. Loopback, private, link-local (the cloud metadata address included), shared-address, multicast and reserved ranges are refused.
- The login is written to one file in the job's own home directory, mode `0600`, and removed with the job's scratch directory: `.npmrc` (and `.yarnrc.yml` for Yarn Berry), `.netrc` for pip and uv, or the generated Maven `settings.xml`. It is never in a command line or the environment. Only the registry URL is set in the environment when a default registry replaces the operator's.
- A job with registries bypasses the result cache and is never shared with a concurrent identical request, so what a private registry served to one organisation cannot reach another that sent the same manifests.
- Every spelling of the secret (as given, base64, and URL-escaped) is removed from the messages and results before they are stored.

#### Limits and residual risks

- **DNS rebinding.** The runner's address check is a screen, not the boundary. A tool resolves the name again, so a name that changes its answer is stopped only by the runner's egress policy. Operators must enforce one that allows only the hosts they list.
- **Dependency confusion with pip.** pip takes the best version across all its indexes, so scoping a PyPI connection as an extra index cannot keep a public package of the same name out. uv prefers the extra index. Where this matters, use an unscoped default registry that proxies the public index.
- **netrc is per host.** A private PyPI index that serves its files from another host needs a login for that host as well. The login is not sent there.
- A bug in a package manager could print or send the file it was configured from. The runner's container is the boundary, as for every other tool in it.

### Container images with the CLI

`vulnetix image` reads a private image with your own connection when you are signed in. This is in the CLI release after v4.5.0; v4.5.0 and earlier read a registry with your own Docker credentials only. The CLI asks Vulnetix, with `POST /v1/scan-registries/oci-token`, for a pull token for the one repository it is about to read. Vulnetix does the registry's own token exchange and returns that token, which the registry expires within minutes and which reads only that repository. The stored login never reaches the machine.

- The caller must be an owner, admin or member of the organisation, on a plan with registry credentials. The connection must be an enabled `oci` connection on exactly that host whose scope serves the repository. Anything else, including a host you have not connected and another organisation's host, answers `403 no_connection` without opening the vault.
- A registry that has no token service (it asks for basic authentication, as a bare `registry:2` with an htpasswd file does) and a connection that stores a bearer token cannot issue a short-lived token. They answer `409 no_ephemeral_credential`, and the CLI uses your own `docker login`. The long-lived login is not handed out to make that work.
- Any other failure, such as being offline, falls back to your Docker credentials the same way, so the feature can add access and never removes it.
- The route is limited to 30 requests a minute and counts against the same hourly allowance. The registry is reached from Vulnetix, over public addresses only, and the login is sent only to the token service the registry names, over `https`.
- The request names the registry and the repository, so a run with `--no-upload` and a community run, which have no account, do not make it.

### What has not been verified

The behaviour above is tested with fake registries and the real package managers, not with a real third-party registry. The runner's tests run npm, pnpm, Yarn Berry, Bun, pip, uv and Maven against a fake private registry that requires the login for everything, confirm the operator's registry is never sent it, and confirm a wrong login fails and that the tool's output holds no login. Not run: Yarn 1, a Maven default registry (a mirror, which would also have to serve the plugin), a registry with a TLS certificate the tools had to trust, and any hosted registry such as Artifactory, Nexus, GitHub Packages or a cloud registry. Treat the first connection to each as something to try on a disposable job.

## Before the database migration

Connections need the database migration `20261228020000_scan_registry_connection`. Until it is applied the page says so, and saving a connection or applying a document is refused with the migration's name.
