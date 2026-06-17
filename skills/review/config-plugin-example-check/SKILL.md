---
name: config-plugin-example-check
description: Deterministically validate Expo config plugin examples in the docs against the real plugin option types in the monorepo's packages/. No LLM in the verdict path; the source of truth is the TypeScript type behind each plugin's ConfigPlugin<T>. MUST USE when the user says "config plugin check", "check config plugin examples", "plugin example drift", "are the config plugin examples right", or "/config-plugin-example-check".
version: "0.2.0"
---

# config-plugin-example-check

Flags config plugin examples in the Expo docs whose JSON disagrees with the plugin's real option type: wrong types (e.g. `"toolsButton": "true"` where a `boolean` is expected), wrong enum values, malformed example JSON, and options that don't exist. It is a plain TypeScript program — no model in the verdict path, same input always gives the same output.

## Run

```sh
bun <skill-dir>/scripts/check.ts [docs-repo-path] [flags]
```

`docs-repo-path` defaults to `~/Documents/GitHub/expo/docs`. Flags: `--only <plugin>`, `--print-schema <plugin>` (dump a plugin's extracted options), `--versions a,b`, `--verbose` (also list info), `--json`.

**The printed report is the authoritative result — relay it as-is; do not re-derive or re-judge findings.** Exit code `1` means there is at least one real type error.

## Reading the output

- `ERROR` — `type-mismatch` / `invalid-enum`: the example contradicts the type. A real bug; fix it. The inline `(src: file:line)` is the exact type it was checked against.
- `WARN` — `unknown-prop`, `malformed-json` (a broken `<ConfigPluginExample>` block), or `heuristic-quoted-boolean` (third-party smell). Review.
- The coverage line counts every example by verdict so nothing is hidden: `type-checked` (validated), `heuristic` (third-party), `unresolved` (first-party not checked — investigate), `no-options`, `unparseable` (type sketches / partials). `--verbose` lists the info ones.

## Source of truth

The TS option type behind each plugin's `ConfigPlugin<T>`, read with the TypeScript compiler from the entry `app.plugin.js` actually loads (`require('./plugin/build/withX')` → `plugin/src/withX.ts`), with import aliases resolved across files. Third-party plugins get a quoted-boolean heuristic only; frozen old SDK versions are out of scope (their docs would be judged against current types). Full design, resolution strategies, severities, and limitations: `manifest.json`.

## Requirements

`bun` on PATH, and a full **expo/expo monorepo** checkout with deps installed — the checker reads option types from `packages/` and loads `typescript`/`json5` from the monorepo (zero install).

## Fixing an `unresolved` plugin

Confirm with `--print-schema <plugin>`. If a plugin wraps another's options, add it to `PLUGIN_ALIASES`; a genuinely new export shape is a small addition to `findOptionTypeNode` / `propsTypeFromDecl` in `scripts/check.ts`. See `manifest.json` → `resolution_strategies`.
