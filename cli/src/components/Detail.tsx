import { Box, Text } from 'ink';
import { homedir } from 'node:os';
import { glyph, ui } from '../lib/theme';
import type { Skill, SkillTargetState } from '../lib/types';

const HOME = homedir();

function tilde(p: string): string {
  return p.startsWith(HOME) ? `~${p.slice(HOME.length)}` : p;
}

function StateLabel({ state }: { state: SkillTargetState }) {
  if (state.status === 'linked') {
    return <Text color={ui.linked}>{glyph.linked} linked</Text>;
  }
  if (state.status === 'conflict') {
    return <Text color={ui.conflict}>{glyph.conflict} conflict</Text>;
  }
  return <Text color={ui.unlinked}>{glyph.unlinked} not linked</Text>;
}

export function Detail({ skill, width }: { skill: Skill; width: number }) {
  return (
    <Box
      borderStyle="round"
      borderColor={ui.border}
      paddingX={1}
      flexDirection="column"
      width={width}>
      <Box>
        <Text bold color={ui.subtitle}>
          {skill.name}
        </Text>
        <Text dimColor> · {skill.category}</Text>
      </Box>

      {skill.description ? (
        <Text dimColor wrap="truncate-end">
          {skill.description}
        </Text>
      ) : (
        <Text dimColor italic>
          no description
        </Text>
      )}

      <Box marginTop={1} flexDirection="column">
        {skill.targets.map(t => (
          <Box key={t.target.id} flexDirection="column">
            <Box>
              <Box width={9}>
                <Text color={t.target.accent}>{t.target.label}</Text>
              </Box>
              <Box flexGrow={1}>
                <Text dimColor wrap="truncate-middle">
                  {tilde(t.targetPath)}
                </Text>
              </Box>
              <Box marginLeft={1}>
                <StateLabel state={t} />
              </Box>
            </Box>
            {t.status === 'conflict' && t.reason && (
              <Box>
                <Box width={9}>
                  <Text> </Text>
                </Box>
                <Text color={ui.conflict} wrap="truncate-end">
                  ↳ {t.reason}
                </Text>
              </Box>
            )}
          </Box>
        ))}
      </Box>
    </Box>
  );
}
