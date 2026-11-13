import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CalmMap } from '@/components/map/CalmMap';
import type { CalmMapHandle, MapMarker, MapRoute, Padding } from '@/components/map/types';
import { IconButton } from '@/components/ui/IconButton';
import { Sheet } from '@/components/ui/Sheet';
import type { StressKind } from '@/core/calm-score';
import { bboxOf, mergeBBoxes, type LngLat } from '@/core/geo';
import type { Fix } from '@/core/nav';
import { DirectionsHeader } from '@/features/directions/DirectionsHeader';
import { DirectionsSheet } from '@/features/directions/DirectionsSheet';
import { useRoutes } from '@/features/directions/useRoutes';
import { ArrivalSheet } from '@/features/navigation/ArrivalSheet';
import { NavigationLayer } from '@/features/navigation/NavigationLayer';
import { PlaceSheet } from '@/features/place/PlaceSheet';
import { useLayout } from '@/hooks/useLayout';
import { useDriveSide, useUnits } from '@/hooks/useRegion';
import { useUserLocation } from '@/hooks/useUserLocation';
import { reverseGeocode } from '@/services/geocoding/photon';
import { useLocation } from '@/store/location';
import { useTrip, type Mode } from '@/store/trip';
import { useTheme } from '@/theme/ThemeProvider';
import { space } from '@/theme/tokens';
import { ExploreSheet } from './ExploreSheet';
import { ResultsSheet } from './ResultsSheet';
import { TopBar } from './TopBar';

const WORLD: LngLat = [8, 30];
const SHOWN_STRESS: StressKind[] = ['highway-entry', 'interchange', 'merge', 'turn-across', 'u-turn', 'roundabout'];

const DEFAULT_INDEX: Record<Mode, number> = {
  explore: 1,
  results: 1,
  place: 0,
  directions: 1,
  navigating: 0,
  arrived: 0,
};

