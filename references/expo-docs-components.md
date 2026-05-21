# Expo Docs Components Reference

Catalog of MDX components used in `expo/docs/pages/`. Use this to know which component to reach for, the props it accepts, and the patterns that pass review. When in doubt, the source files under `expo/docs/ui/components/` and `expo/docs/components/plugins/` are the authority.

## MDX gotchas

These characters break the build if used unescaped in prose, table cells, or headings:

| Character | Problem                          | Fix                                  |
| --------- | -------------------------------- | ------------------------------------ |
| `{` `}`   | Interpreted as JS expressions    | Wrap in backticks: `` `{}` ``        |
| `<` `>`   | Interpreted as JSX elements      | Use `&lt;` `&gt;` or wrap in backticks |

A component used without a matching `import` line is a silent build failure on production export. Component imports go at the top of the file, after the frontmatter block.

Indented JSX is parsed as a code block. Keep component opening and closing tags flush left, not indented.

## Catalog

| Component                  | Purpose                                                                            | Import from                         |
| -------------------------- | ---------------------------------------------------------------------------------- | ----------------------------------- |
| `Terminal`                 | Shell command snippets with copy button                                            | `~/ui/components/Snippet`           |
| `Tabs`, `Tab`              | Switchable views for multiple variants of the same content                         | `~/ui/components/Tabs`              |
| `Step`                     | Numbered procedural step wrapper                                                   | `~/ui/components/Step`              |
| `Prerequisites`, `Requirement` | Collapsible setup checklist for guides                                         | `~/ui/components/Prerequisites`     |
| `Collapsible`              | Hidden-by-default secondary content with a clickable summary                       | `~/ui/components/Collapsible`       |
| `FAQ`                      | Wrap a set of `Collapsible` items and emit FAQ structured data                     | `~/ui/components/FAQ`               |
| `BoxLink`                  | Cross-link card with title, description, and optional icon                         | `~/ui/components/BoxLink`           |
| `SnackInline`              | Inline runnable code example that opens on Snack                                   | `~/components/plugins/SnackInline`  |
| `ContentSpotlight`         | Image, video, or component preview with light/dark variants                        | `~/ui/components/ContentSpotlight`  |
| `VideoBoxLink`             | Link card for a YouTube video on the Expo channel                                  | `~/ui/components/VideoBoxLink`      |
| `APISection`               | Auto-generated API reference from TypeDoc JSON                                     | `~/components/plugins/APISection`   |
| `AndroidPermissions`       | Table of Android manifest permissions with descriptions                            | `~/components/plugins/permissions`  |
| `IOSPermissions`           | Table of iOS `Info.plist` permission keys with descriptions                        | `~/components/plugins/permissions`  |
| `ConfigPluginExample`      | Wrapper around an `app.json` snippet for config plugin props                       | `~/ui/components/ConfigSection`     |
| `ConfigPluginProperties`   | Property table for config plugin options                                           | `~/ui/components/ConfigSection`     |
| `ConfigReactNative`        | Collapsible "are you in an existing React Native app?" block for SDK pages         | `~/ui/components/ConfigSection`     |
| `FileTree`                 | Visual file and directory tree                                                     | `~/ui/components/FileTree`          |
| `Diagram`                  | Light/dark image pair rendered as a labelled diagram block                         | `~/ui/components/Diagram`           |
| `DiffBlock`                | Render a unified diff as syntax-highlighted code                                   | `~/ui/components/Snippet`           |
| `PlatformTags`             | Inline platform badges (iOS, Android, web, tvOS)                                   | `~/ui/components/Tag`               |
| `ProgressTracker`          | Tutorial chapter completion checkbox and next-chapter link                         | `~/ui/components/ProgressTracker`   |
| `CodeBlocksTable`          | Side-by-side multi-language code blocks with auto-detected tab labels              | `~/components/plugins/CodeBlocksTable` |
| `ConfigPluginHierarchy`    | ReactFlow diagram of `Config Plugin → Plugin Function → Mod`                       | `~/ui/components/ConfigPluginHierarchy` |
| `AppConfigSchemaTable`     | Renders the `app.json` schema as a properties table                                | `~/ui/components/AppConfigSchemaTable` |

