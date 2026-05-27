# Expo Docs Review — Output Format

The contract for the JSON + Markdown reports written by the `expo-docs-review` skill, and the verdict mapping used when staging a pending GitHub review.

The JSON file is the source of truth. The Markdown file is a human-readable rendering of the same data. The `post-review.ts` script consumes the JSON, never the Markdown.

## JSON schema

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

## GitHub-shaped fields

`path`, `line`, `side`, and `body` match GitHub's review-comments API shape exactly. They are consumed by `post-review.ts` when it POSTs the pending review.

- `path` repeats the top-level `file` value for every comment in this file's report. Identical across the array, but required per-comment by the API.
- `side` is always `"RIGHT"` because the skill only flags lines that were added or modified by the PR (the head version of the file). Deleted lines are out of scope.
- `start_line` and `start_side` are optional. Include both when the `suggestion` block replaces a multi-line range; omit both for single-line suggestions. `start_side` should match `side`.

## Verdict

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

## Markdown report shape

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
