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

> Audit the keyboard shortcuts section in `expo/docs/pages/get-started/start-developing.mdx` against the expo-writing-style skill. Report `<kbd>` formatting violations with line numbers.

The review skills take a public Expo docs PR URL:

> /expo-docs-review https://github.com/expo/expo/pull/XXXXX

`expo-docs-review` and `expo-docs-boxlink-audit` write reports to `/tmp/` and stage findings as a **pending** GitHub review (private to your account, never submitted). You open the Review URL on github.com to edit, then submit or cancel.

## Skills

Skills live in `skills/<category>/<name>/SKILL.md`.

### Authoring

| Skill | What it does |
| --- | --- |
| `expo-writing-style` | Apply Expo's docs writing style and MDX component conventions. Use when writing or editing `.mdx` under `expo/docs/pages/`. |
| `docs-pr` | Generate a PR description (Why, How, Test Plan, Checklist). `--short` outputs only the How section. Text only. |
| `docs-ja-translator` | Translate an MDX docs page to Japanese, mirrored to `pages/ja/<same-path>`. Preserves frontmatter, JSX, code, links, and imports. |

### Reviewing

| Skill | What it does |
| --- | --- |
| `expo-docs-review` | Review a docs PR against the style guide and MDX conventions; stage a pending GitHub review. Public PRs only. |
| `expo-docs-boxlink-audit` | Audit `<BoxLink>` components for Icon-prop vs destination-URL mismatches; stage a pending review. |

The review skills share `skills/review/scripts/post-review.ts`, which stages comments via `gh`.

## References

Shared reference docs at the repo root, read by the skills:

| File | Purpose |
| --- | --- |
| `references/expo-docs-style-guide.md` | Expo writing style rules. Source of truth for `expo-writing-style` and `expo-docs-review`. |
| `skills/authoring/docs-components/references/components.md` | MDX component catalog and conventions. |
| `references/expo-docs-review-output.md` | Report output format for the review skills. |
| `references/expo-docs-review-comments.md` | Comment body format for staged review comments. |

`expo-docs-boxlink-audit` also carries its own scoped references.

## Layout

```
expo-docs-skills/
├── cli/            # Bun + Ink TUI for staging symlinks (bun start)
├── references/     # shared reference docs (see above)
├── skills/
│   ├── authoring/  # expo-writing-style, docs-pr, docs-ja-translator
│   └── review/  # expo-docs-review, expo-docs-boxlink-audit, screenshot-audit
│                   # + scripts/post-review.ts (stages pending GitHub reviews)
├── deprecated/     # retired skills; CLI skips this folder
└── package.json
```
