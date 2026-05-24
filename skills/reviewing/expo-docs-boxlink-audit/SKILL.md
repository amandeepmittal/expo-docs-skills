---
name: expo-docs-boxlink-audit
description: Audit `<BoxLink>` components in an Expo docs PR and flag mismatches between the Icon prop and the destination URL, then stage findings as a private pending GitHub review (never auto-submitted). MUST USE when the user provides a GitHub PR URL and says "audit boxlink icons", "review boxlinks", "check boxlink icons", or "/expo-docs-boxlink-audit". Reads the canonical mapping at references/expo-docs-boxlink-icons.md (co-located). Produces one JSON + Markdown report per changed .mdx file at /tmp/expo-docs-boxlink-audit-pr-{number}-{file-slug}.{json,md}, then invokes the post-review.ts script in the expo-docs-review skill folder to stage comments as PENDING. Public PRs only. Narrow scope: icon mismatches only, not other BoxLink props (title, description, href format).
license: MIT
compatibility: Works with Claude Code, Cursor, and skills.sh-compatible agents.
metadata:
  author: amandeepmittal
  version: "1.0.0"
---

# Expo Docs BoxLink Audit

Review a public Expo docs PR for `<BoxLink>` components whose `Icon` prop does not match the destination URL's canonical icon. Outputs one JSON + Markdown report per changed `.mdx` file to `/tmp/`, then stages the findings as a PENDING review on the PR via the `post-review.ts` script in the `expo-docs-review` skill folder.

**Single concern: icon mismatches only.** This skill does not check BoxLink title length, description presence, href format, or any other style rule. Those are handled by the broader `expo-docs-review` skill.

## When to Use

- Reviewing a docs PR that adds or changes `<BoxLink>` components.
- Specifically flagging cards on EAS service pages, tutorial overviews, or modules pages where the icon should match the service or section rather than the generic `BookOpen02Icon`.
- Re-running after the author updates icons to confirm the fix lands.

## Input

A public GitHub PR URL. Accepted forms:

- `https://github.com/expo/expo/pull/30000`
- `expo/expo#30000`
- A bare PR number, when the user has already established the repo in context

If `--iteration N` (or "iteration 2", "review again") is in the request, read the prior reports first, then re-fetch the PR.

Private repos and GitHub Enterprise are out of v1 scope by choice, not by technical limitation.

## References

One reference file, co-located with this skill:

- **`references/expo-docs-boxlink-icons.md`** (relative to this `SKILL.md`): canonical mapping of destination URL patterns to expected icons, plus severity guidance and special-case exceptions (platform-specific submit links, external brand icons, etc.).

Read this reference before Phase 2. The mapping is the source of truth for what counts as a violation.

## Four-phase workflow

### Phase 1: Fetch and Context

Use the `gh` CLI for all GitHub fetches.

1. **Resolve the PR.** Parse `{owner}/{repo}/{number}` from the user's input.
2. **Fetch PR metadata:**

   ```sh
   gh pr view {number} --repo {owner}/{repo} --json title,body,baseRefOid,headRefOid,author,files
   ```

3. **Fetch the diff:**

   ```sh
   gh pr diff {number} --repo {owner}/{repo}
   ```

   Parse the unified diff. Build the list of `.mdx` files under `docs/pages/` that the PR changes. Note added vs. modified vs. removed lines per file.

4. **For each changed `.mdx` file, fetch the head-version content:**

   ```sh
   gh api 'repos/{owner}/{repo}/contents/{path}?ref={head_sha}' \
     -H "Accept: application/vnd.github.raw"
   ```

   **Quote the URL.** `zsh` glob-expands the `?` if it is unquoted, and the fetch will fail silently or with a confusing error.

5. **Read the PR title and body.** Skip files where the PR's scope clearly excludes BoxLink work (e.g. a typo fix PR that does not touch components).

### Phase 2: Analyze

For each changed `.mdx` file:

1. **Find every `<BoxLink>` usage in the head-version file.** Use a regex or string search for `<BoxLink` and parse the JSX block until the matching closing tag or self-close.
2. **Extract the `href` and `Icon` props** for each BoxLink.
3. **Scope to in-PR additions and modifications.** Use the diff to determine which BoxLink usages were added or modified by this PR. Pre-existing BoxLinks with wrong icons are out of scope; the PR author cannot reasonably act on them.
4. **Match each in-scope BoxLink against the canonical mapping** in `references/expo-docs-boxlink-icons.md`. For each mismatch, classify per the reference's severity guidance:
   - `design` for clearly-wrong icons on service-specific destinations (e.g. `BookOpen02Icon` on `/eas/build/`).
   - `suggestion` for legacy or borderline icons (e.g. `Cube01Icon` on `/eas/build/` when `BuildIcon` is canonical).
   - Skip findings that match the canonical or fall under the documented special cases (platform overrides, brand icons on vendor domains, logo icons from `@expo/styleguide`).

Every finding needs:

- The rule reference: always `expo-docs-boxlink-icons.md` plus the row that documents the destination pattern (e.g. `expo-docs-boxlink-icons.md#canonical-mapping`).
- The exact fix: name the canonical icon and the import path.
- A `line_content` substring (5-15 chars of the actual line) so the next iteration can re-resolve after new commits.
- The `line` number in the head version of the file pointing at the `Icon={...}` prop line.

### Phase 3: Output

Write two files per changed `.mdx` that has at least one finding:

- `/tmp/expo-docs-boxlink-audit-pr-{number}-{file-slug}.json` (source of truth, machine-readable)
- `/tmp/expo-docs-boxlink-audit-pr-{number}-{file-slug}.md` (human-readable, rendered from the JSON)

Where `{file-slug}` is the file path with slashes replaced by dashes. Example: `docs/pages/tutorial/cicd/next-steps.mdx` becomes `docs-pages-tutorial-cicd-next-steps`.

Print a one-line summary per file to stdout when done, with the count of findings and the path to the Markdown report.

If a changed `.mdx` has zero findings, skip it: do not write empty reports.

#### JSON schema

Mirrors the `expo-docs-review` schema so `post-review.ts` can consume both without modification.

````json
{
  "pr_url": "https://github.com/expo/expo/pull/30000",
  "pr_title": "...",
  "pr_author": "...",
  "owner": "expo",
  "repo": "expo",
  "pull_number": 30000,
  "base_sha": "abc123...",
  "head_sha": "def456...",
  "file": "docs/pages/tutorial/cicd/next-steps.mdx",
  "page_type": "tutorial",
  "iteration": 1,
  "summary": "One paragraph: how many BoxLinks were checked, how many flagged, and what the dominant issue is.",
  "verdict": "ready | has-suggestions | needs-changes",
  "comments": [
    {
      "path": "docs/pages/tutorial/cicd/next-steps.mdx",
      "line": 42,
      "side": "RIGHT",
      "line_content": "Icon={BookOpen02Icon}",
      "severity": "design",
      "rule_ref": "expo-docs-boxlink-icons.md#canonical-mapping",
      "body": "**[design]** This BoxLink points at `/eas/build/`; use `BuildIcon` rather than `BookOpen02Icon` for EAS Build links (`expo-docs-boxlink-icons.md#canonical-mapping`).\n\n```suggestion\n  Icon={BuildIcon}\n```\n\nAlso update the import to `import { BuildIcon } from '@expo/styleguide-icons/custom/BuildIcon';`.",
      "resolved": false
    }
  ]
}
````

#### Verdict

Agent judges per file based on the findings for that file:

- `ready`: no `design` findings. At most a couple of `suggestion`s.
- `has-suggestions`: `suggestion`s present, no `design`.
- `needs-changes`: at least one `design` finding.

There is no `critical` or `nit` tier for this skill. Icon mismatches are not render-breaking (so never `critical`), and they are not mechanical typos (so never `nit`).

#### Markdown report shape

```md
# Expo BoxLink icon audit: {file}

**PR:** [{pr_title}]({pr_url}) by @{pr_author}
**Verdict:** {verdict} **Iteration:** {n} **Page type:** {page_type}
**Head SHA:** `{head_sha[:7]}`

## Summary

{summary}

## Findings

### design ({count})

- **Line {line}** ({rule_ref}): {body first line}

### suggestion ({count})

- **Line {line}** ({rule_ref}): {body first line}

## Resolved this iteration

- **Line {line}** ({rule_ref}): {body first line} [resolved at head_sha={short_sha}]
```

