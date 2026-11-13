export type UnitSystem = 'metric' | 'imperial';

const M_PER_MILE = 1609.344;
const FT_PER_M = 3.28084;

/** Short display distance, e.g. "350 m", "4.2 km", "800 ft", "12 mi". */
export function formatDistance(meters: number, units: UnitSystem): string {
  if (units === 'imperial') {
    const miles = meters / M_PER_MILE;
    if (miles < 0.1) return `${roundTo(meters * FT_PER_M, 50)} ft`;
    return miles < 10 ? `${miles.toFixed(1)} mi` : `${Math.round(miles)} mi`;
  }
  if (meters < 1000) return `${roundTo(meters, meters < 100 ? 10 : 50)} m`;
  const km = meters / 1000;
  return km < 10 ? `${km.toFixed(1)} km` : `${Math.round(km)} km`;
}

/** Distance phrased for speech, e.g. "400 meters", "half a mile", "3 kilometers". */
export function spokenDistance(meters: number, units: UnitSystem): string {
  if (units === 'imperial') {
    const miles = meters / M_PER_MILE;
    if (miles < 0.15) return `${roundTo(meters * FT_PER_M, 100)} feet`;
    if (miles < 0.35) return 'a quarter mile';
    if (miles < 0.65) return 'half a mile';
    if (miles < 0.9) return 'three quarters of a mile';
    if (miles < 1.5) return '1 mile';
    return `${Math.round(miles)} miles`;
  }
  if (meters < 1000) return `${roundTo(meters, meters < 200 ? 50 : 100)} meters`;
  const km = meters / 1000;
  if (km < 1.5) return '1 kilometer';
  return km < 10 ? `${(Math.round(km * 2) / 2).toString()} kilometers` : `${Math.round(km)} kilometers`;
}

/** "1 h 12 min", "8 min", "under 1 min". */
export function formatDuration(seconds: number): string {
  const totalMin = Math.round(seconds / 60);
  if (totalMin < 1) return 'under 1 min';
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h === 0) return `${m} min`;
  return m === 0 ? `${h} h` : `${h} h ${m} min`;
}

/** Arrival clock time like "14:05" or "2:05 PM" depending on locale. */
export function formatArrival(secondsFromNow: number, now = new Date()): string {
  const t = new Date(now.getTime() + secondsFromNow * 1000);
  return t.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

function roundTo(value: number, step: number): number {
  return Math.max(step, Math.round(value / step) * step);
}

/** Countries that use miles on road signs. */
const IMPERIAL_REGIONS = new Set(['US', 'GB', 'LR', 'MM', 'PR', 'VI', 'GU', 'AS', 'MP']);

export function unitsForRegion(regionCode: string | null | undefined): UnitSystem {
  return regionCode && IMPERIAL_REGIONS.has(regionCode.toUpperCase()) ? 'imperial' : 'metric';
}
