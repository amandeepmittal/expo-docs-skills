import type { AgentTarget } from './paths';

export type TargetStatus = 'linked' | 'unlinked' | 'conflict';

export type SkillStatus = 'linked' | 'unlinked' | 'partial' | 'conflict';

export type SkillTargetState = {
  target: AgentTarget;
  status: TargetStatus;
};

export type Skill = {
  name: string;
  category: string;
  description: string;
  sourcePath: string;
  status: SkillStatus;
  targets: SkillTargetState[];
};

export type PendingAction = 'link' | 'unlink';

// Per-skill-per-target pending changes.
// Outer key: skill name. Inner key: target id.
export type PendingChanges = Map<string, Map<string, PendingAction>>;

export type Phase = 'browsing' | 'applying' | 'done';

export type Mode = 'skill' | 'target';
