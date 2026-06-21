#!/usr/bin/env bun
/**
 * screenshot-audit/capture.ts — live capture only.
 *
 * Reads a section baseline (baselines/<section>.json) and, for each in-scope
 * screenshot entry, navigates the live Expo dashboard with Playwright and writes
 * a fresh PNG to the output dir. It does NOT judge staleness and does NOT touch
 * any doc file. Comparing each capture to its published doc image is the skill's
 * job (the agent), because that judgment is interpretive and a plain script
 * shouldn't make it.
 *
 * Read-only by design: it navigates, runs read-only `clicks` (if an entry
 * provides machine-readable ones), and screenshots. It never submits forms,
 * confirms dialogs, or enters create/delete/convert flows.
 *
 * What it captures vs skips (one prefixed line per entry, for the agent to parse):
 *   CAPTURED   <id> <path>         live PNG written
 *   SKIPPED    <id> out-of-scope   in_scope=false in the baseline
 *   NEEDS_REACH <id>               entry has a natural-language `reach` but no machine-readable `clicks`; capture by hand
 *   GATED      <id> org            requires a second account or real org data; not attempted
 *   ERROR      <id> <message>      navigation/capture failed (e.g. landed on a login page)
 *
 * Auth: pass a Playwright storageState file via --auth. Create it once by logging
 * in by hand:
 *   bunx playwright open --save-storage=/tmp/expo-storage.json https://expo.dev
 *   (log in, then close the browser window to save the session)
 *
 * Identity: --account/--project/--org flags override <skill-dir>/config.json
 * (gitignored; copy config.example.json). No personal defaults are baked in.
 *
 * Usage:
 *   bun capture.ts <baseline.json> --auth=/tmp/expo-storage.json [--out=out/live] [--only=<id>] [--requires=<tag>] [--account=<expo-username>] [--project=<slug>]
 *
 * Requires: playwright (bun install && bunx playwright install chromium).
 */

import { chromium } from 'playwright';
import { readFileSync, mkdirSync, existsSync } from 'node:fs';
import { resolve, join } from 'node:path';