## Mandatory usage

Do not use bare Markdown or HTML when one of these components fits:

| Pattern                                          | Use this component       |
| ------------------------------------------------ | ------------------------ |
| Shell commands shown to the reader               | `Terminal`               |
| Procedural steps with more than two stages       | `Step` (each step wrapped) |
| Multiple variants of the same example (JS vs TS, npm vs yarn) | `Tabs` / `Tab` |
| Setup requirements at the top of a guide         | `Prerequisites` / `Requirement` |
| Cross-link "next page" cards on overview pages   | `BoxLink`                |
| YouTube videos                                   | `VideoBoxLink`           |
| Inline runnable code with dependencies            | `SnackInline`            |
| Auto-generated SDK reference content             | `APISection`             |

Bare `<img>` tags and unscoped `<video>` tags do not get processed by the markdown export pipeline. Use `ContentSpotlight` for both.

## Terminal

Renders shell commands with a copy-to-clipboard action. Lines that start with `$` are commands. Lines that start with `#` are comments. Empty strings render as blank rows.

| Prop            | Type                              | Required | Description                                                                                  |
| --------------- | --------------------------------- | -------- | -------------------------------------------------------------------------------------------- |
| `cmd`           | `string[]`                        | Yes      | Lines to render. Use `$` for commands, `#` for comments, `""` for spacing.                   |
| `cmdCopy`       | `string`                          | No       | Override the auto-generated copy text. Use when chaining commands with `&&`.                 |
| `title`         | `string`                          | No       | Override the default header label of "Terminal".                                             |
| `browserAction` | `{ href: string; label: string }` | No       | Add a launch button that opens a related browser flow in a new tab.                          |
| `hideOverflow`  | `boolean`                         | No       | Prevent horizontal scrollbars on long output.                                                |
| `className`     | `string`                          | No       | Extra utility classes for layout adjustments.                                                |

```mdx
import { Terminal } from '~/ui/components/Snippet';

<Terminal cmd={['$ npx expo install expo-router']} />

<Terminal
  cmd={['# Create a new Expo project', '$ npx create-expo-app@latest my-app']}
  cmdCopy="npx create-expo-app@latest my-app"
/>
```

Gotchas:

- A leading `$ ` is rendered as a prompt, not copied. Without `cmdCopy`, the copy button strips `$ ` automatically.
- Do not nest a fenced code block inside `Terminal`. Use `cmd` for everything that would be in the block.
- Multi-package-manager install commands are documented in the writing-style reference under the `npm or Yarn` rule, not with `Terminal` alone.

## Tabs and Tab

Switchable views for the same content in different variants: language (JS vs TS), tool (npm vs Yarn vs pnpm), platform (iOS vs Android), or component pattern (class vs function).

`Tabs` accepts `Tab` children. Each `Tab` requires a `label` prop.

```mdx
import { Tabs, Tab } from '~/ui/components/Tabs';

<Tabs>
<Tab label="Class component">

```js
class Counter extends Component {}
```

</Tab>
<Tab label="Function component">

```js
function Counter() {}
```

</Tab>
</Tabs>
```

Gotchas:

- Do not indent the `<Tab>` opening tag or its child fenced code block. Indented content is parsed as a Markdown code block and the tab renders empty.
- Keep tab labels short and parallel ("iOS" / "Android", not "iOS Setup" / "Android").
- Two tabs is the minimum. For a single variant, use a plain code block.

## Step

Numbered procedural step wrapper. Each step gets its own `<Step>` block with a `label` prop holding the step number as a string.

```mdx
import { Step } from '~/ui/components/Step';

<Step label="1">

Install the package.

<Terminal cmd={['$ npx expo install expo-camera']} />

</Step>

<Step label="2">

Import the component in your screen.

</Step>
```

