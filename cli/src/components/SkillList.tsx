import { Box, Text } from 'ink';
import type { PendingChanges, Skill, TargetStatus } from '../lib/types';

type Props = {
  skills: Skill[];
  selectedIndex: number;
  pending: PendingChanges;
};

const dotColor: Record<Skill['status'], string> = {
  linked: 'green',
  partial: 'yellow',
  unlinked: 'gray',
  conflict: 'red',
};

const targetLetter: Record<string, string> = {
  claude: 'C',
  codex: 'X',
};

function effectiveStatus(
  current: TargetStatus,
  willToggle: boolean
): TargetStatus {
  if (current === 'conflict') return 'conflict';
  if (!willToggle) return current;
  return current === 'linked' ? 'unlinked' : 'linked';
}

function letterColor(status: TargetStatus, willToggle: boolean): string {
  if (status === 'conflict') return 'red';
  const eff = effectiveStatus(status, willToggle);
  return eff === 'linked' ? 'green' : 'gray';
}

export function SkillList({ skills, selectedIndex, pending }: Props) {
  if (skills.length === 0) {
    return (
      <Box paddingX={1}>
        <Text dimColor>
          No skills found. Add one under skills/&lt;category&gt;/&lt;name&gt;/SKILL.md
        </Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column">
      {skills.map((skill, i) => {
        const isSelected = i === selectedIndex;
        const pendingSet = pending.get(skill.name);
        const pendingCount = pendingSet?.size ?? 0;

        return (
          <Box key={skill.name}>
            <Text color={isSelected ? 'cyan' : undefined}>
              {isSelected ? '▸ ' : '  '}
            </Text>
            <Text color={dotColor[skill.status]}>● </Text>
            <Box width={32}>
              <Text
                color={isSelected ? 'cyan' : 'white'}
                bold={isSelected}>
                {skill.name}
              </Text>
            </Box>
            <Box width={18}>
              <Text dimColor>{skill.category}</Text>
            </Box>
            <Box>
              {skill.targets.map((t, ti) => {
                const willToggle = pendingSet?.has(t.target.id) ?? false;
                const color = letterColor(t.status, willToggle);
                return (
                  <Text key={t.target.id}>
                    {ti > 0 ? ' ' : ''}
                    <Text
                      color={color}
                      bold={willToggle}
                      underline={willToggle}>
                      {targetLetter[t.target.id] ?? '?'}
                    </Text>
                  </Text>
                );
              })}
            </Box>
            {pendingCount > 0 && (
              <Text color="yellow">  {pendingCount}*</Text>
            )}
          </Box>
        );
      })}
    </Box>
  );
}
