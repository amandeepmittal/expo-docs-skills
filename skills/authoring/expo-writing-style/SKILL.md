---
name: expo-writing-style
description: Apply Expo's documentation writing style guide to prose. MUST USE when writing or editing .mdx files under expo/docs/pages/, reviewing prose in docs PRs. Covers voice, tone, punctuation, headings, link text, capitalization, platform order, and the Expo glossary. Does NOT cover API/TSDoc reference style. See expo-api-docs for that.
license: MIT
compatibility: Works with Claude Code, Cursor, and skills.sh-compatible agents.
metadata:
  author: amandeepmittal
  version: "1.0.0"
---

# Expo Writing Style

Apply Expo's documentation writing style guidelines when writing, authoring or reviewing prose. These rules distill the [Expo Documentation Writing Style Guide](https://github.com/expo/expo/blob/main/guides/Expo%20Documentation%20Writing%20Style%20Guide.md) in the expo/expo monorepo on GitHub.

**Apply these conventions while drafting, not as a cleanup pass.**

## When to Use

- Drafting new docs pages (`.mdx` under `expo/docs/pages/`)
- Editing existing prose for tone, voice, or clarity
- Reviewing PRs to expo/docs/
- Translating draft prose into Expo's voice

For deterministic checks (Oxford commas, em dash entities, spelling), run Vale from `expo/docs/` via `pnpm lint-prose` or `.vale/bin/vale`. This skill covers what Vale cannot see.

## Core Principles

1. **Write for the reader who is mid-task.** Short sentences, one idea per sentence, present tense, active voice.
2. **Be neutral and direct.** No marketing language. No first-person plural ("we" / "our") outside tutorials. No jargon when a common word works.
3. **Show, then tell.** Lead with a working example, then explain the why and how. Use visuals and code samples to demonstrate concepts rather than abstract descriptions.

## Voice and tone

- Use **second person** ("you do X") in general docs. Use **third-person declarative** ("Returns Y") in API reference.
- Use **present tense.** "Expo Router resolves the path" not "Expo Router will resolve the path".
- Use **active voice.** "The build fails" not "The build is failed".
- One thought per sentence. Two clauses joined by "and" is usually two sentences.
- **Tutorial exception:** tutorial pages use "we" / "our" by convention. Non-tutorial pages do not.
- **Gender-neutral language.** Use "they" as a singular pronoun. When addressing readers collectively, use "developers" or "app users" rather than gendered terms.

Before:

> We will be exploring how you can configure your app's icon. Our team has provided several recommended approaches that developers can leverage.

After:

> Configure your app icon using one of the approaches below.

## Word usage

- **Abbreviations on first mention.** Spell out abbreviations the first time they appear on a page, then use the short form: "source (src)". Common abbreviations that do not require expansion include HTML, JPEG, HTTP, PNG, URL, npm, CSV, and the build artifact extensions `.ipa`, `.apk`, and `.aab`.
- **App vs. application vs. project.** Use "app" or "application" interchangeably for the built artifact (`.ipa`, `.apk`, `.aab`). Use "project" for the source repository before it has been built. Example: "EAS Build takes a project and produces an app".
- **Bytes and bits.** Always capital `B` for bytes (`kB`, `MB`, `GB`, `TB`). Lowercase `b` for bits (`kbit`, `Mbit`, `Gbit`). Insert a space between the number and unit: `10 MiB`, not `10MiB`.

## Punctuation

- **Double quotes** in prose. Single quotes only in code.
- **Oxford commas** in lists, except in headings.
- **Em dashes:** write the HTML entity `&mdash;`. Never paste the literal `—` character. The literal is an AI-writing tell. Also, don't over use it. If you find yourself writing multiple em dashes in a paragraph, consider breaking it up into sentences.
- **Spell out symbols.** Write "and" instead of `&`, and "plus" instead of `+`, in prose, headings, tables, and navigation. Exception: keyboard shortcuts use a literal `+` between keys.
- Latin abbreviations: write **"that is"** and **"for example"** instead of "i.e." and "e.g."
- **Apostrophes and possessives:** singular nouns add `'s` ("Expo's logo"). Plural nouns ending in "s" add only `'` ("the developers' guide"). Pronoun possessives (`its`, `hers`, `theirs`, `yours`) never take an apostrophe.
- **Phrase splitting.** When breaking up a complex thought, prefer separate sentences over em dashes or comma chains. Use connectors like "then" or "however" when continuity matters.
- **No space around `/`.** Write "Android device/emulator", not "Android device / emulator".

## Formatting and structure

