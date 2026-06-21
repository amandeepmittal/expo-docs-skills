#!/usr/bin/env bun
/**
 * lint.ts — deterministic quality checks for a SKILL.md.
 *
 * Computes the objective, repeatable half of a skill-quality review:
 * frontmatter shape, naming, size, code ratio, house style (no em dashes),
 * and reference integrity. Emits JSON for the skill-quality skill to fold
 * into its report. Never edits files.
 *
 * Usage:
 *   bun lint.ts <name|path|skills/.../SKILL.md>   one skill
 *   bun lint.ts all                                every skill (skips deprecated/node_modules)
 *   bun lint.ts --changed                          only git-changed skills
 *
 * Canonical frontmatter (repo decision): top-level `name`, `version`,
 * `description`, plus optional `argument-hint` and `allowed-tools`. The
 * `license` + `metadata.{author,version}` shape is flagged as style drift.
 */

import { readFileSync, existsSync, readdirSync, statSync, realpathSync } from 'node:fs';
import { join, resolve, dirname, basename } from 'node:path';
import { execSync } from 'node:child_process';

// realpath so REPO_ROOT points at the true repo even when this skill is invoked
// through its symlink in ~/.claude/skills/ or ~/.codex/skills/.
const REPO_ROOT = resolve(realpathSync(import.meta.dir), '../../../..');
const SKILLS_ROOT = join(REPO_ROOT, 'skills');

// Thresholds tuned to this repo (SKILL.md files run 40-162 lines today).
const MAX_LINES = 180;
const MAX_CODE_RATIO = 0.4;
const DESC_MIN = 40;
const DESC_MAX = 600;

type Severity = 'fail' | 'warn' | 'info';
type Finding = { severity: Severity; check: string; line: number | null; message: string };
type Report = {
  skill: string;
  path: string;
  category: string;
  metrics: { lines: number; codeRatio: number; descriptionChars: number };
  findings: Finding[];
  deterministicScore: number; // 10 - 2*fails - warns, floored at 0; sorting aid only
};

function splitFrontmatter(text: string): { fm: string; fmLines: string[]; bodyStart: number } | null {
  const lines = text.split(/\r?\n/);
  if (lines[0]?.trim() !== '---') return null;
  for (let i = 1; i < lines.length; i++) {
    if (lines[i].trim() === '---') {
      return { fm: lines.slice(1, i).join('\n'), fmLines: lines.slice(1, i), bodyStart: i + 1 };
    }
  }
  return null;
}

// Line number (1-based, whole file) of the first frontmatter key, for finding anchors.
function keyLine(fmLines: string[], key: string): number | null {
  const idx = fmLines.findIndex((l) => new RegExp(`^${key}\\s*:`).test(l));
  return idx === -1 ? null : idx + 2; // +1 for the opening ---, +1 for 1-based
}

