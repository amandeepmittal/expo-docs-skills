# Expo Docs BoxLink Icon Conventions

Canonical mapping of `<BoxLink>` destination URL patterns to their expected icons.

## Canonical mapping

| Destination URL pattern | Canonical icon | Import path | Consistency |
| ----------------------- | -------------- | ----------- | ----------- |
| `/eas/build/`, `/build/`, `/build-reference/` | `BuildIcon` | `@expo/styleguide-icons/custom/BuildIcon` | Inconsistent. `BuildIcon` is authoritative (EAS landing). `Cube01Icon` is legacy. `BookOpen02Icon` is incorrect for an EAS service. |
| `/eas/update/`, `/eas-update/` | `LayersTwo02Icon` | `@expo/styleguide-icons/outline/LayersTwo02Icon` | High (18 of 20). |
| `/eas/submit/`, `/submit/` (generic) | `EasSubmitIcon` | `@expo/styleguide-icons/custom/EasSubmitIcon` | High. |
| `/submit/android` | `GoogleAppStoreIcon` | `@expo/styleguide-icons/custom/GoogleAppStoreIcon` | Intentional platform override. |
| `/submit/ios` | `AppleAppStoreIcon` | `@expo/styleguide-icons/custom/AppleAppStoreIcon` | Intentional platform override. |
| `/eas/workflows/` | `Dataflow03Icon` | `@expo/styleguide-icons/outline/Dataflow03Icon` | 100% consistent (14 of 14). |
| `/eas/hosting/` | `Cloud01Icon` | `@expo/styleguide-icons/outline/Cloud01Icon` | 100% consistent (12 of 12). |
| `/eas/metadata/` | `EasMetadataIcon` | `@expo/styleguide-icons/custom/EasMetadataIcon` | 100% consistent (11 of 11). |
| `/eas/insights/`, `/eas-insights/` | `DataIcon` | `@expo/styleguide-icons/outline/DataIcon` | 100% consistent. |
| `/eas/observe/` | `ActivityIcon` | `@expo/styleguide-icons/outline/ActivityIcon` | 100% consistent (7 of 7). |
| `/tutorial/**` (overview / cross-tutorial links) | `GraduationHat02DuotoneIcon` | `@expo/styleguide-icons/duotone/GraduationHat02DuotoneIcon` | Inconsistent. Authoritative on `pages/tutorial/overview.mdx`. `BookOpen02Icon` tolerated for internal step-to-step links within a single tutorial. |
| `/modules/**` | `Grid01Icon` | `@expo/styleguide-icons/outline/Grid01Icon` | Inconsistent (18 of 24). Authoritative on `pages/modules/get-started.mdx`. |
| Sensors SDK pages | `Speedometer04Icon` | `@expo/styleguide-icons/outline/Speedometer04Icon` | 100% consistent (35 of 35). |
| Notifications pages | `NotificationBoxIcon` | `@expo/styleguide-icons/outline/NotificationBoxIcon` | 100% consistent (13 of 13). |
| `/router/**` | `BookOpen02Icon` | `@expo/styleguide-icons/outline/BookOpen02Icon` | 83 of 91. `RouterLogo` from `@expo/styleguide` is acceptable for top-level intro links. |
| `/workflow/**` | `BookOpen02Icon` | `@expo/styleguide-icons/outline/BookOpen02Icon` | 100% consistent (23 of 23). |
| `/config-plugins/**` | `BookOpen02Icon` | `@expo/styleguide-icons/outline/BookOpen02Icon` | 100% consistent. |
| `/billing/**`, `expo.dev/pricing` | `CreditCard02Icon` | `@expo/styleguide-icons/outline/CreditCard02Icon` | 100% consistent (8 of 8). |
| `/versions/**`, `/sdk/**` (SDK reference) | `BookOpen02Icon` | `@expo/styleguide-icons/outline/BookOpen02Icon` | `DocsLogo` from `@expo/styleguide` is acceptable for top-level `/versions/` index. |
| `/guides/**` | `BookOpen02Icon` | `@expo/styleguide-icons/outline/BookOpen02Icon` | 39 of 47. Brand icons (`LogrocketIcon`, `SentryIcon`, `FigmaIcon`, etc.) acceptable for vendor-integration guides. |
| Troubleshooting, errors, debugging | `BookOpen02Icon` | `@expo/styleguide-icons/outline/BookOpen02Icon` | 9 of 10. |
| Other `/eas/*` reference (`/eas/json/`, `/eas/environment-variables/`, `/eas/ai/mcp/`) | `BookOpen02Icon` | `@expo/styleguide-icons/outline/BookOpen02Icon` | Generic reference fallback. Acceptable. |

## Severity guidance for the skill

When a `<BoxLink>` icon does not match the canonical mapping:

- **`design`**: icon is clearly wrong for a service-specific destination. Examples: `BookOpen02Icon` on `/eas/build/` (an EAS service has a dedicated icon, the generic book icon is the wrong call). `BookOpen02Icon` on `/eas/workflows/`, `/eas/hosting/`, or `/eas/metadata/`. `BookOpen02Icon` on `/tutorial/overview` (tutorial overview has a dedicated graduation-hat icon).
- **`suggestion`**: icon is legacy or borderline. Examples: `Cube01Icon` on `/eas/build/` (was canonical historically; `BuildIcon` is current). `BookOpen02Icon` on `/modules/**` (`Grid01Icon` is preferred but `BookOpen02Icon` is tolerated).
- **Do not flag**: icon matches the canonical, or matches one of the intentional platform/brand overrides documented above (e.g., `AppleAppStoreIcon` on `/submit/ios/`, `GithubIcon` on a `github.com` URL).

## Special cases the skill must not flag

These are intentional overrides that the table treats as canonical for their specific destination:

- **Platform-specific submit links.** `AppleAppStoreIcon` for `/submit/ios/`, `GoogleAppStoreIcon` for `/submit/android/`.
- **External vendor links.** When the destination is an external vendor domain and the icon is the matching brand icon: `GithubIcon` for `github.com`, `FigmaIcon` for `figma.com`, `LogrocketIcon` for `logrocket.com`, `SentryIcon` for `sentry.io`, `YoutubeIcon` or `VideoRecorderIcon` for `youtube.com`.
- **External docs that are README/Guide pages on GitHub.** When the destination is a `github.com` URL pointing at a markdown file inside a repo, `BookOpen02Icon` is acceptable (the link is documentation, not a code repo). When the destination is a repo root, prefer `GithubIcon`.
- **Logo-style icons from `@expo/styleguide` (not `@expo/styleguide-icons`).** `DocsLogo`, `RouterLogo`, `ExpoGoLogo`, `PlanEnterpriseIcon`. These are valid imports and are intentionally used on landing/intro pages. Do not flag them as broken imports.
- **Icon variant differences.** `outline/` vs `solid/` vs `custom/` vs `duotone/`. Out of scope for this audit. Only flag when the icon **name** mismatches the canonical.

## Sample pages to consult when uncertain

- `pages/eas/index.mdx` : authoritative for EAS service icons.
- `pages/tutorial/overview.mdx` : authoritative for tutorial icons.
- `pages/modules/get-started.mdx` : authoritative for modules icons.
