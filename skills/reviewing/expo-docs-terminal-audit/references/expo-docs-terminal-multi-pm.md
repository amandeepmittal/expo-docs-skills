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
| Script run (`npm run <script>` and aliases `npm test`, `npm start`) | `expo/docs/pages/guides/publishing-websites.mdx:376-383` | Four-variant `<pm> run <script>` set |
| Expo CLI invocation (`npx expo <sub>`, all subcommands) | `expo/docs/pages/more/expo-cli.mdx:25,27,532` and `pages/guides/using-bun.mdx:33` | Implicit precedent (prose + single-PM Terminal blocks across yarn/bun: e.g. `yarn expo -h`, `yarn expo install`, `bun expo install`). No multi-PM `cmd={{...}}` Terminal block exists yet; the four-variant shape is mechanical and applies to every subcommand (`start`, `prebuild`, `run:ios`, `run:android`, `install`, `export`, `customize`, `config`, `doctor`, `lint`, `whoami`, `login`). |

## Canonical conversion table

For each command shape the skill flags, this is the four-variant set the suggestion block uses verbatim. Sources are listed under each row.

| Command shape | npm | yarn | pnpm | bun |
| ------------- | --- | ---- | ---- | --- |
| Local dep install | `npm install <pkg>` | `yarn add <pkg>` | `pnpm add <pkg>` | `bun add <pkg>` |
| Dev dep install | `npm install --save-dev <pkg>` | `yarn add --dev <pkg>` | `pnpm add --save-dev <pkg>` | `bun add --dev <pkg>` |
| Global install | `npm install --global <pkg>` | `yarn global add <pkg>` | `pnpm add --global <pkg>` | `bun add --global <pkg>` |
| Project scaffold | `npx create-<pkg>` | `yarn create <pkg>` | `pnpm create <pkg>` | `bun create <pkg>` |
| One-shot runner | `npx <pkg>` | `yarn dlx <pkg>` | `pnpm dlx <pkg>` | `bunx <pkg>` |
| Pinned dep install | `npm install <pkg>@<version>` | `yarn add <pkg>@<version>` | `pnpm add <pkg>@<version>` | `bun add <pkg>@<version>` |
| Script run | `npm run <script>` | `yarn run <script>` | `pnpm run <script>` | `bun run <script>` |
| Expo CLI invocation | `npx expo <sub>` | `yarn expo <sub>` | `pnpm expo <sub>` | `bun expo <sub>` |

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

When the skill suggests a multi-PM block on a page, **all PMs that support a long flag form must use it** — not just npm. Concretely:

- npm: `--global` (not `-g`), `--save-dev` (not `-D`)
- pnpm: `--global` (not `-g`), `--save-dev` (not `-D`)
- bun: `--global` (not `-g`), `--dev` (no longer form supported)
- yarn 1: `yarn global add` is a subcommand (no flag); `--dev` for dev deps

Rationale: long flags read clearly across all four columns. Mixing `--global` for npm and `-g` for pnpm/bun looks like an oversight, not a choice.

**Note on gold standard:** `eas/cli.mdx:17-24` currently uses `pnpm add -g` and `bun add -g` (short flags). The skill's suggestion blocks use the long forms regardless, per this rule. If the gold-standard page is updated for consistency, the reference and suggestions remain aligned.

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

## Multi-command blocks (separate `$` lines)

A `cmd` array may contain multiple `$ `-prefixed lines that are separate commands (not `&&`-joined within a single line). When converting these to multi-PM, every `$ ` line must be converted in every variant. Comments (`# ...`), blank strings (`''`), and shell output (lines without `$`) stay byte-identical across all four variants.

Example: `pages/router/web/server-rendering.mdx:222` originally read:

```mdx
<Terminal
  cmd={['$ npx expo export --platform web', '', '$ npx eas-cli@latest hosting:deploy dist']}
/>
```

Converts to:

