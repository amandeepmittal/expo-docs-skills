import { lstat, mkdir, symlink, unlink } from 'node:fs/promises';
import { dirname } from 'node:path';

export async function ensureGlobalDir(dir: string): Promise<void> {
  try {
    const stat = await lstat(dir);
    if (stat.isSymbolicLink()) {
      throw new Error(
        `${dir} is itself a symlink. Refusing to operate inside it.`
      );
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
