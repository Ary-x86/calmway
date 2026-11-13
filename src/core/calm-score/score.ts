import type { LngLat } from '@/core/geo';
import { classifyManeuver, isDecision, type DriveSide, type StressKind } from './maneuvers';
import { NEUTRAL_WEIGHTS, type TriggerWeights } from './weights';

/** The parts of a route the score needs. Kept minimal so it is easy to test. */
export interface ScorableManeuver {
  type: number;
  distance: number;
  duration: number;
  beginIndex: number;
  highway: boolean;
  roundaboutExitCount?: number;
}

export interface ScorableRoute {
  distance: number;
  geometry: LngLat[];
  maneuvers: ScorableManeuver[];
}

export interface StressEvent {
  kind: StressKind;
  maneuverIndex: number;
  coord: LngLat;
  points: number;
}

export type CalmLevel = 'very-calm' | 'calm' | 'moderate' | 'busy' | 'intense';

export interface CalmScore {
  /** 0 to 100, higher is calmer. */
  score: number;
  level: CalmLevel;
  /** Raw stress points. Compare these between routes for the same trip. */
  stress: number;
  counts: Record<StressKind, number>;
  highwayKm: number;
  fastRoadKm: number;
  events: StressEvent[];
}

/** Base stress points per event, before personal weights. */
export const BASE_POINTS: Record<StressKind, number> = {
  'highway-entry': 10,
  interchange: 6,
  merge: 6,
  'highway-exit': 2.5,
  'turn-across': 3.5,
  'u-turn': 5,
  roundabout: 2.5,
  fork: 1.5,
  rapid: 2,
  turn: 0.75,
  ferry: 4,
};

const HIGHWAY_POINTS_PER_KM = 1;
const FAST_ROAD_POINTS_PER_KM = 0.4;
const FAST_KMH = 85;
const FAST_ROAD_KMH = 70;
const RAPID_GAP_M = 150;
const NORMALISER = 28;

function weightFor(kind: StressKind, w: TriggerWeights): number {
  switch (kind) {
    case 'highway-entry':
      return (w.highways + w.merging) / 2;
    case 'interchange':
      return (w.highways + w.complexJunctions) / 2;
    case 'merge':
      return w.merging;
    case 'highway-exit':
      return w.highways;
    case 'turn-across':
    case 'u-turn':
      return w.turnsAcross;
    case 'roundabout':
      return w.roundabouts;
    case 'fork':
    case 'rapid':
    case 'turn':
      return w.complexJunctions;
    case 'ferry':
      return 1;
  }
}

const emptyCounts = (): Record<StressKind, number> => ({
  'highway-entry': 0,
  interchange: 0,
  merge: 0,
  'highway-exit': 0,
  'turn-across': 0,
  'u-turn': 0,
  roundabout: 0,
  fork: 0,
  rapid: 0,
  turn: 0,
  ferry: 0,
});

function speedKmh(m: ScorableManeuver): number {
  return m.duration > 0 ? m.distance / 1000 / (m.duration / 3600) : 0;
}

/** A stretch driven at highway speed, flagged or not (connector ramps often are not). */
function isFast(m: ScorableManeuver | undefined): boolean {
  return Boolean(m && (m.highway || speedKmh(m) >= FAST_KMH));
}

/**
 * What a maneuver means for the driver, using its neighbours for context.
 * Valhalla codes a highway on-ramp as "exit", "ramp", "merge" or even a turn
 * depending on the road layout, so entering fast traffic is detected from the
 * change in speed instead of the maneuver type alone.
 */
export function stressKindAt(maneuvers: ScorableManeuver[], i: number, side: DriveSide): StressKind | null {
  const m = maneuvers[i];
  const prev = maneuvers[i - 1];
  const base = classifyManeuver(m.type, side);
  const fastNow = isFast(m);
  const fastBefore = isFast(prev);

  if (fastNow && prev && !fastBefore && isDecision(m.type)) return 'highway-entry';
  if (base === 'merge') return fastBefore ? 'interchange' : 'merge';
  if (base === 'highway-entry') {
    // A ramp onto a road that is not fast is just a junction.
    return isFast(maneuvers[i + 1]) || fastNow ? null : 'fork';
  }
  if (base === 'highway-exit' || base === 'fork') {
    if (fastBefore && fastNow) return 'interchange';
    if (fastBefore) return 'highway-exit';
    return 'fork';
  }
  return base;
}

