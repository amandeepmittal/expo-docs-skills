---
name: ide-screenshot-drift
description: Check whether Expo docs environment-setup screenshots (Android Studio, Xcode) still match the locally installed IDEs (advisory report; docs edits and installs only on explicit opt-in; macOS only). MUST USE when the user says "ide screenshot drift", "check env setup screenshots", "are the android studio screenshots outdated", "xcode screenshot drift", or "/ide-screenshot-drift".
license: MIT
metadata:
  author: amandeepmittal
  version: "0.2.0"
---

# ide-screenshot-drift

Flags Expo docs screenshots of Android Studio and Xcode that no longer match the IDEs as actually installed. The screenshots live in shared instruction partials rendered on several pages (see `pages` in the manifest), so one fix propagates to all of them. Capture runs against the real IDE on this machine; judging uses the four-safeguard LLM-as-judge pattern (structured output, 3-run ensemble, auto-pass / review / drift zones, cost cap), the long-term strategy here because native IDEs have no selectors Expo controls. The deliverable is a local markdown report; the docs repo is edited only in opt-in update mode (step 5).

## When NOT to use

- Windows-specific screenshots (`windows-*.png`): macOS only, always reported as skipped.
- First-launch wizard screens (`reachability: first-launch-wizard` in the manifest): capturable on the first launch right after the opt-in clean updater has run, or by re-triggering the wizard (see update mode). On a configured machine without either, reported as not-capturable, never faked.
- Dashboard or web screenshots: use `screenshot-audit`.
- Docs edits without a completed drift report from this session: run the audit first; update mode applies report findings, it does not freelance rewrites.

## Requirements

- macOS (the version script hard-fails elsewhere).
- `python3` on PATH (ships with Xcode Command Line Tools).
- `config.json` in the skill dir (copy `config.example.json`) with `docs_repo` pointing at the local expo/docs checkout. If missing, try `~/Documents/GitHub/expo/docs`, then ask the user.
- computer-use MCP tools for IDE navigation (load in bulk via ToolSearch `{ query: "computer-use", max_results: 30 }`, then `request_access` for Android Studio and/or Xcode).
- Terminal needs Accessibility + Screen Recording permissions for `scripts/capture_window.sh` (it uses System Events window bounds + `screencapture`, which also sidesteps CleanShot X owning the screenshot hotkeys).

## Workflow

### 1. Preflight (deterministic, no judgment)

Run:

```sh
bash <skill-dir>/scripts/check_versions.sh
```

Parse the prefixed lines. Rules, in order:

- `PLATFORM FAIL`: stop entirely. This skill is macOS only.
- Per IDE, read `AS_GATE` / `XCODE_GATE`:
  - `PASS`: that IDE may be captured.
  - `STALE`: **hard gate.** A newer stable version exists. Do NOT capture that IDE (its UI may not represent what the docs should show). Default: tell the user the installed and latest versions and ask them to update the IDE themselves, then re-run. Exception: if the user explicitly asks the skill to update Android Studio for them (in this session, in their own words), read `references/update-mode.md` and run the opt-in updater it describes, then re-run `check_versions.sh` and continue. There is no updater for Xcode; it is always a manual App Store/developer-site update. Continue with the other IDE if it passed.
  - `MISSING`: same as STALE but the ask is to install it. Continue with the other IDE.
  - `UNKNOWN` (network failure fetching the latest-version feed): proceed with capture but mark every verdict for that IDE as `version-unverified` in the report.

Resolve `docs_repo` (config.json, then the default path, then ask). Then check manifest drift:

```sh
bash <skill-dir>/scripts/extract_doc_targets.sh <docs_repo>
```

Diff the `TARGET` lines against `manifest.json`. Images in the docs but not the manifest are reported as **unmanifested** (do not invent a navigation recipe mid-run; they become manifest additions later). Manifest entries no longer in the docs are reported as **removed from docs** and skipped.

The script also prints `CONSUMER <partial> <path>` lines: the pages outside the instructions directory that import each partial. Diff these against the manifest's `pages` array; a new consumer page is a report note (the audit already covers it, since the page renders the same partials), and a vanished one means that page stopped using the shared instructions and may now carry its own drifting copies. List the consumer pages in the report's run header so the reader knows everywhere a fix propagates. Wrapper partials inside the instructions directory (the lowercase ones the get-started scene composes) are plumbing for get-started itself, and the script intentionally does not list them.

Then check the required-SDK prose claim:

```sh
bash <skill-dir>/scripts/check_required_sdk.sh <docs_repo>
```

This compares the API level the docs say is "required to compile a React Native app" against the latest Expo SDK row of the docs' own compatibility table: `<docs_repo>/ui/components/SDKTables/sdk-versions.json`, the data rendered at `/versions/latest/#support-for-android-and-ios-versions`. That table is the canonical statement of `compileSdkVersion` (and `xcode`) per SDK: always read the first `sdkVersions` row of the JSON directly, never a localhost dev server and never a number remembered from a previous run. The gradle plugin fallback in the expo monorepo is used only when the table is missing; its bare numeric default is NOT authoritative and has lagged the published table before. The oracle is deliberately not "the newest platform Android Studio offers": the docs step exists precisely because the wizard installs the latest platform while React Native compiles against a specific one. `SDK_CLAIM_GATE DRIFT` is a deterministic finding for the report (no judges needed); `REQUIRED_XCODE` feeds the iOS instructions counterpart the same way.

