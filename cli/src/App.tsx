import { Box, Text, useApp, useInput } from 'ink';
import { useEffect, useState } from 'react';
import { SkillDetails } from './components/SkillDetails';
import { SkillList } from './components/SkillList';
import { StatusBar } from './components/StatusBar';
import { discoverSkills } from './lib/discover';
import { AGENT_TARGETS } from './lib/paths';
import {
  ensureAllGlobalDirs,
  linkSkillToTarget,
  unlinkSkillFromTarget,
} from './lib/symlink';
import type {
  Mode,
  PendingAction,
  PendingChanges,
  Phase,
  Skill,
} from './lib/types';

function totalPending(pending: PendingChanges): number {
  let n = 0;
  for (const m of pending.values()) n += m.size;
  return n;
}

export function App() {
  const { exit } = useApp();
  const [skills, setSkills] = useState<Skill[]>([]);
  const [skillIndex, setSkillIndex] = useState(0);
  const [targetIndex, setTargetIndex] = useState(0);
  const [mode, setMode] = useState<Mode>('skill');
  const [pending, setPending] = useState<PendingChanges>(new Map());
  const [phase, setPhase] = useState<Phase>('browsing');
  const [errors, setErrors] = useState<string[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    void (async () => {
      try {
        await ensureAllGlobalDirs();
        const discovered = await discoverSkills();
        setSkills(discovered);
      } catch (err) {
        setErrors([`Failed to load skills: ${(err as Error).message}`]);
      } finally {
        setLoaded(true);
      }
    })();
  }, []);

  function setTargetPending(
    skillName: string,
    targetId: string,
    action: PendingAction | null
  ) {
    setPending(prev => {
      const next = new Map(prev);
      const inner = new Map(next.get(skillName) ?? new Map());
      if (action === null) {
        inner.delete(targetId);
      } else {
        inner.set(targetId, action);
      }
      if (inner.size === 0) next.delete(skillName);
      else next.set(skillName, inner);
      return next;
    });
  }

  function toggleAllForSkill(skill: Skill) {
    // If every link-able target is currently linked, toggle "unlink all".
    // Otherwise, "link all". Conflicts are skipped.
    const linkable = skill.targets.filter(t => t.status !== 'conflict');
    if (linkable.length === 0) return;
    const allLinked = linkable.every(t => t.status === 'linked');
    const desired: PendingAction = allLinked ? 'unlink' : 'link';

    setPending(prev => {
      const next = new Map(prev);
      const inner = new Map(next.get(skill.name) ?? new Map());

      for (const t of linkable) {
        const wouldMatchCurrent =
          (desired === 'link' && t.status === 'linked') ||
          (desired === 'unlink' && t.status === 'unlinked');
        if (wouldMatchCurrent) {
          inner.delete(t.target.id);
        } else {
          inner.set(t.target.id, desired);
        }
      }

      if (inner.size === 0) next.delete(skill.name);
      else next.set(skill.name, inner);
      return next;
    });
  }

  function toggleOneTarget(skill: Skill, targetIdx: number) {
    const t = skill.targets[targetIdx];
    if (!t || t.status === 'conflict') return;

    const currentPending = pending.get(skill.name)?.get(t.target.id);
    const desired: PendingAction = t.status === 'linked' ? 'unlink' : 'link';

    if (currentPending === desired) {
      setTargetPending(skill.name, t.target.id, null);
    } else {
      setTargetPending(skill.name, t.target.id, desired);
    }
  }

  useInput((input, key) => {
    if (input === 'q') {
      exit();
      return;
    }

    if (phase !== 'browsing') return;
    const skill = skills[skillIndex] ?? null;

    if (mode === 'skill') {
      if (key.upArrow) {
        setSkillIndex(i => Math.max(0, i - 1));
      } else if (key.downArrow) {
        setSkillIndex(i => Math.min(skills.length - 1, i + 1));
      } else if (key.tab) {
        if (skill && skill.targets.length > 0) {
          setMode('target');
          setTargetIndex(0);
        }
      } else if (input === ' ') {
        if (skill) toggleAllForSkill(skill);
      } else if (key.return) {
        void applyChanges();
      }
      return;
    }

    // mode === 'target'
    if (!skill) {
      setMode('skill');
      return;
    }

    if (key.escape) {
      setMode('skill');
    } else if (key.upArrow) {
      setTargetIndex(i => Math.max(0, i - 1));
    } else if (key.downArrow) {
      setTargetIndex(i => Math.min(skill.targets.length - 1, i + 1));
    } else if (input === ' ') {
      toggleOneTarget(skill, targetIndex);
    } else if (key.return) {
      void applyChanges();
    }
  });

  async function applyChanges() {
    if (totalPending(pending) === 0) return;
    setPhase('applying');
    const failures: string[] = [];

    for (const [skillName, perTarget] of pending) {
      const skill = skills.find(s => s.name === skillName);
      if (!skill) continue;
      for (const [targetId, action] of perTarget) {
        const target = AGENT_TARGETS.find(t => t.id === targetId);
        if (!target) continue;
        try {
          if (action === 'link') {
            await linkSkillToTarget(skill.sourcePath, skill.name, target);
          } else {
            await unlinkSkillFromTarget(skill.name, target);
          }
        } catch (err) {
          failures.push(`${skillName} → ${target.label}: ${(err as Error).message}`);
        }
      }
    }

    const fresh = await discoverSkills();
    setSkills(fresh);
    setPending(new Map());
    setErrors(failures);
    setPhase('done');
  }

  if (!loaded) {
    return (
      <Box>
        <Text dimColor>Loading skills...</Text>
      </Box>
    );
  }

  const current = skills[skillIndex] ?? null;
  const pendingForSkill = current ? pending.get(current.name) : undefined;

  return (
    <Box flexDirection="column" paddingX={1}>
      <Box
        borderStyle="round"
        borderColor="cyan"
        paddingX={2}
        marginBottom={1}>
        <Text bold color="cyan">EXPO DOCS SKILLS</Text>
      </Box>
      <Box marginBottom={1}>
        <Text dimColor>Manage local skill symlinks (Claude Code, Cursor, Codex)</Text>
      </Box>

      <SkillList
        skills={skills}
        selectedIndex={skillIndex}
        pending={pending}
        mode={mode}
      />

      <Box
        marginTop={1}
        borderStyle="single"
        borderColor={mode === 'target' ? 'cyan' : 'gray'}
        paddingX={1}
        paddingY={0}
        flexDirection="column">
        <SkillDetails
          skill={current}
          mode={mode}
          selectedTargetIndex={targetIndex}
          pendingForSkill={pendingForSkill}
        />
      </Box>

      <Box marginTop={1}>
        <StatusBar
          pendingCount={totalPending(pending)}
          phase={phase}
          mode={mode}
          errors={errors}
        />
      </Box>
    </Box>
  );
}
