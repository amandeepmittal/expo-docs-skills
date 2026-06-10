# Japanese style, vocabulary, and glossary for Expo docs translation

Read by docs-ja-translator at Step 2. Three parts: style and register rules, the do-not-translate vocabulary, and the per-term glossary, plus worked examples at the end.

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

## Cultural register (imperatives, subject, vocabulary)

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

When in doubt: leave the term in English and call it out in the report so the maintainer can decide.

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

## Worked examples

### BoxLink

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

`href`, `Icon`, and the component itself are unchanged. Only `title` and `description` text is translated. `Expo`, `Android`, `iOS`, `web` stay in English; spaces are inserted where Latin meets kana.

### Bold + colon

**Source:** `**Note:** This is important.`
**Target:** `**注：** これは重要です。` ← space after closing `**`

### Heading + link

**Source:** `## See [the API reference](/versions/latest/sdk/notifications/) for details.`
**Target:** `## 詳細は[API リファレンス](/versions/latest/sdk/notifications/)を参照してください。`

URL untouched; link text translated; heading marker preserved.