export function HomeScreen() {
  const { p, scheme } = useTheme();
  const insets = useSafeAreaInsets();
  const { height, wide, panelWidth } = useLayout();
  const map = useRef<CalmMapHandle>(null);
  const trip = useTrip();
  const position = useLocation((s) => s.position);
  const permission = useLocation((s) => s.permission);
  const { request } = useUserLocation();
  const units = useUnits(trip.destination?.countryCode ?? trip.place?.countryCode);
  const driveSide = useDriveSide(trip.destination?.countryCode);

  const [sheetIndex, setSheetIndex] = useState(DEFAULT_INDEX[trip.mode]);
  const [sheetHeight, setSheetHeight] = useState(0);
  const [topHeight, setTopHeight] = useState(120);
  const [following, setFollowing] = useState(true);
  const [bearing, setBearing] = useState(0);
  const [navPos, setNavPos] = useState<Fix | null>(null);
  const [userMovedMap, setUserMovedMap] = useState(0);

  const inDirections = trip.mode === 'directions';
  const originCoord = trip.origin?.coord ?? position?.coord;
  const routes = useRoutes(inDirections ? originCoord : undefined, inDirections ? trip.destination : undefined);
  const selectedId = trip.selectedRouteId ?? routes.ranked[0]?.id;
  const selectedRoute = routes.ranked.find((r) => r.id === selectedId);

  // Each mode opens its sheet at its own default height.
  const [sheetMode, setSheetMode] = useState(trip.mode);
  if (sheetMode !== trip.mode) {
    setSheetMode(trip.mode);
    setSheetIndex(DEFAULT_INDEX[trip.mode]);
  }

  const snapPoints = useMemo(() => {
    const tall = height - insets.top - topHeight - space.lg;
    switch (trip.mode) {
      case 'place':
        return [236];
      case 'directions':
        return [200, Math.min(height * 0.6, tall), tall];
      case 'arrived':
        return [300];
      default:
        return [132, Math.min(380, height * 0.5), tall];
    }
  }, [trip.mode, height, insets.top, topHeight]);

  const padding: Padding = useMemo(
    () =>
      wide
        ? { top: topHeight + 40, bottom: 40, left: panelWidth + 56, right: 56 }
        : { top: insets.top + topHeight + 24, bottom: sheetHeight + 24, left: 40, right: 40 },
    [wide, topHeight, panelWidth, insets.top, sheetHeight],
  );

  // Camera: first fix, follow mode, and framing whatever the screen is about.
  const hadFix = useRef(false);
  useEffect(() => {
    if (!position || trip.mode === 'navigating') return;
    if (!hadFix.current) {
      hadFix.current = true;
      if (trip.mode === 'explore') map.current?.easeTo({ center: position.coord, zoom: 14.5, padding, duration: 1200 });
      return;
    }
    if (following && trip.mode === 'explore') map.current?.easeTo({ center: position.coord, padding, duration: 600 });
    // Only react to new positions here.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [position]);

  useEffect(() => {
    if (trip.mode === 'place' && trip.place) {
      map.current?.easeTo({ center: trip.place.coord, zoom: 15.5, padding, duration: 800 });
    } else if (trip.mode === 'results' && trip.results.length > 0) {
      const pts = trip.results.map((r) => r.coord);
      if (position) pts.push(position.coord);
      map.current?.fitBounds(bboxOf(pts), padding);
    } else if (trip.mode === 'arrived' && trip.arrival) {
      map.current?.easeTo({ center: trip.arrival.destination.coord, zoom: 15.5, bearing: 0, pitch: 0, padding });
    }
    // Frame once per change of focus, not on every padding tweak.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trip.mode, trip.place, trip.results, trip.arrival]);

  const framedRoutes = useRef<string>('');
  useEffect(() => {
    if (!inDirections || routes.ranked.length === 0) return;
    const key = routes.ranked.map((r) => r.id).join('|');
    if (framedRoutes.current === key) return;
    framedRoutes.current = key;
    map.current?.fitBounds(mergeBBoxes(routes.ranked.map((r) => r.bbox)), padding);
  }, [inDirections, routes.ranked, padding]);

  useEffect(() => {
    if (!inDirections) framedRoutes.current = '';
  }, [inDirections]);

  // What to draw.
  const mapRoutes: MapRoute[] = useMemo(() => {
    if (trip.mode === 'navigating' && trip.navRoute) {
      return [{ id: trip.navRoute.id, geometry: trip.navRoute.geometry, selected: true, color: p.routeCalm }];
    }
    if (!inDirections) return [];
    return routes.ranked.map((r) => {
      const selected = r.id === selectedId;
      const color = !selected
        ? p.routeAlt
        : r.labels.includes('calmest')
          ? p.routeCalm
          : r.labels.includes('fastest')
            ? p.routeFast
            : p.routeCalm;
      return { id: r.id, geometry: r.geometry, selected, color };
    });
  }, [trip.mode, trip.navRoute, inDirections, routes.ranked, selectedId, p]);

  const markers: MapMarker[] = useMemo(() => {
    const out: MapMarker[] = [];
    const destKind = (id: string) => (id.startsWith('pt:') ? 'pin' : 'destination');
    switch (trip.mode) {
      case 'results':
        trip.results.forEach((r) => out.push({ id: r.id, coord: r.coord, kind: 'result', label: r.name }));
        break;
      case 'place':
        if (trip.place)
          out.push({
            id: trip.place.id,
            coord: trip.place.coord,
            kind: destKind(trip.place.id),
            label: trip.place.name,
            selected: true,
          });
        break;
      case 'directions':
        selectedRoute?.score.events
          .filter((e) => SHOWN_STRESS.includes(e.kind))
          .forEach((e, i) => out.push({ id: `stress-${i}`, coord: e.coord, kind: 'stress' }));
        if (trip.origin) out.push({ id: 'origin', coord: trip.origin.coord, kind: 'origin' });
        if (trip.destination)
          out.push({ id: 'dest', coord: trip.destination.coord, kind: 'destination', label: trip.destination.name });
        break;
      case 'navigating':
      case 'arrived': {
        const dest = trip.destination ?? trip.arrival?.destination;
        if (dest) out.push({ id: 'dest', coord: dest.coord, kind: 'destination', label: dest.name });
        break;
      }
    }
    return out;
  }, [trip.mode, trip.results, trip.place, trip.origin, trip.destination, trip.arrival, selectedRoute]);

  const user = useMemo(() => {
    if (trip.mode === 'navigating' && navPos) return { coord: navPos.coord, heading: navPos.heading, navigating: true };
    return position ? { coord: position.coord, heading: position.heading } : undefined;
  }, [trip.mode, navPos, position]);

  // Map interactions.
  const onLongPress = useCallback(async (coord: LngLat) => {
    const mode = useTrip.getState().mode;
    if (mode === 'navigating' || mode === 'arrived') return;
    if (mode === 'directions') return;
    useTrip
      .getState()
      .selectPlace({ id: `pt:${coord[0].toFixed(5)},${coord[1].toFixed(5)}`, name: 'Dropped pin', coord });
    const place = await reverseGeocode(coord, { lang: 'en' }).catch(() => undefined);
    const s = useTrip.getState();
    if (place && s.mode === 'place' && s.place?.coord === coord) s.selectPlace(place);
  }, []);

  const onPress = useCallback(() => {
    const s = useTrip.getState();
    if (s.mode === 'place') s.back();
  }, []);

  const onMarkerPress = useCallback((id: string) => {
    const s = useTrip.getState();
    const hit = s.results.find((r) => r.id === id);
    if (hit) s.selectPlace(hit);
  }, []);

  const onRoutePress = useCallback((id: string) => {
    const s = useTrip.getState();
    if (s.mode === 'directions') s.selectRoute(id);
  }, []);

  const onUserGesture = useCallback(() => {
    setFollowing(false);
    setUserMovedMap((n) => n + 1);
  }, []);

  const locate = async () => {
    if (permission !== 'granted') {
      await request();
      return;
    }
    setFollowing(true);
    if (position) map.current?.easeTo({ center: position.coord, zoom: 15, bearing: 0, pitch: 0, padding });
  };

  const sheetStyle = wide ? { left: space.lg, bottom: space.lg, width: panelWidth, borderRadius: 28 } : undefined;
  const navigating = trip.mode === 'navigating' && trip.navRoute;

  return (
    <View style={[styles.screen, { backgroundColor: p.background }]}>
      <CalmMap
        ref={map}
        scheme={scheme}
        routes={mapRoutes}
        markers={markers}
        user={user}
        initialCenter={WORLD}
        initialZoom={1.6}
        onPress={onPress}
        onLongPress={onLongPress}
        onMarkerPress={onMarkerPress}
        onRoutePress={onRoutePress}
        onUserGesture={onUserGesture}
        onBearingChange={setBearing}
      />

      {navigating ? (
        <NavigationLayer
          route={trip.navRoute!}
          simulate={trip.simulate}
          driveSide={driveSide}
          units={units}
          map={map}
          userMovedMap={userMovedMap}
          onPosition={setNavPos}
          onEnd={trip.endNavigation}
        />
      ) : (
        <>
          <View
            pointerEvents="box-none"
            onLayout={(e) => {
              // A hidden screen reports 0, keep the last real height.
              const h = e.nativeEvent.layout.height;
              if (h > 0) setTopHeight(h);
            }}
            style={[styles.top, { top: insets.top + space.sm }, wide && { width: panelWidth, right: undefined }]}
          >
            {trip.mode === 'directions' ? (
              <DirectionsHeader />
            ) : trip.mode === 'arrived' ? null : (
              <TopBar
                title={
                  trip.mode === 'results' ? trip.resultsLabel : trip.mode === 'place' ? trip.place?.name : undefined
                }
                onClear={trip.mode === 'results' || trip.mode === 'place' ? trip.reset : undefined}
              />
            )}
          </View>

          <View
            pointerEvents="box-none"
            style={[styles.controls, wide ? { bottom: space.xxl } : { bottom: sheetHeight + space.md }]}
          >
            {Math.abs(bearing) > 3 && (
              <IconButton
                icon="explore"
                label="Point the map north"
                floating
                onPress={() => position && map.current?.easeTo({ center: position.coord, bearing: 0, pitch: 0 })}
              />
            )}
            <IconButton
              icon={permission === 'granted' ? (following ? 'my-location' : 'location-searching') : 'location-disabled'}
              label="Show my location"
              floating
              iconColor={following && permission === 'granted' ? p.primary : undefined}
              onPress={locate}
            />
          </View>

          <Sheet
            snapPoints={snapPoints}
            index={Math.min(sheetIndex, snapPoints.length - 1)}
            onIndexChange={setSheetIndex}
            onHeightChange={setSheetHeight}
            style={sheetStyle}
          >
            {trip.mode === 'explore' && <ExploreSheet />}
            {trip.mode === 'results' && <ResultsSheet />}
            {trip.mode === 'place' && trip.place && <PlaceSheet place={trip.place} />}
            {trip.mode === 'directions' && (
              <DirectionsSheet
                routes={routes.ranked}
                selectedId={selectedId}
                loading={routes.loading}
                error={routes.error}
                needsOrigin={!originCoord}
                units={units}
                onSelect={trip.selectRoute}
                onRetry={() => routes.refetch()}
                onStart={(simulate) => selectedRoute && trip.startNavigation(selectedRoute, simulate)}
              />
            )}
            {trip.mode === 'arrived' && trip.arrival && (
              <ArrivalSheet arrival={trip.arrival} units={units} onDone={trip.reset} />
            )}
          </Sheet>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, overflow: 'hidden' },
  top: { position: 'absolute', left: space.lg, right: space.lg },
  controls: { position: 'absolute', right: space.lg, gap: space.sm, alignItems: 'flex-end' },
});
