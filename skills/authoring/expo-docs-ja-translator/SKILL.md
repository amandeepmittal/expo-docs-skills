---
name: expo-docs-ja-translator
description: Translate Expo MDX docs pages from English to Japanese. Use when the user asks to translate a docs page to Japanese, says "translate to ja", "ja translate", "translate this page (to Japanese)", or "/expo-docs-ja-translator". Outputs to `pages/ja/<same-path>` mirroring the English source. Preserves frontmatter keys, JSX tags, code blocks, links, and import statements; translates prose, headings, link text, and string-valued JSX props (title, description, summary).
---

# expo-docs-ja-translator

Translate one Expo MDX docs page from English to Japanese. Output to `pages/ja/<same-path>` mirroring the English source path.

This skill is Expo-specific: it knows the product vocabulary, the custom JSX components used in Expo MDX, the formatting rules MDX requires for Japanese text, and the structural invariants that the rendered page depends on.

## When to use

- User pastes or names a single English MDX path under `expo/docs/pages/...` and asks for a Japanese version.
- User says "translate this page", "translate to ja", "ja translate", "/expo-docs-ja-translator".

## When NOT to use

- Translating UI strings in `messages/*.json` — that's react-intl chrome, not docs prose. Edit those files directly.
- API reference pages auto-generated from JSDoc — those are not authored MDX prose.
- Bulk translation of many pages at once — run this skill once per page so each page can be reviewed.

## Inputs

- **Source file path:** absolute or repo-relative path to an MDX page under `expo/docs/pages/...`. If the user does not provide one, ask for it.
- **Output path (auto-derived):** `expo/docs/pages/ja/<same subpath>`. Confirm before writing if the target file already exists.

## Workflow

### Step 1 — Read the source

Read the full English MDX file. Note:
- Frontmatter keys (`title`, `sidebar_title`, `description`, `hideTOC`, etc.).
- Top-of-file `import` statements.
- Every JSX component used (`<BoxLink>`, `<Step>`, `<Tabs>`, `<Terminal>`, `<ContentSpotlight>`, `<APIBox>`, `<Collapsible>`, `<Diagram>`, `<FileTree>`, `<DiffBlock>`).
- Every fenced code block.
- Every Markdown heading.
- Every link target.

### Step 2 — Translate

Translate to Japanese following the rules in **Translation rules** and **Japanese style**. Use the **Do-not-translate list** verbatim. Use the **Glossary** for recurring tutorial terms so wording stays consistent across pages.

### Step 3 — Self-check (structural diff)

Before saving, verify the translated output against the English source:

