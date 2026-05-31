import { Box, Text, useApp, useInput, useStdout } from 'ink';
import { useEffect, useRef, useState } from 'react';
import { Detail } from './components/Detail';
import { SkillList } from './components/SkillList';
import { discoverSkills } from './lib/discover';
import { AGENT_TARGETS } from './lib/paths';
import { glyph, ui } from './lib/theme';
import {
  ensureAllGlobalDirs,
  linkSkillToTarget,
  unlinkSkillFromTarget,
} from './lib/symlink';
import type { PendingChanges, Skill } from './lib/types';

const TARGET_KEY_MAP: Record<string, string> = {};
AGENT_TARGETS.forEach((t, i) => {
  TARGET_KEY_MAP[t.key] = t.id;
  TARGET_KEY_MAP[String(i + 1)] = t.id;
});

function totalPending(pending: PendingChanges): number {
  let n = 0;
  for (const s of pending.values()) n += s.size;
  return n;
}

function useContentWidth(): number {
  const { stdout } = useStdout();
  const [cols, setCols] = useState<number>(stdout?.columns ?? 80);
  useEffect(() => {
    if (!stdout) return;
    const onResize = () => setCols(stdout.columns ?? 80);
    stdout.on('resize', onResize);
    return () => {
      stdout.off('resize', onResize);
    };
  }, [stdout]);
  return Math.min(Math.max(cols - 2, 44), 88);
}