function lint(skillMdPath: string): Report {
  const text = readFileSync(skillMdPath, 'utf8');
  const allLines = text.split(/\r?\n/);
  const dir = dirname(skillMdPath);
  const dirName = basename(dir);
  const category = basename(dirname(dir));
  const findings: Finding[] = [];
  const add = (severity: Severity, check: string, line: number | null, message: string) =>
    findings.push({ severity, check, line, message });

  const fmParsed = splitFrontmatter(text);
  let descriptionChars = 0;

  if (!fmParsed) {
    add('fail', 'frontmatter', 1, 'No YAML frontmatter block found.');
  } else {
    const { fm, fmLines } = fmParsed;
    const topKeys = new Set<string>();
    for (const l of fmLines) {
      const m = l.match(/^([A-Za-z][\w-]*)\s*:/); // top-level keys only (no indent)
      if (m) topKeys.add(m[1]);
    }

    // Required fields.
    if (!topKeys.has('name')) add('fail', 'frontmatter-required', null, 'Missing required `name`.');
    if (!topKeys.has('description')) add('fail', 'frontmatter-required', null, 'Missing required `description`.');

    // Canonical: top-level version. Flag the metadata/license style as drift.
    if (!topKeys.has('version')) {
      if (topKeys.has('metadata') || topKeys.has('license')) {
        add('warn', 'frontmatter-style', keyLine(fmLines, 'metadata') ?? keyLine(fmLines, 'license'),
          'Uses `license` + `metadata.version` style. Canonical is a top-level `version` (with `argument-hint`/`allowed-tools`).');
      } else {
        add('warn', 'frontmatter-required', null, 'Missing top-level `version`.');
      }
    }
    if (!topKeys.has('argument-hint'))
      add('info', 'frontmatter-recommend', null, 'No `argument-hint`. Add one if the skill takes arguments.');
    if (!topKeys.has('allowed-tools'))
      add('info', 'frontmatter-recommend', null, 'No `allowed-tools`. Scoping tools tightens the skill.');

    // name checks
    const nameMatch = fm.match(/^name:\s*(.+)$/m);
    const name = nameMatch?.[1].trim().replace(/^["']|["']$/g, '') ?? '';
    if (name) {
      if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(name))
        add('fail', 'name-kebab', keyLine(fmLines, 'name'), `\`name\` "${name}" is not kebab-case.`);
      if (name !== dirName)
        add('fail', 'name-dir', keyLine(fmLines, 'name'), `\`name\` "${name}" does not match directory "${dirName}".`);
    }

    // description checks
    const descMatch = fm.match(/^description:\s*([\s\S]*?)(?=\n[A-Za-z][\w-]*\s*:|$)/m);
    const description = descMatch?.[1].trim().replace(/^["']|["']$/g, '') ?? '';
    descriptionChars = description.length;
    if (description) {
      const descLine = keyLine(fmLines, 'description');
      if (descriptionChars < DESC_MIN)
        add('warn', 'description-length', descLine, `Description is ${descriptionChars} chars (min ${DESC_MIN}). Too thin to trigger reliably.`);
      if (descriptionChars > DESC_MAX)
        add('warn', 'description-length', descLine, `Description is ${descriptionChars} chars (max ${DESC_MAX}). Tighten it.`);
      const hasTrigger = /use when|must use|use this skill|\/[a-z0-9-]+/i.test(description);
      if (!hasTrigger)
        add('warn', 'description-trigger', descLine, 'Description has no trigger cue ("Use when…", "MUST USE", or a /slash-command). The model may not know when to fire it.');
    }
  }

  // Body metrics (everything after frontmatter).
  const bodyStart = fmParsed?.bodyStart ?? 0;
  const totalLines = allLines.length;
  let inFence = false;
  let codeLines = 0;
  for (let i = bodyStart; i < allLines.length; i++) {
    const l = allLines[i];
    if (/^\s*```/.test(l)) {
      inFence = !inFence;
      codeLines++; // count the fence lines themselves as code
      continue;
    }
    if (inFence) codeLines++;
  }
  const bodyLen = Math.max(1, totalLines - bodyStart);
  const codeRatio = Math.round((codeLines / bodyLen) * 100) / 100;

  if (totalLines > MAX_LINES)
    add('warn', 'size', null, `${totalLines} lines (soft cap ${MAX_LINES}). Long skills burn context; move detail into references/.`);
  if (codeRatio > MAX_CODE_RATIO)
    add('warn', 'code-ratio', null, `Code is ${Math.round(codeRatio * 100)}% of the body (cap ${Math.round(MAX_CODE_RATIO * 100)}%). Instructions should dominate, not code.`);

  // House style: no em dashes (repo-wide rule).
  allLines.forEach((l, i) => {
    if (l.includes('—')) add('warn', 'house-style', i + 1, 'Em dash (—). Use a period, colon, comma, or parentheses.');
  });

  // Reference integrity: relative paths the body points at must exist on disk.
  // Capture full path tokens (including ../ prefixes) that name a references/ or
  // scripts/ file, then resolve them properly so cross-skill and repo-root paths
  // (../../authoring/.../references/x.md, ../scripts/post-review.ts) are not false-flagged.
  const pathRe = /(?:\.\.\/)*[\w.][\w./-]*\.(?:md|ts|sh|js|py|tsx)/g;
  const seen = new Set<string>();
  allLines.forEach((l, i) => {
    const matches = l.match(pathRe);
    if (!matches) return;
    for (const tok of matches) {
      if (!/(?:^|\/)(?:references|scripts)\//.test(tok)) continue; // only validate ref/script paths
      if (seen.has(tok)) continue;
      seen.add(tok);
      // A path may be skill-dir-relative (prose pointing at a sibling file) or
      // repo-root-relative (a bash command meant to run from the repo root). Accept either.
      if (!existsSync(resolve(dir, tok)) && !existsSync(resolve(REPO_ROOT, tok)))
        add('warn', 'broken-reference', i + 1, `Referenced path "${tok}" does not resolve from the skill dir or repo root.`);
    }
  });

  // Score by distinct check category, not raw count, so one repeated nit
  // (five em dashes) does not weigh the same as five different problems.
  const fails = new Set(findings.filter((f) => f.severity === 'fail').map((f) => f.check)).size;
  const warns = new Set(findings.filter((f) => f.severity === 'warn').map((f) => f.check)).size;
  const name = basename(dir);
  return {
    skill: name,
    path: skillMdPath.replace(REPO_ROOT + '/', ''),
    category,
    metrics: { lines: totalLines, codeRatio, descriptionChars },
    findings,
    deterministicScore: Math.max(0, 10 - 2 * fails - warns),
  };
}

// ---- target resolution ----

function findAllSkills(): string[] {
  const out: string[] = [];
  for (const cat of readdirSync(SKILLS_ROOT)) {
    const catPath = join(SKILLS_ROOT, cat);
    if (cat === 'deprecated' || cat === 'node_modules' || !statSync(catPath).isDirectory()) continue;
    for (const name of readdirSync(catPath)) {
      const md = join(catPath, name, 'SKILL.md');
      if (existsSync(md)) out.push(md);
    }
  }
  return out.sort();
}

function resolveTarget(arg: string): string[] {
  if (arg === 'all') return findAllSkills();
  if (arg === '--changed') {
    let changed: string[] = [];
    try {
      const tracked = execSync('git diff --name-only HEAD', { cwd: REPO_ROOT, encoding: 'utf8' });
      const untracked = execSync('git ls-files --others --exclude-standard', { cwd: REPO_ROOT, encoding: 'utf8' });
      changed = (tracked + untracked).split('\n').filter(Boolean);
    } catch {
      /* not a git repo; fall through to empty */
    }
    const mds = new Set<string>();
    for (const f of changed) {
      const m = f.match(/^(skills\/[^/]+\/[^/]+)\//);
      if (m) {
        const md = join(REPO_ROOT, m[1], 'SKILL.md');
        if (existsSync(md)) mds.add(md);
      }
    }
    return [...mds].sort();
  }
  // bare name, dir, or path to SKILL.md
  if (arg.endsWith('SKILL.md') && existsSync(arg)) return [resolve(arg)];
  const asDir = resolve(arg);
  if (existsSync(join(asDir, 'SKILL.md'))) return [join(asDir, 'SKILL.md')];
  // search by bare skill name
  for (const md of findAllSkills()) if (basename(dirname(md)) === arg) return [md];
  return [];
}

const arg = process.argv[2];
if (!arg) {
  console.error('usage: bun lint.ts <name|path|all|--changed>');
  process.exit(2);
}
const targets = resolveTarget(arg);
if (targets.length === 0) {
  console.error(`No skills matched "${arg}".`);
  process.exit(1);
}
const reports = targets.map(lint);
console.log(JSON.stringify(reports, null, 2));
