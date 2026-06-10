---
name: docs-pr
version: 2.0.0
description: Write PR titles and descriptions for Expo docs repository pull requests, terse by default. Use when the user asks to "write a PR description" or "create a PR" for expo/docs; supports a --short mode that outputs only the How section.
argument-hint: "[--short]"
allowed-tools: Read, Grep, Glob, Bash(git diff:*), Bash(git log:*), Bash(git status:*)
---

# docs-pr

## Default length: terse

Always default to the shortest credible description. Aman almost always wants "short / tiny / concise" output; treat that as the baseline rather than a modifier the user has to add.

Expand beyond the terse defaults only when ONE of these holds:

- The PR touches 5+ unrelated areas.
- The user explicitly says "longer", "detailed", "with context", or asks follow-up questions.
- The diff genuinely needs context a reviewer cannot infer from the title.

If Why + How + Test Plan together exceed ~6 sentences, cut.

## Short mode (`--short`)

When the user passes `--short` or asks for the "short version", output only the `# How` section and nothing else. Skip the title, Why, Test Plan, and Checklist.

## PR Title Format

```
[docs] Short description of the change
```

- Always prefix with `[docs]`
- Keep it under 70 characters
- Use imperative mood (e.g., "Fix", "Add", "Remove", "Update")

## PR Description Format

The description must use these exact sections in this order, each as an H1 (`#`):

### Why

Default: 1 sentence stating the motivation. Add a second sentence only when the problem cannot be understood without it (e.g., quoting an error message or linking an issue). Do not restate the solution.

### How

Default: 1-2 sentences in prose describing the technical approach. Use inline code formatting for file names, function names, and config values. Keep it as one paragraph with no bullet lists, unless the PR spans 3+ unrelated changes; then group them with bold sub-headings, one line each.

### Test Plan

Default: 1-2 sentences in plain prose (no checkboxes, no nested lists). Name the specific page or feature to exercise and the expected result. Skip anything a reasonable reviewer would assume.

### Checklist

Always include this exact checklist at the end:

```markdown
- [ ] I added a `changelog.md` entry and rebuilt the package sources according to [this short guide](https://github.com/nicknisi/dotfiles/wiki/Pull-Request-Guidelines).
- [ ] This diff will work correctly for `npx expo prebuild` & EAS Build (eg: updated a module plugin).
- [ ] Conforms with the [Documentation Writing Style Guide](https://github.com/expo/expo/blob/main/guides/Expo%20Documentation%20Writing%20Style%20Guide.md).
```

When generating the final output, use `#` (H1) for the Why, How, Test Plan, and Checklist headings, not `##` (H2).

## Example

```markdown
# Why

Running `yarn lint` prints this warning on every run:

> (node:40346) ESLintPoorConcurrencyWarning: You may disable concurrency or use a numeric concurrency setting to improve performance.

It is a known, purely informational warning from ESLint v9+ that does not affect linting results, and suppressing it keeps the output readable.

# How

Suppress the `ESLintPoorConcurrencyWarning` noise from `yarn lint` output by adding `NODE_OPTIONS='--no-warnings'` to the lint script.

# Test Plan

Run `yarn lint` and confirm no warning is printed.

# Checklist

- [ ] I added a `changelog.md` entry and rebuilt the package sources according to [this short guide](https://github.com/nicknisi/dotfiles/wiki/Pull-Request-Guidelines).
- [ ] This diff will work correctly for `npx expo prebuild` & EAS Build (eg: updated a module plugin).
- [ ] Conforms with the [Documentation Writing Style Guide](https://github.com/expo/expo/blob/main/guides/Expo%20Documentation%20Writing%20Style%20Guide.md).
```

## Guidelines

- Never use em dashes or en dashes. Use hyphens, commas, or separate sentences instead.
- Do not enumerate every file touched. Group related edits into one phrase ("registers paths and titles in `common/i18n.ts`") rather than listing each function or constant separately.
- Generate text only. Never commit, push, or create the PR; the user handles git.
