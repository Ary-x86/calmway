import type { BBox, LngLat } from '@/core/geo';

export interface Place {
  id: string;
  name: string;
  /** One-line address under the name, e.g. "Domplein 9, Utrecht". */
  address?: string;
  /** Human category, e.g. "Cafe", "Parking", "Street". */
  category?: string;
  coord: LngLat;
  /** ISO 3166-1 alpha-2, used for drive side and units. */
  countryCode?: string;
  bbox?: BBox;
}
