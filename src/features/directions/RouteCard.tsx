import { Pressable, StyleSheet, View } from 'react-native';
import { CalmMeter } from '@/components/ui/CalmMeter';
import { Text } from '@/components/ui/Text';
import { LEVEL_LABEL } from '@/core/calm-score';
import { formatDistance, formatDuration, type UnitSystem } from '@/core/geo';
import type { RankedRoute, RouteLabel } from '@/services/routing/types';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, space } from '@/theme/tokens';

const LABEL_TEXT: Record<RouteLabel, string> = {
  calmest: 'Calmest',
  balanced: 'Balanced',
  fastest: 'Fastest',
};

export function tradeoffText(route: RankedRoute): string | null {
  if (route.labels.includes('fastest')) return null;
  const mins = Math.round(route.extraTime / 60);
  const time = mins <= 0 ? 'Same time' : `+${mins} min`;
  return route.calmerBy > 0 ? `${time}, ${route.calmerBy}% calmer` : time;
}

export function RouteCard({
  route,
  selected,
  units,
  onPress,
}: {
  route: RankedRoute;
  selected: boolean;
  units: UnitSystem;
  onPress: () => void;
}) {
  const { p } = useTheme();
  const tradeoff = tradeoffText(route);
  const isCalm = route.labels.includes('calmest');

  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={`${route.labels.map((l) => LABEL_TEXT[l]).join(' and ')} route, ${formatDuration(route.duration)}, calm score ${route.score.score}`}
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: selected ? p.surfaceRaised : p.surface,
          borderColor: selected ? (isCalm ? p.primary : p.routeFast) : p.border,
          borderWidth: selected ? 2 : 1,
          opacity: pressed ? 0.9 : 1,
        },
      ]}
    >
      <CalmMeter score={route.score.score} size={54} breathing={selected && isCalm} />
      <View style={styles.body}>
        <View style={styles.labels}>
          {route.labels.map((l) => (
            <View
              key={l}
              style={[
                styles.pill,
                { backgroundColor: l === 'calmest' ? p.primarySoft : l === 'fastest' ? p.surfaceSunken : p.accentSoft },
              ]}
            >
              <Text variant="overline" color={l === 'calmest' ? p.primary : l === 'fastest' ? p.inkMuted : p.accentInk}>
                {LABEL_TEXT[l]}
              </Text>
            </View>
          ))}
          <Text variant="caption" tone="faint">
            {LEVEL_LABEL[route.score.level]}
          </Text>
        </View>
        <View style={styles.metrics}>
          <Text variant="heading">{formatDuration(route.duration)}</Text>
          <Text variant="caption" tone="muted">
            {formatDistance(route.distance, units)}
          </Text>
        </View>
        <Text variant="caption" tone="muted" numberOfLines={2}>
          {route.summary}
        </Text>
        {tradeoff && (
          <Text variant="label" tone="primary">
            {tradeoff}
          </Text>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', gap: space.md, padding: space.md, borderRadius: radius.lg, alignItems: 'center' },
  body: { flex: 1, gap: 3 },
  labels: { flexDirection: 'row', alignItems: 'center', gap: space.xs, flexWrap: 'wrap' },
  pill: { paddingHorizontal: space.sm, paddingVertical: 2, borderRadius: radius.pill },
  metrics: { flexDirection: 'row', alignItems: 'baseline', gap: space.sm },
});
