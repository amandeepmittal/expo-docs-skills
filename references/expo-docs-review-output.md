# Expo Docs Review — Output Format

JSON + Markdown reports written by the skill. The JSON is the source of truth; `post-review.ts` consumes the JSON, never the Markdown.

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

`path`, `line`, `side`, and `body` match GitHub's review-comments API shape exactly. `post-review.ts` POSTs them directly.

- `side` is always `"RIGHT"` (skill only flags added/modified lines). Deleted lines are out of scope.
- `start_line` and `start_side` are optional. Include both when the `suggestion` block replaces a multi-line range; omit both for single-line. `start_side` matches `side`.

## Verdict

Agent judges per file, based on the findings for that file:

- `ready`: no `critical` or `design` findings. Only `nit`s and at most a couple of `suggestion`s.
- `has-suggestions`: `suggestion`s present, no `critical` or `design`.
- `needs-changes`: at least one `critical` or `design` finding.

Recommended GitHub event when submitting:

| `verdict`         | Suggested GitHub event on submit |
| ----------------- | -------------------------------- |
| `ready`           | `Approve`                        |
| `has-suggestions` | `Comment`                        |
| `needs-changes`   | `Request changes`                |