```mdx
<Terminal
  cmd={{
    npm: ['$ npx expo export --platform web', '', '$ npx eas-cli@latest hosting:deploy dist'],
    yarn: ['$ yarn expo export --platform web', '', '$ yarn dlx eas-cli@latest hosting:deploy dist'],
    pnpm: ['$ pnpm expo export --platform web', '', '$ pnpm dlx eas-cli@latest hosting:deploy dist'],
    bun: ['$ bun expo export --platform web', '', '$ bunx eas-cli@latest hosting:deploy dist'],
  }}
/>
```

Apply the canonical conversion table to each `$ `-prefixed line independently. The first command here is an Expo CLI invocation (uses `<pm> expo <sub>`); the second is a one-shot runner for an Expo-ecosystem tool (uses `npx`/`yarn dlx`/`pnpm dlx`/`bunx`). Both must convert per their respective rows in the conversion table.

For chained (`&&`-joined) commands within a single `$ ` line, use the `cmdCopy`-per-variant shape from the "Chained install + CLI invocation rule" section instead. The two patterns are distinct: multi-command blocks coordinate independent commands; chained commands run as one shell pipeline and need a unified copy string.

### `cd`-led multi-command blocks (FLAG, do not skip)

A common variant: the block leads with `$ cd <dir>` (sometimes via a `cmdCopy="cd <dir> && ..."` chained form for the copy button), then continues with one or more PM-dependent commands such as `npx expo run:android`, `npm run build`, or `npm install`.

**Flag these as `design`** if ANY subsequent `$ ` line is PM-dependent. The strict "skip if first line is `cd`" reading of decision tree step 3 does NOT apply when the `cd` is purely navigational and the substantive content is PM-dependent.

Conversion: replicate the `cd` line (and any `# ...` comments / blank `''` strings) in every variant; vary only the PM-dependent lines.

Example: `pages/modules/native-view-tutorial.mdx:137` originally read:

```mdx
<Terminal
  cmd={[
    '# Navigate to the example directory',
    '$ cd example',
    '# Run the example app on Android',
    '$ npx expo run:android',
    '# Run the example app on iOS',
    '$ npx expo run:ios',
  ]}
/>
```

Converts to:

```mdx
<Terminal
  cmd={{
    npm: [
      '# Navigate to the example directory',
      '$ cd example',
      '# Run the example app on Android',
      '$ npx expo run:android',
      '# Run the example app on iOS',
      '$ npx expo run:ios',
    ],
    yarn: [
      '# Navigate to the example directory',
      '$ cd example',
      '# Run the example app on Android',
      '$ yarn expo run:android',
      '# Run the example app on iOS',
      '$ yarn expo run:ios',
    ],
    // ...pnpm, bun: same structure
  }}
/>
```

**When the block has a `cmdCopy="cd <dir> && <cmd>"` prop**, keep `cmdCopy` as-is (npm-form, per the chained-command convention). The `cmd` body still converts to all four variants. Gold-standard precedent: `pages/modules/get-started.mdx:172`, `pages/modules/native-module-tutorial.mdx:166`, `pages/modules/use-standalone-expo-module-in-your-project.mdx:190` (all converted in the 2026-05 modules pass).

**Skip the block entirely (do NOT flag) when ALL subsequent `$ ` lines are also shell/system commands** (e.g. `$ cd <dir>` followed by `$ rm <file>`, or `$ cd android` followed by `$ ./gradlew bundleRelease`). The `cd` rule's original spirit applies in this case — the whole block is shell prep.

| Block shape | Action |
| ----------- | ------ |
| `cd <dir>` only | Skip |
| `cd <dir>` + `rm`/`mkdir`/`mv`/native build (Gradle, Xcode) | Skip — all shell |
| `cd <dir>` + one or more PM-dependent commands (`npm`, `yarn`, `pnpm`, `bun`, `npx <pkg>`) | **Flag (`design`)** — replicate `cd` per variant, vary PM lines |
| `brew install <pkg>` + one or more PM-dependent commands | Borderline — `brew install` is a one-time macOS prereq, often kept single-PM. Default to flag (`suggestion`) and let the author choose. |

## Environment-variable-prefixed commands

