---
name: expo-docs-review
description: Review an Expo docs pull request against the Expo writing style guide and MDX component conventions, and stage the findings as a private pending GitHub review (never auto-submitted). MUST USE when the user provides a GitHub PR URL and says "review this pr", "review this docs pr", "audit this pr", "check this pr against the style guide", or "/expo-docs-review". Produces one JSON + Markdown report per changed .mdx file at /tmp/expo-docs-review-pr-{number}-{file-slug}.{json,md} with severity-classified findings (critical, design, suggestion, nit), then invokes the shared skills/reviewing/scripts/post-review.ts script to stage the comments as a PENDING review (visible only to the user, requires manual submit on github.com to publish). Public PRs only. Iteration-aware: re-running re-fetches the PR, re-resolves prior findings via line_content matching, and replaces the prior pending review.
license: MIT
metadata:
  author: amandeepmittal
  version: "1.8.0"
---

# Expo Docs Review

Review a public Expo docs PR against the Expo writing style guide and MDX component conventions. Outputs one JSON + Markdown report per changed `.mdx` file to `/tmp/`, then stages the findings as a PENDING review on the PR via the shared `skills/reviewing/scripts/post-review.ts` script. The pending review is private to the user that runs the skill; publication (Approve / Comment / Request changes) is a manual action on github.com.

**Context before critique. Read the PR description and the changed file in full before flagging individual lines.**

## When to Use

- Reviewing a docs PR before commenting on it on GitHub
- Re-reviewing a PR after the author pushes new commits
- Calibrating a draft PR against the references without leaving a public trace

## When NOT to Use

- The PR touches files outside `expo/docs/pages/`. This skill only knows about `.mdx` files under that path. SDK package source, examples, CI config, etc. are out of scope.
- The PR is on a private repo or GitHub Enterprise. v1 scope is public Expo PRs only.
- The PR changes only `pages/versions/latest/...` (those files are mirrored from the current versioned directory; edits belong on the versioned path).
- The user wants drafting help, not review. Use `expo-writing-style`.
- The user wants a broad prose audit across many local files, or a grammar/spelling sweep. Use `docs-grammar-audit` or `docs-check-style`.
- `gh pr view` returns an authentication error or "Could not resolve to a PullRequest". Tell the user to run `gh auth status` / `gh auth refresh` and stop.

## Input

A public GitHub PR URL. Accepted forms:

- `https://github.com/expo/expo/pull/30000`
- `expo/expo#30000`
- A bare PR number, when the user has already established the repo in context

If `--iteration N` (or "iteration 2", "review again") is in the request, read the prior reports first, then re-fetch the PR.

## References

Reference files live next to this skill. Load each before its phase fires.

**Review checklist (load before Phase 2):**

- **`../../../references/expo-docs-style-guide.md`** for prose: voice, tone, punctuation, formatting, glossary, anti-patterns, Expo-specific gotchas with before/after examples.
- **`../../../references/expo-docs-components.md`** for MDX component usage: catalog, mandatory-usage rules, prop tables, examples, gotchas.

**Comment authoring (load when writing the JSON in Phase 2):**

- **`../../../references/expo-docs-review-comments.md`** for the severity-tag-first body format, `suggestion` block usage, single-line vs. multi-line replacements, and judgment-only cases.

**Output format (load before Phase 3):**

- **`../../../references/expo-docs-review-output.md`** for the JSON schema, the GitHub-API field contract (`path`/`line`/`side`/`start_line`), the verdict mapping, and the Markdown report template.

## Four-phase workflow

### Phase 1: Fetch and Context

Use the `gh` CLI for all GitHub fetches in this phase. `gh` is authorized for Expo docs PR review work and returns clean structured output.

1. **Resolve the PR.** Parse `{owner}/{repo}/{number}` from the user's input.
2. **Fetch PR metadata:**

   ```sh
   gh pr view {number} --repo {owner}/{repo} --json title,body,baseRefOid,headRefOid,author,files
   ```

   Capture: `title`, `body`, `baseRefOid` (base SHA), `headRefOid` (head SHA), `author.login`, and the `files[]` list (each entry has `path`, `additions`, `deletions`).

3. **Fetch the diff:**

   ```sh
   gh pr diff {number} --repo {owner}/{repo}
   ```

   Parse the unified diff. Build the list of `.mdx` files under `expo/docs/pages/` that the PR changes (cross-reference with `files[]` from step 2 to confirm). Note added vs. modified vs. removed lines per file.

4. **For each changed `.mdx` file, fetch the head-version content:**

   ```sh
   gh api repos/{owner}/{repo}/contents/{path}?ref={head_sha} \
     -H "Accept: application/vnd.github.raw"
   ```

   Read the file in full so context-aware review is possible.

