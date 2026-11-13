import { formatDistance, type UnitSystem } from '@/core/geo';
import type { RankedRoute, Route, RouteLabel } from '@/services/routing/types';
import type { DriveSide } from './maneuvers';
import { kindLabel, scoreRoute, type CalmScore } from './score';
import type { TriggerWeights } from './weights';

export interface RankOptions {
  driveSide: DriveSide;
  weights: TriggerWeights;
  /** Most extra time the driver accepts for a calmer route, in seconds. */
  maxExtraSeconds: number;
  units: UnitSystem;
}

/**
 * Picks up to three routes worth showing: the calmest within the driver's
 * time budget, the fastest, and a balanced middle option when one exists.
 */
export function rankRoutes(routes: Route[], opts: RankOptions): RankedRoute[] {
  if (routes.length === 0) return [];
  const scored = routes.map((r) => ({ route: r, score: scoreRoute(r, opts.driveSide, opts.weights) }));

  const fastest = scored.reduce((a, b) => (b.route.duration < a.route.duration ? b : a));
  const budget = Math.min(opts.maxExtraSeconds, fastest.route.duration * 0.75);
  const eligible = scored.filter((s) => s.route.duration - fastest.route.duration <= budget);

  const calmest = eligible.reduce((a, b) => {
    if (b.score.stress < a.score.stress - 0.5) return b;
    if (Math.abs(b.score.stress - a.score.stress) <= 0.5 && b.route.duration < a.route.duration) return b;
    return a;
  });

  // Balanced: best mix of time and stress among the rest, if it is a real middle ground.
  let balanced: (typeof scored)[number] | undefined;
  const rest = eligible.filter((s) => s !== calmest && s !== fastest);
  if (rest.length > 0 && calmest !== fastest) {
    const cost = (s: (typeof scored)[number]) =>
      s.route.duration / fastest.route.duration + s.score.stress / Math.max(fastest.score.stress, 1);
    const candidate = rest.reduce((a, b) => (cost(b) < cost(a) ? b : a));
    const lessStress = candidate.score.stress < fastest.score.stress * 0.92;
    const quicker = candidate.route.duration < calmest.route.duration - 60;
    if (lessStress && quicker) balanced = candidate;
  }

  const picks: { s: (typeof scored)[number]; labels: RouteLabel[] }[] = [];
  const push = (s: (typeof scored)[number] | undefined, label: RouteLabel) => {
    if (!s) return;
    const existing = picks.find((p) => p.s === s);
    if (existing) existing.labels.push(label);
    else picks.push({ s, labels: [label] });
  };
  push(calmest, 'calmest');
  push(balanced, 'balanced');
  push(fastest, 'fastest');

  return picks.map(({ s, labels }) => {
    const extraTime = Math.max(0, s.route.duration - fastest.route.duration);
    const calmerBy =
      fastest.score.stress > 0 ? Math.round(((fastest.score.stress - s.score.stress) / fastest.score.stress) * 100) : 0;
    return {
      ...s.route,
      score: s.score,
      labels,
      extraTime,
      calmerBy,
      summary: summarize(s.score, opts.units, s === fastest ? undefined : fastest.score),
    };
  });
}

/** One short line about what makes a route easy or hard. */
export function summarize(score: CalmScore, units: UnitSystem, comparedTo?: CalmScore): string {
  const c = score.counts;
  const parts: string[] = [];

  if (comparedTo) {
    const avoidedMerges = comparedTo.counts['highway-entry'] + comparedTo.counts.merge - (c['highway-entry'] + c.merge);
    if (avoidedMerges > 0 && c['highway-entry'] + c.merge === 0) {
      parts.push('No highway merges');
    } else if (avoidedMerges > 0) {
      parts.push(`${avoidedMerges} fewer ${avoidedMerges === 1 ? 'merge' : 'merges'}`);
    }
    const fewerAcross = comparedTo.counts['turn-across'] - c['turn-across'];
    if (fewerAcross > 1) parts.push(`${fewerAcross} fewer turns across traffic`);
  }

  if (parts.length === 0) {
    if (score.highwayKm < 0.5) parts.push('No highways');
    else parts.push(`${formatDistance(score.highwayKm * 1000, units)} on highways`);
  }

  const notable = (['turn-across', 'roundabout', 'merge'] as const)
    .filter((k) => c[k] > 0)
    .map((k) => kindLabel(k, c[k]));
  if (notable.length > 0 && parts.length < 2) parts.push(notable[0]);

  return parts.join(', ');
}