| Count | Source | Target | Pass? |
| ----- | ------ | ------ | ----- |
| Markdown headings (`#`, `##`, `###`) | N | N | must match |
| Fenced code blocks (` ``` `) | N | N | must match |
| Top-level `import` lines | N | N | must match |
| JSX component opening tags | N | N | must match |
| Inline link count `[text](url)` | N | N | must match |
| Frontmatter keys | same set | same set | must match |

If any count differs, fix the translation before writing.

### Step 4 — Write the target file

Write to `expo/docs/pages/ja/<same subpath>`. Create parent directories as needed.

### Step 5 — Wire the page into i18n

After writing, update `expo/docs/common/i18n.ts`:

- Add the canonical path to `EXPO_TUTORIAL_PATHS` so the language switcher shows on the English page (only if the path falls inside the tutorial sections currently in scope).
- Add the canonical path to `PATHS_WITH_JAPANESE` so `<HreflangAlternates>` emits the alternate link tag. **Only add the path if the JA file has actually been written to disk in this run.** Removing this rule once means hreflang points at a 404.
- Add `<canonical-path>: <translated sidebar_title>` to `JA_SIDEBAR_TITLES` so the sidebar entry on `/ja/...` pages renders in Japanese instead of falling back to the English `sidebar_title` baked into `navigation.json`.

### Step 5b — Translate inline links and BoxLink hrefs

For every internal href encountered in the source (`<BoxLink href="...">`, `<A href="...">`, markdown `[text](url)`), check the target:

- **If the target's canonical path is in `PATHS_WITH_JAPANESE`** (after this run, including the path you just added): rewrite the href from `/foo` to `/ja/foo` so a JA reader stays in locale.
- **If the target's canonical path is NOT in `PATHS_WITH_JAPANESE`**: leave the href as the English path. The JA reader will fall back to the English page rather than 404.

This rule is file-level (the skill writes the translated href into the MDX). Component-level locale-aware rewriting is out of scope for the skill.

### Step 6 — Report

Tell the user:
- Source path → target path written.
- Structural-diff table from Step 3.
- Whether `common/i18n.ts` was updated and which constants were touched.
- Any **deferred** items (untranslatable strings, ambiguous terms, content that needs a Japanese reviewer's eye). Be explicit.

## Translation rules

### Do translate

- Body prose, paragraphs, list items.
- Markdown headings (`#`, `##`, `###`).
- Anchor link **text** in `[text](url)` — keep the URL untouched.
- The frontmatter values for `title`, `sidebar_title`, `description`, `summary`.
- String-valued JSX **props** that hold human-facing copy: `title`, `description`, `summary`, `label`, `placeholder`, `caption`. Translate the value; never rename the prop.
- Visible text **children** of components (e.g., the `Click here` inside `<A>Click here</A>`).

### Do NOT translate

- Frontmatter keys themselves (`title:`, `sidebar_title:`, `hideTOC:`).
- Frontmatter boolean / enum values (`true`, `false`, `null`, platform names).
- The contents of any fenced code block (` ``` … ``` `), including comments inside code, **unless** the user explicitly asks for code-comment translation.
- Inline backtick code spans (`` `expo install …` ``).
- JSX tag names, attribute names, component import paths.
- URL paths and href values inside `[text](url)`.
- File paths, package names, command-line flags, env-var names.
- The do-not-translate list below.

### MDX bold/italic spacing rule (CRITICAL)

When a `**bold**` or `*italic*` span is followed by Japanese punctuation or a word, you **must** keep the marker tight to the bolded text and ensure the markdown still parses:

- Correct: `**重要：** 続きの文章` (space after closing `**`)
- Wrong: `**重要：**続きの文章` (no space — breaks MDX rendering)

This applies to `**…**`, `*…*`, `__…__`, `_…_`. The Japanese full-width colon `：` is fine inside the bold span; the space matters after the closing marker.

### Code blocks

Treat fenced code blocks as opaque. Do not edit their contents. The terminal output, file contents, and command examples must be byte-identical to the source.

### Links and anchors

- `[text](url)` → translate `text`, keep `url` untouched.
- In-page anchors (`#some-heading`) keep their English slug — Expo docs slugs are derived from the **English** heading text via `rehype-slug`. Japanese page slugs are not regenerated; we link to the same URL space.
- External links: do not change the URL.

### JSX components (Expo allowlist)

These are the custom components used in Expo MDX. Do not change their tag names, attribute names, or `import` paths. Do translate the listed props.

| Component | Translatable props | Translatable children |
| --------- | ------------------ | --------------------- |
| `<BoxLink>` | `title`, `description` | — |
| `<Step>` | `label` | yes (body prose) |
| `<Tabs>` / `<Tab>` | `label` | yes |
| `<Collapsible>` | `summary` | yes |
| `<ContentSpotlight>` | `alt` | — |
| `<Diagram>` | `alt` | — |
| `<Terminal>` | none (commands are code) | — |
| `<DiffBlock>` | none | — |
| `<FileTree>` | none | — |
| `<APIBox>` | `header` | yes (description prose) |
| `<Prerequisites>` | — | yes |
| `<VideoBoxLink>` | `title`, `description` | — |
| `<A>` | — | yes (link text) |
| `<ProgressTracker>` | `chapterTitle`, `summary`, `nextChapterDescription`, `nextChapterTitle` | — |

For any custom component not listed: translate visible text children, keep all props untouched, and flag it in the Step 6 report so the maintainer can confirm.

**`<ProgressTracker>` special case:** the source MDX does not pass a `chapterTitle` prop. The component falls back to a hardcoded English chapter title from `TutorialData.ts` (e.g., "Chapter 1: Create your first app"). For JA pages, **always add a `chapterTitle` prop** with the Japanese chapter title (e.g., `chapterTitle="第 1 章：最初のアプリを作成する"`) so the rendered card matches the rest of the page's locale.

## Do-not-translate list (product vocabulary)

Always keep these in English, even when surrounded by Japanese text:

**Expo and EAS:**
- Expo, Expo Go, Expo Router, Expo CLI, Expo SDK
- EAS, EAS Build, EAS Update, EAS Submit, EAS Workflows, EAS Hosting, EAS Insights
- expo-router, expo-modules, expo-dev-client, expo-notifications (and any `expo-*` package name)
- Continuous Native Generation, CNG, prebuild
- Development build (the term itself is fine to translate as 開発ビルド, but keep the noun phrase consistent across a single page; pick one and stick with it)

**React Native ecosystem:**
- React, React Native, React Native Web, JSX, TSX
- Metro, Hermes, JavaScriptCore, JSI, TurboModules, Fabric
- npm, pnpm, yarn, bun, Node.js
- Xcode, Android Studio, CocoaPods, Gradle
- iOS, Android, watchOS, tvOS, visionOS, web
- TypeScript, JavaScript, ESLint, Prettier

**Tooling and infra:**
- Git, GitHub, GitLab, Bitbucket
- Cloudflare, Vercel, Netlify, AWS, GCP
- Sentry, Datadog, PostHog
- Tailwind, NativeWind

**Generic CS terms that idiomatic Japanese tech docs leave in English:**
- API, SDK, CLI, UI, UX, URL, JSON, YAML, HTTP, HTTPS, WebSocket
- ID, UUID, JWT, OAuth, OIDC
- iOS Simulator, Android Emulator
- pull request, merge, commit, branch (these have Japanese equivalents but Expo's audience expects English)

When in doubt: leave the term in English and call it out in the Step 6 report so the maintainer can decide.

## Japanese style

- **Register:** formal documentation tone. Prefer `です／ます調` (polite form) consistently. Do not mix with `だ／である調`. Do **not** use full keigo (尊敬語/謙譲語) — Japanese tech docs (React JP, Vue.js JP, MDN JP) all use plain 丁寧語. Full keigo reads as a stiff business letter.
- **Honorifics on the reader:** address the reader as `あなた` only when necessary; usually omit. Example: "You can install Expo CLI" → 「Expo CLI をインストールできます」, not 「あなたは Expo CLI をインストールできます」.
- **Mixed script:** acceptable and expected — leave product names, code identifiers, and common CS abbreviations in Latin script. Surround them with single-byte spaces when adjacent to Japanese characters: `Expo を使用` ✅, `Expoを使用` ❌.
- **Punctuation:**
  - Use 。 and 、 for prose.
  - Use full-width `：` after a label in bold (`**注：** …`) but full-width `？` and `！` in body prose. In code, all punctuation stays half-width.
  - Quotation marks: prefer 「」 for inline emphasis when no markdown formatting is appropriate.
- **Lists:** keep parallel structure. If the English item starts with an imperative verb, the Japanese item should also use the dictionary form (`～する`) or polite form consistently.
- **Numbers and dates:** keep half-width digits. Use Japanese reading order for dates only when reformatting is requested; otherwise mirror the source.
- **Sentence length:** prefer breaking long English sentences into shorter Japanese ones. Two short sentences are clearer than one nested clause.

### Cultural register (imperatives, subject, vocabulary)

Real Japanese tech docs (React JP, Vue.js JP, MDN JP) lean on a small set of conventions that make the prose feel native rather than translated. Apply these consistently.

**1. Subject is the topic, not the reader.** Omit `あなた` entirely. The product, page topic, or function is the implicit subject. Address the reader through verb mood (see imperative table), not pronouns.

- Avoid: 「あなたはコンポーネントをインポートできます」
- Prefer: 「コンポーネントをインポートできます」

**2. Imperative softening — pick the form by intent, don't default to `〜してください`.**

| Form | Use when… | Example |
| ---- | ---------- | ------- |
| `〜してみましょう` | tutorial step the reader does with you (most common in tutorials) | 「アプリを起動してみましょう」 |
| `〜してみてください` | softer "please try" — exploratory or optional | 「公式ドキュメントを参照してみてください」 |
| `〜できます` | replaces "you can …" — capability framing, not a command | 「`expo install` を使ってインストールできます」 |
| `〜してください` | direct, used **sparingly** for hard requirements or warnings | 「`node_modules` を削除してください」 |
| `お〜ください` | extra polite, for a choice the reader makes | 「お好みのスタイルをお選びください」 |

Default to `〜してみましょう` for tutorial steps. Reserve `〜してください` for "you must" moments. Mix `〜できます` in to vary rhythm.

**3. Use 和語 for general CS concepts; reserve katakana for Expo/RN-specific tech terms.** Over-katakana-ing reads as machine-translated.

| English | Prefer (和語) | Avoid (katakana) |
| ------- | ------------- | ---------------- |
| function | 関数 | ファンクション |
| argument / parameter | 引数 | アーギュメント／パラメーター |
| return value | 戻り値 | リターンバリュー |
| variable | 変数 | バリアブル |
| value | 値 | バリュー |
| string | 文字列 | ストリング |
| array | 配列 | アレイ |
| object (data) | オブジェクト ✓ keep | — |
| syntax | 構文 | シンタックス |
| condition | 条件 | コンディション |
| folder / directory | ディレクトリ ✓ keep | — |
| file | ファイル ✓ keep | — |
| screen | 画面 | スクリーン |
| button | ボタン ✓ keep | — |
| image | 画像 | イメージ |
| permission | 権限 | パーミッション |

Tech-specific terms stay katakana: コンポーネント, フック, プロパティ, モジュール, ライブラリ, フレームワーク, インターフェース.

**4. Capability and passive framing.** When the English says "you can X", "we will X", or describes what something does, prefer:

- `〜できます` (capability)
- `〜と呼ばれます` / `〜と呼ばれています` (passive — "is called …")
- `〜することができます` (slightly more formal capability)

Avoid translating "we will" / "we can" into 「私たちは〜」 — the first-person plural is rarely used in JP docs. Reframe as the topic-subject sentence ("In this chapter, we will learn X" → 「この章では X について学びます」, not 「私たちは X を学びます」).

**5. Tutorial flow words.** These connectors keep tutorial prose feeling like a guided session rather than a spec:

- 「それでは」 / 「では」 — "now then" / "let's", at the start of an action paragraph
- 「次に」 / 「続いて」 — "next" / "then"
- 「ここまでで」 — "so far" / "up to this point"
- 「これで」 — "with this" / "now"
- 「〜してみましょう」 endings — invites action

**Concrete before/after:**

| English | Robotic JP (avoid) | Native-feeling JP (prefer) |
| ------- | ------------------ | -------------------------- |
| "You can install it by running this command." | 「あなたはこのコマンドを実行することによってそれをインストールできます。」 | 「次のコマンドを実行してインストールできます。」 |
| "Now, let's run the app." | 「今、アプリを実行しましょう。」 | 「それでは、アプリを実行してみましょう。」 |
| "Add this code to the file." | 「このコードをファイルに追加してください。」 | 「次のコードをファイルに追加します。」 (declarative for inline tutorial steps) or 「〜追加してみましょう」 |
| "We will learn about state in this chapter." | 「私たちはこの章で state について学びます。」 | 「この章では state について学びます。」 |

## Glossary (tutorial-recurring terms)

Pick one Japanese rendering per term and use it consistently across a single page. The list below is a starting reference; deviate only with reason.

| English | Preferred Japanese |
| ------- | ------------------ |
| development build | 開発ビルド |
| production build | プロダクションビルド |
| internal distribution | 内部配布 |
| app config | アプリ設定 (or `app config` left in English when referring to `app.config.ts`) |
| config plugin | コンフィグプラグイン (keep "plugin" in katakana) |
| native module | ネイティブモジュール |
| development server | 開発サーバー |
| bundler | バンドラー |
| getting started | はじめに |
| overview | 概要 |
| introduction | はじめに (or 紹介 when "introduction" appears alongside a separate "getting started" page) |
| follow-up | 次のステップ |
| reference | リファレンス |
| guide | ガイド |
| tutorial | チュートリアル |
| step | ステップ |
| project | プロジェクト |
| dependency | 依存関係 |
| environment variable | 環境変数 |
| simulator | シミュレーター |
| emulator | エミュレーター |
| device | デバイス |
| build profile | ビルドプロファイル |
| update channel | アップデートチャンネル |
| over-the-air, OTA | OTA (keep) / OTA アップデート |

## Frontmatter handling

Translate string values for these keys; keep the keys themselves and any non-string values untouched:

- `title` → translate
- `sidebar_title` → translate (keep short — sidebar width is fixed)
- `description` → translate
- `summary` → translate
- `hideTOC`, `searchRank`, `searchPosition`, `modificationDate` → keep value untouched
- `platforms` → keep value untouched

## Examples

### Example: BoxLink

**Source:**
```mdx
<BoxLink
  title="Expo Tutorial"
  description="If you are new to Expo, we recommend starting with this tutorial. It provides a step-by-step guide on how to build an Expo app that runs on Android, iOS and web."
  href="/tutorial/introduction/"
  Icon={GraduationHat02DuotoneIcon}
/>
```

**Target:**
```mdx
<BoxLink
  title="Expo チュートリアル"
  description="Expo を初めて使う方には、このチュートリアルから始めることをおすすめします。Android、iOS、web で動作する Expo アプリの作り方をステップごとに解説します。"
  href="/tutorial/introduction/"
  Icon={GraduationHat02DuotoneIcon}
/>
```

Note: `href`, `Icon`, and the component itself are unchanged. Only `title` and `description` text is translated. `Expo`, `Android`, `iOS`, `web` stay in English; spaces are inserted where Latin meets kana.

### Example: bold + colon

**Source:** `**Note:** This is important.`
**Target:** `**注：** これは重要です。` ← space after closing `**`

### Example: heading + link

**Source:** `## See [the API reference](/versions/latest/sdk/notifications/) for details.`
**Target:** `## 詳細は[API リファレンス](/versions/latest/sdk/notifications/)を参照してください。`

URL untouched; link text translated; heading marker preserved.

## Output report (Step 6 template)

```
expo-docs-ja-translator — translation report

Source: pages/<path>.mdx
Target: pages/ja/<path>.mdx

Structural diff:
- Headings:        N source / N target
- Code fences:     N / N
- Imports:         N / N
- JSX tags:        N / N
- Inline links:    N / N
- Frontmatter:     keys identical

i18n.ts updates:
- EXPO_TUTORIAL_PATHS: <added | already present | not applicable>
- PATHS_WITH_JAPANESE: <added | already present>
- JA_SIDEBAR_TITLES: <"<path>": "<sidebar_title_ja>"> added | already present
- Internal href rewrites: <N hrefs rewritten to /ja/... | none — all targets untranslated>

Deferred for reviewer:
- <bullet list of any term, sentence, or component flagged>
- <or "none">
```

## Notes for the maintainer

- This skill is single-page by design. For batch translation, invoke it in a loop or fan out via parallel Agent calls — but each invocation handles one MDX file.
- Quality is bounded by the model's Japanese fluency. A native Japanese reviewer should still pass over any translation before it ships to production. Always flag terms you're unsure about in the Step 6 report rather than guessing.
- The do-not-translate list and glossary are living documents. When a Japanese reviewer corrects a term, update this skill so the next page picks up the fix.
