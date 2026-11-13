import {
  classifyManeuver,
  driveSideFor,
  M,
  NEUTRAL_WEIGHTS,
  rankRoutes,
  scoreRoute,
  weightsFromSelection,
} from '@/core/calm-score';
import { dedupeRoutes, parseValhallaResponse } from '@/services/routing/valhalla';
import type { Route } from '@/services/routing/types';
import calmFixture from '../__fixtures__/valhalla-ams-utr-calm.json';
import fastestFixture from '../__fixtures__/valhalla-ams-utr-fastest.json';

const fastest = parseValhallaResponse(fastestFixture, 'fastest', 'metric');
const calm = parseValhallaResponse(calmFixture, 'calm', 'metric');

describe('maneuver classification', () => {
  it('treats left turns as crossing traffic only where people drive on the right', () => {
    expect(classifyManeuver(M.Left, 'right')).toBe('turn-across');
    expect(classifyManeuver(M.Left, 'left')).toBe('turn');
    expect(classifyManeuver(M.Right, 'left')).toBe('turn-across');
  });

  it('recognises highway ramps, merges and roundabouts', () => {
    expect(classifyManeuver(M.RampLeft, 'right')).toBe('highway-entry');
    expect(classifyManeuver(M.MergeRight, 'right')).toBe('merge');
    expect(classifyManeuver(M.RoundaboutEnter, 'right')).toBe('roundabout');
    expect(classifyManeuver(M.Continue, 'right')).toBeNull();
  });

  it('knows which countries drive on the left', () => {
    expect(driveSideFor('GB')).toBe('left');
    expect(driveSideFor('jp')).toBe('left');
    expect(driveSideFor('NL')).toBe('right');
    expect(driveSideFor(undefined)).toBe('right');
  });
});

describe('parsing Valhalla', () => {
  it('parses every trip with geometry and maneuvers in meters', () => {
    expect(fastest).toHaveLength(3);
    expect(calm).toHaveLength(2);
    const r = fastest[0];
    expect(r.distance).toBeGreaterThan(50_000);
    expect(r.geometry.length).toBeGreaterThan(100);
    expect(r.cumulative[r.cumulative.length - 1]).toBeGreaterThan(r.distance * 0.97);
    expect(r.maneuvers[0].beginIndex).toBe(0);
    expect(r.maneuvers[r.maneuvers.length - 1].beginIndex).toBe(r.geometry.length - 1);
  });

  it('drops near-identical alternatives', () => {
    const copy: Route = { ...fastest[0], id: 'copy' };
    expect(dedupeRoutes([fastest[0], copy, fastest[1]])).toHaveLength(2);
  });
});

describe('scoreRoute', () => {
  it('scores the highway-free calm route as calmer than the fastest one', () => {
    const fast = scoreRoute(fastest[0]);
    const noHighway = calm.find((r) => !r.hasHighway)!;
    const quiet = scoreRoute(noHighway);
    expect(quiet.highwayKm).toBe(0);
    expect(fast.highwayKm).toBeGreaterThan(10);
    expect(quiet.stress).toBeLessThan(fast.stress);
    expect(quiet.score).toBeGreaterThan(fast.score);
  });

  it('stays within 0 to 100 and records where each stress event is', () => {
    for (const r of [...fastest, ...calm]) {
      const s = scoreRoute(r);
      expect(s.score).toBeGreaterThanOrEqual(0);
      expect(s.score).toBeLessThanOrEqual(100);
      for (const e of s.events) expect(r.geometry).toContainEqual(e.coord);
    }
  });

  it('makes a route feel more stressful when its triggers matter to the driver', () => {
    const neutral = scoreRoute(fastest[0], 'right', NEUTRAL_WEIGHTS);
    const highwayAverse = scoreRoute(fastest[0], 'right', weightsFromSelection(['highways', 'merging']));
    expect(highwayAverse.stress).toBeGreaterThan(neutral.stress);
  });

  it('gives an empty route a perfect score', () => {
    expect(scoreRoute({ distance: 500, geometry: [[0, 0]], maneuvers: [] }).score).toBe(100);
  });
});

describe('rankRoutes', () => {
  const all = dedupeRoutes([...fastest, ...calm]);

  it('labels the fastest and a calmer option within the time budget', () => {
    const ranked = rankRoutes(all, {
      driveSide: 'right',
      weights: NEUTRAL_WEIGHTS,
      maxExtraSeconds: 60 * 60,
      units: 'metric',
    });
    const fastestPick = ranked.find((r) => r.labels.includes('fastest'))!;
    const calmestPick = ranked.find((r) => r.labels.includes('calmest'))!;
    expect(fastestPick.duration).toBe(Math.min(...all.map((r) => r.duration)));
    expect(calmestPick.score.stress).toBeLessThanOrEqual(fastestPick.score.stress);
    expect(calmestPick.calmerBy).toBeGreaterThan(0);
    expect(ranked[0].labels).toContain('calmest');
    expect(ranked.length).toBeLessThanOrEqual(3);
  });

  it('respects the extra time the driver is willing to accept', () => {
    const ranked = rankRoutes(all, {
      driveSide: 'right',
      weights: NEUTRAL_WEIGHTS,
      maxExtraSeconds: 5 * 60,
      units: 'metric',
    });
    for (const r of ranked) expect(r.extraTime).toBeLessThanOrEqual(5 * 60);
  });
});
