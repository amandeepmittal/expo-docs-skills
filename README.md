# expo-docs-skills

Agent skills (slash commands and behaviors) for writing and auditing Expo documentation.

## Install

1. **Clone the repo.**

2. **Install dependencies and launch the symlink TUI.** The TUI lives in `cli/`; install its deps once, then run from the repo root:

   ```sh
   cd cli && bun install && cd ..
   bun start
   ```

   The TUI lists each skill (grouped by category) and stages symlinks to `~/.claude/skills/` and `~/.codex/skills/`. Keys: `c` toggles Claude, `x` toggles Codex (`space` for both), `enter` applies.

3. **Claude Code: grant read access to this repo.** Skills read references from this repo, which Claude Code treats as cross-project and prompts for each time. Silence the prompts by adding to `permissions.allow` in `~/.claude/settings.json` (merge, don't replace):

   ```json
   "Read(/Users/<your-username>/<your-path>/expo-docs-skills/**)"
   ```

4. **For `expo-docs-review` (optional):** `gh` CLI authenticated with `pull-requests: write` on the target repo. See `skills/review/expo-docs-review/SKILL.md`.

## Usage

Once a skill is linked, invoke it from Claude Code with a focused prompt:

> Audit the keyboard shortcuts section in `expo/docs/pages/get-started/start-developing.mdx` against the docs-writing-style skill. Report `<kbd>` formatting violations with line numbers.

The review skills take a public Expo docs PR URL:

> /expo-docs-review https://github.com/expo/expo/pull/XXXXX

`expo-docs-review` and `docs-boxlink-audit` write reports to `/tmp/` and stage findings as a **pending** GitHub review (private to your account, never submitted). You open the Review URL on github.com to edit, then submit or cancel.

## Skills

Skills live in `skills/<category>/<name>/SKILL.md`.

### Authoring

| Skill | What it does |
| --- | --- |
| `docs-writing-style` | Apply Expo's docs writing style. Use when writing or editing `.mdx` under `expo/docs/pages/`. |
| `docs-pr` | Generate a PR description (Why, How, Test Plan, Checklist). `--short` outputs only the How section. Text only. |
| `docs-ja-translator` | Translate an MDX docs page to Japanese, mirrored to `pages/ja/<same-path>`. Preserves frontmatter, JSX, code, links, and imports. |

### Reviewing

| Skill | What it does |
| --- | --- |
| `expo-docs-review` | Review a docs PR against the style guide and MDX conventions; stage a pending GitHub review. Public PRs only. |
| `docs-boxlink-audit` | Audit `<BoxLink>` components for Icon-prop vs destination-URL mismatches; stage a pending review. |
| `docs-eas-env-drift` | Diff the docs' built-in EAS Build env var list against the definition sites in `expo/eas-cli`. Local report only. |

The review skills share `skills/review/scripts/post-review.ts`, which stages comments via `gh`.

### Procedures

Recurring drift checks against a local `expo/docs` checkout. Each carries a `manifest.json` of tracked state and a deterministic detection script; edits are applied to the working tree and left for the user to commit.

| Skill | What it does |
| --- | --- |
| `docs-ja-sync` | Detect and apply drift between the English tutorial (source of truth) and its Japanese mirror under `pages/ja/tutorial`, via a per-page git-SHA watermark. Run weekly. Edits the working tree; never commits. |
| `ide-screenshot-drift` | Flag env-setup screenshots (Android Studio, Xcode) that no longer match the locally installed IDEs. macOS only. |

## References

Shared reference docs at the repo root, read by the skills:

| File | Purpose |
| --- | --- |
| `skills/authoring/docs-writing-style/references/style-guide.md` | Expo writing style rules. Source of truth for `docs-writing-style` and `expo-docs-review`. |
| `skills/authoring/docs-components/references/components.md` | MDX component catalog and conventions. |
| `references/expo-docs-review-output.md` | Report output format for the review skills. |
| `references/expo-docs-review-comments.md` | Comment body format for staged review comments. |

`docs-boxlink-audit` also carries its own scoped references.

## Layout

```
expo-docs-skills/
├── cli/            # Bun + Ink TUI for staging symlinks (bun start)
├── references/     # shared reference docs (see above)
├── skills/
│   ├── authoring/  # docs-writing-style, docs-pr, docs-ja-translator
│   ├── review/  # expo-docs-review, docs-boxlink-audit, screenshot-audit, docs-eas-env-drift
│   │                # + scripts/post-review.ts (stages pending GitHub reviews)
│   └── procedures/ # docs-ja-sync, ide-screenshot-drift
├── deprecated/     # retired skills; CLI skips this folder
└── package.json
```
