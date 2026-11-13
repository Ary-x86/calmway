import { Camera, GeoJSONSource, Layer, Map, type CameraRef, type LayerProps } from '@maplibre/maplibre-react-native';
import { forwardRef, useImperativeHandle, useMemo, useRef } from 'react';
import { StyleSheet } from 'react-native';
import { buildMapStyle } from '@/theme/map/mapStyle';
import { palettes } from '@/theme/tokens';
import { markerLayers, markersGeoJSON, routeLayers, routesGeoJSON, SOURCE, userGeoJSON, userLayers } from './layers';
import type { CalmMapHandle, CalmMapProps } from './types';

type Spec = ReturnType<typeof routeLayers>[number];

function SpecLayers({ specs }: { specs: Spec[] }) {
  return (
    <>
      {specs.map((spec) => (
        <Layer key={spec.id} {...(spec as unknown as LayerProps)} />
      ))}
    </>
  );
}

/** Native map (iOS and Android) using MapLibre Native. */
export const CalmMap = forwardRef<CalmMapHandle, CalmMapProps>(function CalmMap(props, ref) {
  const camera = useRef<CameraRef>(null);
  const palette = palettes[props.scheme];
  const style = useMemo(() => buildMapStyle(props.scheme), [props.scheme]);

  useImperativeHandle(ref, () => ({
    fitBounds(bbox, padding, duration = 700) {
      camera.current?.fitBounds(bbox, { padding, duration, easing: 'ease', bearing: 0, pitch: 0 });
    },
    easeTo(t) {
      const options = Object.fromEntries(
        Object.entries({
          zoom: t.zoom,
          bearing: t.bearing,
          pitch: t.pitch,
          padding: t.padding,
          duration: t.duration ?? 700,
        }).filter(([, v]) => v !== undefined),
      );
      camera.current?.easeTo({ center: t.center, easing: 'ease', ...options });
    },
  }));

  const routes = useMemo(() => routesGeoJSON(props.routes), [props.routes]);
  const markers = useMemo(() => markersGeoJSON(props.markers), [props.markers]);
  const user = useMemo(() => userGeoJSON(props.user), [props.user]);

  return (
    <Map
      style={StyleSheet.absoluteFill}
      mapStyle={style}
      logo={false}
      attribution
      attributionPosition={{ bottom: 8, right: 8 }}
      compass={false}
      onPress={(e) => props.onPress?.(e.nativeEvent.lngLat)}
      onLongPress={(e) => props.onLongPress?.(e.nativeEvent.lngLat)}
      onRegionWillChange={(e) => {
        if (e.nativeEvent.userInteraction) props.onUserGesture?.();
      }}
      onRegionIsChanging={(e) => props.onBearingChange?.(e.nativeEvent.bearing)}
    >
      <Camera ref={camera} initialViewState={{ center: props.initialCenter, zoom: props.initialZoom }} />
      <GeoJSONSource
        id={SOURCE.routes}
        data={routes}
        hitbox={{ top: 12, right: 12, bottom: 12, left: 12 }}
        onPress={(e) => {
          const id = e.nativeEvent.features[0]?.properties?.id;
          if (id) props.onRoutePress?.(String(id));
        }}
      >
        <SpecLayers specs={routeLayers(palette)} />
      </GeoJSONSource>
      <GeoJSONSource
        id={SOURCE.markers}
        data={markers}
        hitbox={{ top: 10, right: 10, bottom: 10, left: 10 }}
        onPress={(e) => {
          const id = e.nativeEvent.features[0]?.properties?.id;
          if (id) props.onMarkerPress?.(String(id));
        }}
      >
        <SpecLayers specs={markerLayers(palette)} />
      </GeoJSONSource>
      <GeoJSONSource id={SOURCE.user} data={user}>
        <SpecLayers specs={userLayers(palette)} />
      </GeoJSONSource>
    </Map>
  );
});
