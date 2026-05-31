import { Box, Text } from 'ink';
import { AGENT_TARGETS } from '../lib/paths';
import { glyph, ui } from '../lib/theme';
import type { PendingChanges, Skill, SkillTargetState } from '../lib/types';

type Props = {
  skills: Skill[];
  selectedIndex: number;
  pending: PendingChanges;
};

const GUTTER = 2;
const NAME_W = 30;
const CELL_W = 12;

function Cell({ state, willToggle }: { state: SkillTargetState; willToggle: boolean }) {
  let color: string = ui.unlinked;
  let text = `${glyph.unlinked} unlinked`;

  if (state.status === 'conflict') {
    color = ui.conflict;
    text = `${glyph.conflict} conflict`;
  } else if (willToggle) {
    color = ui.pending;
    text = state.status === 'linked' ? `${glyph.toggle} unlink` : `${glyph.toggle} link`;
  } else if (state.status === 'linked') {
    color = ui.linked;
    text = `${glyph.linked} linked`;
  }

  return (
    <Box width={CELL_W}>
      <Text color={color} bold={willToggle}>
        {text}
      </Text>
    </Box>
  );
}

function ColumnHeader() {
  return (
    <Box>
      <Box width={GUTTER}>
        <Text> </Text>
      </Box>
      <Box width={NAME_W}>
        <Text bold dimColor>
          SKILL
        </Text>
      </Box>
      {AGENT_TARGETS.map(t => (
        <Box width={CELL_W} key={t.id}>
          <Text bold color={t.accent}>
            {t.label.toUpperCase()}
          </Text>
        </Box>
      ))}
    </Box>
  );
}

function CategoryHeader({ name }: { name: string }) {
  const ruleLen = Math.max(4, NAME_W + CELL_W * 2 - name.length - 1);
  return (
    <Box marginTop={1}>
      <Box width={GUTTER}>
        <Text> </Text>
      </Box>
      <Text bold color={ui.category}>
        {name}{' '}
      </Text>
      <Text color={ui.rule} dimColor>
        {'─'.repeat(ruleLen)}
      </Text>
    </Box>
  );
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
      <ColumnHeader />
      {skills.map((skill, i) => {
        const isSelected = i === selectedIndex;
        const pendingSet = pending.get(skill.name);
        const showCategory = i === 0 || skills[i - 1]!.category !== skill.category;

        return (
          <Box key={skill.name} flexDirection="column">
            {showCategory && <CategoryHeader name={skill.category} />}
            <Box>
              <Box width={GUTTER}>
                <Text color={ui.selected} bold>
                  {isSelected ? `${glyph.selected} ` : '  '}
                </Text>
              </Box>
              <Box width={NAME_W}>
                <Text
                  color={isSelected ? ui.selected : undefined}
                  bold={isSelected}
                  wrap="truncate-end">
                  {skill.name}
                </Text>
              </Box>
              {skill.targets.map(t => (
                <Cell
                  key={t.target.id}
                  state={t}
                  willToggle={pendingSet?.has(t.target.id) ?? false}
                />
              ))}
            </Box>
          </Box>
        );
      })}
    </Box>
  );
}