- **Headings:** H2 (`##`) is the top level on a page. The frontmatter `title` handles the H1.
- **Sentence case** for headings. Product names stay capitalized: _"Configuring Expo Router"_, not _"Configuring expo router"_.
- **Title case** for button labels in instructions: _"Click Get Started"_, not _"Click get started"_.
- **File and directory names** in bold (`**app.json**`, `**ios/**`), not inline code.
- **Inline code** is for code: identifiers, values, commands, methods, and variables.
- **Link text describes the destination.** Never _"here"_ or _"learn more"_. Write _"see the EAS Build configuration reference"_.
- **Internal links preferred** when both internal and external options exist.
- **Expo FYI links** use the shorthand URL `https://expo.fyi/<slug>` rather than the full GitHub path (`https://github.com/expo/fyi/blob/main/<slug>.md`).
- **Alt text** is required on every image and video.
- **Do not skip heading levels.** No H4 directly under H2.
- **Numbered lists start with `1`**, not `0`.
- **Collapsibles** do not use a bullet point when they contain a single item.
- **Keyboard shortcuts.** Format with `<kbd>` elements and a literal `+` between keys: `<kbd>Cmd ⌘</kbd> + <kbd>T</kbd>` for macOS, `<kbd>Ctrl</kbd> + <kbd>T</kbd>` for Windows.
- **Visualization tools.** Use diagrams for relationships between components, screenshots to confirm visual features, videos for flows and interactions, and `<SnackInline>` blocks for runnable code examples.
- **Callouts.** Use `> **info**`, `> **warning**`, or `> **note**` for inline alerts. Keep each callout to a single paragraph. Fold longer prose into the main flow.
- **Code blocks.** Open fenced blocks with a language tag (`ts`, `tsx`, `js`, `json`, `swift`, `kotlin`, `sh`). When the code belongs to a specific file, append the path after the language tag: ` ```ts app/(tabs)/index.tsx `.
- **SDK version range callouts.** When content applies only to a specific SDK range, prefer the version-range callout component over inline phrasing like "in SDK 55 and earlier".

Before:

> Read more [here](/eas/workflows/).

After:

> See the [EAS Workflows reference](/eas/workflows/).

## Glossary and product names

| Term                    | Use                                                       | Avoid                                            |
| ----------------------- | --------------------------------------------------------- | ------------------------------------------------ |
| Expo Go                 | "test in Expo Go"                                         | "run / develop / preview in Expo Go"             |
| Expo Libraries          | preferred for user-facing docs                            | "Expo modules" outside technical contexts        |
| EAS Workflows           | always plural                                             | "EAS Workflow"                                   |
| app config              | generic term                                              | "app.json" (only when the specific file matters) |
| Apple App Store         | proper noun, capitalized                                  | "the app store" (generic)                        |
| Google Play Store       | proper noun, capitalized                                  | "the play store" (generic)                       |
| app stores              | lowercase as generic                                      | "App Stores"                                     |
| npm                     | lowercase                                                 | "NPM" or "Npm"                                   |
| React Native            | two words, both capitalized                               | "react-native" in prose, "Reactive Native"       |
| TypeScript              | one word, two caps                                        | "Typescript", "typescript" in prose              |
| JavaScript              | one word, two caps                                        | "Javascript"                                     |
| CocoaPods               | one word, two caps                                        | "Cocoa Pods", "cocoapods"                        |
| macOS                   | lowercase m                                               | "MacOS", "Mac OS"                                |
| GitHub                  | two caps                                                  | "Github"                                         |
| managed workflow        | Expo projects that use Continuous Native Generation (CNG) | "managed workflow" (deprecated term)             |
| bare apps/bare workflow | Existing React Native apps                                | "bare workflow" (deprecated term)                |
| custom clients          | synonym for development builds                            | n/a — both names are valid, just be consistent   |
| standalone build        | production build submitted to app stores                  | "release build" (Android-only term)              |
| SDK 56 and later        | preferred for version ranges                              | "SDK 56 and above"                               |
| Android, iOS, and Web   | platform order in prose                                   | "iOS and Android" or "Web, iOS, Android"         |

### Term meanings

When usage is ambiguous, follow these definitions:

- **Module.** An Expo module is a unit of code packaged for use in multiple apps. May or may not include native code. Distinct from a JavaScript module (an ESM file) and from a React Native module.
- **Library.** Code that app developers call into. In Expo, "Expo SDK Libraries" is the user-facing synonym for "Expo modules".
- **Archive.** A compressed file set (zip, tar). An iOS archive is a `.ipa` file.
- **Bundle.** An Android bundle is a `.aab` file submitted to Google Play. A JavaScript bundle is application code and dependencies combined by a bundler.

## Anti-patterns

- **Literal em dash character (`—`)** in prose. Use `&mdash;` instead. Catches AI-written drafts.
- **Emojis** in docs prose. Do not use them in headings, callouts, tables, or body text.
- **First-person plural** ("we", "our") in non-tutorial docs.
- **Marketing adjectives:** "seamlessly", "effortlessly", "powerful", "robust".
- **Vague link text:** "here", "learn more", "this guide".
- **Outdated workflow terms:** "managed workflow", "bare workflow". Use "Expo project" or describe the specific configuration.
- **Multi-paragraph callouts.** Keep `> **info**` and `> **warning**` blocks to one paragraph. Move longer prose into the main flow.

## Expo-specific gotchas

- **Unescaped braces in MDX** (`{...}`) render as JSX expressions. Escape with backticks or use a fenced code block.
- **Heading anchors** are auto-generated from heading text. Renaming a heading breaks every inbound link to that anchor.
- **`<Terminal cmd={{ npm, yarn, pnpm, bun }}>`** is the standard for install commands. Single-string `cmd` is acceptable only for one-off shell commands.
- **Snack examples** require `<SnackInline>` with a `dependencies` array that lists every package the snippet imports.
- **Versioned vs. unversioned pages:** edits to `expo/docs/pages/versions/v56.0.0/...` apply to that SDK only. Files under `expo/docs/pages/versions/latest/...` are mirrored from the current versioned directory and should not be edited directly.

---

## Quick Reference

**Do:**

- Second person, present tense, active voice
- Sentence case headings, title case button labels
- Bold for file and directory names
- Descriptive link text
- `&mdash;` entity instead of `—`
- Platform order: Android, iOS, and Web

**Don't:**

- Use literal `—`, marketing adjectives, or vague link text
- Write "we" / "our" outside tutorials
- Skip heading levels
- Use "managed workflow" or "bare workflow"
- Mix product casing (write "macOS", "GitHub", "React Native", not "MacOS" / "Github" / "reactnative")
- Reference specific SDK version numbers in version-agnostic pages
