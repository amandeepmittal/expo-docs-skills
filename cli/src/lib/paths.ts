import { homedir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = fileURLToPath(new URL('.', import.meta.url));

export const SKILLS_ROOT = resolve(here, '../../../skills');
export const GLOBAL_DIR = join(homedir(), '.claude', 'skills');
