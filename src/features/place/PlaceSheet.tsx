import { Platform, Share, StyleSheet, View } from 'react-native';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { Text } from '@/components/ui/Text';
import { formatDistance, haversine } from '@/core/geo';
import { useUnits } from '@/hooks/useRegion';
import type { Place } from '@/services/geocoding/types';
import { useLocation } from '@/store/location';
import { usePlaces } from '@/store/places';
import { useTrip } from '@/store/trip';
import { useTheme } from '@/theme/ThemeProvider';
import { space } from '@/theme/tokens';
import { iconForPlace } from '@/features/search/PlaceRow';

async function sharePlace(place: Place) {
  const [lng, lat] = place.coord;
  const url = `https://www.openstreetmap.org/?mlat=${lat.toFixed(6)}&mlon=${lng.toFixed(6)}#map=17/${lat.toFixed(6)}/${lng.toFixed(6)}`;
  const message = `${place.name}${place.address ? `, ${place.address}` : ''}`;
  try {
    if (Platform.OS === 'web') {
      const nav = globalThis.navigator as Navigator | undefined;
      if (nav?.share) await nav.share({ title: place.name, text: message, url });
      else await nav?.clipboard?.writeText(`${message}\n${url}`);
    } else {
      await Share.share({ message: `${message}\n${url}`, url, title: place.name });
    }
  } catch {
    // Sharing was cancelled.
  }
}

export function PlaceSheet({ place }: { place: Place }) {
  const { p } = useTheme();
  const units = useUnits(place.countryCode);
  const position = useLocation((s) => s.position);
  const directionsTo = useTrip((s) => s.directionsTo);
  const toggleFavorite = usePlaces((s) => s.toggleFavorite);
  const saved = usePlaces((s) => s.favorites.some((f) => f.id === place.id));
  const setSlot = usePlaces((s) => s.setSlot);
  const home = usePlaces((s) => s.home);
  const work = usePlaces((s) => s.work);

  const distance = position ? formatDistance(haversine(position.coord, place.coord), units) : undefined;

  return (
    <View style={styles.content}>
      <View style={styles.titleRow}>
        <View style={[styles.badge, { backgroundColor: p.accentSoft }]}>
          <Icon name={iconForPlace(place)} size={22} color={p.accent} />
        </View>
        <View style={styles.flex}>
          <Text variant="heading" numberOfLines={2}>
            {place.name}
          </Text>
          <Text variant="caption" tone="muted" numberOfLines={2}>
            {[place.category, distance && `${distance} away`].filter(Boolean).join(' · ')}
          </Text>
        </View>
      </View>
      {place.address && (
        <Text variant="body" tone="muted">
          {place.address}
        </Text>
      )}

      <View style={styles.actions}>
        <Button label="Directions" icon="directions" onPress={() => directionsTo(place)} style={styles.flex} />
        <Button
          label={saved ? 'Saved' : 'Save'}
          icon={saved ? 'bookmark' : 'bookmark-border'}
          variant="soft"
          onPress={() => toggleFavorite(place)}
        />
        <Button label="Share" icon="ios-share" variant="outline" onPress={() => sharePlace(place)} />
      </View>

      <View style={styles.slots}>
        <Button
          size="sm"
          variant="ghost"
          icon="home"
          label={home?.id === place.id ? 'This is home' : 'Set as home'}
          onPress={() => setSlot('home', place)}
        />
        <Button
          size="sm"
          variant="ghost"
          icon="work"
          label={work?.id === place.id ? 'This is work' : 'Set as work'}
          onPress={() => setSlot('work', place)}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: space.xl, paddingBottom: space.xl, gap: space.md },
  titleRow: { flexDirection: 'row', gap: space.md, alignItems: 'center' },
  badge: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  flex: { flex: 1 },
  actions: { flexDirection: 'row', gap: space.sm, marginTop: space.xs },
  slots: { flexDirection: 'row', gap: space.xs, marginLeft: -space.sm },
});
