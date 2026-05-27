---
name: expo-docs-terminal-audit
description: Audit `<Terminal>` components in local Expo docs `.mdx` files and flag single-package-manager commands that should be multi-PM per established Expo conventions. MUST USE when the user provides a local `.mdx` path (or directory of `.mdx` files) and says "audit terminal commands", "audit multi-pm", "check terminal blocks", "review terminal", or "/expo-docs-terminal-audit". Reads the canonical mapping at references/expo-docs-terminal-multi-pm.md (co-located). Produces an in-session report showing each flagged block, the canonical fix, and the rule reference. After the user reviews, applies the suggested conversions directly to the `.mdx` files (only with explicit user approval, per finding or in batch). Does not call GitHub, does not write JSON, does not post PR comments. Narrow scope: single-PM-to-multi-PM conversions for command shapes Expo already documents with multi-PM examples. Does not invent new patterns; does not flag inline prose mentions, shell commands, `eas`/`expo` CLI invocations, `npx expo`/`npx eas-cli` runners, or `npm run` scripts.
license: MIT
metadata:
  version: "1.0.0"
---

# Expo Docs Terminal Audit

Audit `<Terminal>` components in local Expo docs `.mdx` files for single-package-manager commands that should be multi-PM per established Expo conventions. The skill produces an in-session report; after the user reviews, it can apply the suggested conversions directly to the source files.

**Single concern: single-PM-to-multi-PM conversions only.** This skill does not check Terminal title, `browserAction`, or any other prop. It does not flag inline prose mentions of package managers outside `<Terminal>` blocks. It does not invent new multi-PM shapes; it uses the patterns Expo already documents.

**Local-first. No GitHub.** Operates on `.mdx` files on disk. Does not fetch PRs, write JSON reports, or stage PR comments. The output is an in-session markdown report; edits are applied directly to the file(s) only with explicit user approval.

## When to Use

