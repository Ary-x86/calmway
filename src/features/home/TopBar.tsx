import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Chip } from '@/components/ui/Chip';
import { Icon, type IconName } from '@/components/ui/Icon';
import { IconButton } from '@/components/ui/IconButton';
import { Text } from '@/components/ui/Text';
import { CATEGORIES, searchNearby } from '@/services/geocoding/photon';
import { useLocation } from '@/store/location';
import { useTrip } from '@/store/trip';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, space } from '@/theme/tokens';

export function TopBar({ title, onClear }: { title?: string; onClear?: () => void }) {
  const { p, scheme } = useTheme();
  const near = useLocation((s) => s.position?.coord);
  const showResults = useTrip((s) => s.showResults);
  const resultsLabel = useTrip((s) => s.resultsLabel);
  const shadow = scheme === 'dark' ? '0 4px 18px rgba(0,0,0,0.5)' : '0 4px 18px rgba(27, 42, 44, 0.12)';

  const openCategory = async (id: string) => {
    const cat = CATEGORIES.find((c) => c.id === id);
    if (!cat || !near) return;
    const places = await searchNearby(cat.include, near, { lang: 'en' }).catch(() => []);
    showResults(cat.label, places);
  };

  return (
    <View style={styles.wrap} pointerEvents="box-none">
      <View style={[styles.bar, { backgroundColor: p.surfaceRaised, boxShadow: shadow }]}>
        <Pressable
          accessibilityRole="search"
          accessibilityLabel="Search for a place"
          onPress={() => router.push('/search')}
          style={styles.searchArea}
        >
          <Icon name="search" size={22} color={p.inkMuted} />
          <Text variant="body" tone={title ? 'ink' : 'faint'} numberOfLines={1} style={styles.flex}>
            {title ?? 'Where to, calmly?'}
          </Text>
        </Pressable>
        {title && onClear ? (
          <IconButton icon="close" label="Clear" size={38} tone="subtle" onPress={onClear} />
        ) : (
          <IconButton icon="tune" label="Settings" size={38} tone="subtle" onPress={() => router.push('/settings')} />
        )}
      </View>
      {near && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chips}
          style={styles.chipScroll}
        >
          {CATEGORIES.map((c) => (
            <Chip
              key={c.id}
              floating
              label={c.label}
              icon={c.icon as IconName}
              selected={resultsLabel === c.label}
              onPress={() => openCategory(c.id)}
            />
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space.sm },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 54,
    borderRadius: radius.pill,
    paddingLeft: space.lg,
    paddingRight: space.sm,
    gap: space.sm,
  },
  searchArea: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: space.md, height: '100%' },
  flex: { flex: 1 },
  chipScroll: { marginHorizontal: -space.lg, flexGrow: 0 },
  chips: { gap: space.sm, paddingHorizontal: space.lg, paddingVertical: space.xs },
});