Gotchas:

- Leave a blank line after the opening `<Step>` and before the closing tag, otherwise Markdown inside the step does not render.
- Step labels are strings, not numbers. `label="1"` is correct, `label={1}` is not.
- Do not nest `Step` blocks. For substeps, use nested headings or a bulleted list inside the step body.

## Prerequisites and Requirement

Collapsible block at the top of a guide that lists what the reader needs before starting. Each `Requirement` becomes a row with a heading slug, so it can be linked from elsewhere.

```mdx
import { Prerequisites, Requirement } from '~/ui/components/Prerequisites';

<Prerequisites>
  <Requirement title="Set up your development environment">
    Make sure your computer is [set up for running an Expo app](/get-started/create-a-project/).
  </Requirement>
  <Requirement title="Install EAS CLI">
    Run `npm install -g eas-cli` and log in.
  </Requirement>
</Prerequisites>
```

Pass `open` to `Prerequisites` to render the block expanded by default.

Gotchas:

- `Requirement` titles end up in the heading map, so keep them noun phrases.

## Collapsible

Hidden-by-default secondary content with a clickable summary line. Use for optional context, OS-specific notes, or content that would crowd the main flow.

| Prop      | Type        | Required | Description                                       |
| --------- | ----------- | -------- | ------------------------------------------------- |
| `summary` | `ReactNode` | Yes      | Heading text shown on the clickable summary row.  |
| `open`    | `boolean`   | No       | Render expanded by default. Defaults to `false`.  |

```mdx
import { Collapsible } from '~/ui/components/Collapsible';

<Collapsible summary="What is a development build?">

A development build of your app includes the `expo-dev-client` library.

</Collapsible>
```

Gotchas:

- The `summary` is registered as a heading slug. Two collapsibles with the same summary on a page produce duplicate slugs; the second wins anchor scrolling.
- Do not put a single bullet inside a `Collapsible`. The disclosure already implies a single item; convert the bullet to prose.

## FAQ

Wraps a list of `Collapsible` items and emits FAQPage structured data (good for SEO on guide pages with question-shaped headings). The component reads each child's `summary` prop as the question and its body as the answer.

```mdx
import { FAQ } from '~/ui/components/FAQ';
import { Collapsible } from '~/ui/components/Collapsible';

<FAQ>
  <Collapsible summary="What is a development build?">

  A development build of your app includes the `expo-dev-client` library.

  </Collapsible>
  <Collapsible summary="Do I need a paid Apple Developer account?">

  Only when you submit to TestFlight or the App Store. Local builds do not require one.

  </Collapsible>
</FAQ>
```

Gotchas:

- Children must be `Collapsible` components with a `summary` prop. Other JSX is rendered but ignored by the structured-data emitter.
- `summary` strings are flattened to plain text for the FAQ schema, so avoid links and inline JSX inside the summary.

## BoxLink

Card-shaped cross-link. Use on overview pages and at the bottom of guides to point at the next page. External URLs render with an outbound-arrow icon automatically.

| Prop          | Type        | Required | Description                                                     |
| ------------- | ----------- | -------- | --------------------------------------------------------------- |
| `title`       | `string`    | Yes      | Primary card label.                                             |
| `href`        | `string`    | Yes      | Destination URL. External URLs open in a new tab.               |
| `description` | `ReactNode` | No       | Sub-label rendered under the title.                             |
| `Icon`        | Component   | No       | Icon component rendered to the left of the title.               |
| `imageUrl`    | `string`    | No       | Square image rendered in the icon slot. Mutually exclusive with `Icon`. |

```mdx
import { BoxLink } from '~/ui/components/BoxLink';
import { BookOpen02Icon } from '@expo/styleguide-icons/outline/BookOpen02Icon';

<BoxLink
  title="Expo Router"
  description="File-based routing for universal apps."
  href="/router/introduction/"
  Icon={BookOpen02Icon}
/>
```

Gotchas:

- Use root-relative paths for internal links: `/router/introduction/`. The export pipeline rewrites these for `.md` siblings.

## SnackInline

Inline runnable code example that opens on `snack.expo.dev` when the reader clicks Open. The `dependencies` prop must list every non-core package the snippet imports.

| Prop              | Type                       | Required | Description                                                                  |
| ----------------- | -------------------------- | -------- | ---------------------------------------------------------------------------- |
| `dependencies`    | `string[]`                 | Yes      | Packages the snippet depends on. Include version with `package@version` if needed. |
| `label`           | `string`                   | No       | Header label for the snippet block.                                          |
| `defaultPlatform` | `'android' \| 'ios' \| 'web'` | No    | Initial Snack preview platform. Defaults to `android`.                       |
| `platforms`       | `string[]`                 | No       | Restrict the Snack preview platforms.                                        |
| `files`           | `Record<string, string>`   | No       | Additional files included in the Snack workspace.                            |
| `contentHidden`   | `boolean`                  | No       | Hide the code body in the page but ship it to Snack.                         |

```mdx
import SnackInline from '~/components/plugins/SnackInline';

<SnackInline label="Camera preview" dependencies={['expo-camera']}>

```js
import { CameraView } from 'expo-camera';

export default function Screen() {
  return <CameraView style={{ flex: 1 }} />;
}
```

</SnackInline>
```

Gotchas:

- Inline annotations: `/* @info text */ ... /* @end */` reveals on hover; `/* @hide text */ ... /* @end */` hides in docs but ships to Snack. Add `{/* prettier-ignore */}` above the fence so formatters do not strip the annotations.
- Missing a dependency in `dependencies` makes the Snack fail to bundle, even when the docs page renders fine.

## ContentSpotlight

Single component for embedded images, videos, and component previews. The `variant` prop chooses behavior. Default variant is `screenshot`, which renders a lightbox on click.

| Prop      | Type                          | Required        | Description                                                              |
| --------- | ----------------------------- | --------------- | ------------------------------------------------------------------------ |
| `variant` | `'screenshot' \| 'component'` | No              | Render mode. Defaults to `screenshot`.                                   |
| `file`    | `string`                      | For video       | Filename inside `/static/videos/`.                                       |
| `src`     | `string`                      | For images      | Light-theme image path. Place assets under `/public/static/images/...`.  |
| `darkSrc` | `string`                      | No              | Dark-theme image path. Rendered via `<picture>` when dark theme is active. |
| `alt`     | `string`                      | Yes (images)    | Alt text for screen readers.                                             |
| `aspect`  | `'landscape' \| 'portrait'`   | When `variant="component"` | Frame shape: `landscape` for wide previews, `portrait` for phone mocks. |

```mdx
import { ContentSpotlight } from '~/ui/components/ContentSpotlight';

<ContentSpotlight file="guides/color-schemes.mp4" />

<ContentSpotlight
  variant="component"
  aspect="landscape"
  src="/static/images/expo-ui/badgedbox/android-light.webp"
  darkSrc="/static/images/expo-ui/badgedbox/android-dark.webp"
  alt="Mail icon with a count badge and a wifi icon with a small dot badge"
/>
```

Gotchas:

- Videos must be MP4 generated with the `ffmpeg` recipe in the docs README. Other containers do not play on all platforms.
- For images at `variant="component"`, the frame is fixed (540 px landscape, 220 px portrait). Choose source assets at the correct aspect ratio; the frame does not crop.

## VideoBoxLink

Card-shaped link to a YouTube video on the Expo channel.

| Prop          | Type     | Required | Description                                                            |
| ------------- | -------- | -------- | ---------------------------------------------------------------------- |
| `videoId`     | `string` | Yes      | YouTube ID, the value after `v=` in the watch URL.                     |
| `title`       | `string` | Yes      | Card title.                                                            |
| `description` | `string` | No       | Sub-label rendered under the title.                                    |

