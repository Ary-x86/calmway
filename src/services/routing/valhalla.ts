import { bboxOf, cumulativeDistances, decodePolyline, overlapRatio, type LngLat, type UnitSystem } from '@/core/geo';
import { config, withKey } from '@/services/config';
import { buildProfiles, type AvoidOptions, type CalmStrength, type ProfileRequest } from './profiles';
import type { Maneuver, Route, RouteProfile } from './types';

export class RoutingError extends Error {
  constructor(
    message: string,
    readonly kind: 'no-route' | 'network' | 'server' = 'server',
  ) {
    super(message);
    this.name = 'RoutingError';
  }
}

interface ValhallaManeuver {
  type: number;
  instruction: string;
  verbal_transition_alert_instruction?: string;
  verbal_pre_transition_instruction?: string;
  verbal_post_transition_instruction?: string;
  street_names?: string[];
  length: number;
  time: number;
  begin_shape_index: number;
  end_shape_index: number;
  highway?: boolean;
  toll?: boolean;
  ferry?: boolean;
  roundabout_exit_count?: number;
  sign?: {
    exit_number_elements?: { text: string }[];
    exit_branch_elements?: { text: string }[];
    exit_toward_elements?: { text: string }[];
  };
}

interface ValhallaTrip {
  legs: { shape: string; maneuvers: ValhallaManeuver[] }[];
  summary: {
    length: number;
    time: number;
    has_highway?: boolean;
    has_toll?: boolean;
    has_ferry?: boolean;
  };
}

export interface ValhallaResponse {
  trip?: ValhallaTrip;
  alternates?: { trip: ValhallaTrip }[];
  error?: string;
  error_code?: number;
}

const KM_PER_MILE = 1.609344;

export interface RouteQuery {
  origin: LngLat;
  destination: LngLat;
  /** Current heading of the car, helps avoid "turn around" on reroutes. */
  heading?: number;
  units: UnitSystem;
  language?: string;
  signal?: AbortSignal;
}

function buildBody(q: RouteQuery, p: ProfileRequest) {
  const origin: Record<string, number> = { lon: q.origin[0], lat: q.origin[1] };
  if (q.heading !== undefined) {
    origin.heading = Math.round(q.heading);
    origin.heading_tolerance = 45;
  }
  return {
    locations: [origin, { lon: q.destination[0], lat: q.destination[1] }],
    costing: 'auto',
    costing_options: { auto: p.costingOptions },
    alternates: p.alternates,
    units: q.units === 'imperial' ? 'miles' : 'kilometers',
    language: q.language ?? 'en-US',
    directions_type: 'instructions',
  };
}

function parseTrip(trip: ValhallaTrip, profile: RouteProfile, index: number, units: UnitSystem): Route {
  const toMeters = (len: number) => len * (units === 'imperial' ? KM_PER_MILE : 1) * 1000;
  const geometry: LngLat[] = [];
  const maneuvers: Maneuver[] = [];

  for (const leg of trip.legs) {
    const shape = decodePolyline(leg.shape, 6);
    // Legs share their joining vertex; drop the duplicate.
    const offset = geometry.length === 0 ? 0 : geometry.length - 1;
    geometry.push(...(geometry.length === 0 ? shape : shape.slice(1)));
    for (const m of leg.maneuvers) {
      const exitNumber = m.sign?.exit_number_elements?.[0]?.text;
      const branch = m.sign?.exit_branch_elements?.[0]?.text ?? m.sign?.exit_toward_elements?.[0]?.text;
      maneuvers.push({
        type: m.type,
        instruction: m.instruction,
        verbalAlert: m.verbal_transition_alert_instruction,
        verbalPre: m.verbal_pre_transition_instruction,
        verbalPost: m.verbal_post_transition_instruction,
        streetNames: m.street_names ?? [],
        distance: toMeters(m.length),
        duration: m.time,
        beginIndex: m.begin_shape_index + offset,
        endIndex: m.end_shape_index + offset,
        highway: Boolean(m.highway),
        toll: Boolean(m.toll),
        ferry: Boolean(m.ferry),
        roundaboutExitCount: m.roundabout_exit_count,
        sign: [exitNumber && `Exit ${exitNumber}`, branch].filter(Boolean).join(' · ') || undefined,
      });
    }
  }

  const cumulative = cumulativeDistances(geometry);
  return {
    id: `${profile}-${index}-${Math.round(trip.summary.length * 1000)}`,
    profile,
    geometry,
    cumulative,
    bbox: bboxOf(geometry),
    distance: toMeters(trip.summary.length),
    duration: trip.summary.time,
    maneuvers,
    hasHighway: Boolean(trip.summary.has_highway),
    hasToll: Boolean(trip.summary.has_toll),
    hasFerry: Boolean(trip.summary.has_ferry),
  };
}

