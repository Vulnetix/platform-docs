---
title: Corporate proxies and restricted networks
nav: Corporate proxy
description: The hosts Vulnetix tools reach, the proxy and TLS environment variables the CLI honours, timeouts and retries, and CI examples behind a proxy.
order: 1
sources: [cli/pkg/vdb/client.go, cli/pkg/vdb/http_trace.go, cli/cmd/root.go, cli/cmd/auth.go, cli/cmd/scan.go, cli/cmd/cli_sca.go, cli/install.sh, cli/action.yml, cli/internal/sensor/siem/siem.go, cli/website/content/docs/enterprise/corporate-proxy.md]
checked: [cli@4c8c3b7]
updated: 02 Nov 2026
---

The Vulnetix CLI has no proxy settings of its own. Its HTTP client uses Go's standard proxy and TLS environment, so the same variables that work for `curl` work for `vulnetix`.

## Hosts to allow

All on port 443.

| Host | Used by |
|---|---|
| `api.vdb.vulnetix.com` | `scan`, `vdb`, `upload`, `gha`, `auth verify`, and every other call to the vulnerability database |
| `www.vulnetix.com` | `auth login` (the browser device flow) and the Resolve Platform |
| `packages.vulnetix.com` | The [package firewall](/package-firewall/) registry proxy |
| `guardrails.vulnetix.com` | The [AI firewall](/ai-firewall/) gateway |
| `ingest.vulnetix.com` | The runtime sensor's event upload |
| `cli.vulnetix.com` | `install.sh` |
| `github.com` and the GitHub release download host it redirects to | The CLI binaries `install.sh` downloads |

If a proxy allowlist misses one of these, only the feature that uses it breaks.

## Environment variables

| Variable | Read by | Purpose |
|---|---|---|
| `HTTPS_PROXY`, `HTTP_PROXY`, `NO_PROXY` (and lowercase) | Go's HTTP transport | Route requests through the proxy. `https://` and `socks5://` proxy URLs work too. |
| `SSL_CERT_FILE`, `SSL_CERT_DIR` | Go's TLS stack on Linux and BSD | Trust a corporate root CA. On macOS and Windows, add the CA to the system trust store instead. |
| `VULNETIX_ORG_ID`, `VULNETIX_API_KEY` | every command | Credentials. See [Service accounts and API keys](/organization/people/service-accounts-and-api-keys/). |
| `VULNETIX_API_URL` | `scan`, the language server, the agent lookup | Point at a different vulnerability database API |
| `VULNETIX_WEB_URL` | `auth login` | Point the device flow at a different console |
| `VULNETIX_SCA_TIMEOUT` | `scan` (SCA) and the language server | Per-request deadline for SCA batches, in seconds. Default 75, clamped to 10 to 300. |
| `VULNETIX_HTTP_TRACE` | the VDB client | Any value prints one line per HTTP request to stderr: sequence, start offset, duration, status, method, host and path |

Go reads the proxy variables once per process. Set them before you run `vulnetix`.

```bash
export HTTPS_PROXY="http://proxy.example.com:8080"
export NO_PROXY="localhost,127.0.0.1,.example.com"
export SSL_CERT_FILE=/etc/ssl/certs/ca-certificates.crt   # includes your corporate CA

vulnetix auth verify
vulnetix scan
```

Credentials in a proxy URL must be URL-encoded: a password `p@ss` is written `p%40ss`.

## Timeouts and retries

| Setting | Value | Configurable |
|---|---|---|
| Per-request timeout, VDB client | 30 s | no |
| Per-request timeout, SCA batches | 75 s | `VULNETIX_SCA_TIMEOUT` |
| Retries | 2, with exponential backoff, on network errors and retryable statuses | no |

A request against an endpoint that never answers takes about 90 seconds to give up, not 30. If a proxy is slow enough to trip the timeout, fix the proxy.

## TLS verification

There is no way to turn TLS verification off: no `--skip-tls-verify`, no `--insecure`. A proxy that intercepts TLS must present a certificate chained to a CA you trust. Add that CA to the system store (`update-ca-certificates` on Debian and Ubuntu, `update-ca-trust` on RHEL, `security add-trusted-cert` on macOS) or point `SSL_CERT_FILE` at a bundle that contains it.

> [!CAREFUL] Flags that do not exist
> Older docs showed `--proxy`, `--proxy-auto-detect`, `--timeout`, `--retries`, `--compression`, `--incremental`, `--audit-log`, `--metrics-output`, `VULNETIX_LOG_LEVEL` and `VULNETIX_DEBUG`. None of them exist. The diagnostics are `-v` (rate limits, cache status, auth notes) and `-vv` (adds raw evidence), plus `VULNETIX_HTTP_TRACE`.

## Diagnosing

```bash
vulnetix auth status                     # which credential is active, and where it came from
vulnetix -v auth verify                  # does it reach the API through the proxy
VULNETIX_HTTP_TRACE=1 vulnetix scan      # every request, with timing
curl -x "$HTTPS_PROXY" -sI https://api.vdb.vulnetix.com/ | head -1   # the proxy itself, without the CLI
```

## Installing behind a proxy

`install.sh` uses `curl` (or `wget`), which honours `HTTPS_PROXY`:

```bash
export HTTPS_PROXY="http://proxy.example.com:8080"
curl -fsSL https://cli.vulnetix.com/install.sh | sh -s -- --install-dir ~/.local/bin
```

`go install` does not work: the CLI depends on private Go modules. Use the installer or a release binary.

## CI behind a proxy

### GitHub Actions on a self-hosted runner

The `Vulnetix/cli@v4` action downloads the released binary with `install.sh`, so it needs `cli.vulnetix.com` and `github.com`; it does not need Go.

```yaml
jobs:
  scan:
    runs-on: self-hosted
    env:
      HTTPS_PROXY: ${{ vars.CORPORATE_HTTPS_PROXY }}
      NO_PROXY: ${{ vars.CORPORATE_NO_PROXY }}
    steps:
      - uses: actions/checkout@v5
      - uses: Vulnetix/cli@v4
        with:
          org-id: ${{ secrets.VULNETIX_ORG_ID }}
          api-key: ${{ secrets.VULNETIX_API_KEY }}
      - run: vulnetix scan
```

### GitLab CI

```yaml
vulnetix:
  image: debian:stable-slim
  variables:
    HTTPS_PROXY: "http://proxy.example.com:8080"
    NO_PROXY: "localhost,127.0.0.1,.example.com"
  before_script:
    - apt-get update && apt-get install -y curl ca-certificates git
    - curl -fsSL https://cli.vulnetix.com/install.sh | sh -s -- --install-dir /usr/local/bin
  script:
    - vulnetix scan
```

Set `VULNETIX_ORG_ID` and `VULNETIX_API_KEY` as masked CI variables; the CLI reads them directly, with no login step. `git` needs its own proxy setting (`git config --global http.proxy "$HTTPS_PROXY"`) if the job clones through the proxy.

### Jenkins

```groovy
pipeline {
  agent any
  environment {
    HTTPS_PROXY = 'http://proxy.example.com:8080'
    NO_PROXY    = 'localhost,127.0.0.1,.example.com'
    VULNETIX_ORG_ID  = credentials('vulnetix-org-id')
    VULNETIX_API_KEY = credentials('vulnetix-api-key')
  }
  stages {
    stage('Scan') {
      steps {
        sh 'vulnetix scan'
      }
    }
  }
}
```

## Related

- [/cli/](/cli/) for installation and CI options
- [Service accounts and API keys](/organization/people/service-accounts-and-api-keys/) for a CI credential
