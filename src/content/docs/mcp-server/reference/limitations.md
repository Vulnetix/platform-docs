---
title: Limitations
description: What the server cannot do, the reason in each case, and the tool or product to use instead.
order: 7
sources:
  - mcp-server/src/mcp/server.ts
  - mcp-server/src/index.ts
  - mcp-server/src/tools/analysis.ts
  - mcp-server/src/prompts/generated.ts
checked: [mcp-server@8bbe962]
updated: 02 Nov 2026
---

| It cannot | Why | Use instead |
|---|---|---|
| Read your code | No tool accepts file content and the Worker has no filesystem | The [prompts](/mcp-server/prompts/overview/), which drive the Vulnetix CLI on your machine |
| Apply a fix | It has no access to your manifests | `vulnetix_fix_plan` for the edit, then the `vulnetix_fix` prompt or the CLI |
| Run a scanner | No sandbox, no code execution | `vulnetix scan` locally, which composes with Semgrep, Trivy, Grype, Syft when present |
| Run an exploit check | By design, permanently. `vulnetix_exploit_test` returns a command as text. | Run the command yourself against a system you are authorised to test |
| Remember anything | The server is stateless; nothing is kept between requests | `.vulnetix/memory.yaml`, written by the CLI and read by the `vulnetix_dashboard` prompt |
| Sign in with OAuth | No authorization server. The RFC 9728 document lists none. | An `Authorization` header in the client config |
| Return gated records on Community | vdb-api withholds exploit, IOC, sighting and threat-actor records below Pro | The counts, which are returned on every plan |
| Gate a merge deterministically | An agent's verdict can be wrong in either direction | `vulnetix scan --evaluate-sca --severity high --exploits weaponized`, which exits 1 on its own |
| Run Tasks | The Tasks extension needs durable state across polls | Every tool answers within one exchange |
| Stream very large Pro exploit lists | Responses are buffered and shaped, bounded by a 3 MiB buffer guard | `vdb_request` with paging, or the CLI |
| Notify you of a change | No webhooks, resource subscriptions or push of any kind: the server answers requests and holds nothing between them | Poll the tool, or use the Resolve Platform's notifications |
| Ignore the daily quota | Calls count against the API key's daily request limit, and an agent in a loop can spend a day's quota in minutes | Read `_meta["vulnetix/rateLimit"].remaining` on every result. See [Plans and limits](/mcp-server/get-started/plans-and-limits/). |

## The AI sections can be wrong

`vulnetix_triage_reason`, `vulnetix_secure_code_write`, `vulnetix_detection_rules`, `vulnetix_exploit_test` and `vulnetix_fix_plan` add a model-written `analysis`. It is labelled `derived: true` in `_meta["vulnetix/ai"]` and carries an `analysisNote` saying it is interpretation. The VDB half of each result is deterministic; verify the analysis before you act on it.

## Coverage is the VDB's coverage

A vulnerability that nobody has published is not in the VDB, and a package no source tracks has no history. An empty result means the VDB has no record, not that the package is safe. `vulnetix_purl` says so explicitly with `versionStatus` when it has never seen a version.

## Clients that cannot set a header

The server never supplies a credential. A client that can only do OAuth, or that cannot set a custom request header, can connect and list tools, and the three sign-in tools work, but every VDB tool returns a 401 error result. Use the [stdio bridge](/mcp-server/clients/other-clients/) or a different client.
