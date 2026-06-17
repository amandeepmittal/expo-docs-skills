---
name: docs-build-with-ai-metrics
version: 0.1.0
description: Pull weekly traffic and vote metrics for the Expo "Build with AI" tutorial (/tutorial/build-with-ai/) from the docs.expo.dev GA4 property into the expo-tutorial-ai tab of the shared Google Sheet: upsert the current and previous week in a weekly trend (its chart auto-extends) and refresh a 28-day per-page snapshot. Browser-driven because Expo's Workspace blocks GA4/Sheets OAuth apps, so it runs interactively, never headless. MUST USE when the user says "build with ai metrics", "build-with-ai metrics", "ai tutorial metrics", "ai tutorial analytics", or "/docs-build-with-ai-metrics".
argument-hint: "[week_ending date e.g. 2026-06-21, else current + previous week]"
---

# docs-build-with-ai-metrics

Pulls traffic and vote counts for the Expo "Build with AI" tutorial (`/tutorial/build-with-ai/`, 7 pages under `pages/tutorial/build-with-ai/`, entry page `/tutorial/build-with-ai/introduction/`) from the `docs.expo.dev` GA4 property and writes them into the `expo-tutorial-ai` tab of the configured Google Sheet (`config.sheet.name`, tab `config.sheet.tab`): a **weekly trend** the user charts (one row per Sunday-ending week, chart auto-extends) plus a refreshed **28-day per-page snapshot**. There is no daily row: the weekly trend is the time series, and a line chart over it does the rollup.

This is the sibling of `docs-ja-metrics`. Same property, same workbook, same two-section layout and write mechanics: only the path filter (`/tutorial/build-with-ai`) and the tab (`expo-tutorial-ai`) differ. If you change the pull or write mechanics here, mirror them there.

It is browser-driven out of necessity, not preference. The GA-authorized account sits under a Google Workspace policy that blocks unapproved OAuth apps: the GA4 Reports Builder add-on, the GA4 Data API, and the Sheets API all return `Error 400: access_not_configured`. So there is no headless or API path. The skill drives the user's already-authenticated GA4 and Sheets browser tabs through the claude-in-chrome MCP instead. The consequence is a hard limit: it **cannot** run as a cron, cloud routine, or background job. It needs an interactive session with Chrome logged in as the GA-authorized account.

Scope is `/tutorial/build-with-ai/` only. Votes are real GA4 events (`page_vote_up`, `page_vote_down`); traffic is the Pages and screens report filtered to the section path. The section is new (created mid-June 2026), so expect small or near-zero weeks at first.

## When NOT to use

- Headless, cloud, or scheduled runs: impossible here (no session, API blocked). Run it interactively or not at all.
- The Japanese tutorial or any locale: that is `docs-ja-metrics` (tab `ja`, path `/ja/`). This skill writes only the `expo-tutorial-ai` tab.
- Other docs sections: this is scoped to `/tutorial/build-with-ai/`. For another section, copy the config with a new `path_filter`, `section`, and `tab`.
- Pushing to Notion: that is the separate `ga4-metrics` skill (manual CSV to Notion). This one writes the Sheet via the browser.
- Ad-hoc one-off exploration: just use the GA4 UI directly.

## Requirements

- **claude-in-chrome MCP.** Load the core set in one ToolSearch call: `select:mcp__claude-in-chrome__tabs_context_mcp,mcp__claude-in-chrome__navigate,mcp__claude-in-chrome__computer,mcp__claude-in-chrome__get_page_text,mcp__claude-in-chrome__browser_batch`.
- **Chrome logged in** as the account in `config.ga4.login_email`, with access to the GA4 property and edit rights on the Sheet.
- **`config.json`** next to this file (copy `config.example.json` and fill in your values). It is gitignored, so your email, sheet ID, and GA property IDs stay local and never get committed.

## Config

All account-specific and target values live in `config.json` (copy `config.example.json` on first run; `config.json` is gitignored). Never hardcode them into this file or the reference. Keys: `section`, `path_filter`, `ga4` (`property_name`, `account`, `login_email`, `property_url`), `sheet` (`name`, `id`, `tab`, `snapshot_header`, `weekly_header`), `snapshot_window`, `week_ending_day`. The shared workbook holds one tab per scope; this skill owns the `config.sheet.tab` tab only. Inside that tab are two stacked sections, each located by its header cell (`snapshot_header`, `weekly_header`) so row counts can grow without breaking.

