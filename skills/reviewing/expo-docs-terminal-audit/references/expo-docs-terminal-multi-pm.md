# Expo Docs Terminal Multi-PM Conventions

Canonical mapping for `<Terminal>` component multi-package-manager conversions in Expo docs. Compiled from a survey of 857 `<Terminal>` usages across `expo/docs/pages/**/*.mdx`, cross-referenced against each package manager's canonical documentation. Use this reference to flag `<Terminal>` components whose `cmd` prop is single-package-manager when an established Expo multi-PM equivalent exists.

The rule the skill enforces: **use the patterns Expo already documents**. Do not invent new multi-PM shapes. If a command shape has no established Expo gold-standard, do not flag.

## Gold-standard Expo pages (authoritative for current convention)

These are the canonical sources for multi-PM `<Terminal>` patterns. When suggesting a conversion, the skill matches the shape used in the relevant gold-standard page.

| Command shape | Authoritative page | Note |
| ------------- | ------------------ | ---- |
| Project scaffold (`create-expo-app`) | `expo/docs/pages/more/create-expo.mdx:15-22` | The canonical four-variant set |
| Global install | `expo/docs/pages/eas/cli.mdx:17-24` | Uses long flag (`--global`) for npm |
| One-shot tool run (runner form) | `expo/docs/pages/eas/cli.mdx:28-35` | `npx` / `yarn dlx` / `pnpm dlx` / `bunx` |
| Pinned dependency install | `expo/docs/pages/workflow/upgrading-expo-sdk-walkthrough.mdx:30-37` | Note: uses `bun install` (non-canonical Bun syntax). See "Adaptive cross-check" below. |
| Chained install + CLI invocation | `expo/docs/pages/develop/development-builds/create-a-build.mdx:104` | Multi-PM `cmd={{...}}` with `cmdCopy` per variant |
| Dev dependency install | (none yet established) | Skill does not flag if no gold-standard exists |
| Plain dependency install | `expo/docs/pages/workflow/upgrading-expo-sdk-walkthrough.mdx:30-37` | Same as pinned shape |

## Canonical conversion table

For each command shape the skill flags, this is the four-variant set the suggestion block uses verbatim. Sources are listed under each row.

| Command shape | npm | yarn | pnpm | bun |
| ------------- | --- | ---- | ---- | --- |
| Local dep install | `npm install <pkg>` | `yarn add <pkg>` | `pnpm add <pkg>` | `bun add <pkg>` |
| Dev dep install | `npm install --save-dev <pkg>` | `yarn add --dev <pkg>` | `pnpm add -D <pkg>` | `bun add --dev <pkg>` |
| Global install | `npm install --global <pkg>` | `yarn global add <pkg>` | `pnpm add -g <pkg>` | `bun add -g <pkg>` |
| Project scaffold | `npx create-<pkg>` | `yarn create <pkg>` | `pnpm create <pkg>` | `bun create <pkg>` |
| One-shot runner | `npx <pkg>` | `yarn dlx <pkg>` | `pnpm dlx <pkg>` | `bunx <pkg>` |
| Pinned dep install | `npm install <pkg>@<version>` | `yarn add <pkg>@<version>` | `pnpm add <pkg>@<version>` | `bun add <pkg>@<version>` |

**Sources:**