Group by severity, sorted within group by line number. Omit empty sections.

### Phase 4: Stage as PENDING review on GitHub

Invoke the `post-review.ts` script in the `expo-docs-review` skill folder. It is shared infrastructure; this skill reuses it without modification.

1. Collect every JSON path written in Phase 3 for this PR.
2. Run the script with all paths in one invocation (consolidated pending review):

   ```sh
   bun /Users/amanhimself/Documents/GitHub/expo-docs-skills/skills/reviewing/expo-docs-review/post-review.ts \
     /tmp/expo-docs-boxlink-audit-pr-{number}-*.json
   ```

3. On iteration 2 or later, pass `--replace` so prior pending reviews from the same user on this PR are deleted first:

   ```sh
   bun /Users/amanhimself/Documents/GitHub/expo-docs-skills/skills/reviewing/expo-docs-review/post-review.ts \
     --replace /tmp/expo-docs-boxlink-audit-pr-{number}-*.json
   ```

4. Print the Review URL the script reports back.

**Skip Phase 4 and stop after Phase 3** when the user said "report only", "dry run", "don't post", or anything that signals they want the JSON without GitHub state.

**Posting consolidation note:** if the user also ran `expo-docs-review` on the same PR earlier, those JSONs live at `/tmp/expo-docs-review-pr-{number}-*.json`. The user may want one consolidated pending review across both skills, in which case pass both globs to `post-review.ts` in one invocation. The script merges all comments into one review payload.

The script never submits a review. It POSTs without an `event` field, leaving the review in PENDING state. Submission is exclusively a manual action the user takes on github.com.

## Iteration

When the user asks to re-review:

1. Read the prior JSON at `/tmp/expo-docs-boxlink-audit-pr-{number}-*.json`.
2. Re-fetch the PR metadata. If `head.sha` matches the prior `head_sha`, tell the user there are no new commits and ask whether to re-review anyway.
3. If `head.sha` is new, re-fetch the diff and head-version files.
4. For each prior comment in each file, search the new head-version file for the `line_content` substring within ~10 lines of the prior `line` number. If found, re-check whether the icon mismatch still applies. If not found or no longer applicable, mark `resolved: true`.
5. Add new findings introduced by the new commits.
6. Bump `iteration` in each file's JSON and rewrite both files.
7. Run `post-review.ts --replace` to clear the prior pending review and post the new one.

## DO

- Read `references/expo-docs-boxlink-icons.md` before flagging anything. The mapping is the source of truth.
- Prefix every comment body with the severity tag and rule reference. Format: `**[<severity>]** <one-sentence explanation> (\`<rule-ref>\`).`
- Use GitHub ` ```suggestion ` blocks for the Icon prop line replacement. The fence language must be exactly `suggestion`, not `mdx` or `tsx`.
- Mention the import line in prose alongside the suggestion block. The Icon prop and the import are on different lines, so a single suggestion block can only fix one of them; tell the author what to update in the import too.
- Cross-reference base vs. head when uncertain: is this BoxLink introduced by this PR, or was it already there with a wrong icon? Only flag the former.
- Respect the special-case exceptions in the reference file (platform overrides, brand icons, logo imports).
- Be concise. 1-3 sentences per comment.

## DON'T

- Submit, approve, comment, or request-changes on the review. The pending review created by `post-review.ts` must stay in PENDING state.
- Flag pre-existing BoxLinks outside the PR's diff range.
- Flag icon variant differences (`outline/` vs `solid/` vs `custom/` vs `duotone/`). Only the icon name matters for this audit.
- Flag brand icons on vendor URLs (`GithubIcon` on `github.com`, `FigmaIcon` on `figma.com`, etc.) when the icon matches the brand.
- Flag logo imports from `@expo/styleguide` (`DocsLogo`, `RouterLogo`, `ExpoGoLogo`, `PlanEnterpriseIcon`). They are valid intentional uses.
- Invent rules not in the reference. If a destination URL pattern is not documented in the canonical mapping, do not flag the BoxLink. Add the pattern to the reference instead (in a follow-up).
- Review PRs your `gh` CLI is not authenticated for. If `gh pr view` returns an authentication error, stop and tell the user to run `gh auth status`.
