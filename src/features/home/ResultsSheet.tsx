import { FlatList, StyleSheet, View } from 'react-native';
import { Text } from '@/components/ui/Text';
import { PlaceRow } from '@/features/search/PlaceRow';
import { useLocation } from '@/store/location';
import { useTrip } from '@/store/trip';
import { space } from '@/theme/tokens';

export function ResultsSheet() {
  const near = useLocation((s) => s.position?.coord);
  const results = useTrip((s) => s.results);
  const label = useTrip((s) => s.resultsLabel);
  const selectPlace = useTrip((s) => s.selectPlace);

  return (
    <FlatList
      data={results}
      keyExtractor={(p) => p.id}
      contentContainerStyle={styles.list}
      ListHeaderComponent={
        <View style={styles.header}>
          <Text variant="heading">{label}</Text>
          <Text variant="caption" tone="muted">
            {results.length === 0 ? 'Nothing found nearby' : `${results.length} nearby, closest first`}
          </Text>
        </View>
      }
      renderItem={({ item }) => <PlaceRow place={item} near={near} onPress={() => selectPlace(item)} />}
    />
  );
}

const styles = StyleSheet.create({
  list: { paddingHorizontal: space.xs, paddingBottom: space.xxl },
  header: { paddingHorizontal: space.lg, paddingBottom: space.sm, gap: 2 },
});
