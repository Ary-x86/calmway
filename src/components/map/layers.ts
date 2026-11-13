import type { Palette } from '@/theme/tokens';
import type { MapMarker, MapRoute, UserDot } from './types';

/**
 * Shared GeoJSON and layer definitions so the web (maplibre-gl) and native
 * (MapLibre React Native) maps draw exactly the same thing.
 */

export const SOURCE = {
  routes: 'cw-routes',
  markers: 'cw-markers',
  user: 'cw-user',
} as const;

export const LAYER = {
  routeCasing: 'cw-route-casing',
  routeLine: 'cw-route-line',
  stress: 'cw-stress',
  markerHalo: 'cw-marker-halo',
  markerDot: 'cw-marker-dot',
  markerCore: 'cw-marker-core',
  markerLabel: 'cw-marker-label',
  userHalo: 'cw-user-halo',
  userDot: 'cw-user-dot',
} as const;

export function routesGeoJSON(routes: MapRoute[]): GeoJSON.FeatureCollection {
  // Selected route last so it draws on top.
  const ordered = [...routes].sort((a, b) => Number(a.selected) - Number(b.selected));
  return {
    type: 'FeatureCollection',
    features: ordered.map((r, i) => ({
      type: 'Feature',
      id: i,
      properties: { id: r.id, selected: r.selected, color: r.color, order: i },
      geometry: { type: 'LineString', coordinates: r.geometry },
    })),
  };
}

export function markersGeoJSON(markers: MapMarker[]): GeoJSON.FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: markers.map((m, i) => ({
      type: 'Feature',
      id: i,
      properties: { id: m.id, kind: m.kind, label: m.label ?? '', selected: Boolean(m.selected) },
      geometry: { type: 'Point', coordinates: m.coord },
    })),
  };
}

export function userGeoJSON(user: UserDot | undefined): GeoJSON.FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: user
      ? [
          {
            type: 'Feature',
            properties: { navigating: Boolean(user.navigating) },
            geometry: { type: 'Point', coordinates: user.coord },
          },
        ]
      : [],
  };
}

type Spec = {
  id: string;
  type: string;
  filter?: unknown;
  paint: Record<string, unknown>;
  layout?: Record<string, unknown>;
};

export function routeLayers(p: Palette): Spec[] {
  return [
    {
      id: LAYER.routeCasing,
      type: 'line',
      layout: { 'line-join': 'round', 'line-cap': 'round', 'line-sort-key': ['get', 'order'] },
      paint: {
        'line-color': p.routeCasing,
        'line-width': [
          'interpolate',
          ['linear'],
          ['zoom'],
          8,
          ['case', ['get', 'selected'], 7, 5],
          16,
          ['case', ['get', 'selected'], 16, 11],
        ],
        'line-opacity': ['case', ['get', 'selected'], 1, 0.85],
      },
    },
    {
      id: LAYER.routeLine,
      type: 'line',
      layout: { 'line-join': 'round', 'line-cap': 'round', 'line-sort-key': ['get', 'order'] },
      paint: {
        'line-color': ['get', 'color'],
        'line-width': [
          'interpolate',
          ['linear'],
          ['zoom'],
          8,
          ['case', ['get', 'selected'], 4.5, 3],
          16,
          ['case', ['get', 'selected'], 11, 7],
        ],
      },
    },
  ];
}

export function markerLayers(p: Palette): Spec[] {
  const kindColor = [
    'match',
    ['get', 'kind'],
    'destination',
    p.accent,
    'origin',
    p.primary,
    'pin',
    p.accent,
    'stress',
    p.stress[3],
    p.primary,
  ];
  return [
    {
      id: LAYER.markerHalo,
      type: 'circle',
      filter: ['!=', ['get', 'kind'], 'stress'],
      paint: {
        'circle-radius': ['case', ['get', 'selected'], 22, ['match', ['get', 'kind'], 'result', 0, 18]],
        'circle-color': kindColor,
        'circle-opacity': 0.18,
      },
    },
    {
      id: LAYER.markerDot,
      type: 'circle',
      paint: {
        'circle-radius': ['match', ['get', 'kind'], 'stress', 6, 'result', ['case', ['get', 'selected'], 11, 8], 11],
        'circle-color': kindColor,
        'circle-stroke-color': p.surfaceRaised,
        'circle-stroke-width': ['match', ['get', 'kind'], 'stress', 2, 3],
      },
    },
    {
      id: LAYER.markerCore,
      type: 'circle',
      filter: ['match', ['get', 'kind'], ['destination', 'pin', 'origin'], true, false],
      paint: { 'circle-radius': 3.5, 'circle-color': p.surfaceRaised },
    },
    {
      id: LAYER.markerLabel,
      type: 'symbol',
      filter: ['all', ['!=', ['get', 'label'], ''], ['!=', ['get', 'kind'], 'stress']],
      layout: {
        'text-field': ['get', 'label'],
        'text-font': ['Noto Sans Bold'],
        'text-size': 12.5,
        'text-offset': [0, 1.3],
        'text-anchor': 'top',
        'text-max-width': 10,
        'text-optional': true,
      },
      paint: { 'text-color': p.ink, 'text-halo-color': p.surface, 'text-halo-width': 1.6 },
    },
  ];
}

export function userLayers(p: Palette): Spec[] {
  return [
    {
      id: LAYER.userHalo,
      type: 'circle',
      paint: {
        'circle-radius': ['case', ['get', 'navigating'], 26, 20],
        'circle-color': p.locationHalo,
        'circle-pitch-alignment': 'map',
      },
    },
    {
      id: LAYER.userDot,
      type: 'circle',
      paint: {
        'circle-radius': ['case', ['get', 'navigating'], 10, 8],
        'circle-color': p.location,
        'circle-stroke-color': '#FFFFFF',
        'circle-stroke-width': 3,
        'circle-pitch-alignment': 'map',
      },
    },
  ];
}
