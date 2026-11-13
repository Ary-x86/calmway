import { StyleSheet, View } from 'react-native';
import { Icon, type IconName } from '@/components/ui/Icon';
import { Text } from '@/components/ui/Text';
import { KIND_ORDER, kindLabel, type CalmScore, type StressKind } from '@/core/calm-score';
import { formatDistance, type UnitSystem } from '@/core/geo';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, space } from '@/theme/tokens';

const KIND_ICON: Record<StressKind, IconName> = {
  'highway-entry': 'merge',
  interchange: 'alt-route',
  merge: 'merge-type',
  'highway-exit': 'exit-to-app',
  'turn-across': 'turn-left',
  'u-turn': 'u-turn-left',
  roundabout: 'roundabout-right',
  fork: 'call-split',
  rapid: 'bolt',
  turn: 'turn-right',
  ferry: 'directions-boat',
};

/** "What to expect" list for a route: every kind of stress, most stressful first. */
export function StressBreakdown({ score, units }: { score: CalmScore; units: UnitSystem }) {
  const { p } = useTheme();
  const rows = KIND_ORDER.filter((k) => k !== 'turn' && score.counts[k] > 0);
  const highway = score.highwayKm >= 0.5;

  return (
    <View style={[styles.box, { backgroundColor: p.background }]}>
      <Text variant="overline" tone="faint">
        What to expect
      </Text>
      {highway && (
        <View style={styles.row}>
          <Icon name="speed" size={18} color={p.stress[3]} />
          <Text variant="caption">{formatDistance(score.highwayKm * 1000, units)} on highways</Text>
        </View>
      )}
      {rows.map((k) => (
        <View key={k} style={styles.row}>
          <Icon name={KIND_ICON[k]} size={18} color={k === 'fork' || k === 'highway-exit' ? p.inkMuted : p.stress[3]} />
          <Text variant="caption">{kindLabel(k, score.counts[k])}</Text>
        </View>
      ))}
      {!highway && rows.length === 0 && (
        <View style={styles.row}>
          <Icon name="spa" size={18} color={p.primary} />
          <Text variant="caption">Nothing tricky. Easy turns on quiet roads.</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { borderRadius: radius.md, padding: space.md, gap: space.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
});
