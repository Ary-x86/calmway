import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { IconButton } from '@/components/ui/IconButton';
import { Text } from '@/components/ui/Text';
import { useTrip } from '@/store/trip';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, space } from '@/theme/tokens';

function Field({ dot, label, value, onPress }: { dot: string; label: string; value: string; onPress: () => void }) {
  const { p } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${label}: ${value}. Change`}
      onPress={onPress}
      style={({ pressed }) => [styles.field, { backgroundColor: pressed ? p.surfaceSunken : p.background }]}
    >
      <View style={[styles.dot, { borderColor: dot }]} />
      <Text variant="label" numberOfLines={1} style={styles.flex}>
        {value}
      </Text>
    </Pressable>
  );
}

export function DirectionsHeader() {
  const { p, scheme } = useTheme();
  const origin = useTrip((s) => s.origin);
  const destination = useTrip((s) => s.destination);
  const swap = useTrip((s) => s.swap);
  const back = useTrip((s) => s.back);
  const shadow = scheme === 'dark' ? '0 4px 18px rgba(0,0,0,0.5)' : '0 4px 18px rgba(27, 42, 44, 0.12)';

  return (
    <View style={[styles.card, { backgroundColor: p.surfaceRaised, boxShadow: shadow }]}>
      <IconButton icon="arrow-back" label="Back" size={38} tone="subtle" onPress={back} />
      <View style={styles.fields}>
        <Field
          dot={p.primary}
          label="From"
          value={origin?.name ?? 'Your location'}
          onPress={() => router.push({ pathname: '/search', params: { purpose: 'origin' } })}
        />
        <Field
          dot={p.accent}
          label="To"
          value={destination?.name ?? 'Choose destination'}
          onPress={() => router.push({ pathname: '/search', params: { purpose: 'destination' } })}
        />
      </View>
      <IconButton icon="swap-vert" label="Swap start and destination" size={38} tone="subtle" onPress={swap} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', gap: space.sm, padding: space.sm, borderRadius: radius.lg },
  fields: { flex: 1, gap: space.xs },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    height: 40,
    paddingHorizontal: space.md,
    borderRadius: radius.sm,
  },
  dot: { width: 12, height: 12, borderRadius: 6, borderWidth: 3 },
  flex: { flex: 1 },
});