Commands like `EXPO_ATLAS=true npx expo start`, `EXPO_NO_DEPLOY=1 npx expo run:ios --configuration Release`, or `EXPO_ROUTER_DISABLE_RN_NAVIGATION_CHECK=1 npx expo start` use a shell-level env var prefix. The env var is set by the shell before invoking the runner; it does not depend on which PM is running.

These commands convert to multi-PM by leaving the env var prefix intact in every variant. Example for `EXPO_ATLAS=true npx expo start`:

```mdx
<Terminal
  cmd={{
    npm: ['$ EXPO_ATLAS=true npx expo start'],
    yarn: ['$ EXPO_ATLAS=true yarn expo start'],
    pnpm: ['$ EXPO_ATLAS=true pnpm expo start'],
    bun: ['$ EXPO_ATLAS=true bun expo start'],
  }}
/>
```

The decision tree's regex steps anchor with `^`, so a literal regex applied to the raw line will NOT match (the env var prefix sits in front). Per step 2, strip any leading `^([A-Z_][A-Z0-9_]*=\S+ )+` segments before applying steps 3–8 of the decision tree.

**Gold-standard precedent:** `pages/guides/analyzing-bundles.mdx` (three blocks: `EXPO_ATLAS=true npx expo start`, `EXPO_ATLAS=true npx expo start --no-dev`, `EXPO_ATLAS=true npx expo export` + `npx expo-atlas .expo/atlas.jsonl`) and `pages/router/migrate/sdk-55-to-56.mdx:62` (`EXPO_ROUTER_DISABLE_RN_NAVIGATION_CHECK=1 npx expo start`).

## Exceptions: command patterns the skill must NOT flag

Skip the Terminal block if the first non-comment line of `cmd` matches any of these. Each is established Expo convention; flagging them produces noise and contradicts existing house style.

| Pattern | Reason | Sample page |
| ------- | ------ | ----------- |
| Shell / system commands: `cd`, `mkdir`, `git`, `echo`, `base64`, `cp`, `mv`, `sudo`, `pod`, `xcodebuild`, `gradle`, `adb`, `brew`, `gem`, `ruby`, `open`, `xed`, `curl`, `mkcert` | Not a JS-ecosystem package manager command | `pages/build-reference/ios-builds.mdx` |
| Installed CLI invocation: `eas <sub>`, `expo <sub>` (running, not installing), `claude <sub>`, `codex <sub>`, `node`, `tsc`, `jest`, `vitest`, `prettier`, `eslint`, `netlify`, `vercel`, `firebase` | Running an already-installed binary, not a PM action | `pages/eas/cli.mdx` (after install block) |
| `npx eas-cli <subcommand>` invocations (with a subcommand) | EAS CLI in mid-prose, runner-with-subcommand form. Single-PM by convention. **Note:** the standalone `npx eas-cli@latest` runner (no subcommand) is NOT an exception — it has a multi-PM gold standard at `eas/cli.mdx:28-35`. See the "Expo-ecosystem one-shot runners" section below for related cases. | `pages/eas/cli.mdx` (in prose, not the runner gold-standard block at L28-35) |
| Already multi-PM (`cmd={{...}}` object form) | Nothing to flag | Many |
| Interactive prompts or shell output (lines without a leading `$ `) | Not a command, just output | `pages/more/create-expo.mdx:28` |
| Registry actions: `npm publish`, `npm login`, `npm view`, `npm whoami` | Yarn/pnpm/bun forms differ semantically; not a clean conversion | `pages/modules/publish.mdx` |
| Inline `npm install` mentions in MDX prose (outside any `<Terminal>` block) | The skill only inspects `<Terminal>` blocks | n/a |

## Expo-ecosystem one-shot runners (FLAG, not skip)

The exceptions catalog above covers `npx eas-cli <subcommand>` invocations (the EAS CLI subcommand form, kept single-PM by convention). It does NOT cover the broader family of Expo-ecosystem one-shot runners. These tools are published by the Expo team, follow the `npx <pkg>` runner shape, and have an established multi-PM gold standard at `pages/eas/cli.mdx:28-35`. **Flag them as `design` for multi-PM conversion.**

