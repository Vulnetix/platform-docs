---
title: Private registries for scans
nav: Private registries
description: Connect your own npm registry, PyPI index, Maven repository or OCI registry so scans can read private packages, keep the credential in the secrets vault, and declare the connection as code.
order: 5
sources: [vdb-site/api/internal/scanregistry/scanregistry.go, vdb-site/api/internal/handler/scan_registries.go, vdb-site/api/internal/handler/config_scanregistry_store.go, vdb-site/api/internal/config/registryconnection.go, vdb-site/docs/scan-registries.md, saas/prisma/models/scan-registry.prisma, saas/prisma/migrations/20261228020000_scan_registry_connection/migration.sql, website/src/pages/resolve/registries.vue]
checked: [vdb-site@c4faca7, saas@29dc0ead, config-schemas@213af1c]
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

A processor that scans for you asks Vulnetix for the credential of the connection that serves a package, giving the registry host and the package or repository name. Vulnetix opens the vault entry, which is recorded in the vault activity log, and answers only to the processors. Each organisation is limited to 600 such requests an hour.

Storing connections and resolving them is in place. Scanners that read your private registries are being connected to it ecosystem by ecosystem, so a connection does not yet change what every scan can reach. In particular, the lockfile resolver that reads manifests for the manifest curator still takes its registries from the operator's configuration, and the CLI pulls images with the credentials of the machine it runs on.

## Before the database migration

Connections need the database migration `20261228020000_scan_registry_connection`. Until it is applied the page says so, and saving a connection or applying a document is refused with the migration's name.
