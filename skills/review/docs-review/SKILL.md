---
name: docs-review
description: Review an Expo docs pull request against the Expo writing style guide and MDX component conventions, and stage the findings as a private pending GitHub review (never auto-submitted). MUST USE when the user provides a GitHub PR URL and says "review this pr", "review this docs pr", "audit this pr", "check this pr against the style guide", or "/docs-review". Public PRs only.
license: MIT
version: "1.8.26"
---

# Expo Docs Review

**Context before critique. Read the PR description and the changed file in full before flagging individual lines.**

## When NOT to Use

- The PR touches files outside `expo/docs/pages/`. This skill only knows about `.mdx` files under that path.
- The PR is on a private repo or GitHub Enterprise. Public Expo PRs only.
- `gh pr view` returns an authentication error or "Could not resolve to a PullRequest". Tell the user to run `gh auth status` / `gh auth refresh` and stop.

## Input

A public GitHub PR URL. Accepted forms:

- `https://github.com/expo/expo/pull/30000`
- `expo/expo#30000`
- A bare PR number, when the user has already established the repo in context

## References

- **`../../authoring/docs-writing-style/references/style-guide.md`** — prose: voice, tone, punctuation, formatting, glossary, anti-patterns.
- **`../../authoring/docs-components/references/components.md`** — MDX components: catalog, mandatory-usage rules, prop tables, gotchas.
- **`../../../references/expo-docs-review-comments.md`** — comment body format: severity tag, `suggestion` blocks, single vs. multi-line.
- **`../../../references/expo-docs-review-output.md`** — output: JSON schema, GitHub-API fields, verdict mapping.

## Four-phase workflow

### Phase 1: Fetch and Context

Use the `gh` CLI for GitHub fetches.

1. **Resolve the PR.** Parse `{owner}/{repo}/{number}` from the user's input.
2. **Fetch PR metadata:**

   ```sh
   gh pr view {number} --repo {owner}/{repo} --json title,body,baseRefOid,headRefOid,author,files
   ```

3. **Fetch the diff:**

   ```sh
   gh pr diff {number} --repo {owner}/{repo}
   ```

   Build the list of `.mdx` files under `expo/docs/pages/` that the PR changes.

4. **For each changed `.mdx` file, fetch the head-version content:**

   ```sh
   gh api repos/{owner}/{repo}/contents/{path}?ref={head_sha} \
     -H "Accept: application/vnd.github.raw"
   ```

5. **Read the PR title and body.**
6. **Note the page type for each file:** tutorial (`pages/tutorial/`, `pages/get-started/`), guide (`pages/guides/`, `pages/router/`), SDK reference (`pages/versions/{ver}/sdk/`). Tutorials allow "we"/"our"; reference does not.

### Phase 2: Analyze

For each changed `.mdx` file, walk the two checklist references and check the rules that apply. Review lines added or modified in this PR's diff; pre-existing violations are out of scope. Content moved within a file (deletion + addition of the same lines) counts as modified.

Classify findings into four severity buckets:

| Severity     | Definition                                                                                       |
| ------------ | ------------------------------------------------------------------------------------------------ |
| `critical`   | Breaks rendering or breaks an example. Missing `dependencies` on `SnackInline`. Indented JSX inside `<Tab>`. Blank-line rule violated in `ConfigPluginExample`. Broken internal link. Wrong import path on a component. |
| `design`     | Wrong component for the pattern. Bare ```` ```sh ```` block instead of `Terminal`. Numbered Markdown list instead of `Step` wrappers. "click here" link instead of descriptive `BoxLink`. Hand-authored API section that `APISection` would generate. |
| `suggestion` | Could be sharper. Sentence longer than ~25 words. Passive voice where active works. First-person plural outside a tutorial. Missing intro example before explanation. |
| `nit`        | Mechanical. Missing Oxford comma. "iOS and Android" instead of "Android, iOS, and Web". Vague link text like "here" or "this page". |

Every finding needs:

- The rule that was violated, cited by reference file and section anchor (`components.md#terminal`, `style-guide.md#platform-order`).
- The exact fix, not just the violation. "Wrap the install command in `<Terminal cmd={['$ npx expo install expo-camera']} />`", not "use Terminal".
- A `line_content` substring (5-15 chars of the actual line) so the next iteration can re-resolve after new commits.
- The `line` number in the **head version** of the file.

### Phase 3: Output

Write two files per changed `.mdx`:

- `/tmp/expo-docs-review-pr-{number}-{file-slug}.json` (source of truth)
- `/tmp/expo-docs-review-pr-{number}-{file-slug}.md` (human-readable)

