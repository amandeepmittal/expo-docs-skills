# GA4 pull recipe (validated 2026-06-16)

Exact browser steps for `docs-ja-metrics`. All actions run through the claude-in-chrome MCP against the user's logged-in tabs. Substitute `<path_filter>` with `config.path_filter` (default `/ja/`) and `<tab>` with `config.sheet.tab`.

## Facts confirmed on the property

- Property and account must match `config.ga4.property_name` and `config.ga4.account`. The `property_url` in config opens the property directly.
- JA pages live at `/ja/tutorial/...`. The `/ja/` filter catches them.
- Votes are GA4 events named `page_vote_up` and `page_vote_down`. They carry page context, so a page-path filter scopes them per locale.
- The Sheets API is blocked by Workspace policy, so writes happen in the Sheet UI tab. Typing tab characters into a cell does not split into columns; the `Tab` key moves across, newlines move down.

## 0. Open and verify (do not skip)

1. Open `config.ga4.property_url` in a new tab. Wait for the SPA to load.
2. Read the property name in the top bar and the account avatar. The header must read `config.ga4.property_name`; the active account must be `config.ga4.login_email` (click the avatar to confirm the email). On any mismatch, stop and tell the user. Do not switch property silently.

## 1. Date ranges

Top-right date picker. Never "today" (GA4 lags 24–48h); the latest finalized day is yesterday.

- **Snapshot:** the `Last 28 days` preset (`config.snapshot_window`).
- **A specific week (Mon–Sun):** click the date label, then `Custom`, then click the start day and the end day on the calendar, then `Apply`. The current week runs Mon–yesterday.
- **URL shortcut (reliable):** a custom range can be set straight from the explorer URL params — append `&_u.date00=YYYYMMDD&_u.date01=YYYYMMDD` (e.g. `_u.date00=20260608&_u.date01=20260614` for Jun 8–14). Keep `filterTerm=%252Fja%252F` in the params to preserve the table filter.

## 2. Traffic (Pages and screens)

1. Reports > search "Pages and screens" > open `Pages and screens: Page path and screen class`.
2. In the table search box, type `<path_filter>` and Enter. The table and over-time chart both scope to `/ja/`.
3. **Snapshot (28d):** read every row — page path, Views, Active users, Average engagement time — and the Total row. Engagement is stored in the sheet as **seconds** (`1m 46s` → `106`, `26m 01s` → `1561`).
4. **Weekly:** set the range to each target week (section 1) and read the `/ja/` **Total Views**. That is `ja_views` for that `week_ending`. Sanity check: the per-week views should reconcile with the 28d snapshot total over the same days.

## 3. Votes (Events, page-path filtered)

1. Reports > Engagement > Events.
2. `Add filter` > dimension `Page path and screen class`, match `contains`, value `<path_filter>`, Apply.
3. With both the `/ja/` filter and a `vote` table-search active, an empty table ("No data available") means **0** `/ja/` votes — record 0, never the site-wide number.
4. For the context note, read site-wide `page_vote_up` / `page_vote_down` separately (the `vote` table-search with the `/ja/` filter removed).
5. Record votes for the snapshot window and each target week. Absent from the filtered list = 0.

## 4. Write the Sheet

Open `https://docs.google.com/spreadsheets/d/<config.sheet.id>/edit`. The tab `<tab>` holds two stacked sections; locate each by its header cell so row counts can grow. Navigate with the Name box (type a cell like `A21`, Enter); a multi-line `type` fills a column downward; the `Tab` key moves across a row.

### 4a. Snapshot section (header `config.sheet.snapshot_header`, e.g. `page_path`)

Columns: `page_path, views, active_users, avg_engagement` (seconds), `votes_up, votes_down`.

1. The data rows sit directly under the header. Compare their count to the new page count `N`.
2. If `N` exceeds the existing data rows, **insert** the difference so the note and the weekly section below shift down intact: Name box the rows to grow into (e.g. `7:11`), then `Insert > Rows > Insert k rows above`. Sheets re-points the chart automatically.
3. Clear the block (`A<first>:F<last>`, Delete) to avoid stale rows and autocomplete, then fill column by column: Name box `A<first>`, Enter, multi-line `type` the paths; repeat for each numeric column. Update the title cell and the site-wide-votes note line to the new window.

### 4b. Weekly section (header `config.sheet.weekly_header`, e.g. `week_ending`)

Columns: `week_ending, ja_views, ja_votes_up, ja_votes_down`.

1. **Upsert** each target week: if a row with that `week_ending` exists, Name box its `ja_views` cell and overwrite (re-finalizing the previous week is the point — its first value is usually undercounted). Otherwise Name box the first empty row under the last week and type across with `Tab` (`2026-06-21` Tab `12` Tab `0` Tab `0`).
2. The "Weekly /ja/ page views" chart reads this block with an open-ended range, so appended rows appear automatically (confirmed). If a new week ever fails to show, widen the chart's data range to the new last row.

## 5. Report

Screenshot the weekly table + chart and the snapshot, then print the report block from SKILL.md filled with the numbers you read.
