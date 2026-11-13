import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { useCallback, useEffect, useRef, useState } from 'react';
import { LEVEL_LABEL, rankRoutes, summarize, type DriveSide } from '@/core/calm-score';
import { bearing, type UnitSystem } from '@/core/geo';
import { Announcer, RouteSimulator, RouteTracker, type Fix, type NavProgress } from '@/core/nav';
import { say, silence } from '@/lib/speech';
import { fetchReroute } from '@/services/routing/valhalla';
import type { RankedRoute } from '@/services/routing/types';
import { useLocation } from '@/store/location';
import { usePrefs } from '@/store/prefs';
import { useTrip } from '@/store/trip';

const SIM_TICK_MS = 250;
const KEEP_AWAKE_TAG = 'calmway-navigation';

export interface NavigationSession {
  progress: NavProgress | null;
  /** Where to draw the car: snapped to the route when on it. */
  position: Fix | null;
  rerouting: boolean;
  muted: boolean;
  setMuted: (m: boolean) => void;
  simSpeed: number;
  setSimSpeed: (s: number) => void;
  wrongTurn: () => void;
}

/**
 * Runs one navigation session: feeds GPS fixes (or simulated ones) into the
 * route tracker, speaks calm instructions, reroutes when the driver leaves the
 * route and reports arrival.
 */
export function useNavigationSession(
  route: RankedRoute | undefined,
  simulate: boolean,
  driveSide: DriveSide,
  units: UnitSystem,
): NavigationSession {
  const voice = usePrefs((s) => s.voice);
  const voiceRate = usePrefs((s) => s.voiceRate);
  const reassurance = usePrefs((s) => s.reassurance);
  const strength = usePrefs((s) => s.strength);
  const avoid = usePrefs((s) => s.avoid);
  const weights = usePrefs((s) => s.weights);
  const simSpeed = usePrefs((s) => s.simSpeed);
  const setPref = usePrefs((s) => s.set);
  const replaceNavRoute = useTrip((s) => s.replaceNavRoute);
  const arrive = useTrip((s) => s.arrive);
  const destination = useTrip((s) => s.destination);

  const [progress, setProgress] = useState<NavProgress | null>(null);
  const [position, setPosition] = useState<Fix | null>(null);
  const [rerouting, setRerouting] = useState(false);
  const [muted, setMuted] = useState(!voice);

  const tracker = useRef<RouteTracker | null>(null);
  const announcer = useRef<Announcer | null>(null);
  const sim = useRef<RouteSimulator | null>(null);
  const reroutingRef = useRef(false);
  const startedAt = useRef(0);
  const lastRerouteAt = useRef(0);
  const firstRoute = useRef<RankedRoute | undefined>(route);
  const mutedRef = useRef(muted);
  const lastFix = useRef<Fix | null>(null);
  useEffect(() => {
    mutedRef.current = muted;
  }, [muted]);

  const speak = useCallback(
    (line: string | null) => {
      if (line && !mutedRef.current) say(line, voiceRate);
    },
    [voiceRate],
  );

  // New route (start or reroute): fresh tracker, announcer and simulator.
  useEffect(() => {
    if (!route) return;
    tracker.current = new RouteTracker(route);
    announcer.current = new Announcer(route.maneuvers, { units, driveSide, reassurance });
    if (simulate) sim.current = new RouteSimulator(route, usePrefs.getState().simSpeed);
    if (route === firstRoute.current) {
      startedAt.current = Date.now();
      speak(announcer.current.intro(LEVEL_LABEL[route.score.level]));
    }
  }, [route, simulate, units, driveSide, reassurance, speak]);

  useEffect(() => {
    if (sim.current) sim.current.speedFactor = simSpeed;
  }, [simSpeed]);

  useEffect(() => {
    activateKeepAwakeAsync(KEEP_AWAKE_TAG).catch(() => undefined);
    return () => {
      deactivateKeepAwake(KEEP_AWAKE_TAG).catch(() => undefined);
      silence();
    };
  }, []);

  const reroute = useCallback(
    async (fix: Fix, prev: Fix | null) => {
      if (!route || !destination || reroutingRef.current) return;
      // Give a failed attempt a few seconds before trying again.
      if (Date.now() - lastRerouteAt.current < 8000) return;
      lastRerouteAt.current = Date.now();
      reroutingRef.current = true;
      setRerouting(true);
      speak('No problem. Finding you a new calm route.');
      try {
        const heading = fix.heading ?? (prev ? bearing(prev.coord, fix.coord) : undefined);
        const next = await fetchReroute(
          { origin: fix.coord, destination: destination.coord, heading, units },
          route.profile,
          strength,
          avoid,
        );
        const [ranked] = rankRoutes([next], { driveSide, weights, maxExtraSeconds: 3600, units });
        replaceNavRoute({ ...ranked, labels: route.labels });
        speak('New route ready.');
      } catch {
        speak('Could not find a new route yet. I will keep trying.');
      } finally {
        reroutingRef.current = false;
        setRerouting(false);
      }
    },
    [route, destination, units, strength, avoid, driveSide, weights, replaceNavRoute, speak],
  );

  const handleFix = useCallback(
    (fix: Fix) => {
      const t = tracker.current;
      const a = announcer.current;
      if (!t || !a || !route) return;
      const p = t.update(fix);
      setProgress(p);
      const prev = lastFix.current;
      lastFix.current = fix;
      setPosition({
        ...fix,
        coord: p.offset < 30 ? p.snapped : fix.coord,
        heading: p.offset < 30 ? p.heading : fix.heading,
      });

      if (p.arrived) {
        speak(a.update(p, fix.speed ?? 0));
        const first = firstRoute.current ?? route;
        arrive({
          destination: destination ?? {
            id: 'dest',
            name: 'your destination',
            coord: route.geometry[route.geometry.length - 1],
          },
          durationSeconds: (Date.now() - startedAt.current) / 1000,
          distanceMeters: first.distance,
          score: first.score,
          avoided: summarize(first.score, units),
          simulated: simulate,
        });
        return;
      }
      if (p.offRoute) {
        reroute(fix, prev);
        return;
      }
      speak(a.update(p, fix.speed ?? 0));
    },
    [route, destination, simulate, units, arrive, reroute, speak],
  );

  // Simulated drive.
  useEffect(() => {
    if (!simulate) return;
    const id = setInterval(() => {
      if (sim.current && !reroutingRef.current) handleFix(sim.current.tick(SIM_TICK_MS));
    }, SIM_TICK_MS);
    return () => clearInterval(id);
  }, [simulate, handleFix]);

  // Real GPS.
  useEffect(() => {
    if (simulate) return;
    return useLocation.subscribe((s, prev) => {
      if (s.position && s.position !== prev.position) handleFix(s.position);
    });
  }, [simulate, handleFix]);

  return {
    progress,
    position,
    rerouting,
    muted,
    setMuted: (m) => {
      setMuted(m);
      if (m) silence();
    },
    simSpeed,
    setSimSpeed: (s) => setPref('simSpeed', s),
    wrongTurn: () => sim.current?.wrongTurn(),
  };
}
