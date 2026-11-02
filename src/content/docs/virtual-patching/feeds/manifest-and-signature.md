---
title: Manifest and signature
description: Check a downloaded feed file against the manifest and the manifest against its Ed25519 signature, the same checks the Vulnetix sensor makes.
order: 3
nav: Manifest and signature
sources: [vdb-site/api/internal/handler/detection_rule_feeds_publish.go, vdb-site/api/internal/handler/detection_rule_feeds_sensor.go, cli/internal/sensor/feed/feed.go, cli/cmd/vulnetix-sensor/main.go, cli/.github/workflows/release.yml]
checked: [vdb-site@1a06d67, cli@4c8c3b7]
updated: 02 Nov 2026
---

Feed files are public, so anyone who can change what a URL serves could change your WAF. Two checks stop that: each file's SHA-256 is in `manifest.json`, and `manifest.json` is signed.

## `manifest.json`

```json
{
  "feedUuid": "…",
  "orgUuid": "…",
  "name": "prod edge",
  "feedType": "SURICATA",
  "schemaVersion": 1,
  "generatedAt": 1793577600000,
  "files": [
    {
      "ruleType": "SURICATA",
      "filename": "suricata.rules",
      "url": "https://vulnetix.com/feeds/<org-uuid>/<feed-uuid>/suricata.rules",
      "sha256": "…",
      "ruleCount": 12
    },
    {
      "ruleType": "",
      "filename": "rules.json",
      "url": "https://vulnetix.com/feeds/<org-uuid>/<feed-uuid>/rules.json",
      "sha256": "…",
      "ruleCount": 12
    }
  ]
}
```

`generatedAt` is Unix milliseconds. `rules.json` is listed like any other file, so the signature covers it.

## `manifest.json.sig`

The base64 of an Ed25519 signature over the exact bytes of `manifest.json`. Vulnetix signs every publish when its signing key is configured. A feed published without it has no `.sig` file.

The public key is a base64 string of the raw 32 bytes. Release builds of `vulnetix-sensor` have it pinned, so the sensor verifies without being told. Pass `--feed-key` (or set `VULNETIX_FEED_KEY`) only to override it, for example during a key rotation.

## Verify by hand

With OpenSSL 3:

```bash
FEED="https://vulnetix.com/feeds/<org-uuid>/<feed-uuid>"
KEY="<base64 Ed25519 public key>"

curl -fsSLO "$FEED/manifest.json"
curl -fsSL "$FEED/manifest.json.sig" | base64 -d > manifest.sig

# Wrap the raw key in the Ed25519 SubjectPublicKeyInfo header.
{ printf '302a300506032b6570032100' | xxd -r -p; printf '%s' "$KEY" | base64 -d; } > feed-key.der
openssl pkey -pubin -inform DER -in feed-key.der -out feed-key.pem

openssl pkeyutl -verify -pubin -inkey feed-key.pem -rawin \
    -in manifest.json -sigfile manifest.sig
# Signature Verified Successfully

# Then check each file against the signed manifest.
curl -fsSLO "$FEED/suricata.rules"
jq -r '.files[] | select(.filename=="suricata.rules") | .sha256 + "  suricata.rules"' manifest.json \
    | sha256sum -c -
```

The `<file>.sha256` beside each file is a convenience for scripts that do not check the signature. It is not signed, so it proves the download is intact, not that it came from Vulnetix.

## What the sensor does with each case

| Case | Result |
|---|---|
| Signature checks against the key | Rules may block, in the modes that allow it |
| No `.sig`, bad base64, or a signature that does not match | Feed loads as **unverified**: every rule reports and never blocks |
| No key configured at all | Same as unverified |
| A file whose SHA-256 does not match the manifest | The feed is refused outright, signed or not |
| `manifest.json` unchanged since the last fetch (same ETag) | Nothing is reloaded |

`vulnetix-sensor tetragon-policy` is stricter: it refuses to run without a key, because the policy it renders blocks in the kernel.
