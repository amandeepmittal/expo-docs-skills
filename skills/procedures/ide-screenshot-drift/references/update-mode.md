# Update mode and the opt-in Android Studio updater

Read this file only when its trigger in SKILL.md has fired: the updater needs an explicit user request in this session (step 1 STALE-gate exception), and update mode needs that kind of request plus a completed report from this session (step 5 preconditions). Never start either because a verdict says drift.

## Opt-in Android Studio updater (step 1 exception)

Explicit user request only, never an automatic STALE response:

```sh
bash <skill-dir>/scripts/update_android_studio.sh
```

Run it with the maximum Bash timeout (600000 ms): the DMG is roughly 1.5-2 GB. The download resumes (`curl -C -`) if a run times out, so just re-run the same command. The script verifies the published sha256 checksum, quits a running Android Studio, then does a **clean replace**: the old app, IDE config/caches/logs, `~/.android` (AVDs and adb keys), and `~/Library/Android` (the SDK) all go to Trash (recoverable, never `rm`), the new app is installed, and it prints `UPDATED <version>`. Consequences to surface to the user: connected Android devices will re-prompt USB-debugging authorization, AVDs are gone (recoverable from Trash), and the first launch must re-download the SDK.

The clean replace means the first launch shows the **Android Studio Setup Wizard** (consent dialog, then Welcome, Install Type, Verify Settings, License Agreement), the fresh-machine state the docs describe. Since 2026.1.1 the Standard path never shows an "SDK Components Setup" screen; that screen only exists on the Custom path. If this run follows the updater: launch Android Studio, capture the first-launch-wizard targets BEFORE clicking past them, then complete the wizard on the Standard path (letting it install the SDK is part of the user's update request) so the remaining Android targets reflect a post-setup machine.

## Update mode procedure (step 5)

Scope rules:

- Fix only what the report flagged (drift and needs-review targets). Auto-pass targets are not touched, even if a fresher capture exists.
- Before rewriting a content claim (such as a required SDK version), verify it against source truth (for example, `compileSdkVersion` defaults in the expo monorepo gradle plugin). A stale screenshot does not prove stale prose.
- When preflight reports `SDK_CLAIM_GATE DRIFT`, rewrite the required-SDK prose in both tab variants to the `REQUIRED_SDK` value. Take the Android version number and codename from the live SDK Platforms list in Settings, where the group header names both (for example "Android 16.0 (Baklava)" for API 36); do not hardcode or recall a mapping. Then re-shoot the `as-sdk-platforms` capture with the new platform's rows checked. Never bump this prose because a newer platform merely exists; only `REQUIRED_SDK` moves it.
- Screenshot replacement: same filename when the documented screen still exists (in-place swap, no MDX change); new descriptive filename when the documented screen itself changed (update `src` and `alt`, `trash` the retired image after confirming nothing else references it).
- Text edits stay minimal and follow the `docs-writing-style` skill (invoke it before editing).
- Update `manifest.json` claims and recipes in the same change so the next audit run judges against the new docs text, not the old.
- Re-captures for update mode follow the same navigation safety rules as SKILL.md step 2. To re-shoot a first-launch-wizard target on a configured machine: quit Android Studio, `trash` `~/Library/Application Support/Google/AndroidStudio<version>/options/androidStudioFirstRun.xml`, relaunch. The wizard reappears (a "Welcome back" variant; Install Type and later steps render identically to a true first run). Complete it on the Standard path afterward so the sentinel is rewritten; with the SDK present it downloads nothing.
- Last step, after all image swaps and text edits: if this run added or replaced any PNG screenshots in the docs repo, invoke the `docs-webp` skill on the touched partial(s) to convert them to lossy WebP (it rewrites `src` to `.webp` and trashes the PNGs). Convert only the screenshots this run generated; leave the page's other PNGs (for example `windows-*.png`) alone unless the user asks. Then update the matching `doc_image` paths in `manifest.json` to the `.webp` filenames so the next audit reads the right files.
- Never run `git add`, `git commit`, or `git push`. End by listing the changed files and suggesting the branch + commit commands for the user to run.
