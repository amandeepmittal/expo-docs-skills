import { Box, Text } from 'ink';
import type { PendingAction, Skill } from '../lib/types';

type Props = {
  skills: Skill[];
  selectedIndex: number;
  pending: Map<string, PendingAction>;
};

const statusIcon: Record<Skill['status'], string> = {
  linked: '✓',
  unlinked: '◯',
  conflict: '⚠',
};

const statusColor: Record<Skill['status'], string> = {
  linked: 'green',
  unlinked: 'gray',
  conflict: 'yellow',
};

export function SkillList({ skills, selectedIndex, pending }: Props) {
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
        const pendingAction = pending.get(skill.name);
        return (
          <Box key={skill.name}>
            <Text color={isSelected ? 'cyan' : undefined}>
              {isSelected ? '▸ ' : '  '}
            </Text>
            <Text color={statusColor[skill.status]}>{statusIcon[skill.status]} </Text>
            <Text color={isSelected ? 'cyan' : undefined} bold={isSelected}>
              {skill.name.padEnd(28)}
            </Text>
            <Text dimColor>[{skill.category}]</Text>
            {pendingAction && (
              <Text color="yellow"> · pending {pendingAction}</Text>
            )}
          </Box>
        );
      })}
    </Box>
  );
}