/**
 * Scores how hard a route is on the nerves.
 *
 * Every maneuver that asks something of the driver adds stress points
 * (merging onto a highway counts far more than a right turn), sustained
 * highway and fast-road driving adds some per km, and decisions that come in
 * quick succession add extra. The total is normalised by the square root of
 * the trip length so that long and short trips land on a similar 0 to 100
 * scale without short city trips looking alarming.
 */
export function scoreRoute(
  route: ScorableRoute,
  driveSide: DriveSide = 'right',
  weights: TriggerWeights = NEUTRAL_WEIGHTS,
): CalmScore {
  const counts = emptyCounts();
  const events: StressEvent[] = [];
  let stress = 0;
  let highwayKm = 0;
  let fastRoadKm = 0;

  const coordAt = (i: number): LngLat =>
    route.geometry[Math.min(Math.max(i, 0), route.geometry.length - 1)] ?? [0, 0];

  const add = (kind: StressKind, maneuverIndex: number, extra = 0) => {
    const points = (BASE_POINTS[kind] + extra) * weightFor(kind, weights);
    counts[kind]++;
    stress += points;
    events.push({ kind, maneuverIndex, coord: coordAt(route.maneuvers[maneuverIndex].beginIndex), points });
  };

  route.maneuvers.forEach((m, i) => {
    const km = m.distance / 1000;
    if (m.highway) highwayKm += km;
    else if (speedKmh(m) >= FAST_ROAD_KMH) fastRoadKm += km;

    const kind = stressKindAt(route.maneuvers, i, driveSide);
    if (kind) {
      const extra = kind === 'roundabout' && (m.roundaboutExitCount ?? 0) >= 3 ? 1.5 : 0;
      add(kind, i, extra);
    }

    // Two decisions with barely any road between them: no time to settle.
    const prev = route.maneuvers[i - 1];
    if (prev && isDecision(m.type) && isDecision(prev.type) && prev.distance < RAPID_GAP_M) {
      add('rapid', i);
    }
  });

  stress += highwayKm * HIGHWAY_POINTS_PER_KM * weights.highways;
  stress += fastRoadKm * FAST_ROAD_POINTS_PER_KM * weights.highways;

  const lengthKm = Math.max(route.distance / 1000, 1);
  const density = stress / Math.sqrt(lengthKm);
  const score = Math.round(100 * Math.exp(-density / NORMALISER));

  return {
    score,
    level: levelFor(score),
    stress: Math.round(stress * 10) / 10,
    counts,
    highwayKm: Math.round(highwayKm * 10) / 10,
    fastRoadKm: Math.round(fastRoadKm * 10) / 10,
    events,
  };
}

export function levelFor(score: number): CalmLevel {
  if (score >= 80) return 'very-calm';
  if (score >= 65) return 'calm';
  if (score >= 50) return 'moderate';
  if (score >= 35) return 'busy';
  return 'intense';
}

export const LEVEL_LABEL: Record<CalmLevel, string> = {
  'very-calm': 'Very calm',
  calm: 'Calm',
  moderate: 'Moderate',
  busy: 'Busy',
  intense: 'Intense',
};

const KIND_LABEL: Record<StressKind, [string, string]> = {
  'highway-entry': ['highway on-ramp', 'highway on-ramps'],
  interchange: ['highway interchange', 'highway interchanges'],
  merge: ['merge', 'merges'],
  'highway-exit': ['highway exit', 'highway exits'],
  'turn-across': ['turn across traffic', 'turns across traffic'],
  'u-turn': ['U-turn', 'U-turns'],
  roundabout: ['roundabout', 'roundabouts'],
  fork: ['fork or lane choice', 'forks or lane choices'],
  rapid: ['quick back-to-back turn', 'quick back-to-back turns'],
  turn: ['easy turn', 'easy turns'],
  ferry: ['ferry', 'ferries'],
};

export function kindLabel(kind: StressKind, count: number): string {
  return `${count} ${KIND_LABEL[kind][count === 1 ? 0 : 1]}`;
}

/** Ordered from most to least stressful, for breakdown lists. */
export const KIND_ORDER: StressKind[] = [
  'highway-entry',
  'interchange',
  'merge',
  'u-turn',
  'turn-across',
  'roundabout',
  'highway-exit',
  'rapid',
  'fork',
  'ferry',
  'turn',
];
