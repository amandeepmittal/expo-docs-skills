---
name: screenshot-audit
description: Check whether Expo docs screenshots still match the live Expo dashboard (advisory only, never edits docs). MUST USE when the user says "screenshot audit", "check docs screenshots", "are the docs screenshots outdated", "screenshot drift", or "/screenshot-audit". Takes a docs section (e.g. accounts, billing).
license: MIT
metadata:
  author: amandeepmittal
  version: "0.1.0"
---

# screenshot-audit

Flags Expo docs screenshots that no longer match the live Expo dashboard. The capture is deterministic Playwright; the only probabilistic step is one constrained visual comparison per screenshot, and it only advises (see Safety).

## When NOT to use

- Screenshots that are not of the Expo dashboard (code editor, terminal, simulator, the user's own app). There is no stable product surface to compare against.
- Sections with no `baselines/<section>.json` yet. List that directory for current coverage.

## Requirements

- `bun`, and Playwright installed in this skill dir: `bun install && bunx playwright install chromium`.
- `config.json` in the skill dir (copy `config.example.json`): your Expo `account`, `project`, `org`, and the local `docs_repo` path. Gitignored; the capture script reads it to fill URL placeholders.
- A Playwright auth session saved once by hand:
  `bunx playwright open --save-storage=/tmp/expo-storage.json https://expo.dev` (log in, then close the window to save it).
- Staff-gated sections also need Expo **staff mode** in the same session (see Workflow step 0).

## Inputs

- A docs section name, which selects `baselines/<section>.json`.
- The Expo docs repo path, to resolve each entry's `doc_image` (`<expo/docs>/<doc_image>`). Default: `docs_repo` from `config.json`.

## Workflow

### 0. Staff-gated screens first (if the section has any)

If the baseline has entries with `staff_mode` in `requires` (e.g. audit-logs), they need Expo staff mode, which **expires quickly**. Before anything else, RUN this command yourself (Bash tool, long timeout, it blocks until the user closes the window). It pops open a Playwright browser window already logged in (load+save), so the user only re-enables staff mode:

```sh
bunx playwright open --load-storage=/tmp/expo-storage.json --save-storage=/tmp/expo-storage.json https://expo.dev
# first time only (no saved session yet): drop --load-storage
```

Tell the user: in the window that just opened, enable staff mode, then close the window to save the elevated session. You cannot toggle staff mode for them. When the command returns (window closed), capture the staff entries immediately (they sort first automatically; `--requires` targets only them):

```sh
bun <skill-dir>/scripts/capture.ts <skill-dir>/baselines/<section>.json --auth=/tmp/expo-storage.json --requires=staff_mode --out=out/live
```

Do this promptly so the elevation has not expired. If a staff entry still captures a "No access / enable staff mode" page, the session was not elevated, ask the user to redo this step. Then continue.

### 1. Capture live screens

```sh
bun <skill-dir>/scripts/capture.ts <skill-dir>/baselines/<section>.json --auth=/tmp/expo-storage.json --out=out/live
```

Read the prefixed output lines:

- `CAPTURED <id> <path>` — a live PNG was written. **Compare these.**
- `SKIPPED <id> out-of-scope` — `in_scope=false` in the baseline. Report, do not compare.
- `NEEDS_REACH <id>` — the screen needs interaction the script can't do yet (the entry has a natural-language `reach` but no machine-readable `clicks`). Flag for a human or add `clicks` during the attended pass.
- `GATED <id> org` — needs a second account or real org data; flag for a human. (`step_up` and `enterprise_plan` entries are attempted, since the saved session may be elevated; if one captures a step-up or upgrade page instead, ask the user to unlock it and re-run with `--only=<id>`.)
- `ERROR <id> <message>` — capture failed (often a login page: the storageState expired; re-save it).

### 2. Compare each captured screenshot

For every `CAPTURED` entry, read both images and judge freshness:

- DOC IMAGE (read first): `<expo/docs>/<doc_image>` from the baseline entry. This is the PUBLISHED screenshot, which may be outdated.
- LIVE CAPTURE (read second): the `out/live/<id>.png` just written (same theme as the doc image, on purpose). This is the CURRENT dashboard, the source of truth.

Decide whether the DOC IMAGE still faithfully represents the live screen. Because the theme is matched, a difference in a control's color, shape, fill, or button style is a REAL design change, not a dark-vs-light artifact.

State `what_changed` strictly in the DOC → LIVE direction: what the live screen shows now that the doc image does not, and what the doc shows that live no longer does. Never reverse it (the doc is the old one). Example: "doc shows only a Name field with a blue Create button; live now adds Slug, Avatar, and Invite-members fields and a black Create button."

**Ignore (NOT drift):**
- Sample or account data (names, emails, timestamps, counts, table rows, plan values)
- Account-type wording: a doc image shot on an Organization account vs a live Personal account (e.g. "organization's username" vs "account's username", or "Organization" vs "Personal account"). Both are valid.
- Annotations on the doc image (red boxes, arrows, highlights)
- Cropping or surrounding page chrome (the doc image may be a tight crop of one panel)

**Treat as drift (the DOC IMAGE is stale):**
- Renamed, removed, moved, or added labels, buttons, menu items, headings, or fields
- Restyled controls: a control's color, shape, fill, or style changed (e.g. a blue pill button is now black), since the doc reflects the old design
- Layout or structure changes: sections reordered or regrouped, a panel moved into a "Danger zone", new or removed rows/columns/section headers
- A screen, panel, or flow that no longer exists or is materially restructured

Return one JSON object per screenshot, nothing else:

```json
{ "id": "<screenshot id>", "verdict": "current | stale | unsure", "what_changed": "<one sentence, DOC -> LIVE direction; empty if current>", "confidence": 0.0 }
```

Use "unsure" only when the capture is incomplete, the wrong screen, or you genuinely cannot tell. When unsure, never guess.

### 3. Report

Print a table: `id`, `verdict`, `what_changed`, plus the source `file:line` (the baseline `source`). Then list everything not compared (`SKIPPED`, `NEEDS_REACH`, `GATED`, `ERROR`) so coverage is honest. For each `stale`, the action is: a human recaptures that screenshot (keeping its crop and annotations), then updates the doc.

## Safety

The skill never edits docs and never recaptures doc images itself. Dashboard navigation is read-only. Opening a form, modal, or drawer to VIEW it is allowed (e.g. the create-organization form page, an audit-log details drawer). NEVER submit, create, delete, convert, confirm, or click a destructive button. `clicks` selectors must only reveal a view (open a dropdown / drawer / form), never a submit / Create / Delete / Confirm control. Stay on expo.dev.

## Notes

- `test_url`, `reach`, and `selector` in the baselines are doc-derived guesses until confirmed in an attended live pass. Setting a stable `selector` crops the capture to the panel for a cleaner comparison; adding `clicks` (machine-readable reach) lets `NEEDS_REACH` entries capture automatically.
