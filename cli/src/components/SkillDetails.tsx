import { Box, Text } from 'ink';
import type { Mode, PendingAction, Skill, TargetStatus } from '../lib/types';

type Props = {
  skill: Skill | null;
  mode: Mode;
  selectedTargetIndex: number;
  pendingForSkill: Map<string, PendingAction> | undefined;
};

const targetIcon: Record<TargetStatus, string> = {
  linked: '✓',
  unlinked: '◯',
  conflict: '⚠',
};

const targetColor: Record<TargetStatus, string> = {
  linked: 'green',
  unlinked: 'gray',
  conflict: 'yellow',
};

export function SkillDetails({
  skill,
  mode,
  selectedTargetIndex,
  pendingForSkill,
}: Props) {
  if (!skill) {
    return (
      <Box>
        <Text dimColor>No skill selected.</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column">
      <Text bold>{skill.name}</Text>
      <Text dimColor>Category: {skill.category}</Text>
      <Box marginTop={1}>
        <Text>{skill.description || '(no description in SKILL.md frontmatter)'}</Text>
      </Box>
      <Box marginTop={1} flexDirection="column">
        <Text dimColor>Source: {skill.sourcePath}</Text>
      </Box>
      <Box marginTop={1} flexDirection="column">
        <Text dimColor>Targets:</Text>
        {skill.targets.map((t, i) => {
          const isFocused = mode === 'target' && i === selectedTargetIndex;
          const pendingAction = pendingForSkill?.get(t.target.id);
          return (
            <Box key={t.target.id}>
              <Text color={isFocused ? 'cyan' : undefined}>
                {isFocused ? '▸ ' : '  '}
              </Text>
              <Text color={targetColor[t.status]}>{targetIcon[t.status]} </Text>
              <Text
                color={isFocused ? 'cyan' : undefined}
                bold={isFocused}>
                {t.target.label.padEnd(24)}
              </Text>
              <Text dimColor>{t.target.globalDir}</Text>
              {pendingAction && (
                <Text color="yellow"> · pending {pendingAction}</Text>
              )}
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}
