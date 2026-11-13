import { useMemo } from 'react';
import { driveSideFor, type DriveSide } from '@/core/calm-score';
import { unitsForRegion, type UnitSystem } from '@/core/geo';
import { usePrefs } from '@/store/prefs';

/** Region from the device locale, e.g. "en-US" -> "US". */
export function localeRegion(): string | undefined {
  try {
    const locale = Intl.DateTimeFormat().resolvedOptions().locale;
    const match = /[-_]([A-Z]{2})\b/i.exec(locale);
    return match?.[1]?.toUpperCase();
  } catch {
    return undefined;
  }
}

/**
 * Distance units. "Automatic" follows the road signs of the country you are
 * driving in when we know it, and the device region otherwise.
 */
export function useUnits(countryCode?: string): UnitSystem {
  const pref = usePrefs((s) => s.units);
  return useMemo(() => (pref === 'auto' ? unitsForRegion(countryCode ?? localeRegion()) : pref), [pref, countryCode]);
}

/** Which side of the road people drive on for a trip, from the place's country. */
export function useDriveSide(countryCode?: string): DriveSide {
  return driveSideFor(countryCode ?? localeRegion());
}