| Tool | Example command | Conversion |
| ---- | --------------- | ---------- |
| `eas-cli` (standalone runner, no subcommand) | `npx eas-cli@latest` | `npx eas-cli@latest` / `yarn dlx eas-cli@latest` / `pnpm dlx eas-cli@latest` / `bunx eas-cli@latest` |
| `patch-project` | `npx patch-project` | `npx patch-project` / `yarn dlx patch-project` / `pnpm dlx patch-project` / `bunx patch-project` |
| `expo-brownfield` | `npx expo-brownfield build:ios` | `npx expo-brownfield build:ios` / `yarn dlx expo-brownfield build:ios` / `pnpm dlx expo-brownfield build:ios` / `bunx expo-brownfield build:ios` |
| `expo-atlas` | `npx expo-atlas .expo/atlas.jsonl` | `npx expo-atlas` / `yarn dlx expo-atlas` / `pnpm dlx expo-atlas` / `bunx expo-atlas` |
| `pod-install` (community, but ubiquitous in Expo docs) | `npx pod-install` | `npx pod-install` / `yarn dlx pod-install` / `pnpm dlx pod-install` / `bunx pod-install` |

**Distinction from the exceptions catalog:**

- `npx eas-cli <subcommand>` (e.g. `npx eas-cli build`, `npx eas-cli update`) → SKIP. This is the EAS CLI being invoked with a subcommand in mid-prose. Kept single-PM as a convention so prose doesn't grow a four-line block every time `eas-cli` appears.
- `npx eas-cli` and `npx eas-cli@latest` (standalone runner, no subcommand) → FLAG. This is the declaration of how to invoke the CLI runner itself, and the gold standard at `pages/eas/cli.mdx:28-35` is multi-PM.

When in doubt, look at the source citation of the exception: `pages/eas/cli.mdx` has TWO `<Terminal>` blocks in its opening section (L17-24 global install, L28-35 one-shot runner). Both are multi-PM. The exception applies to other pages where `npx eas-cli <sub>` shows up incidentally, not to the gold-standard declarations.

## Section-context override

When a `<Terminal>` block lives under a section heading that names a specific PM or runtime (e.g. `### Bun`, `### Express`, `### Yarn`, `### Node`), the author has chosen single-PM intentionally to teach that PM's or runtime's specific workflow. **Do NOT flag these blocks even if their `cmd` shape matches a multi-PM conversion table row.**

Examples encountered in the docs:

- `### Bun` in `pages/router/web/api-routes.mdx:615` — uses `bunx expo export -p web` and `bun run server.ts` intentionally. The section teaches Bun-specific deployment for API routes.
- `### Express` in `pages/router/web/api-routes.mdx:667` — uses `node server.ts` intentionally (Express requires Node).