### 2. Capture (computer-use navigation, script capture)

For each manifest target whose IDE passed the gate and whose `reachability` is `reachable`:

1. Follow the target's `recipe` using computer-use (open app, navigate menus/dialogs).
2. Capture with the script, not with computer-use screenshots:
   ```sh
   bash <skill-dir>/scripts/capture_window.sh "Android Studio" <skill-dir>/out/<YYYY-MM-DD>/<id>.png studio
   ```
   (App name `"Xcode"` for Xcode targets, no third argument.) The third argument is the System Events process name when it differs from the app name: Android Studio registers as `studio`.
3. If a recipe step cannot be completed because the documented control does not exist (no "More Actions", no "Locations" tab), **that is a finding, not an error**: capture whatever screen you reached, note exactly which documented step failed and what you observed instead, and feed that to the judges.

Navigation safety (non-negotiable):

- Read-only navigation. Exit settings dialogs with **Cancel** or cmd+w, never Apply/OK.
- Never create, delete, or modify AVDs; never download SDK components or system images (sole exception: completing the first-launch wizard right after a user-requested clean update); never change Xcode's Command Line Tools selection.
- Never click Finish in any wizard.
- Stay inside Android Studio and Xcode. No other apps.

### 3. Judge (probabilistic, safeguarded)

For each captured target, spawn **3 independent subagent judges** (Agent tool, one message, parallel). Each judge prompt must contain:

- The target's `claims` from the manifest (the documented assertions).
- The absolute path to the docs image (`<docs_repo>/<doc_image>`) and to the fresh capture. The judge Reads both images itself.
- The note from capture if a recipe step failed.
- An adversarial framing: "Your job is to refute the assumption that the documentation screenshot is still accurate. Judge only the documented claims. Do not assess undocumented details (theme, window size, cosmetic chrome)."
- A required structured verdict, JSON only:

```json
{
  "observed": "what the live capture actually shows, described concretely",
  "claims": [
    { "claim": "...", "match": "pass | minor_drift | meaningful_drift", "reasoning": "..." }
  ],
  "overall": "pass | minor_drift | meaningful_drift",
  "confidence": 0.0
}
```

Zone rules (Layer 3):

- All 3 judges agree AND min confidence >= 0.7: **auto verdict** (pass or drift, as agreed).
- Any disagreement on `overall`, or any confidence < 0.7: **needs human review**. Trust the disagreement; do not average it away.
- A failed recipe step is at minimum `meaningful_drift` for the navigation claim it broke, regardless of pixels.

Cost (Layer 4): 3 judge calls per target, 9 targets max per full run (~27 calls). If the user scopes the run ("android only"), filter targets by `platform`.

### 4. Report (local, the only deliverable)

Write `ide-screenshot-drift-<YYYY-MM-DD>.md` in the current working directory:

1. **Run header**: date, machine, docs repo path + current git commit (`git -C <docs_repo> rev-parse --short HEAD`), and the consumer pages the audited partials render on (from the `CONSUMER` lines), so the reader knows everywhere a finding and its fix apply.
2. **Version gate**: per IDE, installed vs latest, gate result, and the explicit "install/update yourself, then re-run" ask when gated. Include the `REQUIRED_SDK` / `DOC_SDK` / `SDK_CLAIM_GATE` result here.
3. **Summary table**: target id, doc image, verdict, judge votes (for example 3/3 or 2/1), min confidence, zone (auto-pass / needs-review / drift).
4. **Findings detail**, drift and needs-review only: documented claims, what the judges observed (their `observed` text is the auditable evidence), which claim broke, and the path to the fresh capture so a human can eyeball both.
5. **Skipped**: first-launch wizard targets, Windows images, gated IDE targets, removed-from-docs entries.
6. **Unmanifested targets**: new docs images the manifest does not cover yet.

Plain statements only. No fix recommendations beyond "screenshot and/or step text needs a human look": this skill detects, it does not prescribe rewrites.

### 5. Update mode (opt-in, explicit user request only)

Applies the report's findings to the docs repo. Hard preconditions: a completed report from this session, and the user asking for the update in their own words ("update the doc", "apply the fixes"). Never enter update mode because a verdict says drift. Once the preconditions are met, read `references/update-mode.md` for the full procedure before editing anything.

## Safety

- The report and the captures under `out/` are the only writes, except in update mode (step 5), which requires an explicit user request and edits only the audited partials, their images, and `manifest.json`. Git operations are always left to the user.
- Never installs, updates, or downloads software automatically. The single exception is `scripts/update_android_studio.sh`, run only on an explicit user request in the current session; it is a clean replace (app, config, `~/.android`, SDK), everything goes to Trash (recoverable) rather than being deleted, and checksums are verified. Surface the consequences (device re-auth, SDK re-download) before running it. Xcode updates are always manual.
- Read-only IDE navigation (see step 2). If unsure whether a click mutates state, do not click; mark the target not-captured with the reason.
- Verdicts are advisory. A drift verdict means "a human should look", never "the docs are wrong".
