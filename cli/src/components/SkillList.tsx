import { Box, Text } from 'ink';
import type { Mode, PendingChanges, Skill } from '../lib/types';

type Props = {
  skills: Skill[];
  selectedIndex: number;
  pending: PendingChanges;
  mode: Mode;
};

const statusIcon: Record<Skill['status'], string> = {
  linked: '✓',
  unlinked: '◯',
  partial: '◐',
  conflict: '⚠',
};

const statusColor: Record<Skill['status'], string> = {
  linked: 'green',
  unlinked: 'gray',
  partial: 'yellow',
  conflict: 'yellow',
};

export function SkillList({ skills, selectedIndex, pending, mode }: Props) {
  if (skills.length === 0) {
    return (
      <Box>
        <Text dimColor>No skills found. Add one under skills/&lt;category&gt;/&lt;name&gt;/SKILL.md</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column">
      {skills.map((skill, i) => {
        const isSelected = i === selectedIndex;
        const focusedInSkillMode = isSelected && mode === 'skill';
        const pendingCount = pending.get(skill.name)?.size ?? 0;
        return (
          <Box key={skill.name}>
            <Text color={focusedInSkillMode ? 'cyan' : undefined}>
              {focusedInSkillMode ? '▸ ' : isSelected ? '· ' : '  '}
            </Text>
            <Text color={statusColor[skill.status]}>{statusIcon[skill.status]} </Text>
            <Text
              color={focusedInSkillMode ? 'cyan' : undefined}
              bold={focusedInSkillMode}>
              {skill.name.padEnd(28)}
            </Text>
            <Text dimColor>[{skill.category}]</Text>
            {pendingCount > 0 && (
              <Text color="yellow"> · {pendingCount} pending</Text>
            )}
          </Box>
        );
      })}
    </Box>
  );
}
