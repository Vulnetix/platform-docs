---
title: "Quickstart: a quality gate in your repository"
nav: Quickstart
description: Write a QualityGate document, validate it locally and in CI, and set the same values on your organization with the imperative commands.
order: 3
sources: [cli/cmd/config_documents.go, cli/cmd/config.go, config-schemas/examples/QualityGate/strict.yaml]
checked: [cli@4c8c3b7, config-schemas@9bda9e1]
updated: 02 Nov 2026
---

You need the Vulnetix CLI v3.153.0 or later (`vulnetix version --short`). Validation needs no login. Step 4 needs `vulnetix auth login` with an organization that is not the community org.

## 1. Write the document

```sh
mkdir -p .vulnetix/config
cat > .vulnetix/config/quality-gate.yaml <<'EOF'
# yaml-language-server: $schema=https://github.com/Vulnetix/config-schemas/releases/download/v1.0.1/QualityGate.schema.json
apiVersion: vulnetix.com/v1
kind: QualityGate
metadata:
  name: default
spec:
  severity: high
  exploits: active
  blockMalware: true
  cooldownDays: 7
EOF
```

The first line binds the file to the pinned schema in editors that run the YAML language server. See [Editor setup](/platform-iac/schemas/editors/).

## 2. Validate it

```sh
vulnetix config validate
```

```text
1 documents valid in 1 files
```

A mistake is reported with the file, the document number and the JSON pointer of each failure, and the command exits 1:

```text
.vulnetix/config/quality-gate.yaml (document 1): jsonschema validation failed with 'https://github.com/Vulnetix/config-schemas/releases/download/v0.0.0-dev/QualityGate.schema.json#'
    - at '/spec/severity': value must be one of 'low', 'medium', 'high', 'critical'
Error: 1 of 1 documents invalid
```

## 3. Validate in CI

`vulnetix config validate` exits 0 when every document is valid and 1 otherwise, so it works as a plain pipeline step. In GitHub Actions:

```yaml
- name: Validate Vulnetix config
  run: |
    curl -fsSL -o vulnetix https://github.com/Vulnetix/cli/releases/latest/download/vulnetix-linux-amd64
    chmod +x vulnetix
    ./vulnetix config validate
```

A repository with no `.vulnetix/config/` directory passes: there is nothing to validate.

## 4. Set the values on your organization

To change your organization from these files, run [`vulnetix config plan`](/platform-iac/cli/plan/) and then [`vulnetix config apply`](/platform-iac/cli/apply/). You can also set the same values with the imperative command:

```sh
vulnetix config set quality-gate --severity high --exploits active --block-malware true --cooldown 7
vulnetix config get quality-gate
```

From then on, every authenticated `vulnetix scan` in the organization uses these values in place of its own `--severity`, `--exploits`, `--block-malware` and `--cooldown` flags. The [QualityGate](/platform-iac/kinds/quality-gate/#set-these-values-today) reference maps every field to its flag.
