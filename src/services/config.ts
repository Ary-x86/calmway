/**
 * Service endpoints. Every value can be overridden with an EXPO_PUBLIC_* env
 * var, so switching from the free public servers to a paid or self-hosted
 * provider is a config change. See docs/DEPLOY.md.
 */
const env = (key: string | undefined, fallback: string) => (key && key.length > 0 ? key : fallback);

export const config = {
  /** Valhalla /route endpoint. Stadia Maps: https://api.stadiamaps.com/route/v1 */
  routingUrl: env(process.env.EXPO_PUBLIC_ROUTING_URL, 'https://valhalla1.openstreetmap.de/route'),
  /** Photon geocoder base URL (serves /api and /reverse). */
  geocoderUrl: env(process.env.EXPO_PUBLIC_GEOCODER_URL, 'https://photon.komoot.io'),
  /** Vector tiles (OpenMapTiles schema). */
  tilesUrl: env(process.env.EXPO_PUBLIC_TILES_URL, 'https://tiles.openfreemap.org/planet'),
  glyphsUrl: env(process.env.EXPO_PUBLIC_GLYPHS_URL, 'https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf'),
  /** Optional API key appended as ?api_key= to routing and geocoding (Stadia style). */
  apiKey: process.env.EXPO_PUBLIC_MAPS_API_KEY ?? '',
  /** Link to the post that inspired the app. */
  originalPostUrl: env(process.env.EXPO_PUBLIC_ORIGINAL_POST_URL, ''),
} as const;

export function withKey(url: string): string {
  if (!config.apiKey) return url;
  return `${url}${url.includes('?') ? '&' : '?'}api_key=${encodeURIComponent(config.apiKey)}`;
}
