#!/usr/bin/env bun
/**
 * docs-webp/convert.ts — conversion only.
 *
 * Finds the PNG screenshots referenced via src="/static/images/....png" in the
 * scoped Expo docs .mdx file(s) and writes a sibling .webp for each, using lossy
 * cwebp -q 80.
 *
 * Scope is deliberately narrow: this script ONLY encodes images. It does not
 * edit any .mdx and does not delete any file. Rewriting the references and
 * removing the original PNGs are the skill's job (the agent), because those
 * touch source files and need verification a plain script shouldn't make on its
 * own.
 *
 * Determinism: cwebp -q 80 is a pure encoder (same PNG in -> same bytes out). A
 * .webp is written only when it is actually smaller than its PNG; flat icons
 * that would grow are reported as SKIPPED so the agent leaves them as PNG.
 * Idempotent: a referenced image whose .webp already exists is reported as
 * EXISTS and not re-encoded.
 *
 * Usage:
 *   bun convert.ts <scope> [--quality=80]
 *     <scope>  an .mdx file, a directory, or a docs section under expo/docs/pages
 *              (e.g. a path ending in pages/eas). The docs root is derived by
 *              walking up to the folder holding pages/ and public/static/images/.
 *
 * Output: one line per image, prefixed for the agent to parse:
 *   CONVERTED <ref> <pngKB> <webpKB> <saved%>
 *   SKIPPED   <ref> (webp not smaller)
 *   EXISTS    <ref> (webp already present)
 *   MISSING   <ref> (png not found on disk)
 *
 * Requires: cwebp (brew install webp).
 */

import { execFileSync } from 'node:child_process';
import {
  existsSync,
  statSync,
  readFileSync,
  readdirSync,
  copyFileSync,
  mkdtempSync,
  rmSync,
} from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { tmpdir } from 'node:os';

// Matches src= or darkSrc= display image refs; require('@/assets/...png') in code fences never matches.
const PNG_REF = /\b(?:src|darkSrc)=(["'])(\/static\/images\/[^"']+?\.png)\1/g;

const argv = process.argv.slice(2);
const scope = argv.find(a => !a.startsWith('--'));
const quality = (() => {
  const q = argv.find(a => a.startsWith('--quality='));
  const n = q ? Number(q.slice('--quality='.length)) : 80;
  return Number.isFinite(n) ? n : 80;
})();

if (!scope) {
  console.error('Usage: bun convert.ts <scope> [--quality=80]');
  process.exit(1);
}
const scopeAbs = resolve(scope);
if (!existsSync(scopeAbs)) {
  console.error(`Scope not found: ${scopeAbs}`);
  process.exit(1);
}

try {
  execFileSync('which', ['cwebp'], { stdio: 'ignore' });
} catch {
  console.error('Missing required tool: "cwebp". Install with: brew install webp');
  process.exit(1);
}

// Walk up to the docs root (folder with both pages/ and public/static/images/).
function findDocsRoot(start: string): string {
  const startDir = statSync(start).isFile() ? dirname(start) : start;
  const walk = (d: string): string => {
    if (existsSync(join(d, 'public/static/images')) && existsSync(join(d, 'pages'))) {
      return d;
    }
    const parent = dirname(d);
    if (parent === d) {
      throw new Error(
        `Could not find the Expo docs root (a folder with pages/ and public/static/images/) at or above ${start}`
      );
    }
    return walk(parent);
  };
  return walk(startDir);
}

function listMdx(target: string): string[] {
  if (statSync(target).isFile()) {
    return target.endsWith('.mdx') ? [target] : [];
  }
  return readdirSync(target, { recursive: true })
    .map(String)
    .filter(p => p.endsWith('.mdx'))
    .map(p => join(target, p));
}

const docsRoot = findDocsRoot(scopeAbs);
const publicDir = join(docsRoot, 'public');
const mdxFiles = listMdx(scopeAbs);
if (mdxFiles.length === 0) {
  console.error(`No .mdx files found in scope: ${scopeAbs}`);
  process.exit(1);
}

// Unique set of .png refs across the scoped files.
const refs = new Set<string>();
for (const file of mdxFiles) {
  const content = readFileSync(file, 'utf8');
  for (const match of content.matchAll(PNG_REF)) refs.add(match[2]);
}

const kb = (n: number) => `${Math.round(n / 1024)}K`;
const pngAbs = (ref: string) => join(publicDir, ref);
const webpAbs = (ref: string) => join(publicDir, ref.replace(/\.png$/, '.webp'));

console.log(`docs root : ${docsRoot}`);
console.log(`scope     : ${scopeAbs}  (${mdxFiles.length} .mdx, ${refs.size} png ref${refs.size === 1 ? '' : 's'})`);
console.log(`quality   : ${quality}`);
console.log('');

if (refs.size === 0) {
  console.log('No .png image references found in scope. (Already converted, or none here.)');
  process.exit(0);
}

const tmp = mkdtempSync(join(tmpdir(), 'expo-webp-'));
let convertedCount = 0;
let savedPng = 0;
let savedWebp = 0;

for (const ref of [...refs].sort()) {
  const src = pngAbs(ref);
  const dest = webpAbs(ref);
  if (!existsSync(src)) {
    console.log(`MISSING   ${ref} (png not found on disk)`);
    continue;
  }
  if (existsSync(dest)) {
    console.log(`EXISTS    ${ref} (webp already present)`);
    continue;
  }
  // Encode to a private temp file first; only land it in the repo if it wins.
  const scratch = join(tmp, ref.replace(/[\\/]/g, '__').replace(/\.png$/, '.webp'));
  execFileSync('cwebp', ['-quiet', '-q', String(quality), src, '-o', scratch]);
  const png = statSync(src).size;
  const webp = statSync(scratch).size;
  if (webp >= png) {
    console.log(`SKIPPED   ${ref} (webp not smaller: ${kb(png)} -> ${kb(webp)})`);
    continue;
  }
  copyFileSync(scratch, dest);
  convertedCount++;
  savedPng += png;
  savedWebp += webp;
  console.log(`CONVERTED ${ref} ${kb(png)} ${kb(webp)} ${Math.round(((png - webp) / png) * 100)}%`);
}

// tmp holds only scratch encodes this run created; safe to clear.
rmSync(tmp, { recursive: true, force: true });

console.log('');
console.log(
  convertedCount > 0
    ? `Converted ${convertedCount} image${convertedCount === 1 ? '' : 's'}: ${kb(savedPng)} -> ${kb(savedWebp)} (${Math.round(((savedPng - savedWebp) / savedPng) * 100)}% saved). References NOT yet rewritten.`
    : 'No images converted.'
);