5. **Read the PR title and body.** The intent shapes what counts as a `design`-level violation. A PR titled "fix typo" should not be reviewed for component-architecture changes.
6. **Note the page type for each file:** tutorial (`pages/tutorial/`, `pages/get-started/`), guide (`pages/guides/`, `pages/router/`), SDK reference (`pages/versions/{ver}/sdk/`). Rules differ by type. Tutorials allow "we"/"our"; reference does not.

**Phase 1 gate:** every changed `.mdx` file has been fetched in full and its page type noted before moving on. If `gh` failed on any file, stop and report.

### Phase 2: Analyze

For each changed `.mdx` file, walk the two checklist reference files and check the rules that apply. Scope:

- **In scope:** lines added or modified by this PR. Findings that the PR author can act on by editing their changes.
- **Out of scope:** pre-existing violations in unchanged parts of the file. The PR author did not introduce them; flagging them is noise.
- **Border case:** if a PR moves content within a file (a deletion + addition of the same lines), treat it as "modified" and review the result.

Classify findings into four severity buckets:

| Severity     | Definition                                                                                       |
| ------------ | ------------------------------------------------------------------------------------------------ |
| `critical`   | Breaks rendering or breaks an example. Missing `dependencies` on `SnackInline`. Indented JSX inside `<Tab>`. Blank-line rule violated in `ConfigPluginExample`. Broken internal link. Wrong import path on a component. |
| `design`     | Wrong component for the pattern. Bare ```` ```sh ```` block instead of `Terminal`. Numbered Markdown list instead of `Step` wrappers. "click here" link instead of descriptive `BoxLink`. Hand-authored API section that `APISection` would generate. |
| `suggestion` | Could be sharper. Sentence longer than ~25 words. Passive voice where active works. First-person plural outside a tutorial. Missing intro example before explanation. |
| `nit`        | Mechanical. Missing Oxford comma. "iOS and Android" instead of "Android, iOS, and Web". Vague link text like "here" or "this page". |

Every finding needs:

- The rule that was violated, cited by reference file and section anchor (`expo-docs-components.md#terminal`, `expo-docs-style-guide.md#platform-order`).
- The exact fix, not just the violation. "Wrap the install command in `<Terminal cmd={['$ npx expo install expo-camera']} />`", not "use Terminal".
- A `line_content` substring (5-15 chars of the actual line) so the next iteration can re-resolve after new commits.
- The `line` number in the **head version** of the file.

Comment body authoring (severity tag, `suggestion` block usage, multi-line replacements, judgment-only cases) lives in **`../../../references/expo-docs-review-comments.md`**. Load it before writing the JSON.

