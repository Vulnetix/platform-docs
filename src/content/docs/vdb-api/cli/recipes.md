---
title: Recipes
description: Runnable examples for common VDB API jobs, with the CLI and with curl, including a CI gate on a package version, KEV checks for a list of CVEs, rule-pack exports and jq filters.
order: 3
sources: [cli/cmd/vdb.go, cli/cmd/vdb_kev.go, cli/cmd/vdb_snort_rules.go, vdb-api/internal/handler/inputs_resolve.go, vdb-api/internal/handler/package_versions.go]
checked: [cli@4c8c3b71c, vdb-api@4145f0a]
updated: 02 Nov 2026
---

Every recipe assumes `VULNETIX_ORG_ID` and `VULNETIX_API_KEY` are set (see the [quickstart](/vdb-api/get-started/quickstart/)), and `jq` is installed. Each API call counts against your [daily quota](/vdb-api/api/rate-limits/).

## Fail a CI job when a pinned package has advisories

`/v2/inputs/resolve` turns a purl into the advisory ids that affect it, in one request:

```bash
#!/usr/bin/env bash
set -euo pipefail
PURL="${1:?usage: $0 pkg:npm/express@4.17.1}"

ids=$(curl -sf \
  -H "Authorization: ApiKey ${VULNETIX_ORG_ID}:${VULNETIX_API_KEY}" \
  --get --data-urlencode "purl=${PURL}" \
  https://api.vdb.vulnetix.com/v2/inputs/resolve | jq -r '.resolved.vulnIds[]')

if [ -n "$ids" ]; then
  echo "$PURL is affected by:"
  echo "$ids"
  exit 1
fi
echo "$PURL: no known advisories"
```

For a whole repository, use [`vulnetix sca`](/sca/) instead; it reads your manifests and lockfiles and applies your quality gate.

## Check a list of CVEs against KEV

```bash
while read -r id; do
  [ -z "$id" ] && continue
  if out=$(vulnetix vdb kev get "$id" -o json --silent 2>/dev/null); then
    echo "$out" | jq -r '"\(.cveId)\tdue \(.dueDate)\toverdue=\(.overdue)\transomware=\(.knownRansomwareCampaignUse)"'
  else
    echo -e "${id}\tnot in KEV"
  fi
done < cves.txt
```

## Count CVEs per version of a package

```bash
vulnetix vdb vulns express --limit 500 -o json --silent \
  | jq -r '.versions[] | "\(.version)\t\(.cveIds | length)"' \
  | sort -t$'\t' -k2 -n -r | head
```

`.totalCVEs` holds the number of distinct CVEs across every version.

## Look up many advisories of mixed formats

```bash
# ids.txt: one id per line, any family (CVE, GHSA, PYSEC, RHSA, USN, ...)
while read -r id; do
  vulnetix vdb vuln "$id" -o json --silent > "vuln-${id//[:\/]/_}.json" || echo "failed: $id" >&2
done < ids.txt
```

## Export the KEV catalogue

```bash
vulnetix vdb kev download -o kev.csv                         # Vulnetix KEV, CSV
vulnetix vdb kev list --source CISA --source enisa -o json --silent > kev.json
vulnetix vdb kev list --reason known_ransomware -o json --silent   # `vdb kev reasons` lists the values
```

## Build a Snort or Suricata rule pack

```bash
vulnetix vdb snort-rules list --source vulnetix \
  --since 2026-10-01T00:00:00Z --limit 200 --format rules -o vulnetix.rules
```

`--format rules` writes the raw `.rules` text instead of JSON. The same works for YARA:

```bash
vulnetix vdb yara-rules list --tag ransomware --limit 200 --format rules -o ransomware.yar
```

## Page through a month of CVE ids

```bash
for offset in 0 500 1000 1500; do
  vulnetix vdb ids 2024 3 --limit 500 --offset "$offset" -o json --silent | jq -r '.identifiers[]'
done
```

Stop when a page comes back with `"hasMore": false`. See [Pagination](/vdb-api/api/pagination/).

## Shell aliases

```bash
alias vv='vulnetix vdb vuln'
alias vx='vulnetix vdb exploits'
alias vf='vulnetix vdb fixes'
```
