import { homedir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = fileURLToPath(new URL('.', import.meta.url));

export const SKILLS_ROOT = resolve(here, '../../../skills');
export const DEPRECATED_ROOT = resolve(here, '../../../deprecated');

export type AgentTarget = {
  id: 'claude' | 'codex';
  label: string;
  globalDir: string;
};

export const AGENT_TARGETS: AgentTarget[] = [
  { id: 'claude', label: 'Claude Code', globalDir: join(homedir(), '.claude', 'skills') },
  { id: 'codex', label: 'Codex', globalDir: join(homedir(), '.codex', 'skills') },
];
