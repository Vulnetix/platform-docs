---
title: "VNX-SEC-025: Azure Storage Account key hardcoded"
nav: "VNX-SEC-025"
description: "Detect Azure Storage account keys (88-character base64 values) hardcoded next to a storage-key name, an AccountKey= connection-string segment."
order: 919
sources: ["cli/internal/sast/rules/vnx-sec-025.rego", "cli/internal/sast/docs/vnx-sec-025.md"]
checked: ["cli@308165d"]
updated: "05 Nov 2026"
generated: true
---

| Field | Value |
|---|---|
| Rule ID | `VNX-SEC-025` |
| Severity | Critical |
| SARIF level | `error` |
| Kind | `secrets` |
| Languages | Any file |
| CWE | [CWE-798](https://cwe.mitre.org/data/definitions/798.html) |
| CAPEC | [CAPEC-191](https://capec.mitre.org/data/definitions/191.html) |
| ATT&CK | [T1552.001](https://attack.mitre.org/techniques/T1552/001/) |
| CWSS vector | `CWSS:1.0/TI:C/AP:A/AL:A/IC:N/FC:LT/RP:N/RL:A/AV:I/AS:N/IN:A/SC:A/BI:C/DI:H/EX:H/EC:N/P:W` |
| Tags | `secret` `azure` `cloud` `credentials` |
| Source | [`internal/sast/rules/vnx-sec-025.rego`](https://github.com/Vulnetix/cli/blob/main/internal/sast/rules/vnx-sec-025.rego) |

## Overview

This rule flags source files where an Azure Storage Account key appears to be hardcoded. The pattern matches lines that reference an Azure storage key variable name (containing `azure`, `storage`, and/or `key` in combination) alongside a base64-encoded string of the characteristic 86-character length followed by `==` padding that Azure Storage keys use.

Azure Storage Account keys provide unrestricted access to every resource within a storage account, all blobs, queues, tables, and file shares, with no further authentication required. Possession of a key is equivalent to being the account owner for the purposes of data access. A key hardcoded in source code is exposed to everyone who can read the repository, including CI systems, third-party integrations, and any developer who has ever cloned the repository.

This rule corresponds to [CWE-798: Use of Hard-coded Credentials](https://cwe.mitre.org/data/definitions/798.html).

## Why this matters

Azure Storage is commonly used to store application logs, database backups, user-uploaded content, and configuration files, all of which may contain sensitive data. An attacker who obtains a storage account key gains immediate access to all of this data regardless of network controls, private endpoint configurations, or firewall rules that might otherwise protect the account.

Beyond data exfiltration, a compromised storage key can be used to tamper with data (overwriting backups or modifying application configuration files to introduce malicious content), to host malware in publicly accessible containers, or to enumerate the storage account structure to understand the application's architecture before mounting further attacks.

Keys committed to version control are particularly dangerous because they persist in git history even after the file is modified. An attacker who gains read access to the repository at any point in time can retrieve historical commits containing the key. Rotation alone is insufficient if the old key was not also revoked.

## What gets flagged

The rule reports an 88-character base64 value (86 characters plus `==`) only when the line, or the lines just above it in a multi-line call, says it is a storage key:

```text
# FLAGGED: connection string segment
"Storage": "DefaultEndpointsProtocol=https;AccountName=contosodata;AccountKey=<88-char key>;EndpointSuffix=core.windows.net"

# FLAGGED: named variable, Terraform local, az CLI flag
AZURE_STORAGE_KEY=<88-char key>
storage_account_access_key = "<88-char key>"
az storage blob upload-batch --account-name contosodata --account-key '<88-char key>' ...

# FLAGGED: shared-key credential, also when the key is on its own line
credential = StorageSharedKeyCredential(
    "contosodata",
    "<88-char key>",
)
```

Not flagged: the published Azurite/emulator key for `devstoreaccount1`, placeholder or low-entropy values, `os.environ[...]` and `{AZURE_STORAGE_KEY}` references, `sha512-` integrity hashes and signatures without storage-key context, and test or fixture paths.

## Remediation

1. **Rotate the key immediately.** In the Azure Portal, navigate to the storage account, select "Access keys", and regenerate the exposed key. Azure provides two keys specifically to allow zero-downtime rotation.

2. **Store secrets in Azure Key Vault.** Applications running on Azure should retrieve storage credentials from Key Vault at runtime using a managed identity, eliminating the need to store credentials in configuration at all:

```python
# SAFE: retrieve from Azure Key Vault using managed identity
from azure.identity import DefaultAzureCredential
from azure.keyvault.secrets import SecretClient

credential = DefaultAzureCredential()
client = SecretClient(vault_url="https://myvault.vault.azure.net", credential=credential)
storage_key = client.get_secret("storage-account-key").value
```

3. **Use environment variables or managed identities for non-Azure deployments.** If running outside Azure, load the key from an environment variable injected by the deployment system, or use a short-lived SAS token scoped to only the required operations:

```python
# SAFE: load from environment variable
import os
storage_key = os.environ["AZURE_STORAGE_ACCOUNT_KEY"]
```

4. **Purge the key from git history.** Use `git filter-repo` or BFG Repo-Cleaner to remove the commit history containing the secret. After history rewrite, force-push and rotate the secret again.

## References

- [CWE-798: Use of Hard-coded Credentials](https://cwe.mitre.org/data/definitions/798.html)
- [Azure Storage Account key management best practices](https://learn.microsoft.com/en-us/azure/storage/common/storage-account-keys-manage)
- [Azure Key Vault documentation](https://learn.microsoft.com/en-us/azure/key-vault/general/overview)
- [OWASP Secrets Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html)
- [Azure Managed Identities for Azure resources](https://learn.microsoft.com/en-us/entra/identity/managed-identities-azure-resources/overview)

## Suppressing this rule

Put a `nosec` comment on the line, or on line 1 to cover the whole file. Use the comment marker of the file's language (`#`, `//`, `--` or `;`):

```text
# nosec vnx-sec-025
// nosec vnx-sec-025
```

Or record an ignore rule: `vulnetix ignore add --rule vnx-sec-025 --reason "..."`. See [Suppressing findings](/sast/guides/suppressing-findings/).
