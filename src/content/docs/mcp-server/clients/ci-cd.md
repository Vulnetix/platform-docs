---
title: Agents in CI
description: Run an MCP-equipped agent in GitHub Actions or GitLab CI with a stored secret key, ask it for a machine-readable verdict, and keep the hard gate in the CLI.
order: 14
sources:
  - mcp-server/src/tools/packages.ts
  - mcp-server/src/tools/intel.ts
  - cli/install.sh
  - cli/cmd/scan.go
checked: [mcp-server@1725a04, cli@4c8c3b7]
updated: 02 Nov 2026
---

The same URL and header work unattended. Two things change: the key comes from the CI secret store, and the pipeline needs a verdict it can act on rather than prose.

Store the secret `VULNETIX_AUTH` as `<orgId>:<hex>`, without the `ApiKey ` prefix. Use a separate organisation for CI so a pipeline that exhausts the daily quota does not block developers.

## Writing the config

Generate the config at run time with `jq`, so the key is never in a committed file and is JSON-escaped correctly:

```bash
jq -n --arg auth "ApiKey ${VULNETIX_AUTH}" '{
  mcpServers: { vulnetix: {
    type: "http",
    url: "https://mcp.vulnetix.com/mcp",
    headers: { Authorization: $auth }
  } }
}' > "${RUNNER_TEMP:-/tmp}/mcp.json"
```

## GitHub Actions with Claude Code

```yaml
name: Dependency review
on:
  pull_request:
    types: [opened, synchronize, ready_for_review]

jobs:
  review:
    if: github.event.pull_request.draft == false
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5
        with:
          fetch-depth: 0

      - name: Write MCP config
        env:
          VULNETIX_AUTH: ${{ secrets.VULNETIX_AUTH }}
        run: |
          jq -n --arg auth "ApiKey ${VULNETIX_AUTH}" '{
            mcpServers: { vulnetix: {
              type: "http",
              url: "https://mcp.vulnetix.com/mcp",
              headers: { Authorization: $auth }
            } }
          }' > "$RUNNER_TEMP/mcp.json"

      - name: Review added dependencies
        env:
          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
        run: |
          npm install -g @anthropic-ai/claude-code
          git diff "origin/${{ github.base_ref }}...HEAD" -- '**/package.json' '**/go.mod' '**/requirements*.txt' > diff.txt
          claude -p "$(cat .github/dependency-gate.md)" \
            --mcp-config "$RUNNER_TEMP/mcp.json" \
            --allowedTools "mcp__vulnetix__vulnetix_package_search,mcp__vulnetix__vulnetix_kev_status,mcp__vulnetix__vulnetix_purl,Read" \
            > verdict.txt
          tail -n 1 verdict.txt > verdict.json
          jq -e '.verdict == "pass"' verdict.json || { jq -r '.reasons[]' verdict.json; exit 1; }
```

`.github/dependency-gate.md`:

```text
Read diff.txt. For every dependency added or upgraded, call vulnetix_package_search with
the right ecosystem, and vulnetix_kev_status for any advisory it reports. Fail if an added
package has a KEV-listed vulnerability and no fixed version. Print ONLY one line of JSON
as the last line of output: {"verdict":"pass"|"fail","reasons":["..."]}
```

Any agent CLI that takes an MCP config file works the same way; replace the `claude` step.

> [!CAREFUL] Never inline the key
> Workflow files are committed and visible to anyone with read access. GitHub masks values from `secrets.*` in logs, not values typed into the file.

## GitLab CI

```yaml
dependency-review:
  image: node:22
  rules:
    - if: $CI_PIPELINE_SOURCE == "merge_request_event"
  script:
    - apt-get update -qq && apt-get install -y -qq jq
    - npm install -g @anthropic-ai/claude-code
    - |
      jq -n --arg auth "ApiKey ${VULNETIX_AUTH}" '{
        mcpServers: { vulnetix: {
          type: "http",
          url: "https://mcp.vulnetix.com/mcp",
          headers: { Authorization: $auth }
        } }
      }' > /tmp/mcp.json
    - git fetch origin "$CI_MERGE_REQUEST_TARGET_BRANCH_NAME"
    - git diff "origin/$CI_MERGE_REQUEST_TARGET_BRANCH_NAME...HEAD" > diff.txt
    - claude -p "$(cat .gitlab/dependency-gate.md)" --mcp-config /tmp/mcp.json --allowedTools "mcp__vulnetix__vulnetix_package_search,mcp__vulnetix__vulnetix_kev_status,Read" | tail -n 1 > verdict.json
    - jq -e '.verdict == "pass"' verdict.json
```

Set `VULNETIX_AUTH` and `ANTHROPIC_API_KEY` as masked, protected CI/CD variables.

## Keep the hard gate deterministic

> [!WHY] The CLI blocks, the agent explains
> A model's verdict can be wrong in either direction. For a gate that must hold, run the Vulnetix CLI, which exits 1 by itself with no model in the path. Use the agent to explain and prioritise what the CLI found.

```yaml
- run: curl -fsSL https://cli.vulnetix.com/install.sh | sh -s -- --install-dir "$HOME/.local/bin"
- run: vulnetix scan --evaluate-sca --severity high --exploits weaponized
```

`--exploits` takes `poc`, `active` or `weaponized`. `--severity` takes `low`, `medium`, `high` or `critical`. See the [CLI CI/CD docs](/cli/).

## Quota in CI

| Do | Why |
|---|---|
| Look up only what the diff changed | A whole lockfile is hundreds of calls |
| Skip draft pull requests | They are pushed many times |
| Set `limit` on list tools | Smaller pages, fewer follow-up calls |
| Read `_meta["vulnetix/rateLimit"].remaining` | Stop before the error |
| Use a dedicated CI organisation | Its quota is not shared with people |

## Running the prompts in CI

All 18 prompts drive a local checkout with the CLI. In CI, install the CLI in the same job (above), and a prompt such as `vulnetix_sast_scan` or `vulnetix_verify_fix` has something to run against.
