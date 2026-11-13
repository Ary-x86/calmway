import { M, type DriveSide, type StressKind } from '@/core/calm-score/maneuvers';
import { stressKindAt } from '@/core/calm-score/score';
import { spokenDistance, type UnitSystem } from '@/core/geo';
import type { Maneuver } from '@/services/routing/types';
import type { NavProgress } from './tracker';

/**
 * A gentle co-driver. Decides what to say and when, with more lead time
 * before tricky maneuvers and some reassurance on long quiet stretches.
 */
export interface AnnouncerOptions {
  units: UnitSystem;
  driveSide: DriveSide;
  reassurance: boolean;
}

type Stage = 'early' | 'prepare' | 'now' | 'post';

const CALM_TIPS: Partial<Record<StressKind, string>> = {
  'highway-entry': 'Get up to speed on the ramp and merge when there is a gap. No rush.',
  merge: 'Match the speed of traffic and merge when it feels right.',
  interchange: 'Move into the lane early and follow the signs.',
  'highway-exit': 'Move over early, there is plenty of time.',
  roundabout: 'Slow down and stay in your lane.',
  'turn-across': 'Wait for a clear gap, there is no rush.',
  'u-turn': 'Only when it is safe.',
  fork: 'Follow the signs.',
};

const DESTINATIONS = new Set<number>([M.Destination, M.DestinationLeft, M.DestinationRight]);

const TRICKY = new Set<StressKind>([
  'highway-entry',
  'interchange',
  'merge',
  'highway-exit',
  'roundabout',
  'turn-across',
  'u-turn',
]);

/** Context-aware: is maneuver i one that deserves an early, gentle heads-up? */
export function isTrickyAt(maneuvers: Maneuver[], i: number, side: DriveSide): boolean {
  const kind = stressKindAt(maneuvers, i, side);
  return kind !== null && TRICKY.has(kind);
}

function lowerFirst(text: string): string {
  return text.length > 0 ? text[0].toLowerCase() + text.slice(1) : text;
}

function stripPeriod(text: string): string {
  return text.replace(/\.\s*$/, '');
}

export class Announcer {
  private spoken = new Set<string>();
  private lastNextIndex = -1;
  private lastReassureAlong = 0;

  constructor(
    private maneuvers: Maneuver[],
    private opts: AnnouncerOptions,
  ) {}

  /** Opening line when navigation starts. */
  intro(levelLabel: string): string {
    const first = this.maneuvers[0];
    const instruction = first?.verbalPre ?? first?.instruction ?? '';
    return `Starting your route. It is a ${levelLabel.toLowerCase()} drive. ${instruction}`.trim();
  }

  /** Returns a line to speak for this update, or null to stay quiet. */
  update(p: NavProgress, speed: number): string | null {
    if (p.arrived) return this.once(`arrive`, 'You have arrived. Nicely done.');

    const next = this.maneuvers[p.nextIndex];
    if (!next) return null;
    const v = Math.max(speed, 8);
    const d = p.distanceToNext;
    const kind = stressKindAt(this.maneuvers, p.nextIndex, this.opts.driveSide);
    const tricky = kind !== null && TRICKY.has(kind);

    const nowAt = Math.max(60, v * 6);
    const prepareAt = Math.max(400, v * 25);
    const earlyAt = Math.max(1600, v * 75);

    // Just finished a maneuver: describe the road ahead.
    if (p.nextIndex !== this.lastNextIndex) {
      const first = this.lastNextIndex === -1;
      this.lastNextIndex = p.nextIndex;
      this.lastReassureAlong = p.along;
      if (!first && d > prepareAt + 300) {
        const post = this.postLine(p.nextIndex, d);
        if (post) return this.once(`${p.nextIndex}:post`, post);
      }
    }

    if (d <= nowAt) {
      const text = DESTINATIONS.has(next.type)
        ? (next.verbalPre ?? 'You have arrived.')
        : (next.verbalPre ?? next.instruction);
      return this.once(`${p.nextIndex}:now`, text);
    }

    if (d <= prepareAt) {
      if (this.spoken.has(`${p.nextIndex}:now`)) return null;
      const what = stripPeriod(next.verbalAlert ?? next.verbalPre ?? next.instruction);
      return this.once(`${p.nextIndex}:prepare`, `In ${spokenDistance(d, this.opts.units)}, ${lowerFirst(what)}.`);
    }

    if (tricky && d <= earlyAt && d > prepareAt + 300) {
      const what = stripPeriod(next.verbalAlert ?? next.instruction);
      const tip = kind ? CALM_TIPS[kind] : undefined;
      return this.once(
        `${p.nextIndex}:early`,
        `Heads up. In about ${spokenDistance(d, this.opts.units)}, ${lowerFirst(what)}.${tip ? ` ${tip}` : ''}`,
      );
    }

    // Long quiet stretch: a calm check-in every ~5 km.
    if (this.opts.reassurance && d > 4000 && p.along - this.lastReassureAlong > 5000) {
      this.lastReassureAlong = p.along;
      return `All good. Stay on this road for about ${spokenDistance(d, this.opts.units)}.`;
    }

    return null;
  }

  private postLine(nextIndex: number, distance: number): string | null {
    const current = this.maneuvers[nextIndex - 1];
    const street = current?.streetNames[0];
    if (distance > 3000) {
      return `Nothing to do for the next ${spokenDistance(distance, this.opts.units)}. Just follow ${street ?? 'this road'}.`;
    }
    return current?.verbalPost ?? null;
  }

  private once(key: Stage | string, text: string): string | null {
    if (this.spoken.has(key)) return null;
    this.spoken.add(key);
    return text;
  }
}

/** The next maneuver after `fromIndex` that deserves attention, for the "next tricky part" hint. */
export function nextTrickyIndex(maneuvers: Maneuver[], fromIndex: number, side: DriveSide): number {
  for (let i = fromIndex; i < maneuvers.length; i++) {
    if (isTrickyAt(maneuvers, i, side)) return i;
  }
  return -1;
}
