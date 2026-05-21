import { readdir, readFile, lstat, readlink } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { AGENT_TARGETS, SKILLS_ROOT } from './paths';
import type { Skill, SkillStatus, SkillTargetState, TargetStatus } from './types';

function parseFrontmatter(content: string): Record<string, string> {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return {};
  const result: Record<string, string> = {};
  for (const line of match[1].split(/\r?\n/)) {
    const kv = line.match(/^([\w-]+):\s*(.+)$/);
    if (!kv) continue;
    result[kv[1]] = kv[2].trim().replace(/^["']|["']$/g, '');
  }
  return result;
}

async function getTargetStatus(source: string, target: string): Promise<TargetStatus> {
  try {
    const stat = await lstat(target);
    if (!stat.isSymbolicLink()) return 'conflict';
    const linkTarget = await readlink(target);
    const resolved = resolve(target, '..', linkTarget);
    return resolved === source ? 'linked' : 'conflict';
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code === 'ENOENT') return 'unlinked';
    throw err;
  }
}

function aggregate(targets: SkillTargetState[]): SkillStatus {
  if (targets.some(t => t.status === 'conflict')) return 'conflict';
  const linkedCount = targets.filter(t => t.status === 'linked').length;
  if (linkedCount === 0) return 'unlinked';
  if (linkedCount === targets.length) return 'linked';
  return 'partial';
}

export async function discoverSkills(): Promise<Skill[]> {
  let categories;
  try {
    categories = await readdir(SKILLS_ROOT, { withFileTypes: true });
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code === 'ENOENT') return [];
    throw err;
  }

  const skills: Skill[] = [];

  for (const cat of categories) {
    if (!cat.isDirectory()) continue;
    if (cat.name.startsWith('_') || cat.name.startsWith('.')) continue;

    const categoryPath = join(SKILLS_ROOT, cat.name);
    const skillDirs = await readdir(categoryPath, { withFileTypes: true });

    for (const skillDir of skillDirs) {
      if (!skillDir.isDirectory()) continue;
      if (skillDir.name.startsWith('.')) continue;

      const sourcePath = join(categoryPath, skillDir.name);
      const skillMdPath = join(sourcePath, 'SKILL.md');

      let content: string;
      try {
        content = await readFile(skillMdPath, 'utf-8');
      } catch {
        continue;
      }

      const fm = parseFrontmatter(content);
      const name = fm.name ?? skillDir.name;

      const targets: SkillTargetState[] = [];
      for (const target of AGENT_TARGETS) {
        const targetPath = join(target.globalDir, name);
        const status = await getTargetStatus(sourcePath, targetPath);
        targets.push({ target, status });
      }

      skills.push({
        name,
        category: cat.name,
        description: fm.description ?? '',
        sourcePath,
        status: aggregate(targets),
        targets,
      });
    }
  }

  return skills.sort((a, b) => a.name.localeCompare(b.name));
}
