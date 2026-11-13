import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Icon, type IconName } from '@/components/ui/Icon';
import { Text } from '@/components/ui/Text';
import { PlaceRow } from '@/features/search/PlaceRow';
import type { Place } from '@/services/geocoding/types';
import { useLocation } from '@/store/location';
import { usePlaces } from '@/store/places';
import { useTrip } from '@/store/trip';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, space } from '@/theme/tokens';

function greeting(): string {
  const h = new Date().getHours();
  if (h < 5) return 'Late drive?';
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

function Shortcut({
  icon,
  label,
  detail,
  onPress,
}: {
  icon: IconName;
  label: string;
  detail: string;
  onPress: () => void;
}) {
  const { p } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${label}, ${detail}`}
      onPress={onPress}
      style={({ pressed }) => [
        styles.shortcut,
        { backgroundColor: pressed ? p.surfaceSunken : p.surfaceRaised, borderColor: p.border },
      ]}
    >
      <View style={[styles.shortcutIcon, { backgroundColor: p.primarySoft }]}>
        <Icon name={icon} size={20} color={p.primary} />
      </View>
      <View style={styles.flex}>
        <Text variant="label">{label}</Text>
        <Text variant="caption" tone="muted" numberOfLines={1}>
          {detail}
        </Text>
      </View>
    </Pressable>
  );
}

export function ExploreSheet() {
  const { p } = useTheme();
  const near = useLocation((s) => s.position?.coord);
  const { home, work, favorites, recents } = usePlaces();
  const directionsTo = useTrip((s) => s.directionsTo);
  const selectPlace = useTrip((s) => s.selectPlace);

  const goTo = (place: Place | undefined, slot: 'home' | 'work') => {
    if (place) directionsTo(place);
    else router.push({ pathname: '/search', params: { purpose: slot } });
  };

  return (
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Text variant="overline" tone="faint">
          {greeting()}
        </Text>
        <Text variant="title">Take the calm way there.</Text>
      </View>

      <View style={styles.shortcuts}>
        <Shortcut
          icon="home"
          label="Home"
          detail={home ? home.name : 'Set address'}
          onPress={() => goTo(home, 'home')}
        />
        <Shortcut
          icon="work"
          label="Work"
          detail={work ? work.name : 'Set address'}
          onPress={() => goTo(work, 'work')}
        />
      </View>

      {favorites.length > 0 && (
        <View>
          <Text variant="overline" tone="faint" style={styles.section}>
            Saved
          </Text>
          {favorites.map((f) => (
            <PlaceRow key={f.id} place={f} near={near} icon="bookmark" onPress={() => selectPlace(f)} />
          ))}
        </View>
      )}

      {recents.length > 0 && (
        <View>
          <Text variant="overline" tone="faint" style={styles.section}>
            Recent
          </Text>
          {recents.slice(0, 5).map((r) => (
            <PlaceRow key={r.id} place={r} near={near} icon="history" onPress={() => selectPlace(r)} />
          ))}
        </View>
      )}

      <Pressable
        accessibilityRole="button"
        onPress={() => router.push('/settings')}
        style={({ pressed }) => [styles.tip, { backgroundColor: p.primarySoft, opacity: pressed ? 0.85 : 1 }]}
      >
        <Icon name="spa" size={22} color={p.primary} />
        <View style={styles.flex}>
          <Text variant="label" tone="primary">
            Calm routes are tuned to you
          </Text>
          <Text variant="caption" tone="muted">
            Tell Calmway what makes driving stressful, like merging or roundabouts, and routes will steer around it.
          </Text>
        </View>
        <Icon name="chevron-right" size={20} color={p.primary} />
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: space.lg, paddingBottom: space.xxl, gap: space.md },
  header: { gap: space.xs, paddingHorizontal: space.xs, paddingTop: space.xs },
  shortcuts: { flexDirection: 'row', gap: space.sm },
  shortcut: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    padding: space.md,
    borderRadius: radius.lg,
    borderWidth: 1,
  },
  shortcutIcon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  flex: { flex: 1 },
  section: { paddingHorizontal: space.xs, paddingTop: space.sm, paddingBottom: space.xxs },
  tip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    padding: space.lg,
    borderRadius: radius.lg,
    marginTop: space.sm,
  },
});