const argv = process.argv.slice(2);
const baselinePath = argv.find(a => !a.startsWith('--'));
const getFlag = (name: string, fallback = '') => {
  const hit = argv.find(a => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : fallback;
};

if (!baselinePath) {
  console.error('Usage: bun capture.ts <baseline.json> --auth=<storageState.json> [--out=out/live] [--only=<id>]');
  process.exit(1);
}

const authPath = getFlag('auth', '/tmp/expo-storage.json');
const outDir = resolve(getFlag('out', 'out/live'));
const only = getFlag('only');
const accountOverride = getFlag('account');

if (!existsSync(authPath)) {
  console.error(
    `No storageState at ${authPath}. Create it once:\n` +
      `  bunx playwright open --save-storage=${authPath} https://expo.dev\n` +
      `  (log in, then close the window to save the session)`
  );
  process.exit(1);
}

// Identity is machine-local: flags > <skill-dir>/config.json (copy config.example.json); never baked in.
const configPath = join(import.meta.dir, '..', 'config.json');
const config = existsSync(configPath) ? JSON.parse(readFileSync(configPath, 'utf8')) : {};

const baseline = JSON.parse(readFileSync(resolve(baselinePath), 'utf8'));
const account = accountOverride || config.account || '';
const project = getFlag('project', config.project || '');
const org = getFlag('org', config.org || '');
if (!account) {
  console.error(`No account configured. Pass --account=<expo-username> or create ${configPath} from config.example.json.`);
  process.exit(1);
}
const resolveUrl = (u: string) =>
  (u || '')
    .replaceAll('[account]', account)
    .replaceAll('[project]', project)
    .replaceAll('[org]', org);
// Only skip what's genuinely unreachable read-only. Opening a form/modal/drawer to VIEW
// it is allowed (via curated `clicks`/`test_url`, never a submit). step_up / enterprise_plan
// are attempted (the saved session may be elevated). Only `org` is skipped: it needs a
// second account or real org data (e.g. a members list) that can't be opened into existence.
const GATES = new Set(['org']);

mkdirSync(outDir, { recursive: true });

// Each entry is captured in its own doc image's theme (per-entry `theme`, falling back to
// the baseline default), so a color/style diff reads as a real restyle, not dark-vs-light.
const entryTheme = (s: any): 'dark' | 'light' =>
  (s.theme || baseline.theme || 'light').toLowerCase() === 'dark' ? 'dark' : 'light';

const browser = await chromium.launch();
// Reuse a context while the theme is unchanged; recreate it when a shot needs the other theme.
let context: any = null;
let page: any = null;
let currentTheme: 'dark' | 'light' | null = null;
async function ensureContext(t: 'dark' | 'light') {
  if (context && currentTheme === t) return;
  if (context) await context.close();
  context = await browser.newContext({ colorScheme: t, storageState: authPath });
  await context.addInitScript((th: string) => {
    try {
      localStorage.setItem('theme', th);
      localStorage.setItem('color-scheme', th);
    } catch {}
  }, t);
  page = await context.newPage();
  currentTheme = t;
}

let captured = 0;
const requiresFilter = getFlag('requires');
// Capture staff-gated entries first: staff mode expires quickly, so grab them
// right after it is enabled, before the rest of the run.
const shots = (baseline.screenshots ?? [])
  .filter((s: any) => !only || s.id === only)
  .filter((s: any) => !requiresFilter || (s.requires ?? []).includes(requiresFilter))
  .sort((a: any, b: any) => {
    const staff =
      Number((b.requires ?? []).includes('staff_mode')) -
      Number((a.requires ?? []).includes('staff_mode'));
    if (staff !== 0) return staff;
    // then group by theme (dark first) to minimize context churn
    return (entryTheme(a) === 'dark' ? 0 : 1) - (entryTheme(b) === 'dark' ? 0 : 1);
  });

for (const s of shots) {
  if (!s.in_scope) {
    console.log(`SKIPPED ${s.id} out-of-scope`);
    continue;
  }
  const gate = (s.requires ?? []).find((r: string) => GATES.has(r));
  if (gate) {
    console.log(`GATED ${s.id} ${gate}`);
    continue;
  }
  // Machine-readable reach is an optional `clicks: ["<selector>", ...]`.
  // A natural-language `reach` with no `clicks` can't be executed deterministically.
  if ((s.reach?.length ?? 0) > 0 && (s.clicks?.length ?? 0) === 0) {
    console.log(`NEEDS_REACH ${s.id}`);
    continue;
  }
  await ensureContext(entryTheme(s));
  const url = resolveUrl(s.test_url);
  const outPath = join(outDir, `${s.id}.png`);
  try {
    await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
    for (const sel of s.clicks ?? []) {
      await page.locator(sel).first().click({ timeout: 10000 });
    }
    let scrolled = false;
    if (s.scroll_to) {
      try {
        await page.locator(s.scroll_to).first().scrollIntoViewIfNeeded({ timeout: 8000 });
        scrolled = true;
      } catch {
        // Scroll target not found in time: fall through to a full-page capture so we
        // still get an image instead of erroring the whole entry.
      }
    }
    await page.waitForTimeout(1500);
    if (s.selector) {
      await page.locator(s.selector).first().screenshot({ path: outPath });
    } else if (scrolled) {
      // Panel lives in an inner scroll container that fullPage can't reach; scrolled
      // into view, so grab the viewport instead.
      await page.screenshot({ path: outPath });
    } else {
      // No selector: full-page capture so below-the-fold panels and open
      // dropdowns/popovers are still in frame. The LLM compare tolerates extra chrome.
      await page.screenshot({ path: outPath, fullPage: true });
    }
    captured++;
    console.log(`CAPTURED ${s.id} ${outPath}`);
  } catch (err) {
    console.log(`ERROR ${s.id} ${(err as Error).message.split('\n')[0]}`);
  }
}

if (context) await context.close();
await browser.close();
console.log(`\n${captured}/${shots.length} captured -> ${outDir}`);
