---
title: Editor setup
description: Get completion, hover text and errors for Vulnetix config documents in any editor that runs the YAML language server.
order: 3
sources: [config-schemas/README.md, config-schemas/cmd/schemacheck/main.go, config-schemas/examples/QualityGate/strict.yaml]
checked: [config-schemas@9bda9e1]
updated: 02 Nov 2026
---

Editors that use the [YAML language server](https://github.com/redhat-developer/yaml-language-server) (the VS Code Red Hat YAML extension, Neovim with `yamlls`, Helix, Zed and others) read a schema URL from a comment on the first line of a file.

## One file, one kind

Point the file at the kind's own schema:

```yaml
# yaml-language-server: $schema=https://github.com/Vulnetix/config-schemas/releases/download/v1.0.1/QualityGate.schema.json
apiVersion: vulnetix.com/v1
kind: QualityGate
metadata:
  name: default
spec:
  severity: high
```

## Any kind

Point the file at the bundle. It requires `apiVersion` and `kind`, offers the released kinds as completions for `kind`, and checks each document against the schema its `kind` names:

```yaml
# yaml-language-server: $schema=https://github.com/Vulnetix/config-schemas/releases/latest/download/vulnetix-config.schema.json
```

## Every file in .vulnetix/config

Instead of a comment in each file, map the directory in your editor settings. In VS Code, `settings.json`:

```json
{
  "yaml.schemas": {
    "https://github.com/Vulnetix/config-schemas/releases/latest/download/vulnetix-config.schema.json": ".vulnetix/config/**/*.yaml"
  }
}
```

## Pinned or latest

| URL form | Use when |
|---|---|
| `releases/download/v1.0.1/...` | The editor must agree exactly with the CLI version your CI runs. CLI v3.153.0 and later embed `v1.0.1`. |
| `releases/latest/download/...` | You want new kinds and fields as soon as they are released. Within a major version a newer schema accepts everything an older one did. See [Compatibility](/platform-iac/schemas/compatibility/). |

The language server follows GitHub's redirects to the asset. If your editor shows a schema load error, check that it can reach `release-assets.githubusercontent.com`.

The comment does not affect `vulnetix config validate`, which always uses the schemas built into the CLI.

> [!CAREFUL] Not in SchemaStore or the Vulnetix extension yet
> The schemas are not registered in the SchemaStore catalog, and the Vulnetix VS Code extension and `vulnetix lsp` do not bind them. Until they do, use the comment or the `yaml.schemas` setting above.
