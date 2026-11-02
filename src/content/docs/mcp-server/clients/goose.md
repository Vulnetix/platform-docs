---
title: Goose
description: Add the server to the Goose agent as a streamable_http extension, from goose configure or config.yaml, with a 60 second timeout.
order: 9
sources:
  - mcp-server/src/config.ts
checked: [mcp-server@1725a04]
updated: 02 Nov 2026
---

Goose calls MCP servers extensions.

## config.yaml

`~/.config/goose/config.yaml`:

```yaml
extensions:
  vulnetix:
    enabled: true
    name: vulnetix
    type: streamable_http
    uri: https://mcp.vulnetix.com/mcp
    timeout: 60
    headers:
      Authorization: "ApiKey <orgId>:<hex>"
```

Goose spells the type `streamable_http` and the URL key `uri`. Quote the header value so YAML does not read the colon in the key as a mapping.

## Interactive

```bash
goose configure
```

Choose Add Extension, then Remote Extension (Streaming HTTP):

| Prompt | Answer |
|---|---|
| Name | `vulnetix` |
| Endpoint URL | `https://mcp.vulnetix.com/mcp` |
| Timeout | `60` |
| Custom headers | `Authorization` = `ApiKey <orgId>:<hex>` |

Goose Desktop has the same fields under Settings, Extensions, Add custom extension.

## Why the timeout matters

The server allows each vdb-api call up to 45 seconds, and a cold call for a large advisory can take several seconds. A short client timeout cuts it off. The next identical call is usually an edge-cache hit.

## Check it

```bash
goose info
goose session
```

```text
Which CVEs were added to the CISA KEV catalogue most recently?
```

Goose is on the MCP Apps client matrix, so the KEV board may render. See [Apps](/mcp-server/protocol/apps/).

## Troubleshooting

| Symptom | Fix |
|---|---|
| Extension fails to start | `type: streamable_http` and `uri` |
| First call times out | Raise `timeout` |
| 401 | Quote the value: `"ApiKey <orgId>:<hex>"` |