`{file-slug}` is the file path with slashes replaced by dashes, no extension. Example: `docs/pages/guides/errors.mdx` becomes `docs-pages-guides-errors`.

Print a one-line summary per file to stdout with the verdict and path to the Markdown report.

Schema in `expo-docs-review-output.md`.

## Iteration

When the user asks to re-review (`--iteration 2`, "review again", "iteration 2"):

1. Read the prior JSON at `/tmp/expo-docs-review-pr-{number}-*.json` (one per file).
2. Re-fetch the PR metadata. If `head.sha` matches the prior `head_sha`, tell the user there are no new commits and ask whether to re-review anyway.
3. If `head.sha` is new, re-fetch the diff and head-version files.
4. For each prior comment in each file:
   - Search the new head-version of the file for the `line_content` substring within ~10 lines of the prior `line` number. If found, re-check whether the rule still applies. If not found, mark `resolved: true`.
   - If the comment's line is no longer in the PR's changed range, mark `resolved: true`.
5. Add new findings introduced by the new commits.
6. Bump `iteration` in each file's JSON and rewrite both files.

## Phase 4: Post findings to GitHub as a pending review

After writing the reports, invoke `post-review.ts` to stage the findings as a **PENDING** review on the PR. PENDING reviews are private to the GitHub account that owns the token (the user) and are not visible to the PR author or anyone else until the user clicks **Submit review** on github.com. The script POSTs without an `event` field, so the review cannot become public via this skill under any code path.

1. Collect every JSON path written in Phase 3 for this PR (one per changed `.mdx`).
2. Run the script with all the paths in one invocation so the user gets one consolidated pending review rather than N stacked ones.
3. On iteration 2 or later, pass `--replace` so prior pending reviews from the same user on this PR are deleted before posting the new one.
4. After the script exits, print the Review URL it reports back to the user.

Invocation:

```sh
bun skills/review/scripts/post-review.ts /tmp/expo-docs-review-pr-{N}-foo.json /tmp/expo-docs-review-pr-{N}-bar.json
```

Use `--replace` on iteration 2+ to clear prior pending reviews. Use `--dry-run` to skip the API call.

**Skip the script and stop after Phase 3** when the user said "report only", "dry run", "don't post", "just write the report", or anything that signals they want the JSON without GitHub state. In that case, print the file paths and the command they can run later.

## DO

- Cross-reference base vs. head when a finding is ambiguous: is this violation **introduced by this PR**, or was it already there? Flag only the former.
- Treat tutorial pages differently than reference. The voice rules diverge.
- Respect `{/* vale off */}` blocks and `hideFromSearch: true`. Those are explicit opt-outs.
- When the PR adds a component you have not seen before, read the source under `expo/docs/ui/components/` or `expo/docs/components/plugins/` before commenting on its usage.

## DON'T

- Submit, approve, comment, or request-changes on the review. Pending only; the user submits on github.com.
- Skip a finding because of PR size, author intent, perceived nitpickiness, or "feels mild". None of those change whether a rule applies. Severity tags exist to signal volume. If a rule names a pattern on a line, flag it. Use `nit` if appropriate, but flag.
- Invent a violation of a non-existent rule. Before flagging, confirm the rule you're about to cite explicitly **names or prohibits** what you're flagging.
  1. **No rule at all.** The only rule you can cite is generic (`voice-and-tone`) for an issue that is not voice or tone (sentence fragments, apposition punctuation, modal hedging like "should"). Drop.
  2. **Rule covers the area but not the pattern.** The rule exists (`callouts`, `word-usage`) and the area matches, but the rule's prose and gotchas don't name your specific finding. Examples are illustrative, not exhaustive: `**info** **Tip:**` is not forbidden by the callouts rule; spelling out `TypeScript (TS)` is not forbidden by the word-usage rule. Drop.
- Use em dashes (`—`) anywhere in skill output, including `suggestion` blocks and comment `body` prose. Restructure into separate sentences.
- Flag pre-existing violations outside the PR's diff. The author cannot act on noise from elsewhere in the file.
- Classify style preferences as `critical`. Reserve `critical` for things that break rendering or break examples.
- Suggest a component swap without naming the component and showing the import.
- Repeat findings from a prior iteration without re-evaluating them. The PR changed; check again.
- Comment on prose in API reference sections generated by `APISection`. Those are sourced from JSDoc in `expo/packages/`, not from the `.mdx`.
- Output prose suggestions as plain corrections. Use the `body` field to explain the rule and show the fix.
- Review PRs your `gh` CLI is not authenticated for. If `gh pr view` returns an authentication error or "Could not resolve to a PullRequest", tell the user to run `gh auth status` / `gh auth refresh` and stop.
