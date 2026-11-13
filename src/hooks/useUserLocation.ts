import * as Location from 'expo-location';
import { useCallback, useEffect, useRef } from 'react';
import { useLocation } from '@/store/location';

/**
 * Keeps the user's position in the location store while the map is open.
 * Asks for permission once; call `request()` again from a button if denied.
 */
export function useUserLocation(enabled = true) {
  const setPermission = useLocation((s) => s.setPermission);
  const setPosition = useLocation((s) => s.setPosition);
  const sub = useRef<Location.LocationSubscription | null>(null);

  const start = useCallback(async () => {
    if (sub.current) return true;
    try {
      const services = await Location.hasServicesEnabledAsync().catch(() => true);
      if (!services) {
        setPermission('unavailable');
        return false;
      }
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setPermission('denied');
        return false;
      }
      setPermission('granted');
      sub.current = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.BestForNavigation, timeInterval: 1000, distanceInterval: 2 },
        (loc) => {
          setPosition({
            coord: [loc.coords.longitude, loc.coords.latitude],
            heading: loc.coords.heading !== null && loc.coords.heading >= 0 ? loc.coords.heading : undefined,
            speed: loc.coords.speed !== null && loc.coords.speed >= 0 ? loc.coords.speed : undefined,
            accuracy: loc.coords.accuracy ?? undefined,
            timestamp: loc.timestamp,
          });
        },
      );
      return true;
    } catch {
      setPermission('unavailable');
      return false;
    }
  }, [setPermission, setPosition]);

  useEffect(() => {
    if (!enabled) return;
    start();
    return () => {
      sub.current?.remove();
      sub.current = null;
    };
  }, [enabled, start]);

  return { request: start };
}
