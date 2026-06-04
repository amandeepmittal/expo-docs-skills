---
name: expo-docs-webp
description: Convert PNG screenshots referenced in local Expo docs `.mdx` pages to lossy WebP, rewrite their `src` references, and trash the original PNGs. PNG-only. MUST USE when the user points at a docs section, directory, glob, or `.mdx` file under `expo/docs/pages/` and asks to "convert images to webp", "optimize docs images", "png to webp", "shrink/compress docs screenshots", "make docs images lighter", or runs "/expo-docs-webp".
license: MIT
metadata:
  author: amandeepmittal
  version: "1.0.0"
---

# Expo Docs WebP

Convert the PNG screenshots on a set of Expo docs pages to lossy WebP, rewrite the references, and remove the originals. q80 cuts a typical screenshot by ~70% with no visible difference and passes Lighthouse's "next-gen formats" audit. Expo docs ship the committed file as-is (plain `<img>`, static export), so converting the file and rewriting the reference is the whole job.

The work splits in two: a bundled script does the deterministic encoding (it only writes `.webp` files, never edits `.mdx`, never deletes); you do everything that touches source (rewrite refs, trash PNGs), because those need verification.

## When NOT to use

- Scope is outside `expo/docs/pages/`. This skill only understands docs pages and `/static/images/` assets.
- Images are JPG (re-encoding already-lossy stacks a second pass) or SVG (keep it vector). PNG-only by design.
- `cwebp` isn't installed — tell the user `brew install webp` and stop.

## Requirements

`cwebp` (`brew install webp`), `bun`, and `trash` (`brew install trash` — never `rm`).

## Workflow

### 1. Convert

```sh
bun <skill-dir>/scripts/convert.ts <scope>
```

`<scope>` is any `.mdx` file, directory, or section path inside a docs checkout (e.g. one ending in `pages/eas`); the script finds the docs root itself. It prints one prefixed line per image:

- `CONVERTED <ref> <pngKB> <webpKB> <saved%>` — `.webp` written next to the PNG. **Rewrite these refs.**
- `EXISTS <ref>` — already converted on a prior run. Rewrite if the `.mdx` still points at `.png`, otherwise done.
- `SKIPPED <ref>` — WebP wasn't smaller. Leave it as PNG; do nothing.
- `MISSING <ref>` — PNG not on disk. Report it; don't invent a file.

Override the encoder with `--quality=N` only if the user asks (default 80).

### 2. Rewrite references

For each `CONVERTED` (and any still-`.png` `EXISTS`) image, exact-string replace `<ref>` with its `.webp` form in the scoped `.mdx` files. Each `/static/images/...` ref is unique, so this is safe and precise. Don't touch `SKIPPED` images, and don't touch `require('@/assets/...png')` paths in code fences — those are sample code, not display images, and the script never reports them.

### 3. Verify

Every new `.webp` reference resolves to a file on disk, and no `.png` reference remains for an image you just converted. If anything's off, fix the reference or re-run step 1 before cleanup.

### 4. Report and let the user look

Summarize the savings (total PNG vs WebP, percent). The original PNGs are still on disk, so reverting is just undoing the reference edits. q80 is visually near-identical, but text-heavy screenshots (diagrams, status bars, fine UI labels) are where a lossy artifact could show — offer the user a local look before you delete anything.

### 5. Cleanup

Work one section at a time. For each converted image, confirm nothing else still needs the PNG, then trash it:

```sh
grep -rl "static/images/<path>/<name>.png" <docs-root>/pages   # nothing? safe to remove
trash <docs-root>/public/static/images/<path>/<name>.png
```

If a page outside the scope still references the `.png`, keep it and say so — the image carries both formats until that page is converted too, which is fine. PNGs also remain in git history until commit, so this step is recoverable.