Before moving on, cross-check every "skip" decision against the [Rationalizations Table](#rationalizations-table) below. If the excuse you're about to construct fits a row there, the corrective action wins.

**Phase 2 gate:** every changed line in the diff has been walked against every rule in the checklist references that names a pattern on that line. Skips cite a carve-out clause from the rule itself, not a constructed reason.

### Phase 3: Output

Write two files per changed `.mdx`:

- `/tmp/expo-docs-review-pr-{number}-{file-slug}.json` (source of truth, machine-readable)
- `/tmp/expo-docs-review-pr-{number}-{file-slug}.md` (human-readable, rendered from the JSON)

Where `{file-slug}` is the file path with slashes replaced by dashes, no extension. Example: `docs/pages/guides/errors.mdx` becomes `docs-pages-guides-errors`.

Print a one-line summary per file to stdout when done, with the verdict and path to the Markdown report. The user picks which report to read first.

JSON schema, GitHub-API field contract, verdict mapping, and Markdown report template all live in **`../../../references/expo-docs-review-output.md`**. Load it before writing the JSON.

**Phase 3 gate:** every file's JSON validates against the schema in the output reference; every comment has a `rule_ref` that points at a real anchor; every finding has a concrete fix in the `body`.

## Iteration

When the user asks to re-review (`--iteration 2`, "review again", "iteration 2"):

1. Read the prior JSON at `/tmp/expo-docs-review-pr-{number}-*.json` (one per file).
2. Re-fetch the PR metadata. If `head.sha` matches the prior `head_sha`, tell the user there are no new commits and ask whether to re-review anyway.
3. If `head.sha` is new, re-fetch the diff and head-version files.
4. For each prior comment in each file:
   - Search the new head-version of the file for the `line_content` substring within ~10 lines of the prior `line` number. If found, re-check whether the rule still applies. If not found, mark `resolved: true`.
   - If the comment's line is no longer in the PR's changed range, mark `resolved: true` (the author may have reverted that part).
5. Add new findings introduced by the new commits.
6. Bump `iteration` in each file's JSON and rewrite both files.

Do not repeat unresolved comments verbatim across iterations. Re-evaluate. The file may have changed in ways that affect the original finding.

## Phase 4: Post findings to GitHub as a pending review

After writing the reports, invoke `post-review.ts` to stage the findings as a **PENDING** review on the PR. PENDING reviews are private to the GitHub account that owns the token (the user) and are not visible to the PR author or anyone else until the user clicks **Submit review** on github.com. The script POSTs without an `event` field, so the review cannot become public via this skill under any code path.

1. Collect every JSON path written in Phase 3 for this PR (one per changed `.mdx`).
2. Run the script with all the paths in one invocation so the user gets one consolidated pending review rather than N stacked ones.
3. On iteration 2 or later, pass `--replace` so prior pending reviews from the same user on this PR are deleted before posting the new one.
4. After the script exits, print the Review URL it reports back to the user.

Invocations:

```sh
# Single-file PR. Run from the repo root, or pass an absolute path to the script.
bun skills/reviewing/scripts/post-review.ts \
  /tmp/expo-docs-review-pr-{number}-{file-slug}.json

# Multi-file PR: pass every JSON from this PR in one call.
bun skills/reviewing/scripts/post-review.ts /tmp/expo-docs-review-pr-{N}-foo.json /tmp/expo-docs-review-pr-{N}-bar.json

# Iteration 2+: clear any prior pending review from the same user on this PR.
bun skills/reviewing/scripts/post-review.ts --replace /tmp/expo-docs-review-pr-{N}-foo.json

# Dry-run (skip the API call). Use when the user asked to "preview" or "dry-run".
bun skills/reviewing/scripts/post-review.ts --dry-run /tmp/expo-docs-review-pr-{N}-foo.json
```

Authentication: the script reads `GITHUB_TOKEN` if set, otherwise runs `gh auth token`. The token user owns the pending review (so it stays private until they submit).

**Skip the script and stop after Phase 3** when the user said "report only", "dry run", "don't post", "just write the report", or anything that signals they want the JSON without GitHub state. In that case, print the file paths and the command they can run later.

**The script never submits a review.** It POSTs without an `event` field, leaving the review in PENDING state. There is no submit/approve/comment/request-changes capability in this skill. Publication is exclusively a manual action the user takes on github.com.

### Pre-delivery quality checklist

Before invoking `post-review.ts`, walk through this checklist for each file's JSON report. If any item fails, fix it first.

- [ ] Every changed line in the PR diff was checked against every rule from the checklist references that names a pattern on that line.
- [ ] Every finding has a `rule_ref` that resolves to a real anchor in the reference files (no invented refs).
- [ ] Every finding has a concrete fix in the `body` — either a `suggestion` block, or a prose rewrite naming what to change.
- [ ] No finding was skipped because of PR size, perceived author skill, "feels mild", or "conceptually tied" — see the [Rationalizations Table](#rationalizations-table).
- [ ] Severity tags match the table in Phase 2 (`critical`/`design`/`suggestion`/`nit`).
- [ ] The verdict reflects the highest severity present (`needs-changes` if any `critical`/`design`, else `has-suggestions` if any `suggestion`, else `ready`).
- [ ] The `line_content` substring is 5-15 characters of the actual head-version line, not a paraphrase.
- [ ] Every comment body starts with the severity tag `**[<severity>]**` and ends the first line with a `rule_ref` in backticks.

## Rationalizations Table

Below are the excuses you might generate to skip a finding, paired with the corrective action. Cross-check every "skip" decision against this table. If the excuse you're constructing fits a row here, the corrective action wins — flag the finding.

| If you think...                                          | Then...                                                                                                                  |
| -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| "PR is small, no need to pile on"                        | PR size does not change which rules apply. Flag.                                                                         |
| "Violation is mild"                                      | Use the `nit` severity tag. Flag.                                                                                        |
| "The pairing is conceptually tied to platform names"     | The platform-order rule's carve-outs are explicit (table cells, headings, sentence-initial). Nothing else. Flag.         |
| "It's a list of one, but might grow later"               | Review the doc that's on the page now, not a hypothetical future doc. A list-of-one is a paragraph with weird formatting. Flag. |
| "The author probably knows this already"                 | Comments document the rule for future readers and for the public PR record. Flag.                                        |
| "Feels like piling on"                                   | Severity tags handle volume signaling. Flag at `nit` if needed; do not drop.                                              |
| "The fix is obvious from the rule alone"                 | Show the exact fix in the comment `body`. Don't drop.                                                                    |
| "Borderline, hard to call"                               | "Borderline" applies only when two rules conflict on the same line, or the rule itself names exceptions that arguably apply. Otherwise the rule applies. Flag, and acknowledge the real trade-off in the comment body if applicable. |
| "Style guide rule doesn't quite name this case"          | If the rule's pattern matches the line, the rule applies. The rule's exceptions are exhaustive. Flag.                    |
| "Author has good intent, this feels nitpicky"            | Intent doesn't change correctness. Severity reflects mechanical-ness (`nit`) not author-friendliness. Flag.              |
| "Including this would make the review too long"          | Length is a function of the diff. A long review on a long diff is correct; trimming for cosmetics drops real findings. Flag. |

## DO

- Prefix every comment `body` with the severity tag and rule reference. Format: `**[<severity>]** <explanation> (\`<rule-ref>\`).` This makes scanning the pending review fast.
- Use GitHub `suggestion` blocks for literal replacements (single-line or multi-line). The fence language must be exactly `suggestion`. See `expo-docs-review-comments.md` for details.
- **Be concise.** Each comment body should be 1-3 short sentences. Lead with the rule violation, follow with the fix.
- Read the PR title and body before reviewing. The author's stated intent shapes severity calls.
- Cross-reference base vs. head when a finding is ambiguous: is this violation **introduced by this PR**, or was it already there? Flag only the former.
- Cite the rule reference for every comment. The user must be able to look up the source.
- Propose the exact fix. Show the MDX or prose that should replace the flagged content.
- Treat tutorial pages differently than reference. The voice rules diverge.
- Respect `{/* vale off */}` blocks and `hideFromSearch: true`. Those are explicit opt-outs.
- Acknowledge real trade-offs in the comment body when borderlineness is genuine (see the borderline definition under the [Rationalizations Table](#rationalizations-table)). Do not justify the severity choice itself ("Suggestion rather than design because...") — that's noise on top of the tag.
- When the PR adds a component you have not seen before, read the source under `expo/docs/ui/components/` or `expo/docs/components/plugins/` before commenting on its usage.

## DON'T

- Submit, approve, comment, or request-changes on the review. The pending review created by `post-review.ts` must stay in PENDING state. Publication is exclusively a manual action the user takes on github.com.
- Invent exceptions to a rule. The rule's documented carve-outs are exhaustive. If a rule names a pattern on a line in the diff, flag it. See the [Rationalizations Table](#rationalizations-table) for common excuses and corrective actions.
- Invent a violation of a non-existent rule. Before flagging, confirm the rule you're about to cite explicitly **names or prohibits** what you're flagging. Two failure modes:
  1. **No rule at all.** The only rule you can cite is generic (`voice-and-tone`) for an issue that is not voice or tone (sentence fragments, apposition punctuation, modal hedging like "should"). The rule does not name your finding.
  2. **Rule covers the area but not the pattern.** The rule exists (`callouts`, `word-usage`) and the area matches, but the rule's prose and gotchas don't name your specific finding. Examples in a rule's reference are illustrative, not exhaustive: they show one valid form, they don't restrict other valid forms. `**info** **Tip:**` after the leading keyword is not forbidden by the callouts rule; spelling out `TypeScript (TS)` is not forbidden by the word-usage rule.

  In both cases, drop the finding rather than dressing up a stylistic preference as a rule citation. "Citing a rule" means matching the rule's named prohibitions, not citing the section heading. The over-flagging failure mode is the mirror of the under-flagging one: skipping cites a fake carve-out, over-flagging cites a fake rule. Both are invalid.
- Write a `suggestion` block that violates a rule you're supposed to enforce. Every `suggestion` block must pass the same review you would apply to the original. Specifically: no em dashes (`—`) — the Expo style guide prefers separate sentences over em dashes, and em dashes are banned outright in this user's writing. If the natural rewrite uses an em dash, restructure into separate sentences with periods. This rule applies to the comment `body` prose too, not just the `suggestion` block.
- Flag pre-existing violations outside the PR's diff. The author cannot act on noise from elsewhere in the file.
- Classify style preferences as `critical`. Reserve `critical` for things that break rendering or break examples.
- Suggest a component swap without naming the component and showing the import.
- Repeat findings from a prior iteration without re-evaluating them. The PR changed; check again.
- Comment on prose in API reference sections generated by `APISection`. Those are sourced from JSDoc in `expo/packages/`, not from the `.mdx`.
- Output prose suggestions as plain corrections. Use the `body` field to explain the rule and show the fix, so the user can decide whether to apply it.
- Review PRs your `gh` CLI is not authenticated for. If `gh pr view` returns an authentication error or "Could not resolve to a PullRequest", tell the user to run `gh auth status` / `gh auth refresh` and stop. v1 scope is public Expo PRs only.