**Walk up from the `<Terminal>` block to the nearest preceding `###` heading.** If that heading names a PM or runtime that matches the command shape (the section is teaching that PM/runtime's workflow), skip. Otherwise flag normally.

**Caveat:** the PM-specific override applies only to commands that exercise the section's named runtime (e.g. `bunx`, `bun run`, `node`). A PM-agnostic dependency install inside such a section is still in scope. Example: `npm i -D express compression morgan` inside `### Express` SHOULD be flagged, because Express itself works with any package manager — the section heading does not constrain how you install Express's dependencies.

## Decision tree

Run for each `<Terminal cmd={[...]}>` block found in the head version of a changed `.mdx` file. The block must be added or modified by the PR; pre-existing single-PM blocks are out of scope.

1. **Already multi-PM?** If `cmd` is the object form `cmd={{ npm: ..., yarn: ..., pnpm: ..., bun: ... }}`, skip.
2. **Extract the first command line.** Strip the leading `$ ` prompt. If the remainder starts with one or more shell env var assignments (regex `^([A-Z_][A-Z0-9_]*=\S+ )+`), strip those too. Call the result `line`. (See "Environment-variable-prefixed commands" section above — the env var prefix does not disqualify a command from multi-PM conversion; it is preserved unchanged in every variant.)
3. **Skip if `line` matches the shell / system regex:** `^(cd|mkdir|git|echo|base64|cp|mv|sudo|pod|xcodebuild|gradle|adb|brew|gem|ruby|open|xed|curl|mkcert) ` — **with a caveat for `cd`-led multi-command blocks:** if `line` starts with `cd ` AND the `cmd` array contains additional `$ ` lines that are PM-dependent (any subsequent line matches a flag pattern in step 8), do NOT skip. Instead apply the "`cd`-led multi-command blocks" rule from the "Multi-command blocks" section. Same caveat for `brew install`-led blocks, but flag as `suggestion` rather than `design`.
4. **Skip if `line` starts with an installed CLI binary** (no `npx` prefix): `^(eas|expo|claude|codex|node|tsc|jest|vitest|prettier|eslint|netlify|vercel|firebase) `
5. **Skip if `line` matches the `npx eas-cli` runner WITH a subcommand:** `^npx eas-cli \S` (a subcommand follows). The standalone runner `npx eas-cli` and `npx eas-cli@latest` (no subcommand or version-only) are NOT skipped — they follow the one-shot runner gold standard and SHOULD be flagged for multi-PM.
6. **Skip if `line` matches a registry-action:** `^npm (publish|login|view|whoami)`
7. **Skip if the block lives under a PM- or runtime-specific `###` section heading** (e.g. `### Bun`, `### Express`). See "Section-context override" above.
8. **Flag (severity: `design`) if `line` matches any of:**
   - Local or dev dep install: `^npm install (--save-dev |-D )?[^-]`
   - Global install: `^npm install (--global |-g )[^-]`
   - Project scaffold runner: `^npx create-[\w@/-]+`
   - Script run: `^npm (run |test$|start$)` (and equivalent `yarn|pnpm|bun run` / `yarn|pnpm|bun test|start`)
   - Expo CLI invocation: `^npx expo ` (any subcommand) and equivalent `^(yarn|pnpm|bun) expo `
   - Standalone one-shot runner for an Expo-ecosystem (or ubiquitous community) CLI tool: `^npx (eas-cli(@\S+)?|patch-project|expo-brownfield|expo-atlas|pod-install)( |$)`. See "Expo-ecosystem one-shot runners" above.
   - Yarn / pnpm / bun single-PM equivalents of the install and scaffold shapes above
9. **Flag (severity: `suggestion`) if `line` matches:**
   - A pattern that COULD be intentionally single-PM in a topic-specific context (e.g. a guide whose subject is the specific dev tool, like `npx workbox-cli wizard` on a PWA page or `npx cross-env ...` in an env-var workaround). Skill should err toward flagging; the author can dismiss.

For chained commands (`&&`-joined within a single `$ ` line), apply the rules to the first segment only. The conversion rule for chained commands is the `cmdCopy`-per-variant shape documented in the "Chained install + CLI invocation rule" section. For `cmd` arrays containing multiple separate `$ ` lines (not `&&`-joined), see the "Multi-command blocks (separate `$` lines)" section.

## Severity guidance

- **`design`**: command shape matches the canonical conversion table and an Expo gold-standard page exists for that shape. The fix is mechanical: paste the four-variant block from the conversion table, adjusted for the specific package name and version.
- **`suggestion`**: command shape is borderline. Examples: a `yarn add -D sass` in a guide where the page is specifically teaching Sass setup; the single-PM might be intentional. Flag but soften the recommendation.
- Do not use `critical` or `nit` for this audit. Multi-PM conversions are never render-breaking (so never `critical`) and never mechanical typos (so never `nit`).

## What this reference does not cover

- Terminal `title` prop, `browserAction`, `hideOverflow`, or other props. Only `cmd` / `cmdCopy` shape and content.
- Prose mentions of package managers in the body of an MDX page. The audit scope is `<Terminal>` blocks only.
- Auto-detection of the package being installed; the skill assumes whatever name is in the original `cmd` is correct and only suggests the PM-variant wrapping.
- Multi-platform variants of native tooling (`pod install` vs Gradle commands). Out of scope.
