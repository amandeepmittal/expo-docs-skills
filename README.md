# expo-docs-skills

A collection of agent skills (slash commands and behaviors) for writing and auditing Expo documentation.

## Install

1. **Clone the repo** to wherever your repository lives.

2. **Symlink the skills into your agent target(s):**

   ```sh
   bun start
   ```

   The TUI lists each skill in this repo (grouped by category) and lets you stage symlinks to `~/.claude/skills/` and `~/.codex/skills/`. Press `c` to toggle Claude, `x` to toggle Codex (`1`/`2` also work), `space` to toggle both, then `enter` to apply. Each skill shows its per-target link status, and the header rolls up totals.

3. **Claude Code setup: grant read access to this repo.** The references live at the repo root and the skill files live in `skills/<category>/<name>/`. When you invoke a skill from a Claude Code session in another project (for example, `expo/`), Claude Code treats reads from this repo as cross-project and prompts every time. To silence the prompts, add this repo to the read allowlist in `~/.claude/settings.json`:

   ```json
   {
     "permissions": {
       "allow": [
         "Read(/Users/<your-username>/<your-path>/expo-docs-skills/**)"
       ]
     }
   }
   ```

   Adjust the path to match where you cloned the repo. Merge with your existing `permissions.allow` array; do not replace it. After saving, the prompts stop the next time you trigger a skill that reads from this repo.

4. **For `expo-docs-review` (optional):** `gh` CLI authenticated with `pull-requests: write` scope on the target repo. The skill stages pending review comments via `gh auth token` or `GITHUB_TOKEN`. See `skills/reviewing/expo-docs-review/SKILL.md` for details.

## Example usage

After a skill is linked into `~/.claude/skills/` (via the `bun start` CLI), invoke it from Claude Code with a focused prompt. For example, using the `expo-writing-style` skill to audit a specific rule on a single page:

> Audit the keyboard shortcuts section in `expo/docs/pages/get-started/start-developing.mdx` against the expo-writing-style skill. Report any violations of the `<kbd>` formatting rule with line numbers.

For the `expo-docs-review` skill, pass a public Expo docs PR URL. Any of these phrasings trigger it:

> review this docs pr https://github.com/expo/expo/pull/XXXXX

> /expo-docs-review https://github.com/expo/expo/pull/XXXXX

> audit https://github.com/expo/expo/pull/XXXXX against the style guide

The skill writes one JSON + Markdown report per changed `.mdx` to `/tmp/expo-docs-review-pr-{number}-{file-slug}.{json,md}`, then stages the findings as a **PENDING** review on the PR via the shared `skills/reviewing/scripts/post-review.ts` script. PENDING reviews are private to your GitHub account; the skill never submits or publishes. You open the resulting Review URL on github.com, edit or delete comments inline, and click **Submit review** (or cancel) to finalize.

## Skills

Skills live in `skills/<category>/<name>/SKILL.md`. The CLI symlinks each into `~/.claude/skills/` and `~/.codex/skills/`.

### Authoring

| Skill | What it does |
| --- | --- |
| `expo-writing-style` | Apply Expo's docs writing style and MDX component conventions: voice, tone, punctuation, headings, link text, capitalization, platform order, the glossary, and the component catalog (Terminal, Tabs, Step, BoxLink, and so on). Use when writing or editing `.mdx` under `expo/docs/pages/`. |
| `expo-docs-ja-translator` | Translate an Expo MDX docs page from English to Japanese, mirrored to `pages/ja/<same-path>`. Preserves frontmatter, JSX, code blocks, links, and imports; translates prose, headings, and string-valued JSX props. |

### Reviewing

| Skill | What it does |
| --- | --- |
| `expo-docs-review` | Review an Expo docs PR against the style guide and MDX conventions, then stage the findings as a private **pending** GitHub review. Public PRs only. |
| `expo-docs-boxlink-audit` | Audit `<BoxLink>` components in a docs PR for Icon-prop vs destination-URL mismatches and stage them as a pending review. Narrow scope: icon mismatches only. |
| `expo-docs-terminal-audit` | Audit local `.mdx` files for `<Terminal>` blocks that use a single package-manager command where Expo conventions call for multi-PM variants. Reports in-session; edits only after approval. |

`expo-docs-review` and `expo-docs-boxlink-audit` share `skills/reviewing/scripts/post-review.ts`, which stages comments as a pending review via `gh`.

## References

Shared reference docs at the repo root, read by the skills above:

| File | Purpose |
| --- | --- |
| `references/expo-docs-style-guide.md` | The Expo documentation writing style rules. Source of truth for `expo-writing-style` and `expo-docs-review`. |
| `references/expo-docs-components.md` | The MDX component catalog and usage conventions. |
| `references/expo-docs-review-output.md` | The report output format for the review skills. |
| `references/expo-docs-review-comments.md` | The comment body format for staged review comments. |

Two skills also carry their own scoped references: `expo-docs-boxlink-audit/references/expo-docs-boxlink-icons.md` and `expo-docs-terminal-audit/references/expo-docs-terminal-multi-pm.md`.

## Deprecated

`deprecated/` holds skills retired from active use. The CLI skips this folder, so nothing inside is symlinked into `~/.claude/skills/` or `~/.codex/skills/` when you run `bun start`. It currently contains only its own README.

## Layout

```
expo-docs-skills/
├── cli/                       # Bun + Ink TUI for staging symlinks (bun start)
│   ├── src/
│   │   ├── App.tsx
│   │   ├── cli.tsx
│   │   ├── components/        # SkillList, Detail
│   │   └── lib/               # discover, paths, symlink, theme, types
│   └── README.md
├── references/                # shared reference docs (see above)
│   ├── expo-docs-style-guide.md
│   ├── expo-docs-components.md
│   ├── expo-docs-review-output.md
│   └── expo-docs-review-comments.md
├── skills/
│   ├── authoring/
│   │   ├── expo-writing-style/
│   │   └── expo-docs-ja-translator/
│   └── reviewing/
│       ├── expo-docs-review/
│       ├── expo-docs-boxlink-audit/    # + references/expo-docs-boxlink-icons.md
│       ├── expo-docs-terminal-audit/   # + references/expo-docs-terminal-multi-pm.md
│       └── scripts/post-review.ts      # shared: stages pending GitHub reviews
├── deprecated/                # retired skills; CLI skips this folder
├── package.json
└── README.md
```