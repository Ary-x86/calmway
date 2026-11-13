import type { BBox, LngLat } from '@/core/geo';
import type { CalmScore } from '@/core/calm-score';

/** Where a candidate route came from. */
export type RouteProfile = 'fastest' | 'calm';

export interface Maneuver {
  /** Valhalla maneuver type code. See core/calm-score/maneuvers.ts. */
  type: number;
  instruction: string;
  /** Spoken heads-up, e.g. "Turn left onto Main Street." */
  verbalAlert?: string;
  /** Spoken right before the maneuver. */
  verbalPre?: string;
  /** Spoken right after, e.g. "Continue for 2 kilometers." */
  verbalPost?: string;
  streetNames: string[];
  /** Length of the stretch that follows this maneuver, meters. */
  distance: number;
  /** Seconds to drive that stretch. */
  duration: number;
  /** Index into Route.geometry where the maneuver happens. */
  beginIndex: number;
  endIndex: number;
  highway: boolean;
  toll: boolean;
  ferry: boolean;
  roundaboutExitCount?: number;
  /** Exit number or branch sign text, if any. */
  sign?: string;
}

export interface Route {
  id: string;
  profile: RouteProfile;
  geometry: LngLat[];
  /** Running distance (m) at each geometry vertex. */
  cumulative: number[];
  bbox: BBox;
  distance: number;
  duration: number;
  maneuvers: Maneuver[];
  hasHighway: boolean;
  hasToll: boolean;
  hasFerry: boolean;
}

export type RouteLabel = 'calmest' | 'balanced' | 'fastest';

export interface RankedRoute extends Route {
  score: CalmScore;
  labels: RouteLabel[];
  /** Extra seconds compared with the fastest option. */
  extraTime: number;
  /** Percent less stress than the fastest option (can be negative). */
  calmerBy: number;
  /** Short human summary, e.g. "Mostly local roads, no highway merges". */
  summary: string;
}

export interface Waypoint {
  coord: LngLat;
  name?: string;
}
