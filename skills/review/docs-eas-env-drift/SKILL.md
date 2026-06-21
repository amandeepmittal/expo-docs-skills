---
name: docs-eas-env-drift
version: 0.1.0
description: Audit the "Built-in environment variables" list on the Expo docs EAS environment-variables usage page against the env definition sites in expo/eas-cli (report only, never edits docs). Use when the user asks whether the built-in EAS Build env vars are outdated, says "eas env drift", "check built-in env vars", or "/docs-eas-env-drift".
argument-hint: [path-to-expo-docs-checkout]
allowed-tools: Read, Grep, Write, Bash(bun:*), Bash(git:*)
---

# docs-eas-env-drift

The docs page `pages/eas/environment-variables/usage.mdx` lists the env vars EAS Build injects into every job. The truth is two files on `expo/eas-cli@main`: literal `setEnv()` calls in `packages/worker/src/env.ts` (cloud builds) and the env object in `packages/local-build-plugin/src/build.ts` (local builds). Manual sync has already failed twice: the files' own "keep in sync" comments point at the retired `turtle-v2` repo, and the packages moved repos once (`eas-build` was archived into `eas-cli`), so the script fails loudly rather than reporting a clean run when a truth file vanishes. The deliverable is a local markdown report; this skill detects drift, it never edits docs.

The audited contract is `EAS_BUILD*` plus `CI`. Other vars the runners set (`GRADLE_OPTS`, `LANG`, `MAESTRO_*`) are infra tuning, out of scope by design.

## Inputs

`$ARGUMENTS` is an optional path to a local expo/docs checkout. Default: `~/Documents/GitHub/expo/docs`. If neither resolves, ask the user.

## When NOT to use

- Env vars of other EAS surfaces (Workflows, Hosting). Different runners, different docs pages.
- Editing the docs page. Findings go in the report; a human applies them.
- Offline. The truth files are fetched from `raw.githubusercontent.com`.

## Requirements

`bun`, network access to `raw.githubusercontent.com`, a local expo/docs checkout.

## Step 1: Extract

```sh
bun <skill-dir>/scripts/extract.ts $ARGUMENTS
```

| Line | Meaning | Your action |
| --- | --- | --- |
| `FATAL <why>` | Truth file unreachable or page restructured | Stop. Locate the new definition site or collapsible first; never report a clean run. |
| `UNDOCUMENTED <var> <runners>` | Set by those runners, missing from the docs list | Finding. Check it isn't documented elsewhere (step 2). |
| `STALE <var>` | Documented, set by no runner | Finding: removal candidate. |
| `CLOUD_ONLY <var>` / `LOCAL_ONLY <var>` | Documented, but only one runner sets it | Finding: the list needs a per-runner caveat. |
| `VALUE_MISMATCH <var> docs=<v> <runner>=<v>` | Docs claim a literal value a runner contradicts | Finding. |
| `EXPECTED <var> <reason>` | Known intentional asymmetry | List under "known", no action. |
| `COUNTS docs=N cloud=N local=N` | Inventory sizes | Header sanity check; a sudden drop means extraction broke. |

For each `UNDOCUMENTED` var, check whether another page already covers it:

```sh
grep -rn "<var>" <docs-repo>/pages --include='*.mdx'
```

A hit outside `usage.mdx` downgrades the finding to "documented elsewhere, consider cross-linking"; no hits anywhere means it is fully undocumented.

## Step 2: Report

Write `docs-eas-env-drift-<YYYY-MM-DD>.md` in the current working directory:

1. **Header**: date, docs commit (`git -C <docs-repo> rev-parse --short HEAD`), the two truth file paths on `expo/eas-cli@main`, and the `COUNTS` line.
2. **Findings**: grouped by category, one plain sentence each, with the `usage.mdx` line number for vars already in the list (grep the collapsible) and the grep result for undocumented ones.
3. **Known asymmetries**: the `EXPECTED` lines, so readers don't re-report them.

Plain statements only, no rewritten doc text. The report is the only write; whether and how to fix the docs is the writer's call.
