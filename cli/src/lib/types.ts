export type SkillStatus = 'linked' | 'unlinked' | 'conflict';

export type Skill = {
  name: string;
  category: string;
  description: string;
  sourcePath: string;
  targetPath: string;
  status: SkillStatus;
};

export type PendingAction = 'link' | 'unlink';

export type Phase = 'browsing' | 'applying' | 'done';
