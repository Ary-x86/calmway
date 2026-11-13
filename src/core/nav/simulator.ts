import { pointAlong, type LngLat } from '@/core/geo';
import type { Route } from '@/services/routing/types';
import type { Fix } from './tracker';

const MIN_SPEED = 4; // m/s
const MAX_SPEED = 36; // m/s

/**
 * Drives a virtual car along a route so navigation can be tested at a desk.
 * Speed follows the expected speed of each stretch, times `speedFactor`.
 */
export class RouteSimulator {
  private along = 0;
  private speed = 8;
  private detour: { from: LngLat; heading: number; meters: number } | null = null;

  constructor(
    private route: Route,
    public speedFactor = 1,
  ) {}

  get finished(): boolean {
    return this.along >= this.route.distance - 1 && !this.detour;
  }

  /** Leaves the route in a straight line, to test rerouting. */
  wrongTurn(): void {
    const here = pointAlong(this.route.geometry, this.route.cumulative, this.along);
    this.detour = { from: here.coord, heading: (here.heading + 70) % 360, meters: 0 };
  }

  tick(dtMs: number, now = Date.now()): Fix {
    const dt = dtMs / 1000;
    if (this.detour) {
      this.detour.meters += 12 * this.speedFactor * dt;
      return {
        coord: offsetCoord(this.detour.from, this.detour.heading, this.detour.meters),
        heading: this.detour.heading,
        speed: 12,
        accuracy: 5,
        timestamp: now,
      };
    }

    const target = this.targetSpeed();
    // Ease toward the target speed so it feels like driving.
    this.speed += (target - this.speed) * Math.min(1, dt * 0.8);
    this.along = Math.min(this.route.distance, this.along + this.speed * this.speedFactor * dt);
    const p = pointAlong(this.route.geometry, this.route.cumulative, this.along);
    return { coord: p.coord, heading: p.heading, speed: this.speed, accuracy: 5, timestamp: now };
  }

  private targetSpeed(): number {
    const { maneuvers, cumulative } = this.route;
    let idx = 0;
    for (let i = 0; i < maneuvers.length; i++) {
      if (cumulative[Math.min(maneuvers[i].beginIndex, cumulative.length - 1)] <= this.along) idx = i;
      else break;
    }
    const m = maneuvers[idx];
    const nextBegin = maneuvers[idx + 1]
      ? cumulative[Math.min(maneuvers[idx + 1].beginIndex, cumulative.length - 1)]
      : this.route.distance;
    let v = m && m.duration > 0 ? m.distance / m.duration : 12;
    // Slow down for the upcoming turn.
    if (nextBegin - this.along < 80) v = Math.min(v, 8);
    return Math.max(MIN_SPEED, Math.min(MAX_SPEED, v));
  }
}

function offsetCoord(from: LngLat, headingDeg: number, meters: number): LngLat {
  const rad = (headingDeg * Math.PI) / 180;
  const dLat = (meters * Math.cos(rad)) / 111320;
  const dLng = (meters * Math.sin(rad)) / (111320 * Math.cos((from[1] * Math.PI) / 180));
  return [from[0] + dLng, from[1] + dLat];
}
