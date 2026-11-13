import { create } from 'zustand';
import type { CalmScore } from '@/core/calm-score';
import type { Place } from '@/services/geocoding/types';
import type { RankedRoute } from '@/services/routing/types';

/**
 * What the map screen is doing right now. One flow, like most map apps:
 * explore -> place -> directions -> navigating -> arrived.
 */
export type Mode = 'explore' | 'results' | 'place' | 'directions' | 'navigating' | 'arrived';

export interface ArrivalSummary {
  destination: Place;
  durationSeconds: number;
  distanceMeters: number;
  score: CalmScore;
  avoided: string;
  simulated: boolean;
}

interface TripState {
  mode: Mode;
  results: Place[];
  resultsLabel?: string;
  place?: Place;
  /** Undefined means "my location". */
  origin?: Place;
  destination?: Place;
  selectedRouteId?: string;
  navRoute?: RankedRoute;
  simulate: boolean;
  arrival?: ArrivalSummary;

  showResults: (label: string, places: Place[]) => void;
  selectPlace: (place: Place) => void;
  back: () => void;
  directionsTo: (destination: Place, origin?: Place) => void;
  setOrigin: (origin: Place | undefined) => void;
  setDestination: (destination: Place) => void;
  swap: () => void;
  selectRoute: (id: string) => void;
  startNavigation: (route: RankedRoute, simulate: boolean) => void;
  replaceNavRoute: (route: RankedRoute) => void;
  arrive: (summary: ArrivalSummary) => void;
  endNavigation: () => void;
  reset: () => void;
}

export const useTrip = create<TripState>()((set, get) => ({
  mode: 'explore',
  results: [],
  simulate: false,

  showResults: (label, places) => set({ mode: 'results', results: places, resultsLabel: label, place: undefined }),
  selectPlace: (place) => set({ mode: 'place', place }),
  back: () => {
    const s = get();
    switch (s.mode) {
      case 'place':
        return set(
          s.results.length > 0 ? { mode: 'results', place: undefined } : { mode: 'explore', place: undefined },
        );
      case 'results':
        return set({ mode: 'explore', results: [], resultsLabel: undefined });
      case 'directions':
        return set(
          s.destination
            ? { mode: 'place', place: s.destination, selectedRouteId: undefined }
            : { mode: 'explore', selectedRouteId: undefined },
        );
      case 'arrived':
        return set({
          mode: 'explore',
          arrival: undefined,
          destination: undefined,
          origin: undefined,
          place: undefined,
        });
      default:
        return;
    }
  },
  directionsTo: (destination, origin) =>
    set({ mode: 'directions', destination, origin, place: destination, selectedRouteId: undefined }),
  setOrigin: (origin) => set({ origin, selectedRouteId: undefined }),
  setDestination: (destination) => set({ destination, selectedRouteId: undefined }),
  swap: () => {
    const { origin, destination } = get();
    if (!destination) return;
    set({ origin: destination, destination: origin, selectedRouteId: undefined });
  },
  selectRoute: (id) => set({ selectedRouteId: id }),
  startNavigation: (route, simulate) => set({ mode: 'navigating', navRoute: route, simulate }),
  replaceNavRoute: (route) => set({ navRoute: route }),
  arrive: (summary) => set({ mode: 'arrived', arrival: summary, navRoute: undefined }),
  endNavigation: () => set({ mode: 'directions', navRoute: undefined, simulate: false }),
  reset: () =>
    set({
      mode: 'explore',
      results: [],
      resultsLabel: undefined,
      place: undefined,
      origin: undefined,
      destination: undefined,
      selectedRouteId: undefined,
      navRoute: undefined,
      arrival: undefined,
      simulate: false,
    }),
}));
