# expo-docs-skills

Agent skills (slash commands and behaviors) for writing and auditing [Expo documentation](https://github.com/expo/expo/tree/main/docs), for use with Claude Code and Codex.

## Install

1. **Clone this repo.**

2. **Install the TUI deps and launch it from the repo root:**

   ```sh
   cd cli && bun install && cd ..
   bun start
   ```

   The TUI lists each skill by category and stages symlinks into `~/.claude/skills/` and `~/.codex/skills/`. Keys: `c` toggles Claude, `x` toggles Codex, `space` toggles both, `enter` applies.

3. **Claude Code only — grant read access.** Skills load references from this repo, which Claude Code treats as cross-project and prompts for each time. Silence the prompts by adding to `permissions.allow` in `~/.claude/settings.json` (merge, don't replace):

   ```json
   "Read(/absolute/path/to/expo-docs-skills/**)"
   ```

4. **Review skills** need `gh` authenticated with `pull-requests: write` on the target repo.

## Usage

Once a skill is linked, invoke it with a focused prompt or its slash command:

```
/docs-review https://github.com/expo/expo/pull/XXXXX
```

`docs-review` and `docs-boxlink-audit` stage their findings as a **pending** GitHub review (private to your account, never auto-submitted). Open the review URL to edit, then submit or cancel.

## Skills

Skills live at `skills/<category>/<name>/SKILL.md`.

### Authoring

| Skill | What it does |
| --- | --- |
| `docs-writing-style` | Expo's docs writing style: voice, headings, link text, capitalization, glossary. |
| `docs-components` | MDX component reference (Terminal, Tabs, Step, SnackInline, callouts): which to use, what props. |
| `docs-pr` | Write a PR title + description for expo/docs. `--short` outputs only the How section. |
| `docs-ja-translator` | Translate one MDX page to Japanese, mirrored to `pages/ja/<same-path>`. |
| `docs-webp` | Convert PNG screenshots to lossy WebP, rewrite `src`, and trash the PNGs. |

### Review

Each stages a pending GitHub review or a local report. Never edits docs, never submits.

| Skill | What it does |
| --- | --- |
| `docs-review` | Review a docs PR against the style guide and MDX conventions. Public PRs only. |
| `docs-boxlink-audit` | Flag `<BoxLink>` icon vs destination-URL mismatches in a PR. |
| `docs-eas-env-drift` | Diff the docs' built-in EAS env var list against `expo/eas-cli`. Report only. |
| `screenshot-audit` | Compare docs dashboard screenshots against the live Expo dashboard. Advisory only. |

### Procedures

Recurring operational checks. Most diff a local `expo/docs` checkout and edit the working tree; `docs-ja-metrics` instead pulls analytics into a Google Sheet. Each leaves edits and commits to you.

| Skill | What it does |
| --- | --- |
| `docs-upstream-sync` | Run the upstream sync generators (app config schema, Expo Skills, Expo MCP, EAS CLI, and more), gather what changed onto one dated branch, run `pnpm lint`, and hand off to a PR. Never commits. |
| `docs-ja-sync` | Sync the Japanese tutorial mirror to the English source via a per-page git-SHA watermark. |
| `ide-screenshot-drift` | Flag env-setup screenshots (Android Studio, Xcode) that no longer match the installed IDEs. macOS only. |
| `docs-ja-metrics` | Pull `/ja/` docs traffic, referrals, and votes from the docs.expo.dev GA4 property into an i18n metrics Sheet. Targets are config-driven; browser-driven and interactive only. |

### Meta

Skills that operate on this repo itself.

| Skill | What it does |
| --- | --- |
| `skill-quality` | Review a `SKILL.md` against the quality rubric (frontmatter, size, house style, clarity, scope). Advisory report, never edits. Runs `bun .../scripts/lint.ts`. |

## Layout

```
skills/
├── authoring/   docs-writing-style, docs-components, docs-pr, docs-ja-translator, docs-webp
├── review/      docs-review, docs-boxlink-audit, docs-eas-env-drift, screenshot-audit
│                + scripts/post-review.ts   (shared: stages pending GitHub reviews)
├── procedures/  docs-upstream-sync, docs-ja-sync, ide-screenshot-drift, docs-ja-metrics
└── meta/        skill-quality   (reviews the skills in this repo)
references/      shared review output + comment formats
cli/             Bun + Ink TUI for staging symlinks (bun start)
deprecated/      retired skills; the TUI skips this folder
```
