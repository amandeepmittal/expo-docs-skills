---
name: docs-ja-sync
version: 0.2.0
description: Detect and apply drift between the English Expo tutorial (source of truth) and its Japanese translation under pages/ja/tutorial, via a per-page git-SHA watermark. Edits the working tree for a native-reviewer PR. MUST USE when the user says "sync japanese tutorial", "ja drift", or "/docs-ja-sync".
argument-hint: "[path-to-expo-docs-checkout]"
allowed-tools: Read, Grep, Glob, Write, Edit, Bash(bash:*), Bash(git:*)
---

# docs-ja-sync

The English tutorial under `pages/tutorial/` is the source of truth; the Japanese mirror under `pages/ja/tutorial/` drifts whenever an English page changes and its translation lags. This skill finds that drift deterministically (a git diff against a per-page watermark), applies the matching Japanese edit, and leaves the result in the working tree so a native reviewer only approves rather than hunts. It never commits.

State lives in `manifest.json`: each page's `syncedFromCommit` is the English commit it was last brought in line with, and detection diffs `syncedFromCommit..HEAD` per page. The model is locale-keyed, so adding `ko`, `zh`, etc. is another block under `locales`, no skill changes.

## Inputs

`$ARGUMENTS` is an optional path to a local expo/docs checkout. Resolution order: `$ARGUMENTS`, then `config.json` next to `manifest.json` (copy `config.example.json`), then `~/Documents/GitHub/expo/docs`. The diff is against `HEAD`, so a stale checkout under-reports: if `HEAD` looks old, tell the user to `git pull` first; never pull for them.

## When NOT to use

- Translating a brand-new page from scratch: that is `docs-ja-translator`, one page per run. This skill *reports* new pages (`NEW_EN`) and hands them off only on explicit opt-in.
- UI chrome strings in `messages/*.json`: edit those directly.
- API reference pages generated from JSDoc.
- Committing or opening the PR: out of scope by design (see Safety).

## Requirements

`python3` and `git` on PATH; the docs checkout on an up-to-date `main`.

## Step 1: Detect (deterministic, no judgment)

```sh
bash <skill-dir>/scripts/detect_drift.sh $ARGUMENTS
```

Parse the prefixed lines (full grammar at the top of the script):

| Line | Meaning | Your action |
| --- | --- | --- |
| `HEAD` / `BASELINE` / `WIRING_BASE` | Run header | Sanity check. |
| `DRIFT <locale> <path> <n>` + `LOG` lines | Page changed upstream | The work: apply it (Step 2). |
| `INSYNC <locale> <path>` | Watermark == HEAD | Leave untouched. |
| `NEW_EN <path>` | Untracked English page under `source_root` | Report only; translate on opt-in (Step 3). |
| `ORPHAN_JA <path>` | Translation whose English counterpart is gone | Report; do not guess a fix. |
| `JA_MISSING <locale> <path>` | Tracked page with no target file | Report. |
| `I18N_WIRING <clean\|changed>` | `common/i18n.ts` moved since `wiring_synced_commit` | Reconcile on `changed` (Step 3). |
| `SUMMARY drift=0 …` | Nothing flagged | Report "in sync" and stop. |

## Step 2: Apply each DRIFT page

Read `references/sync-procedure.md` and follow it per page: pull the `syncedFromCommit..HEAD` diff, classify each hunk (prose / code / `@tutinfo` tooltip text / structural / frontmatter), apply the matching Japanese edit, keep code byte-for-byte, run the structural self-check, then bump that page's `syncedFromCommit` to `HEAD` and `syncedAt` to today.

The `@tutinfo` tooltip is the most common drift and the easiest to botch: the code is identical across locales but the tooltip text is translated prose, with backtick-vs-`<CODE>` rules that depend on the container. The reference carries the rule and a worked example (the gestures highlight fix, #46845, which seeds this manifest's first drift).

## Step 3: Handle the rest (report, opt-in only)

- `NEW_EN`: list under "Untranslated English pages." Translate only if asked; then invoke `docs-ja-translator` once per page (it also wires `i18n.ts`). If a sub-track is intentionally English-only, add its prefix to `ignore_new_en` in the manifest so it stops nagging.
- `ORPHAN_JA`: the English page was removed or renamed. Flag for a human to delete or re-point the translation and its `i18n.ts` entries.
- `I18N_WIRING changed`: read the `common/i18n.ts` diff. If new tutorial paths were added to `PATHS_WITH_JAPANESE` / `EXPO_TUTORIAL_PATHS` / `JA_SIDEBAR_TITLES`, ensure the corresponding pages are tracked and translated; once reconciled, bump `wiring_synced_commit`.

## Step 4: Report

Print a compact summary the user can paste into a PR description:

```
docs-ja-sync: <YYYY-MM-DD>  (docs HEAD <shortsha>)

Synced (ja):
  - pages/tutorial/gestures.mdx  <- f0700472ff7 (Fix missing highlight annotations #46845)
    applied: prettier-ignore + 3 @tutinfo annotations (tooltip text translated)

In sync: 11 pages
Untranslated EN (out of scope unless flagged): build-with-ai/ (7), eas/ (13)
Orphaned ja: none
i18n wiring: clean

Needs native-reviewer eyes: <terms/sentences flagged, or "none">
Manifest watermarks bumped for the synced pages above.
```

## Safety

- Writes only the drifted `pages/ja/...` edits, the `manifest.json` watermark bumps, and (on opt-in) `common/i18n.ts`. In-sync pages are never touched, so reviewer-approved wording survives. Code stays byte-identical across locales: the skill translates prose, `@tutinfo` tooltip text, and allowlisted JSX props only.
- Every translation still needs a native Japanese reader before shipping. Flag uncertain terms in the report rather than guessing; feed corrections back into `docs-ja-translator`'s `japanese-style.md` so the next run inherits them.
- Git is the user's: this skill never runs `git add`, `commit`, `push`, or opens PRs. It stages working-tree edits; the user reviews, commits on a branch, and opens the PR.
