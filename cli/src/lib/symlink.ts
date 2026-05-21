import { lstat, mkdir, readlink, symlink, unlink } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { SKILLS_ROOT } from './paths';

export async function ensureGlobalDir(dir: string): Promise<void> {
  try {
    const stat = await lstat(dir);
    if (stat.isSymbolicLink()) {
      const target = await readlink(dir);
      const resolved = resolve(dir, '..', target);
      if (resolved.startsWith(SKILLS_ROOT)) {
        throw new Error(
          `${dir} is a symlink pointing inside this repo's skills/. Refusing to create recursive symlinks.`
        );
      }
      return;
    }
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code === 'ENOENT') {
      await mkdir(dir, { recursive: true });
      return;
    }
    throw err;
  }
}

export async function linkSkill(source: string, target: string): Promise<void> {
  await mkdir(dirname(target), { recursive: true });
  try {
    const stat = await lstat(target);
    if (!stat.isSymbolicLink()) {
      throw new Error(
        `${target} already exists and is not a symlink. Refusing to overwrite.`
      );
    }
    await unlink(target);
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code !== 'ENOENT') throw err;
  }
  await symlink(source, target);
}

export async function unlinkSkill(target: string): Promise<void> {
  try {
    const stat = await lstat(target);
    if (!stat.isSymbolicLink()) {
      throw new Error(
        `${target} is not a symlink. Refusing to unlink.`
      );
    }
    await unlink(target);
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code === 'ENOENT') return;
    throw err;
  }
}