```mdx
import { VideoBoxLink } from '~/ui/components/VideoBoxLink';

<VideoBoxLink
  videoId="Gk7RHDWsLsQ"
  title="Custom development clients"
  description="Why and when to build a dev client."
/>
```

## APISection

Auto-generated reference for an Expo SDK package, sourced from the JSON files under `docs/public/static/data/{SDK_VERSION}/`. Used inside `pages/versions/{version}/sdk/{package}.mdx`.

| Prop             | Type                       | Required | Description                                                                    |
| ---------------- | -------------------------- | -------- | ------------------------------------------------------------------------------ |
| `packageName`    | `string \| string[]`       | Yes      | Package directory name as it appears in the static-data folder.                |
| `apiName`        | `string`                   | No       | Override the displayed API name. Defaults to the package name.                 |
| `forceVersion`   | `string`                   | No       | Force a specific SDK version for the data lookup.                              |
| `headersMapping` | `Record<string, string>`   | No       | Rename auto-generated section headings.                                        |

```mdx
import APISection from '~/components/plugins/APISection';

<APISection packageName="expo-camera" apiName="Camera" />
```

Gotchas:

- The static JSON file must exist before the page renders. Generate it with `et generate-docs-api-data --packageName <name>` from the expo monorepo root.
- Do not hand-author API reference sections that `APISection` would generate. Edit the JSDoc/TypeDoc in the package source and regenerate.

## AndroidPermissions and IOSPermissions

Render a table of platform-specific permissions from a typed reference list. Used in SDK reference pages where a library declares manifest entries (Android) or `Info.plist` keys (iOS).

Both accept a single `permissions` prop: an array of `PermissionReference` entries. The permission strings reference the static catalog defined in `expo/docs/components/plugins/permissions/data/`.

```mdx
import { AndroidPermissions, IOSPermissions } from '~/components/plugins/permissions';

<AndroidPermissions permissions={['CAMERA', 'RECORD_AUDIO']} />

<IOSPermissions permissions={['NSCameraUsageDescription', 'NSMicrophoneUsageDescription']} />
```

Gotchas:

- A permission string that is not in the static data file renders an empty description cell. If a needed permission is missing from the catalog, add it to `expo/docs/components/plugins/permissions/data/` rather than hand-writing the table.
- These components only render the table. The accompanying prose (when the permission is required, how to request it) is the author's responsibility.

## ConfigPluginExample and ConfigPluginProperties

Paired components for documenting an Expo config plugin: an `app.json` snippet and the property table that goes with it.

```mdx
import { ConfigPluginExample, ConfigPluginProperties } from '~/ui/components/ConfigSection';

<ConfigPluginExample>

```json app.json
{
  "expo": {
    "plugins": [
      [
        "expo-camera",
        {
          "cameraPermission": "Allow $(PRODUCT_NAME) to access your camera."
        }
      ]
    ]
  }
}
```

</ConfigPluginExample>

<ConfigPluginProperties
  properties={[
    {
      name: 'cameraPermission',
      platform: 'ios',
      description: 'Sets the iOS `NSCameraUsageDescription` permission message.',
      default: '"Allow $(PRODUCT_NAME) to access your camera"',
    },
  ]}
/>
```

Gotchas:

- Leave a blank line before and after the fenced code block inside `ConfigPluginExample`, or the runtime throws an error pointing at the missing blank lines.
- `ConfigPluginProperties` expects `default` as a string. Wrap defaults that include quotes in escaped string syntax.

## ConfigReactNative

Collapsible block used on SDK reference pages to surface the "existing React Native app" install path next to the standard Expo install path. Internally a `Collapsible` with a preset summary.

| Prop       | Type        | Required | Description                                                                          |
| ---------- | ----------- | -------- | ------------------------------------------------------------------------------------ |
| `children` | `ReactNode` | Yes      | Body content. Must be JSX or MDX, not a string.                                      |
| `title`    | `string`    | No       | Override the default summary. Defaults to "Are you using this library in an existing React Native app?" |
| `abstract` | `boolean`   | No       | Switch to the shorter "Working in an existing React Native app?" default summary.    |

