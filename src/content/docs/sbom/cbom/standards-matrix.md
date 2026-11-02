---
title: Standards matrix
description: The approval status each standards body gives each algorithm in the CBOM catalog.
order: 3
sources: [cli/internal/cbom/catalog/algorithms.json, cli/internal/cbom/cbomgen]
checked: [cli@4c8c3b71c]
updated: 02 Nov 2026
---
Approval status per standards body, drawn from published post-quantum guidance. An empty cell means the body has not specified a status for that algorithm in the catalog.

> Generated from the CLI's embedded catalog. To change an entry, edit the catalog file named at the foot of this page in `Vulnetix/cli` and run `just gen-aibom` or `just gen-cbom`.

| Algorithm | ACSC | AIVD | BSI | CCCS | CNSA 2.0 | KpqC | NCSC | NIST | NUKIB |
|-----------|------|------|------|------|------|------|------|------|------|
| AES | - | - | - | - | - | - | - | approved | - |
| AIMer | - | - | - | - | - | selected | - | - | - |
| Classic McEliece | - | accepted | recommended | - | - | - | - | - | approved |
| DES | - | - | - | - | - | - | - | disallowed | - |
| DSA | - | - | - | - | - | - | - | deprecated | - |
| ECDSA | - | - | - | - | disallowed | - | - | deprecated | - |
| FN-DSA (Falcon) | - | accepted | - | - | - | - | - | selected | - |
| FrodoKEM | - | accepted | recommended | - | - | - | - | - | approved |
| HAETAE | - | - | - | - | - | selected | - | - | - |
| HQC | - | - | - | - | - | - | - | selected | - |
| LMS/HSS | - | - | recommended | - | approved | - | - | approved | - |
| MD5 | - | - | - | - | - | - | - | disallowed | - |
| ML-DSA-65 | approved | - | recommended | - | - | - | approved | approved | - |
| ML-DSA-87 | approved | recommended | recommended | - | approved | - | - | approved | - |
| ML-KEM-1024 | - | recommended | recommended | - | approved | - | - | approved | approved |
| ML-KEM-512 | approved | - | recommended | approved | - | - | - | approved | - |
| ML-KEM-768 | approved | accepted | recommended | - | - | - | approved | approved | - |
| NTRU+ | - | - | - | - | - | selected | - | - | - |
| RSA | - | - | transitional | - | disallowed | - | - | deprecated | - |
| SHA-1 | - | - | - | - | - | - | - | disallowed | - |
| SHA-256 | - | - | - | - | - | - | - | approved | - |
| SLH-DSA | - | recommended | recommended | approved | - | - | - | approved | - |
| SMAUG-T | - | - | - | - | - | selected | - | - | - |
| Triple DES | - | - | - | - | - | - | - | deprecated | - |
| X25519MLKEM768 | - | - | recommended | - | - | - | - | allowed | - |
| XMSS/XMSSMT | - | - | recommended | - | approved | - | - | approved | - |
