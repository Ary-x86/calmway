import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { Icon } from '@/components/ui/Icon';
import { Text } from '@/components/ui/Text';
import type { UnitSystem } from '@/core/geo';
import type { RankedRoute } from '@/services/routing/types';
import { usePrefs } from '@/store/prefs';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, space } from '@/theme/tokens';
import { RouteCard } from './RouteCard';
import { StressBreakdown } from './StressBreakdown';

export interface DirectionsSheetProps {
  routes: RankedRoute[];
  selectedId?: string;
  loading: boolean;
  error: Error | null;
  needsOrigin: boolean;
  units: UnitSystem;
  onSelect: (id: string) => void;
  onStart: (simulate: boolean) => void;
  onRetry: () => void;
}

export function DirectionsSheet({
  routes,
  selectedId,
  loading,
  error,
  needsOrigin,
  units,
  onSelect,
  onStart,
  onRetry,
}: DirectionsSheetProps) {
  const { p } = useTheme();
  const avoid = usePrefs((s) => s.avoid);
  const setAvoid = usePrefs((s) => s.setAvoid);
  const selected = routes.find((r) => r.id === selectedId) ?? routes[0];

  return (
    <View style={styles.wrap}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.avoidScroll}
          contentContainerStyle={styles.avoid}
        >
          <Chip
            label="No highways"
            icon="block"
            selected={avoid.highways}
            onPress={() => setAvoid('highways', !avoid.highways)}
          />
          <Chip
            label="No tolls"
            icon="money-off"
            selected={avoid.tolls}
            onPress={() => setAvoid('tolls', !avoid.tolls)}
          />
          <Chip
            label="No ferries"
            icon="directions-boat"
            selected={avoid.ferries}
            onPress={() => setAvoid('ferries', !avoid.ferries)}
          />
        </ScrollView>

        {needsOrigin ? (
          <View style={[styles.notice, { backgroundColor: p.accentSoft }]}>
            <Icon name="location-off" size={22} color={p.accentInk} />
            <Text variant="caption" color={p.accentInk} style={styles.flex}>
              Turn on location, or tap the starting point above to choose where you leave from.
            </Text>
          </View>
        ) : loading ? (
          <View style={styles.loading}>
            <ActivityIndicator color={p.primary} />
            <Text tone="muted">Looking for the calmest way there</Text>
          </View>
        ) : error ? (
          <View style={[styles.notice, { backgroundColor: p.accentSoft }]}>
            <Icon name="cloud-off" size={22} color={p.accentInk} />
            <View style={styles.flex}>
              <Text variant="caption" color={p.accentInk}>
                {error.message}
              </Text>
            </View>
            <Button label="Try again" size="sm" variant="outline" onPress={onRetry} />
          </View>
        ) : (
          <>
            {routes.map((r) => (
              <RouteCard
                key={r.id}
                route={r}
                units={units}
                selected={r.id === selected?.id}
                onPress={() => onSelect(r.id)}
              />
            ))}
            {selected && <StressBreakdown score={selected.score} units={units} />}
          </>
        )}
      </ScrollView>
      {selected && !loading && !error && !needsOrigin && (
        <View style={[styles.footer, { borderTopColor: p.border, backgroundColor: p.surface }]}>
          <Button
            label={selected.labels.includes('calmest') ? 'Start calm drive' : 'Start'}
            icon="navigation"
            size="lg"
            onPress={() => onStart(false)}
            style={styles.flex}
          />
          <Button
            label="Preview"
            icon="play-circle-outline"
            size="lg"
            variant="soft"
            onPress={() => onStart(true)}
            accessibilityHint="Simulates the drive so you can see every turn before you go"
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1 },
  content: { paddingHorizontal: space.lg, paddingBottom: space.xl, gap: space.md },
  avoidScroll: { marginHorizontal: -space.lg, flexGrow: 0 },
  avoid: { gap: space.sm, paddingHorizontal: space.lg },
  loading: { alignItems: 'center', gap: space.md, paddingVertical: space.xxl },
  notice: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.md, borderRadius: radius.md },
  flex: { flex: 1 },
  footer: {
    flexDirection: 'row',
    gap: space.sm,
    padding: space.lg,
    paddingTop: space.md,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