```mdx
import { ConfigReactNative } from '~/ui/components/ConfigSection';

<ConfigReactNative>

Add the package and run `pod install`:

<Terminal cmd={['$ npm install expo-camera', '$ cd ios && pod install']} />

</ConfigReactNative>
```

Gotchas:

- Like `ConfigPluginExample`, the body must be parsed as MDX, not as a string. Leave a blank line after the opening tag and before the closing tag, otherwise the component throws at render time.
- Use the default summary unless the page covers more than one library — overriding `title` per occurrence makes pages inconsistent.

## FileTree, Diagram, DiffBlock

`FileTree` renders a labelled directory tree. Pass `files` as an array of paths; nesting is inferred from `/` separators. Use it to show project layout in tutorials.

`Diagram` renders a light/dark image pair as a captioned diagram block. Pass `image`, `darkImage`, and `alt`. The frame is wider than `ContentSpotlight` and centers the image.

`DiffBlock` renders a unified `git diff` patch with syntax highlighting. Pass `source` (a URL to a `.diff` file) or `raw` (the diff string). Use for upgrade walkthroughs where the reader needs to see exact changes.

## PlatformTags

Inline row of platform badges. Used in SDK reference page headers and in tables where an API differs by platform. Renders nothing when `platforms` is empty.

| Prop        | Type             | Required | Description                                                                              |
| ----------- | ---------------- | -------- | ---------------------------------------------------------------------------------------- |
| `platforms` | `PlatformName[]` | Yes      | Array of platform identifiers. Valid values: `'ios'`, `'android'`, `'web'`, `'tvos'`.    |
| `prefix`    | `string`         | No       | Inline label rendered before the badges (for example, `"Available on"`).                 |

```mdx
import { PlatformTags } from '~/ui/components/Tag';

<PlatformTags platforms={['ios', 'android']} />

<PlatformTags prefix="Available on" platforms={['ios', 'android', 'web']} />
```

Gotchas:

- Platform values are sorted alphabetically inside the component — author order does not affect rendering.
- Do not use `PlatformTags` to express "supported on every platform". Omit the tags entirely when an API is universal; the badges are signal for "platform-restricted".

## ProgressTracker

Tutorial chapter footer. Renders a completion checkbox tied to the tutorial progress store and a `BoxLink` to the next chapter.

| Prop                     | Type     | Required | Description                                                              |
| ------------------------ | -------- | -------- | ------------------------------------------------------------------------ |
| `currentChapterIndex`    | `number` | Yes      | Zero-based index of the current chapter in the tutorial's chapter list.  |
| `name`                   | `string` | Yes      | Tutorial identifier. `'GET_STARTED'` selects the get-started chapter set; any other value uses the main tutorial set. |
| `summary`                | `string` | Yes      | Short recap shown above the checkbox.                                    |
| `nextChapterTitle`       | `string` | No       | Title of the next chapter, shown in the `BoxLink`.                       |
| `nextChapterDescription` | `string` | No       | Description shown under the next-chapter title.                          |
| `nextChapterLink`        | `string` | No       | Root-relative path to the next chapter page.                             |

```mdx
import { ProgressTracker } from '~/ui/components/ProgressTracker';

<ProgressTracker
  currentChapterIndex={2}
  name="GET_STARTED"
  summary="You set up your environment and created your first project."
  nextChapterTitle="Run on a device"
  nextChapterDescription="Open the project in Expo Go on your phone."
  nextChapterLink="/get-started/start-developing/"
/>
```

Gotchas:

- The chapter list is defined in `~/ui/components/ProgressTracker/TutorialData.tsx`. Adding a new tutorial chapter without updating that file leaves the checkbox unable to find its entry.
- Place `ProgressTracker` at the very end of a chapter page. Anything below it is visually outside the tutorial flow.

## Less common authoring components

