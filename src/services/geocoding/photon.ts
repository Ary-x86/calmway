import { haversine, type LngLat } from '@/core/geo';
import { config, withKey } from '@/services/config';
import type { Place } from './types';

interface PhotonFeature {
  geometry: { type: 'Point'; coordinates: LngLat };
  properties: {
    osm_id?: number;
    osm_type?: string;
    osm_key?: string;
    osm_value?: string;
    type?: string;
    name?: string;
    housenumber?: string;
    street?: string;
    locality?: string;
    district?: string;
    city?: string;
    county?: string;
    state?: string;
    country?: string;
    countrycode?: string;
    postcode?: string;
    extent?: [number, number, number, number];
  };
}

interface PhotonResponse {
  features: PhotonFeature[];
}

export interface SearchOptions {
  near?: LngLat;
  limit?: number;
  lang?: string;
  signal?: AbortSignal;
}

const SUPPORTED_LANGS = new Set(['en', 'de', 'fr']);

function pretty(value: string | undefined): string | undefined {
  if (!value || value === 'yes') return undefined;
  const words = value.replace(/_/g, ' ');
  return words[0].toUpperCase() + words.slice(1);
}

function categoryFor(p: PhotonFeature['properties']): string | undefined {
  if (p.type === 'street') return 'Street';
  if (p.type === 'city' || p.type === 'locality' || p.type === 'district') return 'Area';
  if (p.type === 'house' && !p.name) return 'Address';
  if (p.osm_key === 'place') return pretty(p.osm_value);
  if (p.osm_key === 'highway') return 'Road';
  return pretty(p.osm_value);
}

export function toPlace(f: PhotonFeature): Place {
  const p = f.properties;
  const streetLine = [p.street, p.housenumber].filter(Boolean).join(' ');
  const town = p.city ?? p.locality ?? p.district ?? p.county;
  const name = p.name ?? (streetLine || town || 'Dropped pin');
  const addressParts = [
    streetLine && streetLine !== name ? streetLine : undefined,
    town !== name ? town : undefined,
    p.country,
  ];
  const address = addressParts.filter(Boolean).join(', ');
  const [lng, lat] = f.geometry.coordinates;
  return {
    id: p.osm_type && p.osm_id ? `${p.osm_type}${p.osm_id}` : `pt:${lng.toFixed(5)},${lat.toFixed(5)}`,
    name,
    address: address || undefined,
    category: categoryFor(p),
    coord: [lng, lat],
    countryCode: p.countrycode,
    bbox: p.extent ? [p.extent[0], p.extent[3], p.extent[2], p.extent[1]] : undefined,
  };
}

function lang(l?: string): string {
  const short = (l ?? 'en').slice(0, 2).toLowerCase();
  return SUPPORTED_LANGS.has(short) ? short : 'en';
}

/** Autocomplete search. Results are biased toward `near` when given. */
export async function searchPlaces(query: string, opts: SearchOptions = {}): Promise<Place[]> {
  const q = query.trim();
  if (q.length < 2) return [];
  const params = new URLSearchParams({ q, limit: String(opts.limit ?? 8), lang: lang(opts.lang) });
  if (opts.near) {
    params.set('lon', opts.near[0].toFixed(5));
    params.set('lat', opts.near[1].toFixed(5));
    params.set('location_bias_scale', '0.4');
  }
  const res = await fetch(withKey(`${config.geocoderUrl}/api/?${params.toString()}`), { signal: opts.signal });
  if (!res.ok) throw new Error(`Search failed (${res.status})`);
  const data = (await res.json()) as PhotonResponse;
  const seen = new Set<string>();
  return data.features.map(toPlace).filter((p) => {
    const key = `${p.name}|${p.address}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/** Address for a point on the map, e.g. after a long press. */
export async function reverseGeocode(
  coord: LngLat,
  opts: { lang?: string; signal?: AbortSignal } = {},
): Promise<Place> {
  const params = new URLSearchParams({
    lon: coord[0].toFixed(6),
    lat: coord[1].toFixed(6),
    lang: lang(opts.lang),
    limit: '1',
  });
  const fallback: Place = {
    id: `pt:${coord[0].toFixed(5)},${coord[1].toFixed(5)}`,
    name: 'Dropped pin',
    address: `${coord[1].toFixed(5)}, ${coord[0].toFixed(5)}`,
    coord,
  };
  try {
    const res = await fetch(withKey(`${config.geocoderUrl}/reverse?${params.toString()}`), { signal: opts.signal });
    if (!res.ok) return fallback;
    const data = (await res.json()) as PhotonResponse;
    const f = data.features[0];
    if (!f) return fallback;
    const place = toPlace(f);
    // Keep the exact pressed point, not the snapped address point.
    return { ...place, id: fallback.id, coord };
  } catch (e) {
    if ((e as Error).name === 'AbortError') throw e;
    return fallback;
  }
}

/** Nearby places in a category, closest first. `include` uses Photon category patterns. */
export async function searchNearby(
  include: string[],
  near: LngLat,
  opts: { limit?: number; lang?: string; signal?: AbortSignal } = {},
): Promise<Place[]> {
  const params = new URLSearchParams({
    include: include.join(','),
    lon: near[0].toFixed(5),
    lat: near[1].toFixed(5),
    limit: '30',
    lang: lang(opts.lang),
  });
  const res = await fetch(withKey(`${config.geocoderUrl}/api/?${params.toString()}`), { signal: opts.signal });
  if (!res.ok) throw new Error(`Search failed (${res.status})`);
  const data = (await res.json()) as PhotonResponse;
  return data.features
    .map(toPlace)
    .sort((a, b) => haversine(near, a.coord) - haversine(near, b.coord))
    .slice(0, opts.limit ?? 12);
}

export interface Category {
  id: string;
  label: string;
  icon: string;
  include: string[];
}

/** Quick categories for the chips under the search bar. */
export const CATEGORIES: Category[] = [
  { id: 'fuel', label: 'Gas', icon: 'local-gas-station', include: ['osm.amenity.fuel'] },
  { id: 'charging', label: 'Charging', icon: 'ev-station', include: ['osm.amenity.charging_station'] },
  { id: 'parking', label: 'Parking', icon: 'local-parking', include: ['osm.amenity.parking'] },
  { id: 'coffee', label: 'Coffee', icon: 'local-cafe', include: ['osm.amenity.cafe'] },
  { id: 'food', label: 'Food', icon: 'restaurant', include: ['osm.amenity.restaurant', 'osm.amenity.fast_food'] },
  {
    id: 'rest',
    label: 'Rest stops',
    icon: 'airline-seat-recline-normal',
    include: ['osm.highway.rest_area', 'osm.highway.services'],
  },
];
