import { useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, FlatList, Keyboard, Platform, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Chip } from '@/components/ui/Chip';
import type { IconName } from '@/components/ui/Icon';
import { IconButton } from '@/components/ui/IconButton';
import { Text } from '@/components/ui/Text';
import { useDebounced } from '@/hooks/useDebounced';
import { useLayout } from '@/hooks/useLayout';
import { CATEGORIES, searchNearby, searchPlaces } from '@/services/geocoding/photon';
import type { Place } from '@/services/geocoding/types';
import { useLocation } from '@/store/location';
import { usePlaces } from '@/store/places';
import { useTrip } from '@/store/trip';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, space, fonts } from '@/theme/tokens';
import { PlaceRow } from './PlaceRow';

/** What the picked place is for. */
export type SearchPurpose = 'explore' | 'origin' | 'destination' | 'home' | 'work';

const PLACEHOLDER: Record<SearchPurpose, string> = {
  explore: 'Search for a place or address',
  origin: 'Choose a starting point',
  destination: 'Choose a destination',
  home: 'Set your home address',
  work: 'Set your work address',
};

export function SearchScreen() {
  const { p } = useTheme();
  const { wide } = useLayout();
  const params = useLocalSearchParams<{ purpose?: SearchPurpose }>();
  const purpose: SearchPurpose = params.purpose ?? 'explore';
  const [query, setQuery] = useState('');
  const debounced = useDebounced(query.trim(), 280);
  const near = useLocation((s) => s.position?.coord);
  const recents = usePlaces((s) => s.recents);
  const addRecent = usePlaces((s) => s.addRecent);
  const setSlot = usePlaces((s) => s.setSlot);
  const trip = useTrip();

  const results = useQuery({
    queryKey: ['search', debounced, near?.map((n) => n.toFixed(2))],
    enabled: debounced.length >= 2,
    staleTime: 60_000,
    queryFn: ({ signal }) => searchPlaces(debounced, { near, signal, lang: 'en' }),
  });

  const pick = (place: Place | undefined) => {
    Keyboard.dismiss();
    if (place) addRecent(place);
    switch (purpose) {
      case 'origin':
        trip.setOrigin(place);
        break;
      case 'destination':
        if (place) trip.setDestination(place);
        break;
      case 'home':
      case 'work':
        if (place) setSlot(purpose, place);
        break;
      default:
        if (place) trip.selectPlace(place);
    }
    router.back();
  };

  const pickCategory = async (id: string) => {
    const cat = CATEGORIES.find((c) => c.id === id);
    if (!cat || !near) return;
    Keyboard.dismiss();
    const places = await searchNearby(cat.include, near, { lang: 'en' }).catch(() => []);
    trip.showResults(cat.label, places);
    router.back();
  };

  const showingResults = debounced.length >= 2;
  const data = showingResults ? (results.data ?? []) : recents;

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: p.background }]} edges={['top', 'left', 'right']}>
      <View style={[styles.column, wide && styles.columnWide]}>
        <View style={[styles.bar, { backgroundColor: p.surfaceRaised, borderColor: p.border }]}>
          <IconButton icon="arrow-back" label="Back" size={40} tone="subtle" onPress={() => router.back()} />
          <TextInput
            autoFocus
            value={query}
            onChangeText={setQuery}
            placeholder={PLACEHOLDER[purpose]}
            placeholderTextColor={p.inkFaint}
            returnKeyType="search"
            onSubmitEditing={() => results.data?.[0] && pick(results.data[0])}
            style={[
              styles.input,
              { color: p.ink, fontFamily: fonts.medium },
              Platform.OS === 'web' && ({ outlineStyle: 'none' } as object),
            ]}
            accessibilityLabel={PLACEHOLDER[purpose]}
          />
          {query.length > 0 && (
            <IconButton icon="close" label="Clear search" size={36} tone="subtle" onPress={() => setQuery('')} />
          )}
        </View>

        {purpose === 'explore' && !showingResults && near && (
          <View style={styles.chips}>
            {CATEGORIES.slice(0, 5).map((c) => (
              <Chip key={c.id} label={c.label} icon={c.icon as IconName} onPress={() => pickCategory(c.id)} />
            ))}
          </View>
        )}

        {purpose === 'origin' && (
          <PlaceRow
            place={{ id: 'me', name: 'Your location', coord: near ?? [0, 0] }}
            icon="my-location"
            subtitle={near ? 'Start from where you are' : 'Location is off'}
            onPress={() => pick(undefined)}
          />
        )}

        <FlatList
          data={data}
          keyExtractor={(item) => item.id}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.list}
          ListHeaderComponent={
            !showingResults && recents.length > 0 ? (
              <Text variant="overline" tone="faint" style={styles.section}>
                Recent
              </Text>
            ) : undefined
          }
          ListEmptyComponent={
            showingResults ? (
              results.isFetching ? (
                <ActivityIndicator color={p.primary} style={styles.empty} />
              ) : results.isError ? (
                <Text tone="muted" align="center" style={styles.empty}>
                  Search is not reachable right now. Check your connection and try again.
                </Text>
              ) : (
                <Text tone="muted" align="center" style={styles.empty}>
                  Nothing found for {`"${debounced}"`}. Try a street, a town or a place name.
                </Text>
              )
            ) : (
              <Text tone="muted" align="center" style={styles.empty}>
                Places you search for will show up here.
              </Text>
            )
          }
          renderItem={({ item }) => (
            <PlaceRow
              place={item}
              near={near}
              icon={showingResults ? undefined : 'history'}
              onPress={() => pick(item)}
            />
          )}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  column: { flex: 1 },
  columnWide: { maxWidth: 640, width: '100%', alignSelf: 'center' },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    marginHorizontal: space.lg,
    marginTop: space.sm,
    paddingHorizontal: space.xs + 2,
    height: 54,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  input: { flex: 1, fontSize: 16, height: '100%' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, paddingHorizontal: space.lg, paddingTop: space.md },
  list: { paddingVertical: space.sm, paddingHorizontal: space.xs },
  section: { paddingHorizontal: space.lg, paddingTop: space.md, paddingBottom: space.xs },
  empty: { marginTop: space.xxl, paddingHorizontal: space.xxl },
});
