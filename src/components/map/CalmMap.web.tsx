import maplibregl, {
  type GeoJSONSource,
  type LayerSpecification,
  type Map as MlMap,
  type StyleSpecification,
} from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { forwardRef, useEffect, useImperativeHandle, useLayoutEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import type { LngLat } from '@/core/geo';
import { buildMapStyle } from '@/theme/map/mapStyle';
import { palettes } from '@/theme/tokens';
import {
  LAYER,
  markerLayers,
  markersGeoJSON,
  routeLayers,
  routesGeoJSON,
  SOURCE,
  userGeoJSON,
  userLayers,
} from './layers';
import type { CalmMapHandle, CalmMapProps } from './types';
import type { ColorScheme } from '@/theme/tokens';

// maplibre-gl and the native SDK ship different copies of the style spec types.
const styleFor = (scheme: ColorScheme) => buildMapStyle(scheme) as unknown as StyleSpecification;

const LONG_PRESS_MS = 550;

/** maplibre treats a present-but-undefined key as NaN, so drop them. */
function defined<T extends object>(obj: T): Partial<T> {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined)) as Partial<T>;
}

export const CalmMap = forwardRef<CalmMapHandle, CalmMapProps>(function CalmMap(props, ref) {
  const container = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MlMap | null>(null);
  const ready = useRef(false);
  const latest = useRef(props);
  /** Camera move requested while the map was hidden (zero size), run on next resize. */
  const pending = useRef<((map: MlMap) => void) | null>(null);
  useLayoutEffect(() => {
    latest.current = props;
  });

  useImperativeHandle(ref, () => {
    const run = (move: (map: MlMap) => void) => {
      const map = mapRef.current;
      const el = container.current;
      if (!map || !el) return;
      if (el.clientWidth === 0 || el.clientHeight === 0) {
        pending.current = move;
        return;
      }
      // Coming back from a hidden screen, maplibre may still think it is 0x0.
      const canvas = map.getCanvas();
      if (canvas.clientWidth !== el.clientWidth || canvas.clientHeight !== el.clientHeight) map.resize();
      move(map);
    };
    return {
      fitBounds(bbox, padding, duration = 700) {
        run((map) =>
          map.fitBounds(
            [
              [bbox[0], bbox[1]],
              [bbox[2], bbox[3]],
            ],
            { padding, duration, maxZoom: 16, bearing: 0, pitch: 0, essential: true },
          ),
        );
      },
      easeTo(t) {
        // Padding is turned into an offset. maplibre would otherwise keep it and
        // add it to every later fitBounds, which leaves no room on a phone.
        const p = t.padding;
        const offset: [number, number] | undefined = p ? [(p.left - p.right) / 2, (p.top - p.bottom) / 2] : undefined;
        run((map) =>
          map.easeTo(
            defined({
              center: t.center,
              zoom: t.zoom,
              bearing: t.bearing,
              pitch: t.pitch,
              duration: t.duration ?? 700,
              offset,
              essential: true,
            }),
          ),
        );
      },
    };
  });

  // Create the map once.
  useEffect(() => {
    if (!container.current) return;
    const map = new maplibregl.Map({
      container: container.current,
      style: styleFor(latest.current.scheme),
      center: latest.current.initialCenter,
      zoom: latest.current.initialZoom,
      attributionControl: { compact: true },
      dragRotate: true,
      pitchWithRotate: true,
      maxPitch: 65,
    });
    mapRef.current = map;
    if (__DEV__) (globalThis as { __calmMap?: MlMap }).__calmMap = map;

    const addOverlays = () => {
      const p = palettes[latest.current.scheme];
      const add = (id: string, data: GeoJSON.FeatureCollection) => {
        if (!map.getSource(id)) map.addSource(id, { type: 'geojson', data });
      };
      add(SOURCE.routes, routesGeoJSON(latest.current.routes));
      add(SOURCE.markers, markersGeoJSON(latest.current.markers));
      add(SOURCE.user, userGeoJSON(latest.current.user));
      const addLayers = (source: string, specs: ReturnType<typeof routeLayers>) => {
        for (const spec of specs) {
          if (!map.getLayer(spec.id)) map.addLayer({ ...spec, source } as unknown as LayerSpecification);
        }
      };
      addLayers(SOURCE.routes, routeLayers(p));
      addLayers(SOURCE.markers, markerLayers(p));
      addLayers(SOURCE.user, userLayers(p));
      ready.current = true;
    };
    map.on('style.load', addOverlays);

    const toLngLat = (e: { lngLat: { lng: number; lat: number } }): LngLat => [e.lngLat.lng, e.lngLat.lat];

    map.on('click', (e) => {
      const hits = map.queryRenderedFeatures(e.point, {
        layers: [LAYER.markerDot, LAYER.routeLine, LAYER.routeCasing].filter((l) => map.getLayer(l)),
      });
      const marker = hits.find((f) => f.layer.id === LAYER.markerDot);
      if (marker) return latest.current.onMarkerPress?.(String(marker.properties.id));
      const route = hits.find((f) => f.layer.id === LAYER.routeLine || f.layer.id === LAYER.routeCasing);
      if (route) return latest.current.onRoutePress?.(String(route.properties.id));
      latest.current.onPress?.(toLngLat(e));
    });
    map.on('contextmenu', (e) => latest.current.onLongPress?.(toLngLat(e)));

    // Touch long press (maplibre has no built-in one).
    let pressTimer: ReturnType<typeof setTimeout> | null = null;
    const cancelPress = () => {
      if (pressTimer) clearTimeout(pressTimer);
      pressTimer = null;
    };
    map.on('touchstart', (e) => {
      cancelPress();
      if (e.originalEvent.touches.length !== 1) return;
      const at = toLngLat(e);
      pressTimer = setTimeout(() => latest.current.onLongPress?.(at), LONG_PRESS_MS);
    });
    map.on('touchend', cancelPress);
    map.on('touchmove', cancelPress);
    map.on('movestart', (e) => {
      cancelPress();
      if ((e as { originalEvent?: Event }).originalEvent) latest.current.onUserGesture?.();
    });
    map.on('rotate', () => latest.current.onBearingChange?.(map.getBearing()));

    const cursorOn = () => (map.getCanvas().style.cursor = 'pointer');
    const cursorOff = () => (map.getCanvas().style.cursor = '');
    for (const l of [LAYER.markerDot, LAYER.routeLine]) {
      map.on('mouseenter', l, cursorOn);
      map.on('mouseleave', l, cursorOff);
    }

    const resize = new ResizeObserver(() => {
      map.resize();
      const el = container.current;
      if (pending.current && el && el.clientWidth > 0 && el.clientHeight > 0) {
        const move = pending.current;
        pending.current = null;
        move(map);
      }
    });
    resize.observe(container.current);

    return () => {
      resize.disconnect();
      cancelPress();
      map.remove();
      mapRef.current = null;
      ready.current = false;
    };
  }, []);

  // Theme change: swap the base style, overlays are re-added on style.load.
  const firstScheme = useRef(props.scheme);
  useEffect(() => {
    const map = mapRef.current;
    if (!map || props.scheme === firstScheme.current) return;
    firstScheme.current = props.scheme;
    ready.current = false;
    map.setStyle(styleFor(props.scheme), { diff: false });
  }, [props.scheme]);

  useEffect(() => {
    if (!ready.current) return;
    (mapRef.current?.getSource(SOURCE.routes) as GeoJSONSource | undefined)?.setData(routesGeoJSON(props.routes));
  }, [props.routes]);

  useEffect(() => {
    if (!ready.current) return;
    (mapRef.current?.getSource(SOURCE.markers) as GeoJSONSource | undefined)?.setData(markersGeoJSON(props.markers));
  }, [props.markers]);

  useEffect(() => {
    if (!ready.current) return;
    (mapRef.current?.getSource(SOURCE.user) as GeoJSONSource | undefined)?.setData(userGeoJSON(props.user));
  }, [props.user]);

  return (
    <View style={StyleSheet.absoluteFill}>
      <div ref={container} style={{ position: 'absolute', inset: 0 }} />
    </View>
  );
});