export function App() {
  const { exit } = useApp();
  const width = useContentWidth();
  const [skills, setSkills] = useState<Skill[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [pending, setPending] = useState<PendingChanges>(new Map());
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [flash, setFlash] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  async function refresh() {
    const fresh = await discoverSkills();
    setSkills(fresh);
    setSelectedIndex(i => Math.min(i, Math.max(0, fresh.length - 1)));
  }

  useEffect(() => {
    void (async () => {
      try {
        await ensureAllGlobalDirs();
        await refresh();
      } catch (err) {
        setFlash({ kind: 'err', text: `Load failed: ${(err as Error).message}` });
      } finally {
        setLoaded(true);
      }
    })();
    return () => {
      if (flashTimer.current) clearTimeout(flashTimer.current);
    };
  }, []);

  function showFlash(kind: 'ok' | 'err', text: string, ms = 1500) {
    if (flashTimer.current) clearTimeout(flashTimer.current);
    setFlash({ kind, text });
    flashTimer.current = setTimeout(() => setFlash(null), ms);
  }

  function toggleTargetForSkill(skillName: string, targetId: string) {
    setPending(prev => {
      const next = new Map(prev);
      const inner = new Set(next.get(skillName) ?? new Set<string>());
      if (inner.has(targetId)) inner.delete(targetId);
      else inner.add(targetId);
      if (inner.size === 0) next.delete(skillName);
      else next.set(skillName, inner);
      return next;
    });
  }

  function toggleAllForSkill(skill: Skill) {
    const eligible = skill.targets.filter(t => t.status !== 'conflict');
    if (eligible.length === 0) return;
    setPending(prev => {
      const next = new Map(prev);
      const inner = new Set(next.get(skill.name) ?? new Set<string>());
      const allMarked = eligible.every(t => inner.has(t.target.id));
      if (allMarked) {
        for (const t of eligible) inner.delete(t.target.id);
      } else {
        for (const t of eligible) inner.add(t.target.id);
      }
      if (inner.size === 0) next.delete(skill.name);
      else next.set(skill.name, inner);
      return next;
    });
  }

  async function applyChanges() {
    if (totalPending(pending) === 0 || busy) return;
    setBusy(true);
    const failures: string[] = [];
    const touched: string[] = [];

    for (const [skillName, targetIds] of pending) {
      const skill = skills.find(s => s.name === skillName);
      if (!skill) continue;
      for (const targetId of targetIds) {
        const target = AGENT_TARGETS.find(t => t.id === targetId);
        const ts = skill.targets.find(t => t.target.id === targetId);
        if (!target || !ts || ts.status === 'conflict') continue;
        const action = ts.status === 'linked' ? 'unlink' : 'link';
        try {
          if (action === 'link') {
            await linkSkillToTarget(skill.sourcePath, skill.name, target);
          } else {
            await unlinkSkillFromTarget(skill.name, target);
          }
          touched.push(`${skill.name}/${target.id}`);
        } catch (err) {
          failures.push(`${skillName} -> ${target.label}: ${(err as Error).message}`);
        }
      }
    }

    await refresh();
    setPending(new Map());
    setBusy(false);

    if (failures.length > 0) {
      showFlash('err', failures[0]!, 4000);
    } else {
      showFlash('ok', `Applied ${touched.length} change${touched.length === 1 ? '' : 's'}`);
    }
  }

  function discardPending() {
    if (pending.size === 0) return;
    setPending(new Map());
    showFlash('ok', 'Discarded pending changes', 1000);
  }

  useInput((input, key) => {
    if (busy) return;

    if (input === 'q' || (key.ctrl && input === 'c')) {
      exit();
      return;
    }

    if (skills.length === 0) return;

    if (key.upArrow || input === 'k') {
      setSelectedIndex(i => Math.max(0, i - 1));
      return;
    }
    if (key.downArrow || input === 'j') {
      setSelectedIndex(i => Math.min(skills.length - 1, i + 1));
      return;
    }
    if (input === 'g') {
      setSelectedIndex(0);
      return;
    }
    if (input === 'G') {
      setSelectedIndex(skills.length - 1);
      return;
    }

    const skill = skills[selectedIndex];
    if (!skill) return;

    if (input === ' ') {
      toggleAllForSkill(skill);
      return;
    }

    const targetId = TARGET_KEY_MAP[input];
    if (targetId) {
      const ts = skill.targets.find(t => t.target.id === targetId);
      if (ts && ts.status !== 'conflict') {
        toggleTargetForSkill(skill.name, targetId);
      }
      return;
    }

    if (key.return) {
      void applyChanges();
      return;
    }
    if (key.escape || input === 'd') {
      discardPending();
      return;
    }
    if (input === 'r') {
      void refresh();
      showFlash('ok', 'Refreshed', 800);
      return;
    }
  });

  if (!loaded) {
    return (
      <Box paddingX={1}>
        <Text color={ui.subtitle}>Loading skills...</Text>
      </Box>
    );
  }

  const current = skills[selectedIndex] ?? null;
  const pendingCount = totalPending(pending);
  const counts = AGENT_TARGETS.map(t => ({
    target: t,
    linked: skills.filter(s =>
      s.targets.some(x => x.target.id === t.id && x.status === 'linked')
    ).length,
  }));
  const conflictCount = skills.reduce(
    (n, s) => n + s.targets.filter(t => t.status === 'conflict').length,
    0
  );

  return (
    <Box flexDirection="column" paddingX={1}>
      <Box
        borderStyle="round"
        borderColor={ui.border}
        paddingX={1}
        flexDirection="column"
        width={width}>
        <Box justifyContent="space-between">
          <Box>
            <Text bold color={ui.title}>
              expo-docs-skills
            </Text>
            <Text dimColor> · symlink manager</Text>
          </Box>
          {pendingCount > 0 ? (
            <Text color={ui.pending} bold>
              {pendingCount} pending
            </Text>
          ) : (
            <Text dimColor>no changes staged</Text>
          )}
        </Box>
        <Box>
          <Text dimColor>{skills.length} skills</Text>
          {counts.map(c => (
            <Box key={c.target.id} marginLeft={3}>
              <Text color={c.target.accent}>{c.target.label} </Text>
              <Text color={ui.linked}>
                {glyph.linked} {c.linked}
              </Text>
              <Text dimColor>/{skills.length}</Text>
            </Box>
          ))}
          {conflictCount > 0 && (
            <Box marginLeft={3}>
              <Text color={ui.conflict}>
                {glyph.conflict} {conflictCount} conflict{conflictCount === 1 ? '' : 's'}
              </Text>
            </Box>
          )}
        </Box>
      </Box>

      <Box marginTop={1}>
        <SkillList skills={skills} selectedIndex={selectedIndex} pending={pending} />
      </Box>

      {current && (
        <Box marginTop={1}>
          <Detail skill={current} width={width} />
        </Box>
      )}

      <Box marginTop={1} flexDirection="column">
        <Text dimColor>
          ↑↓/jk move · space all · c/x targets · ⏎ apply · d discard · r refresh · q quit
        </Text>
        {busy && <Text color={ui.pending}>Applying changes...</Text>}
        {!busy && flash && (
          <Text color={flash.kind === 'ok' ? ui.linked : ui.conflict}>{flash.text}</Text>
        )}
      </Box>
    </Box>
  );
}
