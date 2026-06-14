---
name: docs-ja-sync
description: Detect and apply drift between the English Expo tutorial (the source of truth) and its Japanese (ja) translation under pages/ja/tutorial, using a per-page git-SHA watermark. Detection is deterministic; edits are applied to the working tree and left for a native-reviewer PR (never committed). Built to run weekly (e.g. Mondays). MUST USE when the user says "docs ja sync", "sync japanese tutorial", "ja drift", "update the japanese translation", or "/docs-ja-sync".
license: MIT
metadata:
  author: amandeepmittal
  version: "0.1.0"
allowed-tools: Read, Grep, Glob, Bash, Write, Edit
---

# docs-ja-sync

The English tutorial under `pages/tutorial/` is the source of truth. The Japanese
mirror under `pages/ja/tutorial/` drifts whenever an English page changes and the
translation is not updated. This skill finds that drift with a deterministic git
diff against a per-page watermark, then applies the matching Japanese edit so a
reviewer only has to approve, not hunt.

State lives in `manifest.json`: for each translated page, `syncedFromCommit` is
the English commit it was last brought in line with. Detection diffs
`syncedFromCommit..HEAD` per page. The model is locale-keyed, so adding `ko`,
`zh`, etc. later is another block under `locales`, no skill changes.

## When NOT to use

- Translating a brand-new page from scratch: that is `docs-ja-translator`, one page per run. This skill *reports* new pages (`NEW_EN`) and only hands them off on explicit opt-in.
- UI chrome strings in `messages/*.json`: edit those directly.
- API reference pages generated from JSDoc.
- Committing or opening the PR: out of scope by design (see Safety).

## Requirements

- `config.json` next to `manifest.json` (copy `config.example.json`) with `docs_repo` pointing at the local `expo/docs` checkout. Falls back to `~/Documents/GitHub/expo/docs`.
- `python3` and `git` on PATH.
- The docs checkout on an up-to-date `main`. The watermark diff is against `HEAD`, so a stale checkout under-reports. Tell the user to `git pull` first if `HEAD` looks old; never pull for them.

## Workflow

### 1. Preflight

Resolve `docs_repo`. Confirm `git -C <docs_repo> status` is on `main` and current
(mention `git pull` if not). Read `manifest.json`.

### 2. Detect (deterministic, no judgment)

```sh
bash <skill-dir>/scripts/detect_drift.sh
```

Parse the prefixed lines (grammar documented at the top of the script):

- `HEAD <sha> <date>` and `BASELINE` / `WIRING_BASE`: the run header.
- `DRIFT <locale> <path> <n>` plus its `LOG` lines: a page changed upstream. These are the work.
- `INSYNC <locale> <path>`: watermark matches `HEAD`. Leave untouched.
- `NEW_EN <path>`: an English page under `source_root` that nothing translates (sub-tracks like `eas/`, `build-with-ai/`). Report only.
- `ORPHAN_JA <path>`: a translation whose English counterpart is gone (deleted/renamed). Report; do not guess a fix.
- `JA_MISSING <locale> <path>`: tracked page with no target file. Report.
- `I18N_WIRING <clean|changed>`: whether `common/i18n.ts` moved since `wiring_synced_commit`.

If `SUMMARY drift=0` and nothing else flagged, report "in sync" and stop.

### 3. Apply each DRIFT page

Read `references/sync-procedure.md` and follow it per page: pull the
`syncedFromCommit..HEAD` diff, classify each hunk (prose vs code vs `@tutinfo`
tooltip text vs structural vs frontmatter), apply the matching Japanese edit,
preserve code byte-for-byte, run the structural self-check, then bump that page's
`syncedFromCommit` to `HEAD` and `syncedAt` to today.

The `@tutinfo` tooltip case is the most common drift and the easy one to botch:
the code is identical across locales, but the tooltip text is translated prose
and must follow the target file's own conventions. The worked example in the
reference is the gestures highlight fix (#46845), which is the first real drift
this manifest will surface.

### 4. Handle the rest (report, opt-in only)

- `NEW_EN`: list under "Untranslated English pages." Translate only if the user asks; then invoke `docs-ja-translator` once per page (it also wires `i18n.ts`). If a sub-track is intentionally English-only, add its prefix to `ignore_new_en` in the manifest so it stops nagging.
- `ORPHAN_JA`: the English page was removed or renamed. Flag for a human to delete or re-point the translation and its `i18n.ts` entries.
- `I18N_WIRING changed`: read the `common/i18n.ts` diff. If new tutorial paths were added to `PATHS_WITH_JAPANESE` / `EXPO_TUTORIAL_PATHS` / `JA_SIDEBAR_TITLES`, make sure the corresponding pages are tracked and translated; once reconciled, bump `wiring_synced_commit`.

### 5. Report

Print a compact summary the user can paste into a PR description:

```
docs-ja-sync — <YYYY-MM-DD>  (docs HEAD <shortsha>)

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

- The only writes are the `pages/ja/...` edits for drifted pages, the `manifest.json` watermark bumps, and (on opt-in) `common/i18n.ts`. In-sync pages are never touched, so reviewer-approved wording is preserved.
- Code blocks are byte-identical across locales. The skill translates prose, `@tutinfo` tooltip text, and the allowlisted JSX props only; it must not alter code.
- Every translation still needs a native Japanese reader before shipping. Flag uncertain terms in the report rather than guessing; feed corrections back into `docs-ja-translator`'s `japanese-style.md` so the next run inherits them.
- Git operations are always left to the user: this skill does not run `git add`, `commit`, `push`, or open PRs. It stages edits in the working tree; the user reviews, commits on a branch, and opens the PR.
