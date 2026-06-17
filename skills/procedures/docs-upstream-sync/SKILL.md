---
name: docs-upstream-sync
version: 0.1.0
description: Run the expo/docs upstream sync generators (app config schema, Expo Skills, Expo MCP tools, EAS CLI reference, and more), detect which produced changes worth syncing, gather them onto one dated branch, run pnpm lint, and hand off to the user to open a PR. Never commits. MUST USE when the user says "docs sync", "sync docs", "daily docs sync", "what needs syncing", or "/docs-upstream-sync".
argument-hint: "[path-to-expo-docs-checkout]"
allowed-tools: Read, Bash(bash:*), Bash(git:*), Bash(pnpm:*)
---

# docs-upstream-sync

The expo/docs repo ships a set of generators that regenerate reference content: some from upstream packages (the app config schema, the Expo Skills registry, the Expo MCP tool list, the EAS CLI reference), some derived from local page frontmatter (the `@expo/ui` component tables). Each is an idempotent `pnpm` script: run it, and if its source moved, the working tree changes; if not, nothing changes. That `git diff` is the whole signal for "is there something new worth syncing today." This skill runs them all in one pass, so the recurring one-off sync PRs become a single daily check.

The deterministic part lives in `scripts/run_syncs.sh`, driven by `manifest.json` (one entry per sync). The skill runs that, and only if something actually changed does it create a dated branch, run `pnpm lint`, and hand the result to the user to commit and open a PR. It never commits, pushes, or opens the PR.

The catch: several generators (Expo Skills, EAS CLI, Expo MCP) stamp a `fetchedAt` timestamp into their data JSON on **every** run, so a no-op still shows a diff. A timestamp-only bump is not a mergeable change. `run_syncs.sh` handles this: a sync counts as changed only if its diff has lines beyond `fetchedAt` (the `ignoreDiffPattern` in `manifest.json`); when only the timestamp moved, it reverts that generator's own output and reports `NOSYNC`. So a sync branch never carries an empty `fetchedAt` bump.

## Inputs

`$ARGUMENTS` is an optional path to a local expo/docs checkout. Resolution order: `$ARGUMENTS`, then `config.json` next to `manifest.json` (copy `config.example.json`), then `~/Documents/GitHub/expo/docs`. The syncs run against the current checkout, so a stale `main` re-syncs against old data: if `HEAD` looks old, tell the user to `git pull` first; never pull for them.

## When NOT to use

- A single targeted sync the user names ("just sync EAS CLI"): run that one `pnpm <script>` directly instead of the whole pass.
- Writing the PR title/description: that is `docs-pr`, after this skill leaves the branch.
- Committing, pushing, or opening the PR: out of scope by design (see Safety).
- A dirty working tree: the detector refuses to run so it can attribute changes; commit or stash first.

## Requirements

- The docs checkout on an up-to-date `main` with deps installed (`pnpm install`), and `pnpm` + `python3` + `git` on PATH.
- The Expo MCP sync (`expo-mcp-sync`) authenticates to `mcp.expo.dev` over OAuth and caches a refreshable token at `~/.expo-mcp-docs-sync/auth.json`. The skill runs it only when that cache exists (it refreshes silently); otherwise it is reported `SKIPPED` with a note to run `pnpm expo-mcp-sync` once to authorize. That first authorization opens a browser, so it is a manual one-time step, never done inside an automated run. Everything else runs without credentials.

## Step 1: Detect (deterministic, no judgment)

```sh
bash <skill-dir>/scripts/run_syncs.sh $ARGUMENTS
```

This requires a clean tree, runs each manifest sync in turn, and prints prefixed lines:

| Line | Meaning | Your action |
| --- | --- | --- |
| `HEAD <sha> branch=… repo=…` | Run header | Sanity check it is the right checkout on `main`. |
| `DIRTY <msg>` | Tree not clean / bad repo path | Stop. Tell the user to commit, stash, or fix the path, then re-run. |
| `CHANGED <label>` + `FILE` lines | Upstream moved (real diff, beyond `fetchedAt`) | The work: this source goes on the branch (Step 2). |
| `NOSYNC <label>` | Ran; nothing new, or only the `fetchedAt` timestamp moved and was reverted | Skip. Not a mergeable change. |
| `SKIPPED <label> (<reason>)` | Could not run (for example MCP without an OAuth token cache) | Report it and how to enable, do not treat as a sync. |
| `FAILED <label> (… see <log>)` | The generator errored | Report it with the log path; partial writes may be in the tree (Step 4). |
| `SUMMARY changed=<n> …` | Totals | Drives Step 2. |

If `changed=0`, there is nothing to sync: report the summary (including any `SKIPPED`/`FAILED`), confirm the tree is clean, and stop. Do not create a branch.

## Step 2: Branch (only if something changed)

The syncs ran on `main` and left their changes in the working tree. Carry them onto a dated branch (this is the skill's only git mutation):

```sh
git -C <docs_repo> checkout -b aman/docs-upstream-sync-$(date +%F)
```

`git checkout -b` moves the uncommitted changes onto the new branch. Use the `branchPrefix` from `manifest.json` (`aman/docs-upstream-sync`).

## Step 3: Lint

```sh
cd <docs_repo> && pnpm lint
```

If lint fails, surface the output and stop here: the branch keeps the synced changes for the user to fix. Do not attempt fixes unless asked. If lint passes, continue to the report.

## Step 4: Report and hand off

Print a compact summary the user can act on, then the exact commands to finish (the user runs them, not the skill):

```
docs-upstream-sync: <YYYY-MM-DD>  (docs HEAD <shortsha>)
branch: aman/docs-upstream-sync-<YYYY-MM-DD>

Synced:
  - App config schema   (public/static/schemas/...)
  - Expo Skills         (ui/components/ExpoSkillsTable/...)
No change: @expo/ui component tables, Expo MCP tools, EAS CLI reference, Android permissions
Skipped:   <none, or e.g. Expo MCP tools (not authorized; run `pnpm expo-mcp-sync` once)>
Failed:    <none, or e.g. EAS CLI reference (see /tmp/docs-upstream-sync-eas-cli.log)>
Lint:      passed

Next steps (yours, not mine):
  cd <docs_repo>
  git add -A && git commit -m "[docs] Sync <synced sources>"
  git push -u origin aman/docs-upstream-sync-<YYYY-MM-DD>
  # then open a PR (use /docs-pr for the description)
```

Notes for the report:
- List each `CHANGED` source by its `title` with a representative path from the `FILE` lines.
- If the user prefers one reviewable change per source (their usual separate-PR habit), tell them to commit per source: `git add <that source's paths> && git commit -m "[docs] Sync <source>"`, repeat, then one push and one PR.
- On `FAILED`, tell the user to read the log and decide whether to discard that source's partial changes (`git checkout -- <paths>`) before committing.

## Safety

- Git is the user's. The skill's only git command is `git checkout -b` to gather the changes (which the user explicitly asked for); it never runs `git add`, `commit`, `push`, or opens the PR. The detector touches git history read-only; its one working-tree write is reverting a generator's own timestamp-only output (`git checkout -- <file>` on `fetchedAt`-only diffs), which is safe because it required a clean tree to start, so every change in the tree is its own.
- It refuses to run on a dirty tree, so it never mixes unrelated work into a sync, and so each change can be attributed to the generator that made it.
- Each sync is an upstream generator; the skill only re-runs them and reports the diff. It writes nothing by hand and makes no editorial changes to docs prose.
- `SKIPPED` is not `FAILED`: an unauthorized MCP sync (no `~/.expo-mcp-docs-sync/auth.json`) is expected on a machine that has not run the one-time OAuth login, and is reported as such, not as an error.
