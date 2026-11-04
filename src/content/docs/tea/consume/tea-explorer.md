---
title: TEA Explorer
description: Browse Vulnetix's TEA server and your suppliers' in the console, register third-party TEA providers, and query a provider's Insights API with CEL.
order: 5
sources: [vdb-site/api/internal/handler/tea_provider.go, vdb-site/api/internal/handler/tea_provider_probe.go, vdb-site/api/internal/handler/tea_remote.go, vdb-site/api/internal/handler/tea_insights.go, vdb-site/api/internal/handler/entitlements.go, vdb-site/api/main.go, tea-insights/cel.go, tea-insights/inventory.go, tea-insights/README.md, website/src/pages/resolve/tea.vue, website/src/components/tea/TeaProviderDialog.vue, website/src/components/tea/TeaQueryConsole.vue, website/src/components/tea/tea-cel.ts]
checked: [vdb-site@d2ea72f23, tea-insights@981e7a819, website@7f3b734cd]
updated: 04 Nov 2026
---

The TEA Explorer is the console's client for the Transparency Exchange API, at [www.vulnetix.com/resolve/tea](https://www.vulnetix.com/resolve/tea). It browses Vulnetix's own TEA server and any third-party TEA server you register, so you can read a supplier's products, releases and artefacts next to your own. It also runs Insights queries: a CEL expression over a provider's inventory that answers with the components it selects.

## Plans

| What | Plan |
|---|---|
| Browse the Vulnetix provider and the open-source catalogue | every plan, signed in |
| Insights queries against the Vulnetix provider | every plan |
| Register, refresh and query third-party providers | Pro and above |

Below Pro, the provider list holds only Vulnetix, and the page shows **Add your suppliers' TEA endpoints with Pro**. Publishing is separate; see the [Publisher](/tea/publisher/http-api/) pages.

## The page

A provider picker sits at the top, with **Add a provider**. Each provider shows whether it has an Insights API. Below it are three views of the selected provider:

| View | Shows |
|---|---|
| **Explore** | Its products, product releases, components, component releases and artefacts |
| **Capabilities** | Each TEA operation and how the provider answered it at discovery |
| **Query** | The Insights CEL console |

The Vulnetix provider is always present and cannot be removed. It uses your own session as its credential.

## Add a provider

**Add a provider** takes:

| Field | Notes |
|---|---|
| **Domain, URL or TEI** | A bare domain, a URL or a TEI. It is reduced to the domain name, which is where TEA discovery starts. |
| **Display name** | Optional. Defaults to the domain. |
| **Authentication** | `none`, `bearer`, `basic` or `apikey`, with the credential. For `basic`, enter `user:password`; it is encoded for you. |

Nothing is saved until you have seen what was found. Discovery resolves the domain, reads its `/.well-known/tea` document, checks whether it wants a credential and whether yours works, chooses a TEA version you both speak, and then asks the provider for one item of each TEA operation to see what it implements. Every probe is a read. The dialog shows the result as a checklist (**What we found**), where each step is ok, a warning or a failure, and lists the capabilities. Only a failure stops you saving.

When you save, discovery runs again with the same input, and only a pass is stored. The credential is encrypted with AWS KMS before it is stored, and is not shown again.

Rules:

- At most 25 providers per organisation. The 26th is `409`.
- A domain can be registered once. A second time is `409` `<domain> is already registered`.
- Only HTTPS, in the first request and in every redirect.
- A domain that resolves to a private, loopback or link-local address fails at connect time, on every request.
- A remote request times out after 10 seconds. A response is read up to 4 MiB.

### Refresh and remove

The TEA version is chosen at registration. If a provider later adds a newer version, refresh it to move to it. Refresh re-runs discovery with the stored credential. A refresh that does not pass leaves the provider exactly as it was, so a provider that is down for a minute keeps the root that worked before.

Removing a provider deletes its stored credential with it. Removing is allowed on every plan.

## Insights queries

Insights is a separate OWASP specification from the TEA object API, and a provider may leave it out. When it does, the Query view says **This provider has no Insights API**. Vulnetix serves it at `POST https://www.vulnetix.com/insights/static`, with the same credentials as its TEA API.

An expression is a boolean predicate over one product and one of its components. The server evaluates it across the inventory and returns the components it selected as a CycloneDX document (CycloneDX 1.6 by default; ask for another with `Accept: application/vnd.cyclonedx+json; version=1.7`).

```bash
# Direct dependencies with at least one known vulnerability
curl -s https://www.vulnetix.com/insights/static \
  -H "Authorization: ApiKey $ORG_ID:$API_KEY" \
  -H 'Content-Type: application/json' \
  -d '{"expression": "component.direct && size(component.vulnerabilities) > 0"}'
```

### Variables

