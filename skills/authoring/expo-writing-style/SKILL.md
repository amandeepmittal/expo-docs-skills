---
name: expo-writing-style
description: Apply Expo's documentation writing style guide to prose. MUST USE when writing or editing .mdx files under expo/docs/pages/, reviewing prose in docs PRs. Covers voice, tone, punctuation, headings, link text, capitalization, platform order, and the Expo glossary. Does NOT cover API/TSDoc reference style. See expo-api-docs for that.
license: MIT
compatibility: Works with Claude Code, Cursor, and skills.sh-compatible agents.
metadata:
  author: amandeepmittal
  version: "1.1.0"
---

# Expo Writing Style

Apply Expo's documentation writing style when authoring or reviewing prose for `expo/docs/pages/`.

**Apply these conventions while drafting, not as a cleanup pass.**

## Core Principles

1. **Write for the reader who is mid-task.** Short sentences, one idea per sentence, present tense, active voice.
2. **Be neutral and direct.** No marketing language. No first-person plural ("we" / "our") outside tutorials. No jargon when a common word works.
3. **Show, then tell.** Lead with a working example, then explain the why and how. Use visuals and code samples to demonstrate concepts rather than abstract descriptions.

## When to Use

- Drafting new docs pages (`.mdx` under `expo/docs/pages/`)
- Editing existing prose for tone, voice, or clarity
- Reviewing PRs to expo/docs/
- Translating draft prose into Expo's voice

## How to apply

Before writing or reviewing, **read `../../../references/expo-docs-style-guide.md`** (relative to this SKILL.md). It is the full rule set, including voice, tone, punctuation, formatting, glossary, anti-patterns, and Expo-specific gotchas with concrete before/after examples.

For deterministic checks (Oxford commas, em dash entities, spelling), run Vale from `expo/docs/` via `pnpm lint-prose` or `.vale/bin/vale`. The reference covers what Vale cannot see.

## Quick principles

These are the highest-leverage rules. The reference has the complete list.

1. **Second person, present tense, active voice.** Tutorial pages are the only exception that uses "we" / "our".
2. **Sentence case for headings**, title case for button labels. Bold for file and directory names.
3. **`&mdash;` entity** instead of the literal `—` character. Never paste the literal.
4. **Platform order:** "Android, iOS, and Web".
5. **No marketing language**, no vague link text ("here", "learn more"), no emojis.
6. **Spell out symbols:** "and" instead of `&`, "plus" instead of `+`.

For TSDoc and API reference style, use the `expo-api-docs` skill instead.
