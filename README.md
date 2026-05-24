# expo-docs-skills

A collection of agent skills (slash commands and behaviors) for writing and auditing Expo documentation.

## Install

1. **Clone the repo** to wherever your dotskills live (this README assumes `~/Documents/GitHub/expo-docs-skills/`).

2. **Symlink the skills into your agent target(s):**

   ```sh
   cd ~/Documents/GitHub/expo-docs-skills
   bun start
   ```

   The TUI lists each skill in this repo and lets you stage symlinks to `~/.claude/skills/` and `~/.codex/skills/`. Press `1` to toggle Claude, `2` to toggle Codex, `space` to toggle both, then `enter` to apply.

3. **Claude Code setup: grant read access to this repo.** The references live at the repo root and the skill files live in `skills/<category>/<name>/`. When you invoke a skill from a Claude Code session in another project (for example, `expo/`), Claude Code treats reads from this repo as cross-project and prompts every time. To silence the prompts, add this repo to the read allowlist in `~/.claude/settings.json`:

   ```json
   {
     "permissions": {
       "allow": [
         "Read(/Users/<you>/Documents/GitHub/expo-docs-skills/**)"
       ]
     }
   }
   ```

   Adjust the path to match where you cloned the repo. Merge with your existing `permissions.allow` array; do not replace it. After saving, the prompts stop the next time you trigger a skill that reads from this repo.

4. **For `expo-docs-review` (optional):** `gh` CLI authenticated with `pull-requests: write` scope on the target repo. The skill stages pending review comments via `gh auth token` or `GITHUB_TOKEN`. See `skills/reviewing/expo-docs-review/SKILL.md` for details.

## Example usage

After a skill is linked into `~/.claude/skills/` (via the CLI or `link-skills.sh`), invoke it from Claude Code with a focused prompt. For example, using the `expo-writing-style` skill to audit a specific rule on a single page:

> Audit the keyboard shortcuts section in `expo/docs/pages/get-started/start-developing.mdx` against the expo-writing-style skill. Report any violations of the `<kbd>` formatting rule with line numbers.

For the `expo-docs-review` skill, pass a public Expo docs PR URL. Any of these phrasings trigger it:

> review this docs pr https://github.com/expo/expo/pull/XXXXX

> /expo-docs-review https://github.com/expo/expo/pull/XXXXX

> audit https://github.com/expo/expo/pull/XXXXX against the style guide

The skill writes one JSON + Markdown report per changed `.mdx` to `/tmp/expo-docs-review-pr-{number}-{file-slug}.{json,md}`, then stages the findings as a **PENDING** review on the PR via the shared `skills/reviewing/scripts/post-review.ts` script. PENDING reviews are private to your GitHub account; the skill never submits or publishes. You open the resulting Review URL on github.com, edit or delete comments inline, and click **Submit review** (or cancel) to finalize.

## Reference


### Misc

Tools kep around but barely used.


## Layout