| Variable | Type | Notes |
|---|---|---|
| `productId` | string | The TEA product UUID |
| `product.id`, `product.name`, `product.purl` | string | |
| `product.componentCount` | int | |
| `product.processAttestation` | map | `null` when none is held |
| `component.name`, `group`, `version`, `purl`, `cpe`, `ecosystem` | string | |
| `component.type` | string | The CycloneDX component type: `library`, `application`, `framework`, `container`, ... |
| `component.scope` | string | `required`, `optional` or `excluded` |
| `component.direct`, `development`, `transitive` | bool | |
| `component.relationship` | string | `self` when the component is the product's own source tree, `dependency` otherwise |
| `component.origin` | string | `internal` when it is published from a namespace your organisation publishes, `external` otherwise |
| `component.isProduct` | bool | The component is also a product in this transparency log; `productRef` is its product UUID |
| `component.publisher`, `supplier`, `author` | string | |
| `component.licenses` | list of string | |
| `component.licenseType` | string | `Open Source`, `Commercial` or `Unknown` |
| `component.vulnerabilities` | list of string | Every identifier a finding is known by: the CVE, the advisory id and aliases such as `log4shell` |
| `component.vulnerabilityIds` | string | The same identifiers joined by spaces |
| `component.scorecard` | map | OpenSSF Scorecard result, or `null` |
| `component.provenance`, `attestations` | list | `null` when none is held |
| `component.cryptography`, `ai` | map | `null` when the component has none |

There is no `thirdParty` field. "Third party" depends on who is reading, so write it into the query: `component.origin == 'external'` is the consumer's view, and `component.isProduct` the publisher's.

`list.contains(x)` works on lists as well as strings, so the specification's own example compiles. `x in list` is the same test.

### Examples

```text
true                                                     every component
component.transitive && !component.direct                reached only through something else
component.ecosystem == 'npm'
component.vulnerabilities.contains('CVE-2021-44228')
component.vulnerabilityIds.contains('log4shell')
component.scope == 'required' && size(component.vulnerabilities) > 0
component.direct && component.provenance == null         direct dependencies with no build provenance
component.scorecard != null && component.scorecard.score < 5.0
component.licenses.exists(l, l.startsWith('GPL'))
component.licenseType != 'Open Source'
```

Guard a facet with `!= null` before reading a field of it. An absent facet is `null`, never an empty map or list, so `component.cryptography != null` means the component has cryptography.

### Evaluation rules

| Rule | Effect |
|---|---|
| An empty or invalid expression | `400` with the first line of the CEL error |
| A result that is not a boolean | `400` `expression must evaluate to a boolean` |
| An error on one component, such as reading a field it lacks | That component does not match. The query goes on. |
| 3 seconds of evaluation | The query stops. With some matches, they are returned as a truncated answer; with none, `400` `expression evaluation exceeded its time budget`. |
| 5,000 matches | The answer stops at 5,000 components and is marked truncated |

A predicate that is false everywhere is valid and returns no components.

The Query view has groups of examples, a field reference you can insert from, and recent runs. Each result shows the status, the time taken, the CycloneDX response and a `curl` command to repeat it.

## API

These routes take the console session or `Authorization: ApiKey <orgId>:<key>`. Base `https://www.vulnetix.com/api/site/v1/`.

| Method | Path | Plan | Does |
|---|---|---|---|
| GET | `/v1/tea/providers` | every plan | The Vulnetix provider, plus your registered providers on Pro and above |
| POST | `/v1/tea/providers/discover` | Pro | Runs discovery and returns the report. Saves nothing. |
| POST | `/v1/tea/providers` | Pro | Re-runs discovery and saves the provider; `201` with the provider |
| POST | `/v1/tea/providers/{uuid}/refresh` | Pro | Re-runs discovery and moves the provider to what it finds; answers `{previousVersion, changed, provider}` |
| DELETE | `/v1/tea/providers/{uuid}` | every plan | Removes the provider and its credential; `{"deleted": true}` |
| GET, POST | `/v1/tea/providers/{uuid}/fetch?path=<path>` | Pro | One request to the provider, with the stored credential attached |

`discover` and `providers` take `{"label", "domain", "authScheme", "credential"}`. A provider that does not pass discovery is `400` with `error` and the full `report`. The built-in provider (`uuid` `vulnetix`) cannot be refreshed or removed (`400`).

`fetch` appends `path` to the provider's TEA root, and refuses a path that would leave it. With `target=insights`, the path is resolved against the provider's Insights base instead, which must be on the same host as its TEA root. `POST` is forwarded only for Insights queries, with a body up to 64 KiB. The provider's response comes back with its status and content type, sandboxed so a browser never renders it as a page on the Vulnetix origin. A connection failure is `502`.

A provider view carries `uuid`, `label`, `domain`, `rootUrl`, `version`, `versions`, `authScheme`, `hasCredential`, `insightsUrl`, `builtin`, `created` and the stored discovery `report`. The credential itself is never returned.
