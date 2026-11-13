import { StyleSheet, View } from 'react-native';
import { Icon } from '@/components/ui/Icon';
import { ManeuverIcon } from '@/components/ui/ManeuverIcon';
import { Text } from '@/components/ui/Text';
import { kindLabel, stressKindAt, type DriveSide } from '@/core/calm-score';
import { formatDistance, type UnitSystem } from '@/core/geo';
import { nextTrickyIndex, type NavProgress } from '@/core/nav';
import type { Maneuver } from '@/services/routing/types';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, space } from '@/theme/tokens';

function streetFor(m: Maneuver): string {
  return m.streetNames[0] ?? m.instruction.replace(/\.$/, '');
}

export function ManeuverBanner({
  maneuvers,
  progress,
  units,
  driveSide,
  rerouting,
}: {
  maneuvers: Maneuver[];
  progress: NavProgress | null;
  units: UnitSystem;
  driveSide: DriveSide;
  rerouting: boolean;
}) {
  const { p, scheme } = useTheme();
  const shadow = scheme === 'dark' ? '0 6px 20px rgba(0,0,0,0.5)' : '0 6px 20px rgba(27, 42, 44, 0.18)';

  if (rerouting) {
    return (
      <View style={[styles.banner, { backgroundColor: p.accent, boxShadow: shadow }]}>
        <Icon name="alt-route" size={36} color={p.onAccent} />
        <View style={styles.flex}>
          <Text variant="heading" color={p.onAccent}>
            Finding a new calm route
          </Text>
          <Text variant="caption" color={p.onAccent}>
            No rush. Keep driving safely.
          </Text>
        </View>
      </View>
    );
  }

  const idx = progress?.nextIndex ?? 1;
  const next = maneuvers[idx] ?? maneuvers[maneuvers.length - 1];
  if (!next) return null;
  const distance = progress ? formatDistance(progress.distanceToNext, units) : '';
  const then = maneuvers[idx + 1];
  const thenSoon = then && next.distance < 400;

  const trickyIdx = nextTrickyIndex(maneuvers, idx + 1, driveSide);
  const tricky = trickyIdx > idx ? maneuvers[trickyIdx] : undefined;
  const trickyKind = tricky ? stressKindAt(maneuvers, trickyIdx, driveSide) : null;
  const trickyDistance =
    tricky && progress
      ? maneuvers.slice(idx, trickyIdx).reduce((sum, m) => sum + m.distance, progress.distanceToNext)
      : 0;

  return (
    <View style={styles.stack}>
      <View style={[styles.banner, { backgroundColor: p.primary, boxShadow: shadow }]}>
        <ManeuverIcon type={next.type} size={48} color={p.onPrimary} />
        <View style={styles.flex}>
          <Text variant="metric" color={p.onPrimary}>
            {distance}
          </Text>
          <Text variant="bodyStrong" color={p.onPrimary} numberOfLines={2}>
            {streetFor(next)}
          </Text>
          {next.sign && (
            <Text variant="caption" color={p.onPrimary} numberOfLines={1} style={styles.sign}>
              {next.sign}
            </Text>
          )}
        </View>
      </View>
      {(thenSoon || (tricky && trickyKind)) && (
        <View style={styles.subRow}>
          {thenSoon && (
            <View style={[styles.sub, { backgroundColor: p.primaryPressed }]}>
              <Text variant="label" color={p.onPrimary}>
                Then
              </Text>
              <ManeuverIcon type={then.type} size={22} color={p.onPrimary} />
            </View>
          )}
          {tricky && trickyKind && !thenSoon && (
            <View style={[styles.sub, { backgroundColor: p.surfaceRaised, boxShadow: shadow }]}>
              <Icon name="visibility" size={16} color={p.inkMuted} />
              <Text variant="caption" tone="muted">
                Next tricky part: {kindLabel(trickyKind, 1).replace(/^1 /, '')} in{' '}
                {formatDistance(trickyDistance, units)}
              </Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  stack: { gap: space.sm },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.lg,
    paddingHorizontal: space.xl,
    paddingVertical: space.lg,
    borderRadius: radius.xl,
  },
  flex: { flex: 1 },
  sign: { opacity: 0.85 },
  subRow: { flexDirection: 'row', gap: space.sm },
  sub: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    borderRadius: radius.pill,
  },
});
