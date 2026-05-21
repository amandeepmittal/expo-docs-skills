import { Box, Text } from 'ink';
import type { Phase } from '../lib/types';

type Props = {
  pendingCount: number;
  phase: Phase;
  errors: string[];
};

export function StatusBar({ pendingCount, phase, errors }: Props) {
  if (phase === 'applying') {
    return (
      <Box>
        <Text color="yellow">Applying changes...</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column">
      {phase === 'done' ? (
        <Text color="green">Done. Press q to quit.</Text>
      ) : (
        <Box>
          <Text dimColor>[↑↓] navigate  [space] toggle  [enter] apply  [q] quit</Text>
          {pendingCount > 0 && <Text color="yellow">    {pendingCount} pending</Text>}
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
