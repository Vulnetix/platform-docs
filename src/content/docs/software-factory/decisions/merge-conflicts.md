---
title: Merge conflicts
description: How the factory resolves a pull request's merge conflicts itself in up to five checked attempts, and how a person resolves them in the browser conflict editor.
order: 5
sources: [belai/docs/merge-conflicts.md, website/.repo/conflict-editor.md, vdb-site/docs/factory.md, vdb-site/api/internal/handler/factory_checkpoints_conflicts.go, vdb-site/api/internal/handler/pulls_conflicts.go]
checked: [vdb-site@597344c, belai@8aa7760, website@58b9ffa]
updated: 28 Oct 2026
---

There are two ways to resolve a merge conflict: let the `belai:conflict-resolver` agent do it, or do it yourself in the **conflict editor**.

## The conflict card

A pull request with conflicts gets a card labelled `merge-conflict`, assigned to `belai:conflict-resolver`. One card is open per pull request at a time. The card is filed:

- by the `conflict-fix` [default workflow](/software-factory/workflows/default-workflows/), on a push to the default branch and when a pull request is opened, synchronized or reopened
- by a person, with **Resolve conflicts** on Checkpoints or on a Pix Sandbox's Pull requests tab

A worker on any machine with the repository can claim it.

## How the agent resolves it

Belai runs the loop itself, so its promises hold whatever the model does. For each attempt, up to 5:

1. Fetch the pull request's head and base. A fork's head is fetched as `refs/pull/N/head`.
2. Make a fresh worktree at the head commit, on the card's own branch.
3. On the first attempt, run the build and linters on the head first. A build that already fails there, and lint findings already there, are not the merge's fault.
4. Merge the base in, with conflict markers in diff3 style. Recorded resolutions on the machine are never reused.
5. Plan a strategy for each hunk: keep both sides, the current side (the pull request's), the incoming side (the base's), or a mix. Each attempt is told what earlier attempts chose and how they failed, and may not repeat one.
6. Let the model resolve the hunks in one turn. It may not commit, merge, rebase, reset, stash, switch branches or publish.
7. Check the result, in this order, stopping at the first failure:

| Check | Fails when |
|---|---|
| Markers | A conflict marker is left |
| Duplicate imports | A file imports something twice that neither side did |
| Build | A detected build check (`go build`, `cargo build`, `dotnet build`, Gradle, Maven, `tsc`, an npm build script) exits non-zero |
| Lint | A linter reports more findings than on the head |
| Tests | A detected test suite fails |

8. On a pass, commit the merge and push it. On a failure, record the attempt and start the next one from a clean worktree.

A check that a permission rule stops is not a failed attempt. The card is blocked naming the check, because only a person can change the rule. A check whose tool is not installed is skipped and named in the comment as not run.

### Pushing

A passing resolution is pushed to the pull request's head branch as a **fast-forward**. It never force-pushes. For a pull request from a fork, Belai does not push to the fork: it pushes the attempt's branch to `origin` (`belai/K-xxxxxx/aN`) and says so in a comment on the pull request. A card filed for a fork carries `checkpoint:fork_code`, so no host runs the fork's code until a person clears it on Checkpoints.

### When nothing passes

After 5 failed attempts the card gets the note `conflicts unresolved after 5 attempts`, moves to blocked and is labelled `checkpoint:conflicts-unresolved`, so no worker takes it until a person decides. Sending it back to the backlog starts a new round.

### The ledger

Each attempt adds one note to the card, written by Belai from identifiers only, never model text:

```
conflict attempt 2/5 3fa1c09e: api/handler.go=both, go.mod=incoming -> build failed (build-go)
```

The card drawer and the Checkpoints inspector show these notes as a table: "Attempt 3 of 5", "Resolved on attempt 2".

> [!WHY] Why five fresh checkouts and no repeats
> A model asked to try again tends to make the same choice. Starting each attempt clean, and refusing any choice an earlier attempt already made, means five attempts are five different resolutions.

## The conflict editor

The conflict editor (`/resolve/factory-conflicts?repo=owner/name&pr=N`) resolves conflicts in your browser, the way GitHub's own resolver does, and commits the merge **as you**, signed with your key.

1. The server merges the base into the pull request (diff3). Changes that do not overlap are already in. Each overlapping block shows between `<<<<<<<` (labelled with the head branch), `=======` and `>>>>>>>` (labelled with the base branch).
2. For each block, accept the current change (the pull request's), the incoming change (the base's), or both, or edit the file.
3. **Mark as resolved** once no marker is left in the file.
4. When every file is resolved, **Commit merge**. The dialog shows who you will commit as and how it will be signed. See [Commit signing](/software-factory/decisions/commit-signing/).

Lockfiles are never offered for editing. The base's copy goes into the commit, and nothing regenerates it, so regenerate it locally or send the pull request to Pix. A file the editor cannot merge as text, a fork, a pull request too large, or one with no merge base is named, with the local git commands to use instead.

If the pull request's head or base moved while you worked, nothing is written (`head_moved`, `base_moved`). Reloading keeps the files whose conflict did not change.

> [!CAREFUL] On GHES, Gitea, Forgejo and GitLab
> The editor works the same. The `repo` is the forge repository's name (`codeberg.org/acme/app`). Only GitHub's API can make a two-parent or self-signed commit, so on the other forges the factory builds the merge commit and pushes it over git with the connection's token, as a fast-forward that is refused if the branch moved. The conflict card's `repo` line is the same name, and its `pr` line is the forge's own link (`/pulls/N`, or `/-/merge_requests/N` on GitLab).

## API

| Method | Path |
|---|---|
| POST | `/v1/factory/checkpoints/conflicts` with `{repo, number}`: file the card, or return the open one |
| GET | `/v1/pulls/{owner}/{name}/{number}/conflicts`: the merged files for the editor |
| POST | `/v1/pulls/{owner}/{name}/{number}/resolve`: commit the resolution as you |

## Related

- [Commit signing](/software-factory/decisions/commit-signing/)
- [Checkpoints](/software-factory/decisions/checkpoints/)
