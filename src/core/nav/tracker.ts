import { snapToLine, type LngLat, type SnapResult } from '@/core/geo';
import { M } from '@/core/calm-score/maneuvers';
import type { Route } from '@/services/routing/types';

export interface Fix {
  coord: LngLat;
  /** Horizontal accuracy in meters, if known. */
  accuracy?: number;
  /** Heading in degrees, if known. */
  heading?: number;
  /** Speed in m/s, if known. */
  speed?: number;
  timestamp: number;
}

export interface NavProgress {
  snapped: LngLat;
  heading: number;
  /** Meters driven along the route. */
  along: number;
  /** Meters between the fix and the route line. */
  offset: number;
  /** Index of the next maneuver the driver has to perform. */
  nextIndex: number;
  distanceToNext: number;
  remainingDistance: number;
  remainingDuration: number;
  offRoute: boolean;
  arrived: boolean;
}

const LOOKAHEAD_M = 1500;
const OFF_ROUTE_MIN_M = 40;
const OFF_ROUTE_MAX_M = 90;
const OFF_ROUTE_FIXES = 3;
const ARRIVAL_M = 30;

const DESTINATIONS = new Set<number>([M.Destination, M.DestinationLeft, M.DestinationRight]);

/**
 * Follows the driver along a route: snaps GPS fixes to the line, works out
 * which maneuver is next, how far away it is, and whether they left the route.
 */
export class RouteTracker {
  readonly route: Route;
  private readonly maneuverAlong: number[];
  private readonly total: number;
  private segmentIndex = 0;
  private along = 0;
  private offCount = 0;
  private offSince: number | null = null;

  constructor(route: Route) {
    this.route = route;
    this.maneuverAlong = route.maneuvers.map(
      (m) => route.cumulative[Math.min(m.beginIndex, route.cumulative.length - 1)],
    );
    this.total = route.cumulative[route.cumulative.length - 1] ?? 0;
  }

  get totalDistance(): number {
    return this.total;
  }

  maneuverDistance(index: number): number {
    return this.maneuverAlong[index] ?? this.total;
  }

  update(fix: Fix): NavProgress {
    const { route } = this;
    const snap = this.snap(fix.coord);

    // Never move backwards by more than a little GPS jitter.
    if (snap.along >= this.along - 25 || snap.offset < 15) {
      this.along = Math.max(snap.along, this.along - 25);
      this.segmentIndex = snap.segmentIndex;
    }

    const threshold = Math.min(OFF_ROUTE_MAX_M, Math.max(OFF_ROUTE_MIN_M, (fix.accuracy ?? 10) * 1.5));
    if (snap.offset > threshold) {
      this.offCount++;
      this.offSince ??= fix.timestamp;
    } else {
      this.offCount = 0;
      this.offSince = null;
    }
    const offRoute =
      this.offCount >= OFF_ROUTE_FIXES || (this.offSince !== null && fix.timestamp - this.offSince > 5000);

    let nextIndex = this.maneuverAlong.findIndex((d, i) => i > 0 && d > this.along + 3);
    if (nextIndex === -1) nextIndex = route.maneuvers.length - 1;
    const distanceToNext = Math.max(0, this.maneuverAlong[nextIndex] - this.along);

    // Remaining time: what is left of the current stretch plus every stretch after it.
    const current = Math.max(0, nextIndex - 1);
    const stretch = route.maneuvers[current];
    const stretchLength = Math.max(1, this.maneuverAlong[nextIndex] - this.maneuverAlong[current]);
    const fractionLeft = Math.min(1, distanceToNext / stretchLength);
    let remainingDuration = stretch ? stretch.duration * fractionLeft : 0;
    for (let i = nextIndex; i < route.maneuvers.length; i++) remainingDuration += route.maneuvers[i].duration;

    const remainingDistance = Math.max(0, this.total - this.along);
    const arrived =
      remainingDistance < ARRIVAL_M ||
      (DESTINATIONS.has(route.maneuvers[nextIndex]?.type) && distanceToNext < ARRIVAL_M && snap.offset < 60);

    return {
      snapped: snap.coord,
      heading: snap.heading,
      along: this.along,
      offset: snap.offset,
      nextIndex,
      distanceToNext,
      remainingDistance,
      remainingDuration,
      offRoute: offRoute && !arrived,
      arrived,
    };
  }

  private snap(coord: LngLat): SnapResult {
    const { geometry, cumulative } = this.route;
    // Search a window around where we were last, so overlapping roads do not confuse us.
    const from = Math.max(0, this.segmentIndex - 3);
    let to = this.segmentIndex;
    const limit = cumulative[this.segmentIndex] + LOOKAHEAD_M;
    while (to < geometry.length - 1 && cumulative[to] < limit) to++;
    const local = snapToLine(coord, geometry, cumulative, from, Math.max(to, from + 1));
    if (local.offset < OFF_ROUTE_MIN_M) return local;
    // Lost track (tunnel, GPS jump): look at the whole route.
    const global = snapToLine(coord, geometry, cumulative);
    return global.offset < local.offset ? global : local;
  }
}
