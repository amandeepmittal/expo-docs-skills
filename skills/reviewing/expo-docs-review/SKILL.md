---
name: expo-docs-review
description: Review an Expo docs pull request against the Expo writing style guide and MDX component conventions, and stage the findings as a private pending GitHub review (never auto-submitted). MUST USE when the user provides a GitHub PR URL and says "review this pr", "review this docs pr", "audit this pr", "check this pr against the style guide", or "/expo-docs-review". Produces one JSON + Markdown report per changed .mdx file at /tmp/expo-docs-review-pr-{number}-{file-slug}.{json,md} with severity-classified findings (critical, design, suggestion, nit), then invokes the shared skills/reviewing/scripts/post-review.ts script to stage the comments as a PENDING review (visible only to the user, requires manual submit on github.com to publish). Public PRs only. Iteration-aware: re-running re-fetches the PR, re-resolves prior findings via line_content matching, and replaces the prior pending review.
license: MIT
metadata:
  author: amandeepmittal
  version: "1.4.0"
---

# Expo Docs Review

Review a public Expo docs PR against the Expo writing style guide and MDX component conventions. Outputs one JSON + Markdown report per changed `.mdx` file to `/tmp/`, then stages the findings as a PENDING review on the PR via the shared `skills/reviewing/scripts/post-review.ts` script. The pending review is private to the user that runs the skill; publication (Approve / Comment / Request changes) is a manual action on github.com.

**Context before critique. Read the PR description and the changed file in full before flagging individual lines.**

## When to Use

- Reviewing a docs PR before commenting on it on GitHub
- Re-reviewing a PR after the author pushes new commits
- Calibrating a draft PR against the references without leaving a public trace

Not the right tool for: drafting (use `expo-writing-style`), broad prose audits across many local files, grammar/spelling sweeps. Also not for non-docs PRs. This skill only knows about `.mdx` files under `expo/docs/pages/`.

## Input

A public GitHub PR URL. Accepted forms:

- `https://github.com/expo/expo/pull/30000`
- `expo/expo#30000`
- A bare PR number, when the user has already established the repo in context

If `--iteration N` (or "iteration 2", "review again") is in the request, read the prior reports first, then re-fetch the PR.

Private repos and GitHub Enterprise are out of v1 scope by choice, not by technical limitation. `gh` could reach them if authenticated. v1 stays focused on public Expo PRs to keep the rule set and validation surface narrow.

## References

Two reference files live next to this skill. Both are the source of truth for the checklist. Read them before Phase 2.

- **`../../../references/expo-docs-style-guide.md`** for prose: voice, tone, punctuation, formatting, glossary, anti-patterns, Expo-specific gotchas with before/after examples.
- **`../../../references/expo-docs-components.md`** for MDX component usage: catalog, mandatory-usage rules, prop tables, examples, gotchas.

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

### Phase 2: Analyze

For each changed `.mdx` file, walk the two reference files and check the rules that apply. Scope:

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

#### Comment body format

Each comment's `body` field renders on GitHub's Files Changed tab. Write it so the severity and the rule are scannable at a glance and the fix is one-click-applicable when possible.

**First line is always the severity tag and rule reference:**

```
**[<severity>]** <explanation> (`<rule-ref>`).
```

**When the fix is a literal replacement of one or more contiguous lines**, follow the first line with a GitHub `suggestion` block. GitHub renders it as a green/red diff with a one-click **Commit suggestion** button:

````
**[nit]** File and directory names should be bold, not inline code (`expo-docs-style-guide.md#formatting-and-structure`). The same file follows this rule on line 69.

```suggestion
**android/gradle.properties**
```
````

**When the fix needs judgment** (split a sentence, restructure a paragraph, rewrite a heading), skip the `suggestion` block. The body is then a single paragraph or bullet list explaining the issue and the desired direction:

