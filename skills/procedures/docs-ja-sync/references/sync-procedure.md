# docs-ja-sync :: apply procedure

How to bring one drifted translation back in line with its English source. Read
this before editing any `pages/ja/...` file. The translation rules themselves
(register, glossary, do-not-translate vocabulary, JSX prop allowlist) live in
`../../authoring/docs-ja-translator/references/japanese-style.md`; this document
is only about turning an English *diff* into the matching Japanese edit.

## 1. Get the exact upstream change

For a `DRIFT <locale> <source_path> <n>` line, read the precise English hunks
that landed since the watermark:

```sh
git -C <docs_repo> diff <syncedFromCommit>..HEAD -- <source_path>
```

`<syncedFromCommit>` is that page's value in `manifest.json`. Also read the full
current English file and the current Japanese file. You are applying the diff to
the Japanese file, not retranslating it.

## 2. Classify every hunk

Each changed hunk falls into one bucket. Handle by bucket, never blanket-translate.

| Hunk touches | Do in the Japanese file |
| --- | --- |
| **Body prose / headings / list items** | Translate per `japanese-style.md` and replace the corresponding Japanese passage. |
| **Code inside a fenced block** (the actual TS/TSX/JSON) | Apply the **byte-identical** code change. Code never differs across locales. |
| **`@tutinfo … */` tooltip text** | This is prose riding inside a code comment. Translate the tooltip text to Japanese; keep the `/* @tutinfo `, `*/`, and `/* @end */` delimiters and the code they wrap identical. |
| **Structural MDX** (`{/* prettier-ignore */}`, import lines, JSX tags, `<ContentSpotlight>` files, anchors) | Mirror exactly. Only translatable props (see the allowlist in `japanese-style.md`) get translated values. |
| **Frontmatter** | Translate values of `title` / `sidebar_title` / `description` / `summary`; mirror keys and non-string values verbatim. If `sidebar_title` changed, also update `JA_SIDEBAR_TITLES` in `common/i18n.ts`. |
| **Links `[text](url)`** | Translate `text`, keep `url`. If the target is itself a translated page (in `PATHS_WITH_JAPANESE`), the href should be `/ja/...`; otherwise leave the English path. |

### The `@tutinfo` case is the common one and the easy one to get wrong

Tutorial edits frequently add or change green-highlight annotations. The code is
identical across locales, but the **tooltip text is translated prose**. Inline-code
markup inside tooltips is **context-dependent** — match the English source, which
follows the same split:

- **Inside `@tutinfo … */` tooltip text** (it rides inside a code-block comment):
  use Markdown backticks (`` `Gesture` ``). Do **not** use `<CODE>…</CODE>` here —
  the tags don't render in the tooltip and appear literally as escaped
  `&lt;CODE&gt;` text.
- **Inside JSX children** — `<Collapsible summary={<>…</>}>`,
  `<ProgressTracker summary={<>…</>}>`, inline MDX-in-JSX prose: use the
  `<CODE>…</CODE>` component (defined in `ui/components/Text/index.tsx`). Backticks
  render literally here because JSX children are not Markdown.

Never blanket-replace one form with the other across a file: classify each
occurrence by its container first. (A `docs-ja-sync` run on 2026-06-14 did a
blanket `<CODE>`→backtick sweep to fix the tooltips and broke 5 JSX-summary lines;
they had to be restored to `<CODE>`.) When unsure, copy the phrasing of sibling
annotations in the same file and flag the term for the reviewer.

## Worked example: the gestures highlight fix (commit that seeds the first run)

English `pages/tutorial/gestures.mdx` gained, in the first snippet of "Add a tap
gesture":

```diff
+{/* prettier-ignore */}
 ```tsx components/EmojiSticker.tsx
 // ...rest of the import statements remain same
-import { Gesture, GestureDetector } from 'react-native-gesture-handler';
-import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
+/* @tutinfo Import `Gesture` and `GestureDetector` from `react-native-gesture-handler`. */import { Gesture, GestureDetector } from 'react-native-gesture-handler';/* @end */
+/* @tutinfo Import `useAnimatedStyle`, `useSharedValue`, and `withSpring` from `react-native-reanimated`. */import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';/* @end */
 ...
-  const scaleImage = useSharedValue(imageSize);
+  /* @tutinfo Create a `scaleImage` shared value and set `imageSize` as its initial value. */const scaleImage = useSharedValue(imageSize);/* @end */
```

Apply to `pages/ja/tutorial/gestures.mdx`:

1. Add `{/* prettier-ignore */}` above the same fence (structural, identical).
2. Wrap the same three code lines in `@tutinfo … */code/* @end */`. The wrapped
   code stays byte-identical; the tooltip text is Japanese, reusing the wording
   already in that file's numbered steps (lines 99-101) and Markdown backticks for
   inline code. For example:

   ```tsx
   /* @tutinfo `react-native-gesture-handler` から `Gesture` と `GestureDetector` をインポートします。 */import { Gesture, GestureDetector } from 'react-native-gesture-handler';/* @end */
   ```
3. Nothing else in the file changes.

This is also why the fix matters: without the annotations the new lines render
without the green highlight, the same bug the English page had before #46845.

## 3. Structural self-check (before saving)

Re-run the translator's structural diff. Counts must be equal between the updated
English and Japanese files: markdown headings, fenced code blocks, top-level
`import` lines, JSX opening tags, inline links, and the frontmatter key set. A
mismatch means a hunk was mis-applied. Fix before writing.

## 4. Bump the watermark

In `manifest.json`, set that page's `syncedFromCommit` to the run's HEAD **full**
SHA and `syncedAt` to today (`YYYY-MM-DD`). Only bump pages you actually brought
in line this run. If you touched `common/i18n.ts`, also bump
`wiring_synced_commit` to HEAD.

## 5. What this procedure does NOT do

- It does not retranslate in-sync pages. Untouched prose keeps the reviewer-approved wording.
- It does not create new translations. A `NEW_EN` page is handed to `docs-ja-translator` only on explicit opt-in (see SKILL.md).
- It does not commit, push, or open PRs. Git is left to the human (see SKILL.md safety).
