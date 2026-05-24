---
name: expo-writing-style
description: Apply Expo's documentation writing style and MDX component conventions. MUST USE when writing or editing .mdx files under expo/docs/pages/, reviewing prose or component usage in docs PRs. Covers voice, tone, punctuation, headings, link text, capitalization, platform order, the Expo glossary, AND the MDX component catalog (Terminal, Tabs, Step, BoxLink, SnackInline, APISection, ConfigPluginExample, ProgressTracker, etc.). Does NOT cover API/TSDoc reference style. See expo-api-docs for that.
license: MIT
compatibility: Works with Claude Code, Cursor, and skills.sh-compatible agents.
metadata:
  author: amandeepmittal
  version: "1.3.0"
---

# Expo Writing Style

Apply Expo's documentation writing style and component conventions when authoring or reviewing content for `expo/docs/pages/`.

**Apply these conventions while drafting, not as a cleanup pass.**

## When to Use

- Drafting new docs pages (`.mdx` under `expo/docs/pages/`)
- Editing existing prose for tone, voice, or clarity
- Picking the right MDX component (`Terminal` vs. a plain code block, `Step` vs. a numbered list, `Tabs` vs. duplicated snippets)
- Reviewing PRs to expo/docs/
- Translating draft prose into Expo's voice

## How to apply

Two reference files live next to this skill. Read the one that matches the task. When a change touches both prose and components, consult both.

- **`../../../references/expo-docs-style-guide.md`**: prose rules. Voice, tone, punctuation, formatting, glossary, anti-patterns, and Expo-specific gotchas with concrete before/after examples.
- **`../../../references/expo-docs-components.md`**: MDX component catalog. Mandatory-usage rules, prop tables, minimal examples, and gotchas for `Terminal`, `Tabs`, `Step`, `Prerequisites`, `Collapsible`, `FAQ`, `BoxLink`, `SnackInline`, `ContentSpotlight`, `VideoBoxLink`, `APISection`, the `ConfigSection` trio, `AndroidPermissions` / `IOSPermissions`, `PlatformTags`, `ProgressTracker`, plus less common authoring components.

For deterministic checks (Oxford commas, spelling), run Vale from `expo/docs/` via `pnpm lint-prose` or `.vale/bin/vale`. The references cover what Vale cannot see.

## Quick principles

These are the highest-leverage rules. The references have the complete list.

1. **Write for the reader who is mid-task.** Short sentences, one idea per sentence, present tense, active voice.
2. **Be neutral and direct.** No marketing language. No first-person plural ("we" / "our") outside tutorials. No jargon when a common word works.
3. **Show, then tell.** Lead with a working example, then explain the why and how. Use visuals and code samples to demonstrate concepts rather than abstract descriptions.
4. **Second person, present tense, active voice.** Tutorial pages are the only exception that uses "we" / "our".
5. **Sentence case for headings**, title case for button labels. Bold for file and directory names.
6. **Platform order:** "Android, iOS, and Web".
7. **No marketing language**, no vague link text ("here", "learn more"), no emojis.
8. **Spell out symbols:** "and" instead of `&`, "plus" instead of `+`.
9. **Use components, not bare Markdown, where the catalog requires it.** `Terminal` for shell commands, `Step` for multi-stage procedures, `Tabs` for variants, `BoxLink` for cross-link cards, `SnackInline` for runnable examples, `APISection` for SDK reference content. See the components reference for the full mandatory-usage table.
