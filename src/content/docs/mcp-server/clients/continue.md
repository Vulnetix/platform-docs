---
title: Continue
description: Add the server to the Continue extension for VS Code and JetBrains in config.yaml, used in agent mode.
order: 10
sources:
  - mcp-server/src/index.ts
checked: [mcp-server@1725a04]
updated: 02 Nov 2026
---

Continue declares MCP servers in its YAML config.

`~/.continue/config.yaml`:

```yaml
name: my-configuration
version: 0.0.1
schema: v1

mcpServers:
  - name: vulnetix
    type: streamable-http
    url: https://mcp.vulnetix.com/mcp
    requestOptions:
      headers:
        Authorization: "ApiKey <orgId>:<hex>"
```

Continue reloads the file on save. A workspace can use `.continue/config.yaml`, or a block file under `.continue/mcpServers/`.

Continue spells the type `streamable-http` with a hyphen. The header sits under `requestOptions.headers`.

## Check it

Switch the chat to Agent mode. MCP tools are not offered in Chat or Edit. The tools dropdown lists Vulnetix.

```text
Is there a version of lodash without known vulnerabilities?
```

## Troubleshooting

| Symptom | Fix |
|---|---|
| Server missing | Validate the YAML; indentation errors fail silently |
| Tools listed, never used | Agent mode, and a model that supports tool calling |
| 401 | Quote the whole value, `"ApiKey <orgId>:<hex>"` |
