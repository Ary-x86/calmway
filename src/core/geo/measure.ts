import type { BBox, LngLat } from './types';

const EARTH_RADIUS_M = 6371008.8;
const toRad = (deg: number) => (deg * Math.PI) / 180;
const toDeg = (rad: number) => (rad * 180) / Math.PI;

/** Great-circle distance in meters. */
export function haversine(a: LngLat, b: LngLat): number {
  const dLat = toRad(b[1] - a[1]);
  const dLng = toRad(b[0] - a[0]);
  const lat1 = toRad(a[1]);
  const lat2 = toRad(b[1]);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Initial bearing from a to b in degrees, 0 = north, clockwise. */
export function bearing(a: LngLat, b: LngLat): number {
  const lat1 = toRad(a[1]);
  const lat2 = toRad(b[1]);
  const dLng = toRad(b[0] - a[0]);
  const y = Math.sin(dLng) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

/** Smallest signed difference between two bearings, in degrees (-180..180). */
export function bearingDelta(from: number, to: number): number {
  return ((to - from + 540) % 360) - 180;
}

/** Linear interpolation between two coordinates. Fine for short segments. */
export function lerp(a: LngLat, b: LngLat, t: number): LngLat {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
}

/** Running distance in meters at every vertex. cumulative[0] is always 0. */
export function cumulativeDistances(line: LngLat[]): number[] {
  const out = new Array<number>(line.length);
  let total = 0;
  for (let i = 0; i < line.length; i++) {
    if (i > 0) total += haversine(line[i - 1], line[i]);
    out[i] = total;
  }
  return out;
}

export function bboxOf(points: LngLat[]): BBox {
  let w = Infinity;
  let s = Infinity;
  let e = -Infinity;
  let n = -Infinity;
  for (const [lng, lat] of points) {
    if (lng < w) w = lng;
    if (lng > e) e = lng;
    if (lat < s) s = lat;
    if (lat > n) n = lat;
  }
  return [w, s, e, n];
}

export function mergeBBoxes(boxes: BBox[]): BBox {
  return boxes.reduce<BBox>(
    (acc, b) => [Math.min(acc[0], b[0]), Math.min(acc[1], b[1]), Math.max(acc[2], b[2]), Math.max(acc[3], b[3])],
    [Infinity, Infinity, -Infinity, -Infinity],
  );
}

/** Coordinate at a given distance along a line, plus the heading there. */
export function pointAlong(
  line: LngLat[],
  cumulative: number[],
  distance: number,
): { coord: LngLat; heading: number; segmentIndex: number } {
  if (line.length === 1) return { coord: line[0], heading: 0, segmentIndex: 0 };
  const total = cumulative[cumulative.length - 1];
  const d = Math.max(0, Math.min(distance, total));
  // Binary search for the segment that contains d.
  let lo = 0;
  let hi = cumulative.length - 1;
  while (lo < hi - 1) {
    const mid = (lo + hi) >> 1;
    if (cumulative[mid] <= d) lo = mid;
    else hi = mid;
  }
  const segLen = cumulative[hi] - cumulative[lo];
  const t = segLen > 0 ? (d - cumulative[lo]) / segLen : 0;
  return { coord: lerp(line[lo], line[hi], t), heading: bearing(line[lo], line[hi]), segmentIndex: lo };
}

export interface SnapResult {
  /** Closest point on the line. */
  coord: LngLat;
  /** Index of the segment start vertex. */
  segmentIndex: number;
  /** Distance along the line in meters. */
  along: number;
  /** Perpendicular distance from the input point to the line in meters. */
  offset: number;
  /** Heading of the snapped segment. */
  heading: number;
}

/**
 * Snaps a point to the closest position on a line. Uses a local equirectangular
 * projection per segment, which is accurate to well under a meter at road scale.
 * `fromIndex` and `toIndex` limit the search window so a car on an overpass
 * does not jump to the road underneath.
 */
export function snapToLine(
  point: LngLat,
  line: LngLat[],
  cumulative: number[],
  fromIndex = 0,
  toIndex = line.length - 1,
): SnapResult {
  const cosLat = Math.cos(toRad(point[1]));
  const mPerDegLat = 111320;
  const mPerDegLng = 111320 * cosLat;
  const px = point[0] * mPerDegLng;
  const py = point[1] * mPerDegLat;

  let best: SnapResult = {
    coord: line[0],
    segmentIndex: 0,
    along: 0,
    offset: Infinity,
    heading: 0,
  };
  const start = Math.max(0, fromIndex);
  const end = Math.min(line.length - 1, toIndex);

  for (let i = start; i < end; i++) {
    const a = line[i];
    const b = line[i + 1];
    const ax = a[0] * mPerDegLng;
    const ay = a[1] * mPerDegLat;
    const bx = b[0] * mPerDegLng;
    const by = b[1] * mPerDegLat;
    const dx = bx - ax;
    const dy = by - ay;
    const len2 = dx * dx + dy * dy;
    let t = len2 > 0 ? ((px - ax) * dx + (py - ay) * dy) / len2 : 0;
    t = Math.max(0, Math.min(1, t));
    const cx = ax + t * dx;
    const cy = ay + t * dy;
    const dist = Math.hypot(px - cx, py - cy);
    if (dist < best.offset) {
      const segLen = cumulative[i + 1] - cumulative[i];
      best = {
        coord: lerp(a, b, t),
        segmentIndex: i,
        along: cumulative[i] + segLen * t,
        offset: dist,
        heading: bearing(a, b),
      };
    }
  }
  if (line.length === 1) best.offset = haversine(point, line[0]);
  return best;
}

/**
 * Share of line A that lies within `toleranceM` of line B, sampled every
 * `stepM` meters. Used to drop near-duplicate route alternatives.
 */
export function overlapRatio(a: LngLat[], b: LngLat[], toleranceM = 35, maxSamples = 80): number {
  if (a.length < 2 || b.length < 2) return 0;
  const cumA = cumulativeDistances(a);
  const cumB = cumulativeDistances(b);
  const totalA = cumA[cumA.length - 1];
  if (totalA === 0) return 1;
  const samples = Math.max(2, Math.min(maxSamples, Math.ceil(totalA / 150)));
  let hits = 0;
  for (let i = 0; i < samples; i++) {
    const p = pointAlong(a, cumA, (totalA * i) / (samples - 1)).coord;
    if (snapToLine(p, b, cumB).offset <= toleranceM) hits++;
  }
  return hits / samples;
}