- npm: https://docs.npmjs.com/cli/v10/commands/npm-install
- yarn (v1, matching Expo's house style): https://classic.yarnpkg.com/en/docs/cli/add and https://classic.yarnpkg.com/en/docs/cli/global
- pnpm: https://pnpm.io/cli/add, https://pnpm.io/cli/dlx, https://pnpm.io/cli/create
- bun: https://bun.com/docs/cli/add, https://bun.com/docs/cli/bunx

**Yarn version note:** Expo's existing examples use Yarn 1 syntax (`yarn add`, `yarn global add`, `yarn create`). Yarn 4 differs on some commands. Match Yarn 1 unless an Expo gold-standard page uses a different form.

## Adaptive cross-check (resolves ambiguity)

For one specific command shape, Expo's own house style is inconsistent and the skill must verify before suggesting:

**`bun install <pkg>` vs `bun add <pkg>` for pinned-version installs.**

- Bun's documentation says `bun add` is the canonical form. `bun install <pkg>` works as an alias but is not the documented syntax.
- Expo's `create-expo.mdx:20` and `eas/cli.mdx:22` use `bun add`.
- Expo's `upgrading-expo-sdk-walkthrough.mdx:35` uses `bun install expo@^56.0.0`. This is non-canonical Bun syntax but is the established Expo example for the pinned-version-install pattern.

**Resolution rule:** suggest `bun add <pkg>` (matches the majority Expo gold-standard plus Bun's own docs). Treat the upgrading-expo-sdk-walkthrough usage as a one-off pre-existing case rather than the convention.

If the user wants the skill to match the upgrading-expo guide's pattern instead, this rule is the single place to flip.

## Long-flag rule

When the skill suggests a multi-PM block on a page, the npm variant uses the long flag form: `--global` (not `-g`), `--save-dev` (not `-D`). This matches the authoritative `eas/cli.mdx` gold standard and the first-occurrence-on-page convention.

If the same page later uses short flags inline, that is acceptable and the skill does not flag it. Only the suggestion block produced by the skill uses long flags.

## Chained install + CLI invocation rule

When the original `cmd` is a chained command like `'$ npm install -g eas-cli && eas login'`, the skill suggests converting to the multi-PM-with-`cmdCopy` shape from `develop/development-builds/create-a-build.mdx:104`:

```mdx
<Terminal
  cmdCopy="npm install -g eas-cli && eas login"
  cmd={{
    npm: ['$ npm install --global eas-cli && eas login'],
    yarn: ['$ yarn global add eas-cli && eas login'],
    pnpm: ['$ pnpm add -g eas-cli && eas login'],
    bun: ['$ bun add -g eas-cli && eas login'],
  }}
/>
```

Do NOT suggest splitting the chained command into two separate Terminal blocks. The gold standard pattern is the multi-PM-with-`cmdCopy` shape; the skill matches that.

## Exceptions: command patterns the skill must NOT flag

Skip the Terminal block if the first non-comment line of `cmd` matches any of these. Each is established Expo convention; flagging them produces noise and contradicts existing house style.

| Pattern | Reason | Sample page |
| ------- | ------ | ----------- |
| Shell / system commands: `cd`, `mkdir`, `git`, `echo`, `base64`, `cp`, `mv`, `sudo`, `pod`, `xcodebuild`, `gradle`, `adb`, `brew`, `gem`, `ruby` | Not a JS-ecosystem package manager command | `pages/build-reference/ios-builds.mdx` |
| Installed CLI invocation: `eas <sub>`, `expo <sub>` (running, not installing), `claude <sub>`, `codex <sub>`, `node`, `tsc`, `jest`, `vitest`, `prettier`, `eslint` | Running an already-installed binary, not a PM action | `pages/eas/cli.mdx` (after install block) |
| `npx expo <sub>` family: `install`, `run:ios`, `run:android`, `start`, `prebuild`, `customize`, `export`, `config`, `doctor`, `lint`, `whoami`, `login` | Convention: Expo CLI invocations stay single-PM. 113 single-PM hits across the docs vs. 1 multi-PM exception. | `pages/get-started/start-developing.mdx` |
| `npx eas-cli <sub>` runner invocations | Same posture as `npx expo`: an Expo-ecosystem CLI runner. Single-PM by convention. | `pages/eas/cli.mdx` (in prose, not the runner gold-standard block) |
| `npm run <script>` and equivalents (`npm test`, `npm start`) | Convention: package.json script runs stay single-PM in current Expo docs | `pages/develop/development-builds/use-development-builds.mdx` |
| Already multi-PM (`cmd={{...}}` object form) | Nothing to flag | Many |
| Interactive prompts or shell output (lines without a leading `$ `) | Not a command, just output | `pages/more/create-expo.mdx:28` |
| Registry actions: `npm publish`, `npm login`, `npm view`, `npm whoami` | Yarn/pnpm/bun forms differ semantically; not a clean conversion | `pages/modules/publish.mdx` |
| Inline `npm install` mentions in MDX prose (outside any `<Terminal>` block) | The skill only inspects `<Terminal>` blocks | n/a |

## Decision tree

Run for each `<Terminal cmd={[...]}>` block found in the head version of a changed `.mdx` file. The block must be added or modified by the PR; pre-existing single-PM blocks are out of scope.

1. **Already multi-PM?** If `cmd` is the object form `cmd={{ npm: ..., yarn: ..., pnpm: ..., bun: ... }}`, skip.
2. **Extract the first command line.** Strip the leading `$ ` prompt. Call this `line`.
3. **Skip if `line` matches the shell / system regex:** `^(cd|mkdir|git|echo|base64|cp|mv|sudo|pod|xcodebuild|gradle|adb|brew|gem|ruby) `
4. **Skip if `line` starts with an installed CLI binary** (no `npx` prefix): `^(eas|expo|claude|codex|node|tsc|jest|vitest|prettier|eslint) `
5. **Skip if `line` matches the Expo CLI runner family:** `^npx (expo|eas-cli) `
6. **Skip if `line` matches the script-run family:** `^npm (run |test$|start$)`
7. **Skip if `line` matches a registry-action:** `^npm (publish|login|view|whoami)`
8. **Flag (severity: `design`) if `line` matches any of:**
   - Local or dev dep install: `^npm install (--save-dev |-D )?[^-]`
   - Global install: `^npm install (--global |-g )[^-]`
   - Project scaffold runner: `^npx create-[\w@/-]+`
   - Yarn / pnpm / bun single-PM equivalents of the above
9. **Flag (severity: `suggestion`) if `line` matches:**
   - A pattern that COULD be intentionally single-PM in a topic-specific context (e.g. a guide whose subject is the specific dev tool). Skill should err toward flagging; the author can dismiss.

For chained commands (`&&`-joined), apply the rules to the first segment only. The conversion rule for chained commands is the `cmdCopy`-per-variant shape documented above.

## Severity guidance

- **`design`**: command shape matches the canonical conversion table and an Expo gold-standard page exists for that shape. The fix is mechanical: paste the four-variant block from the conversion table, adjusted for the specific package name and version.
- **`suggestion`**: command shape is borderline. Examples: a `yarn add -D sass` in a guide where the page is specifically teaching Sass setup; the single-PM might be intentional. Flag but soften the recommendation.
- Do not use `critical` or `nit` for this audit. Multi-PM conversions are never render-breaking (so never `critical`) and never mechanical typos (so never `nit`).

## What this reference does not cover

- Terminal `title` prop, `browserAction`, `hideOverflow`, or other props. Only `cmd` / `cmdCopy` shape and content.
- Prose mentions of package managers in the body of an MDX page. The audit scope is `<Terminal>` blocks only.
- Auto-detection of the package being installed; the skill assumes whatever name is in the original `cmd` is correct and only suggests the PM-variant wrapping.
- Multi-platform variants of native tooling (`pod install` vs Gradle commands). Out of scope.
