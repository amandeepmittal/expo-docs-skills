---
name: docs-writing-style
version: 2.0.0
description: Apply Expo's documentation writing style. MUST USE when writing or editing .mdx files under expo/docs/pages/ or reviewing prose in docs PRs. Covers voice, tone, punctuation, headings, link text, capitalization, platform order, and the Expo glossary. For MDX component mechanics and props, use docs-components. Does NOT cover API/TSDoc reference style.
allowed-tools: Read, Grep, Glob, Edit, Write
---

# docs-writing-style

You are applying Expo's documentation writing conventions while authoring or reviewing content for `expo/docs/pages/`. Apply them while drafting, not as a cleanup pass.

## Step 1: Route the task

The prose rules live at `references/style-guide.md` inside this skill dir. Do not read the whole file for a single rule:

| Task | Read |
| --- | --- |
| Drafting or editing prose | The sections matching what you are writing (`grep "^## "` the reference for the list) |
| A specific rule (headings, link text, platform order, glossary term) | That section only |
| Component choice, props, or broken MDX markup | Not here: use the `docs-components` skill |

For deterministic checks (Oxford commas, spelling), run Vale from `expo/docs/` via `pnpm lint-prose`. The reference covers what Vale cannot see.

## Quick principles

The highest-leverage rules; the reference has the complete list.

1. **Write for the reader who is mid-task.** Short sentences, one idea per sentence, present tense, active voice.
2. **Be neutral and direct.** No marketing language. No first-person plural ("we" / "our") outside tutorials. No jargon when a common word works.
3. **Show, then tell.** Lead with a working example, then explain the why and how.
4. **Second person, present tense, active voice.** Tutorial pages are the only exception that uses "we" / "our".
5. **Sentence case for headings**, title case for button labels. Bold for file and directory names.
6. **Platform order:** "Android, iOS, and Web".
7. **No marketing language**, no vague link text ("here", "learn more"), no emojis.
8. **Spell out symbols:** "and" instead of `&`, "plus" instead of `+`.
9. **Use components, not bare Markdown, where required.** `Terminal` for shell commands, `Step` for procedures, `Tabs` for variants. The mandatory-usage table is in the `docs-components` catalog.

## Scope

Shape the prose you are writing or reviewing in the current task. Never sweep pages for violations (that belongs to the review skills, such as `expo-docs-review`). The component catalog is owned by `docs-components`; defer component questions there.