- Auditing a single `.mdx` file (yours or anyone's) for Terminal multi-PM compliance.
- Sweeping a directory of `.mdx` files (e.g. `docs/pages/get-started/`) before opening a PR.
- Cleaning up legacy single-PM Terminal blocks in a guide you are editing.

Not the right tool for: PR-level reviews (use `expo-docs-review` or `expo-docs-boxlink-audit` for those), prose checks (use `expo-writing-style`), or any Terminal check beyond single-vs-multi PM.

## Input

A local file path or a directory.

- Single file: absolute or repo-relative path to an `.mdx` file. Example: `expo/docs/pages/get-started/create-a-project.mdx`.
- Multiple files: a directory; the skill walks it for `*.mdx` files. Example: `expo/docs/pages/get-started/`.
- Glob: also accepted. Example: `expo/docs/pages/guides/*.mdx`.

The skill does NOT require the file to be in a git repo, on a branch, or part of a PR. Any `.mdx` file with `<Terminal>` blocks works.

## References

One reference file, co-located with this skill:

- **`references/expo-docs-terminal-multi-pm.md`** (relative to this `SKILL.md`): canonical mapping of command shapes to multi-PM conversions, gold-standard Expo pages per shape, exceptions catalog, decision tree, severity guidance, and the long-flag / chained-command rules.

Read this reference before Phase 2. The mapping is the source of truth for what counts as a violation and what the fix looks like.

## Three-phase workflow

### Phase 1: Read

1. **Resolve input** to a list of `.mdx` file paths. Reject non-`.mdx` files with a clear error.
2. **Read each file in full.** No diff, no PR, no head-version fetch. The whole file is the audit surface.
3. **Skip files with frontmatter** that signals the audit should not run:
   - `hideFromSearch: true`
   - `isAlpha: true`
   - `isDeprecated: true`
   - Any file under `expo/docs/pages/versions/latest/` (mirror, never edit)

### Phase 2: Analyze

For each file:

1. **Find every `<Terminal>` usage.** Use a regex or string search for `<Terminal` and parse the JSX block until the matching closing tag or self-close.
2. **Extract the `cmd` prop value** for each Terminal. Note whether it is the object form `cmd={{...}}` (already multi-PM, skip) or the array form `cmd={[...]}` (single-PM candidate).
3. **Scope to ALL Terminal blocks in the file.** There is no diff to scope against; every block is fair game.
4. **For each single-PM Terminal block, run the decision tree** documented in `references/expo-docs-terminal-multi-pm.md`. The tree determines whether to skip, flag as `design`, or flag as `suggestion`.
5. **For each finding, look up the canonical four-variant conversion** in the reference's conversion table. The replacement block uses the long-flag form for npm (per the gold-standard `eas/cli.mdx`).
6. **For chained commands** (`&&`-joined `cmd` strings), use the multi-PM-with-`cmdCopy` shape documented in the reference. Do not suggest splitting into multiple Terminal blocks.

**Do not fabricate fixes.** If the command shape is not in the conversion table and Expo has no gold-standard for it, drop the finding. The skill's contract is to use existing Expo patterns only.

### Phase 3: Report and apply

**Report (always shown in-session, never written to disk):**

Print a markdown report to the chat directly. Shape:

````
# Terminal multi-PM audit

**Files reviewed:** N (X with findings, Y clean)
**Findings:** N total (D design, S suggestion)

## {file path 1}

### Finding 1: Line {line} ({severity})
**Rule:** `expo-docs-terminal-multi-pm.md#canonical-conversion-table`
**Current:**
```mdx
<Terminal cmd={['$ npx create-expo-app@latest --template default@sdk-56']} />
````

**Suggested:**

```mdx
<Terminal
  cmd={{
    npm: ["$ npx create-expo-app@latest --template default@sdk-56"],
    yarn: ["$ yarn create expo-app --template default@sdk-56"],
    pnpm: ["$ pnpm create expo-app --template default@sdk-56"],
    bun: ["$ bun create expo --template default@sdk-56"],
  }}
/>
```

**Reasoning:** Project scaffold matches the gold-standard at `pages/more/create-expo.mdx:15-22`.

### Finding 2: ...

## {file path 2}

...

```

Skip files with zero findings entirely (do not list them in the file sections, but include them in the top counts).

**Apply (only with explicit user approval):**

After printing the report, ask the user how to proceed:

> Apply these N changes? Reply with:
> - **`all`** to apply every finding
> - **`1,3,5`** to apply specific findings by number
> - **`skip`** or no reply to leave the files untouched

Default behavior is to do nothing without an explicit affirmative response. Do not apply changes silently.

When the user approves (full or partial):

- Use the Edit tool to replace each flagged `<Terminal>` block with the suggested multi-PM block in the source file.
- After each apply, print a one-line confirmation: `✓ Applied finding 1 to {file}:{line}`.
- If any edit fails (file changed since the audit, regex mismatch, etc.), report the failure but continue with the rest.
- After all edits, print a summary: `Applied {N} of {M} changes across {K} files.`

## Severity guidance

- **`design`**: command shape matches the canonical conversion table and an Expo gold-standard page exists for that shape. The fix is mechanical: paste the four-variant block from the conversion table, adjusted for the specific package name and version.
- **`suggestion`**: command shape is borderline. Examples: a `yarn add -D sass` in a guide where the page is specifically teaching Sass setup; the single-PM might be intentional. Flag but soften the recommendation.

There is no `critical` or `nit` tier. Multi-PM conversions are not render-breaking and are not mechanical typos.

## Iteration

When the user re-runs the skill on the same file(s), there is no prior-state to compare against (no JSON cache, no diff). Each run is fresh.

If the user has already applied some changes from the prior run, those Terminal blocks will now be in the multi-PM object form and the skill will skip them automatically (Phase 2 step 2). The next run only flags what is still single-PM.

## DO

- Read `references/expo-docs-terminal-multi-pm.md` before flagging anything. The mapping and decision tree are the source of truth.
- Print the report in-session as markdown. The user reads it inline; do not write to `/tmp/` or any other file.
- Show the FULL current `<Terminal>` block and the FULL suggested multi-PM block in each finding. The user needs to see what will change.
- Cite the specific Expo gold-standard page for the conversion (e.g. `pages/more/create-expo.mdx:15-22` for scaffolds). The author should be able to see the documented precedent.
- Use the long flag form for npm (`--global`, `--save-dev`) in suggestions. Per the gold-standard `eas/cli.mdx`.
- For chained commands (`&&`-joined), suggest the multi-PM-with-`cmdCopy` shape from `develop/development-builds/create-a-build.mdx:104`. Do NOT split into multiple Terminal blocks.
- For the `bun install` vs `bun add` ambiguity, suggest `bun add` (per the reference's adaptive cross-check rule).
- Ask for explicit approval before applying any edit. Default is no-op.
- Print a per-edit confirmation as you apply changes, plus a summary at the end.

## DON'T

- Write to GitHub. This skill is local-only. No `gh` calls, no PR fetching, no post-review.ts.
- Write JSON output files. The report is in-session markdown; the user does not need a machine-readable copy.
- Apply changes without explicit approval. The default response to the report is to do nothing.
- Flag shell commands, installed-CLI invocations (`eas`, `expo`), `npx expo` family, `npx eas-cli` runners, `npm run` scripts, or any pattern in the exceptions catalog of the reference.
- Flag command shapes not documented in the canonical conversion table. If Expo has no established multi-PM pattern for the shape, drop the finding rather than inventing a fix.
- Suggest splitting chained commands. The gold standard is multi-PM-with-`cmdCopy`, not multiple Terminal blocks.
- Use short flags (`-g`, `-D`) in suggestions when the long form is the gold-standard. The flag form in the original block is the author's choice; only the suggestion uses the canonical long form.
- Flag prose mentions of `npm install` or other PM commands in the body of an MDX page. The audit scope is `<Terminal>` blocks only.
- Edit files in directories the audit was not pointed at. If the user passes a single file path, only that file is in scope; do not walk siblings.
```
