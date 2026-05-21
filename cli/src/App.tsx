import { Box, Text, useApp, useInput } from 'ink';
import { useEffect, useState } from 'react';
import { SkillDetails } from './components/SkillDetails';
import { SkillList } from './components/SkillList';
import { StatusBar } from './components/StatusBar';
import { discoverSkills } from './lib/discover';
import { GLOBAL_DIR } from './lib/paths';
import { ensureGlobalDir, linkSkill, unlinkSkill } from './lib/symlink';
import type { PendingAction, Phase, Skill } from './lib/types';

export function App() {
  const { exit } = useApp();
  const [skills, setSkills] = useState<Skill[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [pending, setPending] = useState<Map<string, PendingAction>>(new Map());
  const [phase, setPhase] = useState<Phase>('browsing');
  const [errors, setErrors] = useState<string[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    void (async () => {
      try {
        await ensureGlobalDir(GLOBAL_DIR);
        const discovered = await discoverSkills();
        setSkills(discovered);
      } catch (err) {
        setErrors([`Failed to load skills: ${(err as Error).message}`]);
      } finally {
        setLoaded(true);
      }
    })();
  }, []);

  useInput((input, key) => {
    if (input === 'q') {
      exit();
      return;
    }

    if (phase !== 'browsing') return;

    if (key.upArrow) {
      setSelectedIndex(i => Math.max(0, i - 1));
    } else if (key.downArrow) {
      setSelectedIndex(i => Math.min(skills.length - 1, i + 1));
    } else if (input === ' ') {
      const skill = skills[selectedIndex];
      if (!skill || skill.status === 'conflict') return;

      const next = new Map(pending);
      const desired: PendingAction = skill.status === 'linked' ? 'unlink' : 'link';

      if (next.get(skill.name) === desired) {
        next.delete(skill.name);
      } else {
        next.set(skill.name, desired);
      }
      setPending(next);
    } else if (key.return) {
      void applyChanges();
    }
  });

  async function applyChanges() {
    if (pending.size === 0) return;
    setPhase('applying');
    const failures: string[] = [];

    for (const [name, action] of pending) {
      const skill = skills.find(s => s.name === name);
      if (!skill) continue;
      try {
        if (action === 'link') {
          await linkSkill(skill.sourcePath, skill.targetPath);
        } else {
          await unlinkSkill(skill.targetPath);
        }
      } catch (err) {
        failures.push(`${name}: ${(err as Error).message}`);
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

  const current = skills[selectedIndex] ?? null;

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
        <Text dimColor>Manage local skill symlinks</Text>
      </Box>

      <SkillList skills={skills} selectedIndex={selectedIndex} pending={pending} />

      <Box marginTop={1} borderStyle="single" borderColor="gray" paddingX={1} paddingY={0} flexDirection="column">
        <SkillDetails skill={current} />
      </Box>

      <Box marginTop={1}>
        <StatusBar pendingCount={pending.size} phase={phase} errors={errors} />
      </Box>
    </Box>
  );
}
