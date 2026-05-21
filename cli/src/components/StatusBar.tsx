import { Box, Text } from 'ink';
import type { Mode, Phase } from '../lib/types';

type Props = {
  pendingCount: number;
  phase: Phase;
  mode: Mode;
  errors: string[];
};

export function StatusBar({ pendingCount, phase, mode, errors }: Props) {
  if (phase === 'applying') {
    return (
      <Box>
        <Text color="yellow">Applying changes...</Text>
      </Box>
    );
  }

  const hints =
    mode === 'skill'
      ? '[↑↓] navigate  [tab] targets  [space] toggle all  [enter] apply  [q] quit'
      : '[↑↓] navigate target  [space] toggle  [esc] back  [enter] apply  [q] quit';

  return (
    <Box flexDirection="column">
      {phase === 'done' ? (
        <Text color="green">Done. Press q to quit.</Text>
      ) : (
        <Box>
          <Text dimColor>{hints}</Text>
          {pendingCount > 0 && (
            <Text color="yellow">    {pendingCount} pending</Text>
          )}
        </Box>
      )}
      {errors.map((e, i) => (
        <Text key={i} color="red">
          {e}
        </Text>
      ))}
    </Box>
  );
}
