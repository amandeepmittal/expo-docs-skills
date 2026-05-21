import { Box, Text } from 'ink';
import type { Skill } from '../lib/types';

type Props = {
  skill: Skill | null;
};

export function SkillDetails({ skill }: Props) {
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
        <Text dimColor>Target: {skill.targetPath}</Text>
        <Text dimColor>Status: {skill.status}</Text>
      </Box>
    </Box>
  );
}
