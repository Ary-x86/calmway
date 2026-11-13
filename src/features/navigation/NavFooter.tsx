import { StyleSheet, View } from 'react-native';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { IconButton } from '@/components/ui/IconButton';
import { Text } from '@/components/ui/Text';
import { formatArrival, formatDistance, formatDuration, type UnitSystem } from '@/core/geo';
import type { NavProgress } from '@/core/nav';
import type { RankedRoute } from '@/services/routing/types';
import { useTheme } from '@/theme/ThemeProvider';
import { space } from '@/theme/tokens';
import type { NavigationSession } from './useNavigationSession';

const SPEEDS = [1, 4, 8];

export function NavFooter({
  route,
  progress,
  session,
  simulate,
  units,
  onEnd,
  onOverview,
}: {
  route: RankedRoute;
  progress: NavProgress | null;
  session: NavigationSession;
  simulate: boolean;
  units: UnitSystem;
  onEnd: () => void;
  onOverview: () => void;
}) {
  const { p } = useTheme();
  const remaining = progress?.remainingDuration ?? route.duration;
  const distance = progress?.remainingDistance ?? route.distance;

  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        <IconButton icon="close" label="End navigation" tone="subtle" onPress={onEnd} />
        <View style={styles.center}>
          <Text variant="heading" tone="primary">
            {formatDuration(remaining)}
          </Text>
          <Text variant="caption" tone="muted">
            {formatDistance(distance, units)} · arrive {formatArrival(remaining)}
          </Text>
        </View>
        <IconButton
          icon={session.muted ? 'volume-off' : 'volume-up'}
          label={session.muted ? 'Unmute voice' : 'Mute voice'}
          tone="subtle"
          onPress={() => session.setMuted(!session.muted)}
        />
        <IconButton icon="alt-route" label="Route overview" tone="subtle" onPress={onOverview} />
      </View>
      {simulate && (
        <View style={[styles.sim, { borderTopColor: p.border }]}>
          <Text variant="overline" tone="faint">
            Preview
          </Text>
          {SPEEDS.map((s) => (
            <Chip key={s} label={`${s}x`} selected={session.simSpeed === s} onPress={() => session.setSimSpeed(s)} />
          ))}
          <View style={styles.flex} />
          <Button
            label="Wrong turn"
            icon="call-missed-outgoing"
            size="sm"
            variant="outline"
            onPress={session.wrongTurn}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: space.lg, gap: space.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  center: { flex: 1, alignItems: 'center' },
  sim: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    paddingTop: space.md,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  flex: { flex: 1 },
});
