/**
 * Valhalla maneuver type codes.
 * https://valhalla.github.io/valhalla/api/turn-by-turn/api-reference/
 */
export const M = {
  None: 0,
  Start: 1,
  StartRight: 2,
  StartLeft: 3,
  Destination: 4,
  DestinationRight: 5,
  DestinationLeft: 6,
  Becomes: 7,
  Continue: 8,
  SlightRight: 9,
  Right: 10,
  SharpRight: 11,
  UturnRight: 12,
  UturnLeft: 13,
  SharpLeft: 14,
  Left: 15,
  SlightLeft: 16,
  RampStraight: 17,
  RampRight: 18,
  RampLeft: 19,
  ExitRight: 20,
  ExitLeft: 21,
  StayStraight: 22,
  StayRight: 23,
  StayLeft: 24,
  Merge: 25,
  RoundaboutEnter: 26,
  RoundaboutExit: 27,
  FerryEnter: 28,
  FerryExit: 29,
  MergeRight: 37,
  MergeLeft: 38,
} as const;

export type DriveSide = 'right' | 'left';

export type StressKind =
  | 'highway-entry'
  | 'interchange'
  | 'merge'
  | 'highway-exit'
  | 'turn-across'
  | 'u-turn'
  | 'roundabout'
  | 'fork'
  | 'rapid'
  | 'turn'
  | 'ferry';

const RAMP = new Set<number>([M.RampStraight, M.RampRight, M.RampLeft]);
const EXIT = new Set<number>([M.ExitRight, M.ExitLeft]);
const MERGE = new Set<number>([M.Merge, M.MergeRight, M.MergeLeft]);
const FORK = new Set<number>([M.StayStraight, M.StayRight, M.StayLeft]);
const UTURN = new Set<number>([M.UturnRight, M.UturnLeft]);

/** Turns that cross oncoming traffic depend on which side of the road you drive on. */
function isTurnAcross(type: number, side: DriveSide): boolean {
  return side === 'right' ? type === M.Left || type === M.SharpLeft : type === M.Right || type === M.SharpRight;
}

function isSimpleTurn(type: number, side: DriveSide): boolean {
  const simple =
    side === 'right'
      ? [M.Right, M.SharpRight, M.SlightRight, M.SlightLeft]
      : [M.Left, M.SharpLeft, M.SlightLeft, M.SlightRight];
  return (simple as number[]).includes(type);
}

/** Classifies a maneuver into the stress event it represents, if any. */
export function classifyManeuver(type: number, side: DriveSide): StressKind | null {
  if (RAMP.has(type)) return 'highway-entry';
  if (MERGE.has(type)) return 'merge';
  if (EXIT.has(type)) return 'highway-exit';
  if (UTURN.has(type)) return 'u-turn';
  if (type === M.RoundaboutEnter) return 'roundabout';
  if (FORK.has(type)) return 'fork';
  if (type === M.FerryEnter) return 'ferry';
  if (isTurnAcross(type, side)) return 'turn-across';
  if (isSimpleTurn(type, side)) return 'turn';
  return null;
}

/** True when the driver has to make a decision (not just "continue"). */
export function isDecision(type: number): boolean {
  return ![
    M.None,
    M.Start,
    M.StartRight,
    M.StartLeft,
    M.Destination,
    M.DestinationRight,
    M.DestinationLeft,
    M.Becomes,
    M.Continue,
    M.RoundaboutExit,
    M.FerryExit,
  ].includes(type as never);
}

/** ISO 3166-1 alpha-2 codes of places that drive on the left. */
const LEFT_HAND_TRAFFIC = new Set(
  (
    'AG AI AU BB BD BM BN BS BT BW CC CK CX CY DM FJ FK GB GD GG GY HK ID IE IM IN JE JM JP KE KI KN KY ' +
    'LC LK LS MO MS MT MU MV MW MY MZ NA NF NP NR NU NZ PG PK PN SB SC SG SH SR SZ TC TH TK TL TO TT TV ' +
    'TZ UG VC VG VI WS ZA ZM ZW'
  ).split(' '),
);

export function driveSideFor(countryCode: string | null | undefined): DriveSide {
  return countryCode && LEFT_HAND_TRAFFIC.has(countryCode.toUpperCase()) ? 'left' : 'right';
}
