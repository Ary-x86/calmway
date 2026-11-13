import { StyleSheet, View } from 'react-native';
import { Button } from '@/components/ui/Button';
import { CalmMeter } from '@/components/ui/CalmMeter';
import { Text } from '@/components/ui/Text';
import { LEVEL_LABEL } from '@/core/calm-score';
import { formatDistance, formatDuration, type UnitSystem } from '@/core/geo';
import type { ArrivalSummary } from '@/store/trip';
import { space } from '@/theme/tokens';

export function ArrivalSheet({
  arrival,
  units,
  onDone,
}: {
  arrival: ArrivalSummary;
  units: UnitSystem;
  onDone: () => void;
}) {
  return (
    <View style={styles.content}>
      <View style={styles.top}>
        <CalmMeter score={arrival.score.score} size={84} breathing />
        <View style={styles.flex}>
          <Text variant="overline" tone="faint">
            {arrival.simulated ? 'Preview finished' : 'You have arrived'}
          </Text>
          <Text variant="display">You made it.</Text>
        </View>
      </View>
      <Text tone="muted">
        {arrival.destination.name}. {formatDistance(arrival.distanceMeters, units)} on a{' '}
        {LEVEL_LABEL[arrival.score.level].toLowerCase()} route. {arrival.avoided}.
      </Text>
      {!arrival.simulated && (
        <Text variant="caption" tone="faint">
          Drive time {formatDuration(arrival.durationSeconds)}. Take a breath before you get out.
        </Text>
      )}
      <Button label="Done" size="lg" onPress={onDone} full />
    </View>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: space.xl, paddingBottom: space.xl, gap: space.md },
  top: { flexDirection: 'row', alignItems: 'center', gap: space.lg },
  flex: { flex: 1 },
});