These components show up in fewer than ten pages each. Use them when the listed pattern fits; otherwise prefer the heavier-traffic components above.

| Component               | When to use                                                                                                   | Source                                          |
| ----------------------- | ------------------------------------------------------------------------------------------------------------- | ----------------------------------------------- |
| `CodeBlocksTable`       | Side-by-side multi-language code blocks (Swift + Kotlin + JS) with auto-detected tab labels from the fences.  | `~/components/plugins/CodeBlocksTable`          |
| `ConfigPluginHierarchy` | ReactFlow diagram of `Config Plugin → Plugin Function → Mod`. Used in config-plugin explainers only.          | `~/ui/components/ConfigPluginHierarchy`         |
| `AppConfigSchemaTable`  | Render the full `app.json` schema as a properties table. Used on the app config reference page.               | `~/ui/components/AppConfigSchemaTable`          |

Each accepts a small prop surface (`children`, a node-id, a `schema` object respectively) and is best understood by reading one of the pages that uses it before reaching for it.

## Callouts

Markdown blockquote with a leading bolded keyword renders as a styled callout. Defined as a remark plugin, not a JSX component. No import needed.

```md
> Normal callout for a note that does not demand much attention.

> **info** Informative callout that demands attention.

> **warning** Used for warnings and deprecation messages.

> **error** Used for errors, breaking changes, or deprecated content in the archive.

> **important** Used for important state information about a package, service, or tool.
```

Gotchas:

- Keep callouts to one short paragraph. If the content needs multiple paragraphs or a list, restructure it as a regular section.
- Do not stack two callouts of different types in a row. Pick one.

## Code blocks

Use a triple-backtick fence with a language identifier. Lowercase language names. Add a title after the language to render a header bar.

```mdx
    ```ts app/(tabs)/index.tsx
    export default function HomeScreen() {}
    ```
```

Optional params follow the title, separated by a pipe:

```mdx
    ```ts app/(tabs)/index.tsx|collapseHeight=600
    export default function HomeScreen() {}
    ```
```

| Param            | Type     | Description                                                                            |
| ---------------- | -------- | -------------------------------------------------------------------------------------- |
| `collapseHeight` | `number` | Pixel height at which the block collapses with an Expand button. Defaults to `408`.    |

### Code block variables

Fenced code blocks resolve `{{variableName}}` tokens at render time from `sdk-versions.json`. The copy button copies the resolved values.

| Variable                  | Example | Description                   |
| ------------------------- | ------- | ----------------------------- |
| `{{expoSdkVersion}}`      | `55.0.0`| Expo SDK version              |
| `{{expoSdkMajorVersion}}` | `55`    | Expo SDK major version number |
| `{{reactNativeVersion}}`  | `0.83`  | React Native version          |
| `{{reactVersion}}`        | `19.2.0`| React version                 |
| `{{nodeVersion}}`         | `20.19.x` | Minimum Node.js version     |
| `{{xcodeVersion}}`        | `26.2`  | Minimum Xcode version         |
| `{{iosDeploymentTarget}}` | `15.1`  | Minimum iOS deployment target |
| `{{androidVersion}}`      | `7`     | Minimum Android version       |
| `{{compileSdkVersion}}`   | `36`    | Android `compileSdkVersion`   |
| `{{targetSdkVersion}}`    | `36`    | Android `targetSdkVersion`    |

Variables only resolve inside fenced code blocks. For dynamic version values in prose, import `latestSdkVersionValues` from `~/ui/components/SDKTables` and use JSX expressions.

### Inline annotations

Inside a fenced block, three special comment shapes drive Snack-style behavior:

- `/* @info Hover text */ ... /* @end */` highlights a span and reveals the info text on hover.
- `/* @hide preview text */ ... /* @end */` hides a block in the docs but keeps it in the Snack copy.
- `/* prettier-ignore */` placed immediately before a fence prevent formatters from stripping the annotations.

Inline annotations are supported in `SnackInline` blocks and in standalone fenced blocks.
