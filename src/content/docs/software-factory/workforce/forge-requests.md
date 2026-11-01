---
title: Forge requests
description: How a worker that cannot push its own work hands the job to a coordinator, which pushes the branch and opens the draft pull request with the GitHub App, and what each outcome means.
order: 14
sources: [vdb-site/docs/belai-forge-requests.md, FORGE-COORDINATOR-CONTRACT.md, vdb-site/api/internal/handler/belai_forge.go]
checked: [vdb-site@284f1d6]
updated: 28 Oct 2026
---

Sometimes a worker finishes a card but cannot publish it: the machine has no `gh`, no push credentials, GitHub is down, or a rate limit hit. Instead of failing, it hands the job to a **coordinator**. For a Pix Sandbox, the coordinator is the sandbox's own controller: it pushes the card's branch from the worker's git bundle with a GitHub App installation token, and finds or opens the draft pull request.

```
worker  ->  belai rc  ->  Vulnetix  ->  coordinator: push, open draft PR  ->  Vulnetix  ->  belai rc  ->  worker
```

Only harness facts cross: ids, commit hashes, enums, counts, timestamps and the pull request title Belai composed. No git output, GitHub text or model text.

## Kinds

| Kind | Asks the coordinator to |
|---|---|
| `push` | Push the branch |
| `pull_request` | Push and find or open the draft pull request |
| `commit` | Push the branch (treated the same as `push`) |
| `issue_sync` | Sync the card's issue |

## Why a worker asks

`no_gh`, `push_credentials`, `auth`, `rate_limited` or `server`.

## Outcomes

| Reason | Means |
|---|---|
| `pushed` | Done: the branch is pushed |
| `pr_opened`, `pr_found` | Done: the draft pull request was opened, or already existed |
| `non_fast_forward` | The remote branch moved. Nothing was overwritten. |
| `branch_mismatch` | The bundle is not for the card's branch |
| `bundle_missing`, `empty_bundle` | The worker's bundle was not there, or had nothing in it |
| `repo_not_attached` | The sandbox does not have the repository |
| `app_not_installed` | The GitHub App is not installed on the repository |
| `token_denied` | GitHub refused the installation token |
| `rate_limited`, `server` | GitHub limited or failed the request. It can be tried again. |
| `expired` | Nobody handled it within 24 hours |

The worker reads the outcome and carries on: it records the pull request on its card, or blocks the card with the reason. While the coordinator works, the worker is told it `took_over` the job, that it is `waiting`, or that it `failed`.

> [!WHY] Why the coordinator never force-pushes
> The coordinator acts for a worker it cannot see. If the remote branch moved, someone else pushed; overwriting it could lose their work. `non_fast_forward` hands the decision back.

## API

| Method | Path |
|---|---|
| POST | `/v1/belai/hosts/{hostId}/forge-requests` |
| GET | `/v1/belai/hosts/{hostId}/forge-requests/{requestId}` |
