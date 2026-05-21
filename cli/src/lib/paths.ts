import { homedir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = fileURLToPath(new URL('.', import.meta.url));

export const SKILLS_ROOT = resolve(here, '../../../skills');

export type AgentTarget = {
  id: 'claude' | 'cursor' | 'agents';
  label: string;
  globalDir: string;
};

export const AGENT_TARGETS: AgentTarget[] = [
  { id: 'claude', label: 'Claude Code', globalDir: join(homedir(), '.claude', 'skills') },
  { id: 'cursor', label: 'Cursor', globalDir: join(homedir(), '.cursor', 'skills') },
  { id: 'agents', label: 'Codex / Agent Skills', globalDir: join(homedir(), '.agents', 'skills') },
];
