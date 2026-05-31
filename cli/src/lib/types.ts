import type { AgentTarget } from './paths';

export type TargetStatus = 'linked' | 'unlinked' | 'conflict';

export type SkillStatus = 'linked' | 'unlinked' | 'partial' | 'conflict';

export type SkillTargetState = {
  target: AgentTarget;
  status: TargetStatus;
  targetPath: string;
  reason?: string;
};

export type Skill = {
  name: string;
  category: string;
  description: string;
  sourcePath: string;
  status: SkillStatus;
  targets: SkillTargetState[];
};

// Flip-intent: outer key skill name, inner set of target ids to toggle.
// "Toggle" means: if currently linked, unlink; if unlinked, link. Conflicts skipped.
export type PendingChanges = Map<string, Set<string>>;