```
**[suggestion]** Sentence is 28 words with a nested parenthetical and a compound condition (`expo-docs-style-guide.md#voice-and-tone`). Consider splitting into two shorter sentences so the parallel between the two clauses lands on first read.
```

The fence language is critical: `` ```suggestion `` (not `` ```mdx ``, `` ```md ``, `` ```sh ``) is the only fence GitHub renders as an apply-button suggestion. For non-suggestion code samples inside a body, regular fences are fine.

**Multi-line suggestion blocks.** When the replacement spans more than one line in the head file, set `start_line` to the first line of the range and `line` to the last. Both must be on the same side (`start_side: "RIGHT"`, `side: "RIGHT"`). The `suggestion` block then replaces the entire `start_line`-through-`line` range with its contents, and GitHub still renders a single **Commit suggestion** button. Without `start_line`, the suggestion only replaces the single line at `line` — usually wrong for fixes like swapping a fenced code block for a `Terminal` component.

### Phase 3: Output

Write two files per changed `.mdx`:

- `/tmp/expo-docs-review-pr-{number}-{file-slug}.json` (source of truth, machine-readable)
- `/tmp/expo-docs-review-pr-{number}-{file-slug}.md` (human-readable, rendered from the JSON)

Where `{file-slug}` is the file path with slashes replaced by dashes, no extension. Example: `docs/pages/guides/errors.mdx` becomes `docs-pages-guides-errors`.

Print a one-line summary per file to stdout when done, with the verdict and path to the Markdown report. The user picks which report to read first.

#### JSON schema

```json
{
  "pr_url": "https://github.com/expo/expo/pull/30000",
  "pr_title": "...",
  "pr_author": "...",
  "owner": "expo",
  "repo": "expo",
  "pull_number": 30000,
  "base_sha": "abc123...",
  "head_sha": "def456...",
  "file": "docs/pages/guides/errors.mdx",
  "page_type": "guide",
  "iteration": 1,
  "summary": "Markdown summary of the review for this file. 2-3 sentences. Cover the highest-leverage findings.",
  "verdict": "ready | needs-changes | has-suggestions",
  "comments": [
    {
      "path": "docs/pages/guides/errors.mdx",
      "line": 42,
      "side": "RIGHT",
      "line_content": "Run npm install expo-camera",
      "severity": "design",
      "rule_ref": "expo-docs-components.md#terminal",
      "body": "**[design]** Shell commands must use the `Terminal` component (`expo-docs-components.md#terminal`).\n\n```suggestion\n<Terminal cmd={['$ npx expo install expo-camera']} />\n```",
      "resolved": false
    },
    {
      "path": "docs/pages/guides/errors.mdx",
      "line": 87,
      "start_line": 78,
      "side": "RIGHT",
      "start_side": "RIGHT",
      "line_content": "```bash",
      "severity": "design",
      "rule_ref": "expo-docs-components.md#mandatory-usage",
      "body": "**[design]** Replace the multi-line bash fence with a `Terminal` invocation.\n\n```suggestion\n<Terminal\n  cmd={[\n    '$ eas observe:events',\n  ]}\n/>\n```",
      "resolved": false
    }
  ]
}
```

**About the GitHub-shaped fields.** `path`, `line`, `side`, and `body` match GitHub's review-comments API shape exactly. They are consumed by Phase 4's `post-review.ts` script when it POSTs the pending review.

- `path` repeats the top-level `file` value for every comment in this file's report. Identical across the array, but required per-comment by the API.
- `side` is always `"RIGHT"` because the skill only flags lines that were added or modified by the PR (the head version of the file). Deleted lines are out of scope.
- `start_line` and `start_side` are optional. Include both when the suggestion replaces a multi-line range; omit both for single-line suggestions. `start_side` should match `side`.

#### Verdict

Agent judges per file, based on the findings for that file:

- `ready`: no `critical` or `design` findings. Only `nit`s and at most a couple of `suggestion`s.
- `has-suggestions`: `suggestion`s present, no `critical` or `design`.
- `needs-changes`: at least one `critical` or `design` finding.

The verdict values are docs-flavored. They are recorded in the JSON for the user's reference. `post-review.ts` does **not** consume the verdict (it cannot, because pending reviews do not carry an `event`). When the user submits the pending review on github.com, they pick the GitHub event manually. This mapping is the recommended choice:

| `verdict`         | Suggested GitHub event on submit |
| ----------------- | -------------------------------- |
| `ready`           | `Approve`                        |
| `has-suggestions` | `Comment`                        |
| `needs-changes`   | `Request changes`                |

#### Markdown report shape

```md
# Expo docs review: {file}

**PR:** [{pr_title}]({pr_url}) by @{pr_author}
**Verdict:** {verdict}  **Iteration:** {n}  **Page type:** {page_type}
**Head SHA:** `{head_sha[:7]}`

## Summary
{summary}

## Findings

### critical ({count})
- **Line {line}** ({rule_ref}): {body first line}

### design ({count})
...

### suggestion ({count})
...

### nit ({count})
...

## Resolved this iteration
- **Line {line}** ({rule_ref}): {body first line} [resolved at head_sha={short_sha}]
```

Group by severity, sorted within group by line number. If a section has zero findings, omit it. Resolved items from prior iterations go in `## Resolved this iteration` at the bottom.

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

## Posting findings to GitHub as a pending review

After writing the reports, invoke `post-review.ts` to stage the findings as a **PENDING** review on the PR. PENDING reviews are private to the GitHub account that owns the token (the user) and are not visible to the PR author or anyone else until the user clicks **Submit review** on github.com. The script POSTs without an `event` field, so the review cannot become public via this skill under any code path.

**Phase 4 (invoke the poster):**

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

## DO

- Prefix every comment `body` with the severity tag and rule reference. Format: `**[<severity>]** <explanation> (\`<rule-ref>\`).` This makes scanning the pending review fast: the user sees `[critical]`, `[design]`, `[suggestion]`, `[nit]` at the top of each comment without expanding it.
- Use GitHub `suggestion` blocks for literal one-or-more-line replacements. The fence language must be exactly `suggestion`, not `mdx` or `md`. GitHub renders these as one-click apply buttons; prose-with-code-fences does not get the apply button.
- **Be concise.** Each comment body should be 1-3 short sentences. Lead with the rule violation, follow with the fix (suggestion block or direct prose). If a finding needs more than 3 sentences to explain, it is either two findings or it does not belong as an inline comment. Trust the reader.
- Read the PR title and body before reviewing. The author's stated intent shapes severity calls.
- Cross-reference base vs. head when a finding is ambiguous: is this violation **introduced by this PR**, or was it already there? Flag only the former.
- Cite the rule reference for every comment. The user must be able to look up the source.
- Propose the exact fix. Show the MDX or prose that should replace the flagged content.
- Treat tutorial pages differently than reference. The voice rules diverge.
- Respect `{/* vale off */}` blocks and `hideFromSearch: true`. Those are explicit opt-outs.
- Acknowledge subject-matter trade-offs only when a rule is genuinely borderline. "Borderline" means one of two things: (a) two style guide rules conflict on the same line, or (b) the rule itself names exceptions that arguably apply. "I had to think about it" is not borderline — that's just the rule applying. When you find yourself constructing a reason a rule doesn't apply, the rule applies. When borderlineness is real, acknowledge the trade-off in the comment body ("This sentence is 28 words but reads cleanly because of the parallel structure"). Do not justify the severity choice itself ("Suggestion rather than design because..."). The severity tag at the top of the comment is the classification; meta-reasoning about it is noise.
- When the PR adds a component you have not seen before, read the source under `expo/docs/ui/components/` or `expo/docs/components/plugins/` before commenting on its usage.

## DON'T

- Submit, approve, comment, or request-changes on the review. The pending review created by `post-review.ts` must stay in PENDING state. Publication (Approve / Comment / Request changes) is exclusively a manual action the user takes on github.com after eyeballing each comment.
- Invent exceptions to a rule. The rule's documented carve-outs are exhaustive (for example, the platform-order rule exempts table cells, headings, and sentence-initial position — nothing else). If a rule names a pattern on a line in the diff, flag it. "PR is small", "violation is mild", "the pairing is conceptually tied", "feels like piling on", "the author probably knows" are not valid skip reasons. A review is a review; PR size does not change which rules apply.
- Flag pre-existing violations outside the PR's diff. The author cannot act on noise from elsewhere in the file.
- Classify style preferences as `critical`. Reserve `critical` for things that break rendering or break examples.
- Suggest a component swap without naming the component and showing the import.
- Repeat findings from a prior iteration without re-evaluating them. The PR changed; check again.
- Comment on prose in API reference sections generated by `APISection`. Those are sourced from JSDoc in `expo/packages/`, not from the `.mdx`.
- Output prose suggestions as plain corrections. Use the `body` field to explain the rule and show the fix, so the user can decide whether to apply it.
- Review PRs your `gh` CLI is not authenticated for. If `gh pr view` returns an authentication error or "Could not resolve to a PullRequest", tell the user to run `gh auth status` / `gh auth refresh` and stop. v1 scope is public Expo PRs only.
