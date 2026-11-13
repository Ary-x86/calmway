import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { rankRoutes } from '@/core/calm-score';
import type { LngLat } from '@/core/geo';
import { useDriveSide, useUnits } from '@/hooks/useRegion';
import type { Place } from '@/services/geocoding/types';
import { fetchCandidateRoutes, RoutingError } from '@/services/routing/valhalla';
import { usePrefs } from '@/store/prefs';

/**
 * Fetches candidate routes for a trip and ranks them for this driver.
 * Re-ranking (weights, time budget) happens locally without new requests.
 */
export function useRoutes(origin: LngLat | undefined, destination: Place | undefined) {
  const strength = usePrefs((s) => s.strength);
  const avoid = usePrefs((s) => s.avoid);
  const weights = usePrefs((s) => s.weights);
  const maxExtraMinutes = usePrefs((s) => s.maxExtraMinutes);
  const units = useUnits(destination?.countryCode);
  const driveSide = useDriveSide(destination?.countryCode);

  // Round the origin so small GPS jitter does not refetch.
  const o = origin ? ([+origin[0].toFixed(4), +origin[1].toFixed(4)] as LngLat) : undefined;

  const query = useQuery({
    queryKey: ['routes', o, destination?.coord, strength, avoid, units],
    enabled: Boolean(o && destination),
    staleTime: 5 * 60_000,
    retry: (count, err) => !(err instanceof RoutingError && err.kind === 'no-route') && count < 2,
    queryFn: ({ signal }) =>
      fetchCandidateRoutes({ origin: o!, destination: destination!.coord, units, signal }, strength, avoid),
  });

  const ranked = useMemo(
    () =>
      query.data ? rankRoutes(query.data, { driveSide, weights, maxExtraSeconds: maxExtraMinutes * 60, units }) : [],
    [query.data, driveSide, weights, maxExtraMinutes, units],
  );

  return {
    ranked,
    loading: query.isFetching && !query.data,
    error: query.error as Error | null,
    refetch: query.refetch,
    driveSide,
    units,
  };
}
