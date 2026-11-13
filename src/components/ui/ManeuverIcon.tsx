import Svg, { Circle, Path } from 'react-native-svg';
import { M } from '@/core/calm-score/maneuvers';

interface Glyph {
  main: string[];
  faint?: string[];
  circle?: { cx: number; cy: number; r: number };
  fill?: string;
}

const STRAIGHT: Glyph = { main: ['M12 21V4', 'M7 9l5-5 5 5'] };
const RIGHT: Glyph = { main: ['M8 21v-9q0-4 4-4h7', 'M15 4l4 4-4 4'] };
const LEFT: Glyph = { main: ['M16 21v-9q0-4-4-4H5', 'M9 4L5 8l4 4'] };
const SLIGHT_RIGHT: Glyph = { main: ['M9 21v-8l8-8', 'M11 5h6v6'] };
const SLIGHT_LEFT: Glyph = { main: ['M15 21v-8L7 5', 'M13 5H7v6'] };
const SHARP_RIGHT: Glyph = { main: ['M8 21V8l9 9', 'M17 11v6h-6'] };
const SHARP_LEFT: Glyph = { main: ['M16 21V8l-9 9', 'M7 11v6h6'] };
const UTURN_LEFT: Glyph = { main: ['M16 21V9a4.5 4.5 0 0 0-9 0v7', 'M4 13l3 3 3-3'] };
const UTURN_RIGHT: Glyph = { main: ['M8 21V9a4.5 4.5 0 0 1 9 0v7', 'M14 13l3 3 3-3'] };
const ROUNDABOUT: Glyph = {
  main: ['M12 21v-6.5', 'M15.2 6.8L19 3', 'M14.5 3H19v4.5'],
  circle: { cx: 12, cy: 10, r: 4.5 },
};
const MERGE: Glyph = { main: ['M7 21q0-8 5-12V3', 'M8 7l4-4 4 4'], faint: ['M17 21q0-8-5-12'] };
const EXIT_RIGHT: Glyph = { main: ['M9 15q0-4 7-10', 'M11.5 5H16v4.5', 'M9 21v-6'], faint: ['M9 15V3'] };
const EXIT_LEFT: Glyph = { main: ['M15 15q0-4-7-10', 'M12.5 5H8v4.5', 'M15 21v-6'], faint: ['M15 15V3'] };
const STAY_RIGHT: Glyph = { main: ['M12 21v-7l5-8', 'M13 6h4v4'], faint: ['M12 14L7 6'] };
const STAY_LEFT: Glyph = { main: ['M12 21v-7L7 6', 'M11 6H7v4'], faint: ['M12 14l5-8'] };
const STAY_STRAIGHT: Glyph = { main: ['M12 21V4', 'M8 8l4-4 4 4'], faint: ['M12 15l-6-6', 'M12 15l6-6'] };
const DESTINATION: Glyph = {
  main: ['M12 21s-6.5-6.2-6.5-11a6.5 6.5 0 0 1 13 0c0 4.8-6.5 11-6.5 11z'],
  circle: { cx: 12, cy: 10, r: 2.3 },
};
const START: Glyph = { main: ['M12 3l7 17-7-4-7 4z'], fill: 'self' };

function glyphFor(type: number): Glyph {
  switch (type) {
    case M.Right:
    case M.StartRight:
      return RIGHT;
    case M.Left:
    case M.StartLeft:
      return LEFT;
    case M.SlightRight:
      return SLIGHT_RIGHT;
    case M.SlightLeft:
      return SLIGHT_LEFT;
    case M.SharpRight:
      return SHARP_RIGHT;
    case M.SharpLeft:
      return SHARP_LEFT;
    case M.UturnLeft:
      return UTURN_LEFT;
    case M.UturnRight:
      return UTURN_RIGHT;
    case M.RoundaboutEnter:
    case M.RoundaboutExit:
      return ROUNDABOUT;
    case M.Merge:
    case M.MergeLeft:
    case M.MergeRight:
      return MERGE;
    case M.RampRight:
    case M.ExitRight:
      return EXIT_RIGHT;
    case M.RampLeft:
    case M.ExitLeft:
      return EXIT_LEFT;
    case M.StayRight:
      return STAY_RIGHT;
    case M.StayLeft:
      return STAY_LEFT;
    case M.StayStraight:
    case M.RampStraight:
      return STAY_STRAIGHT;
    case M.Destination:
    case M.DestinationLeft:
    case M.DestinationRight:
      return DESTINATION;
    case M.Start:
      return START;
    default:
      return STRAIGHT;
  }
}

export function ManeuverIcon({ type, size = 32, color }: { type: number; size?: number; color: string }) {
  const g = glyphFor(type);
  const strokeProps = {
    stroke: color,
    strokeWidth: 2.4,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  };
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {g.faint?.map((d) => (
        <Path key={d} d={d} {...strokeProps} opacity={0.35} />
      ))}
      {g.main.map((d) => (
        <Path key={d} d={d} {...strokeProps} fill={g.fill ? color : 'none'} />
      ))}
      {g.circle && <Circle {...g.circle} {...strokeProps} />}
    </Svg>
  );
}
