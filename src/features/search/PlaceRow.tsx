import { Pressable, StyleSheet, View } from 'react-native';
import { formatDistance, haversine, type LngLat } from '@/core/geo';
import { Icon, type IconName } from '@/components/ui/Icon';
import { Text } from '@/components/ui/Text';
import { useUnits } from '@/hooks/useRegion';
import type { Place } from '@/services/geocoding/types';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, space } from '@/theme/tokens';

const CATEGORY_ICONS: Record<string, IconName> = {
  Fuel: 'local-gas-station',
  'Charging station': 'ev-station',
  Parking: 'local-parking',
  Cafe: 'local-cafe',
  Restaurant: 'restaurant',
  'Fast food': 'fastfood',
  Street: 'signpost',
  Road: 'signpost',
  Area: 'location-city',
  City: 'location-city',
  Town: 'location-city',
  Village: 'holiday-village',
  Address: 'home',
  Services: 'local-gas-station',
  'Rest area': 'airline-seat-recline-normal',
  Supermarket: 'shopping-cart',
  Hospital: 'local-hospital',
  Pharmacy: 'local-pharmacy',
  School: 'school',
  Station: 'train',
  Hotel: 'hotel',
  Park: 'park',
};

export function iconForPlace(place: Place): IconName {
  return (place.category && CATEGORY_ICONS[place.category]) || 'place';
}

export interface PlaceRowProps {
  place: Place;
  near?: LngLat;
  icon?: IconName;
  subtitle?: string;
  onPress: () => void;
  trailing?: React.ReactNode;
}

export function PlaceRow({ place, near, icon, subtitle, onPress, trailing }: PlaceRowProps) {
  const { p } = useTheme();
  const units = useUnits(place.countryCode);
  const distance = near ? formatDistance(haversine(near, place.coord), units) : undefined;
  const detail = subtitle ?? [place.category, place.address].filter(Boolean).join(' · ');
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${place.name}${place.address ? `, ${place.address}` : ''}`}
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && { backgroundColor: p.surfaceSunken }]}
    >
      <View style={[styles.icon, { backgroundColor: p.primarySoft }]}>
        <Icon name={icon ?? iconForPlace(place)} size={20} color={p.primary} />
      </View>
      <View style={styles.text}>
        <Text variant="bodyStrong" numberOfLines={1}>
          {place.name}
        </Text>
        {detail ? (
          <Text variant="caption" tone="muted" numberOfLines={1}>
            {detail}
          </Text>
        ) : null}
      </View>
      {distance && (
        <Text variant="caption" tone="faint">
          {distance}
        </Text>
      )}
      {trailing}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingVertical: space.md,
    paddingHorizontal: space.lg,
    borderRadius: radius.md,
  },
  icon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  text: { flex: 1, gap: 2 },
});