## Workflow

Exact click-paths, filter strings, and Sheet-write mechanics live in `references/ga4-pull-recipe.md`. Follow it; the steps below are the decision spine.

1. **Open and verify.** Read `config.json`. Load the tools, open `config.ga4.property_url`. Confirm the property header reads `config.ga4.property_name` and the signed-in account is `config.ga4.login_email`. Then open the workbook and confirm a tab named `config.sheet.tab` exists. On any mismatch (wrong property, wrong account, or missing tab), **stop** and tell the user; for a missing tab, list the tab names you see so they can rename the tab to `config.sheet.tab` or fix the config. Pulling the wrong property or writing the wrong tab is the main failure mode.

2. **Pick the weeks.** Weeks are Monday to Sunday, labelled by their `week_ending` Sunday (`config.week_ending_day`). By default recompute the **two most recent weeks**: the current week (to date) and the previous (now-complete) week. Re-finalizing the previous week matters: GA4 lags 24 to 48h, so a week written mid-finalization is undercounted. **Re-pull it; do not trust the value already in the sheet.** If `$ARGUMENTS` names a `week_ending` date, do that week instead. Never include "today"; the current week runs Monday to yesterday.

3. **Pull the 28-day snapshot.** Pages and screens report, `config.snapshot_window` (Last 28 days), table search `config.path_filter` (`/tutorial/build-with-ai`). Read each page's path, views, active users, and average engagement, plus the Total row.

4. **Pull weekly traffic.** For each target week, set the date range to that week (Mon to Sun, or Mon to yesterday for the current week) and read the section **Total Views**. That is `views` for that `week_ending`.

5. **Pull votes.** Events report, add filter `Page path and screen class contains <path_filter>`, read `page_vote_up` / `page_vote_down` for the snapshot window and each target week. A vote event missing from the filtered list means 0 (expected while section traffic is low). Never substitute the site-wide vote total; capture site-wide only as the context note.

6. **Write the Sheet** (tab `config.sheet.tab`). See the recipe for exact mechanics, including how to scaffold the two sections if the tab is empty on first run.
   - **Snapshot section** (find the `config.sheet.snapshot_header` row): refresh the per-page rows in place. If the new page count exceeds the existing rows, **insert** rows so the note and the weekly section below shift down intact (Sheets re-points the chart automatically); never overwrite the weekly section. Update the title and site-wide-votes note line to the new window.
   - **Weekly section** (find the `config.sheet.weekly_header` row): for each target week, **upsert** by `week_ending` (update the matching row, or append below the last week). The chart auto-extends to new rows. A partial current week is noted in the report, not the cell.

7. **Verify and report.** Screenshot the weekly table + chart and the snapshot, then print the report below.

## Idempotency and cadence

One row per `week_ending` in the weekly section; re-running upserts that week rather than duplicating it. Each run also re-finalizes the previous week, so a value first written mid-week converges to the finalized number on the next run (the failure mode this guards against: a week pulled before GA4 settled and left undercounted). Weekly is the cadence; at current section volume most weeks are small. The chart over the weekly section visualizes the trend and auto-extends as weeks are appended.

## Safety

- GA4 is read-only. In the Sheet, only refresh the snapshot section and upsert weekly rows in `config.sheet.tab`. **Never touch the `ja` tab or any other tab or section**, never change sharing or permissions, never delete.
- The step 1 account, property, and tab check is mandatory; stop on any mismatch.
- Account-specific values live only in `config.json` (gitignored). Do not write the email, sheet ID, or GA property IDs into this file, the reference, or the report.
- No git, no Notion, no external sends. Data stays in the user's own Sheet.
- Report numbers exactly as read. Do not pad, infer, or reconstruct splits you did not pull (for example, never report a site-wide vote count as the section one).

## Report

```
docs-build-with-ai-metrics: <YYYY-MM-DD>  (property <config.ga4.property_name>)

/tutorial/build-with-ai/ 28d snapshot:  <views> views, <users> users, <n> pages
  top: /tutorial/build-with-ai/<page>  <views>
weekly (upserted):
  <week_ending>  <views> views   (votes up/down <u>/<d>)
  <week_ending>  <views> views   (partial: Mon to <yesterday>)
votes site-wide (28d, context only): <up>/<down>

Sheet: <config.sheet.name> / <config.sheet.tab>: snapshot refreshed, weekly upserted, chart extended.
```