async function requestProfile(q: RouteQuery, p: ProfileRequest): Promise<Route[]> {
  const body = buildBody(q, p);
  // GET with ?json= avoids a CORS preflight on public servers.
  const url = withKey(`${config.routingUrl}?json=${encodeURIComponent(JSON.stringify(body))}`);
  let res: Response;
  try {
    res = await fetch(url, { signal: q.signal });
  } catch (e) {
    if ((e as Error).name === 'AbortError') throw e;
    throw new RoutingError('Could not reach the routing service. Check your connection.', 'network');
  }
  let data: ValhallaResponse;
  try {
    data = (await res.json()) as ValhallaResponse;
  } catch {
    throw new RoutingError(`Routing service error (${res.status}).`, 'server');
  }
  if (!res.ok || !data.trip) {
    const noRoute = data.error_code === 442 || /no (path|route)/i.test(data.error ?? '');
    throw new RoutingError(
      noRoute ? 'No drivable route found between these places.' : (data.error ?? `Routing failed (${res.status}).`),
      noRoute ? 'no-route' : 'server',
    );
  }
  return parseValhallaResponse(data, p.profile, q.units);
}

export function parseValhallaResponse(data: ValhallaResponse, profile: RouteProfile, units: UnitSystem): Route[] {
  if (!data.trip) return [];
  const trips = [data.trip, ...(data.alternates ?? []).map((a) => a.trip)];
  return trips.map((t, i) => parseTrip(t, profile, i, units));
}

/** True when two routes are basically the same drive. */
export function isNearDuplicate(a: Route, b: Route): boolean {
  const timeClose = Math.abs(a.duration - b.duration) / Math.max(a.duration, 1) < 0.03;
  const distClose = Math.abs(a.distance - b.distance) / Math.max(a.distance, 1) < 0.03;
  if (!timeClose || !distClose) return false;
  return overlapRatio(a.geometry, b.geometry) > 0.9 && overlapRatio(b.geometry, a.geometry) > 0.9;
}

export function dedupeRoutes(routes: Route[]): Route[] {
  const out: Route[] = [];
  for (const r of routes) {
    if (!out.some((o) => isNearDuplicate(o, r))) out.push(r);
  }
  return out;
}

/**
 * Fetches the fastest routes and the calm-tuned routes in parallel and
 * returns every distinct candidate. Ranking happens in core/calm-score.
 */
export async function fetchCandidateRoutes(
  q: RouteQuery,
  strength: CalmStrength,
  avoid: AvoidOptions,
): Promise<Route[]> {
  const profiles = buildProfiles(strength, avoid);
  const results = await Promise.allSettled(profiles.map((p) => requestProfile(q, p)));
  const routes = results.flatMap((r) => (r.status === 'fulfilled' ? r.value : []));
  if (routes.length === 0) {
    const firstError = results.find((r): r is PromiseRejectedResult => r.status === 'rejected');
    throw firstError?.reason ?? new RoutingError('No route found.', 'no-route');
  }
  return dedupeRoutes(routes);
}

/** A single calm-profile route, used for rerouting during navigation. */
export async function fetchReroute(
  q: RouteQuery,
  profile: RouteProfile,
  strength: CalmStrength,
  avoid: AvoidOptions,
): Promise<Route> {
  const p = buildProfiles(strength, avoid).find((x) => x.profile === profile)!;
  const [route] = await requestProfile(q, { ...p, alternates: 0 });
  return route;
}
