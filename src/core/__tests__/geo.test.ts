import {
  bearing,
  cumulativeDistances,
  decodePolyline,
  encodePolyline,
  formatDistance,
  formatDuration,
  haversine,
  overlapRatio,
  pointAlong,
  snapToLine,
  spokenDistance,
  type LngLat,
} from '@/core/geo';

const AMSTERDAM: LngLat = [4.8897, 52.374];
const UTRECHT: LngLat = [5.1214, 52.0907];

describe('polyline', () => {
  it('round-trips at precision 6', () => {
    const line: LngLat[] = [AMSTERDAM, [4.95, 52.3], UTRECHT];
    const decoded = decodePolyline(encodePolyline(line));
    decoded.forEach((c, i) => {
      expect(c[0]).toBeCloseTo(line[i][0], 6);
      expect(c[1]).toBeCloseTo(line[i][1], 6);
    });
  });
});

describe('measure', () => {
  it('haversine matches the known Amsterdam to Utrecht distance', () => {
    expect(haversine(AMSTERDAM, UTRECHT) / 1000).toBeCloseTo(35.3, 0);
  });

  it('bearing points south-east from Amsterdam to Utrecht', () => {
    const b = bearing(AMSTERDAM, UTRECHT);
    expect(b).toBeGreaterThan(140);
    expect(b).toBeLessThan(160);
  });

  const line: LngLat[] = [
    [0, 0],
    [0, 0.01],
    [0.01, 0.01],
  ];
  const cum = cumulativeDistances(line);

  it('pointAlong interpolates inside segments', () => {
    const half = pointAlong(line, cum, cum[1] / 2);
    expect(half.coord[1]).toBeCloseTo(0.005, 5);
    expect(half.heading).toBeCloseTo(0, 0);
    const end = pointAlong(line, cum, cum[2] + 500);
    expect(end.coord).toEqual(line[2]);
  });

  it('snapToLine finds the perpendicular foot and offset', () => {
    const snap = snapToLine([0.0005, 0.005], line, cum);
    expect(snap.segmentIndex).toBe(0);
    expect(snap.coord[0]).toBeCloseTo(0, 6);
    expect(snap.offset).toBeGreaterThan(50);
    expect(snap.offset).toBeLessThan(60);
    expect(snap.along).toBeCloseTo(cum[1] / 2, -1);
  });

  it('overlapRatio is 1 for identical lines and low for different ones', () => {
    expect(overlapRatio(line, line)).toBe(1);
    const other: LngLat[] = [
      [0.05, 0],
      [0.05, 0.01],
    ];
    expect(overlapRatio(line, other)).toBe(0);
  });
});

describe('format', () => {
  it('formats metric and imperial distances', () => {
    expect(formatDistance(340, 'metric')).toBe('350 m');
    expect(formatDistance(4230, 'metric')).toBe('4.2 km');
    expect(formatDistance(19312, 'imperial')).toBe('12 mi');
    expect(formatDistance(120, 'imperial')).toBe('400 ft');
  });

  it('phrases spoken distances naturally', () => {
    expect(spokenDistance(380, 'metric')).toBe('400 meters');
    expect(spokenDistance(800, 'imperial')).toBe('half a mile');
    expect(spokenDistance(5200, 'metric')).toBe('5 kilometers');
  });

  it('formats durations', () => {
    expect(formatDuration(20)).toBe('under 1 min');
    expect(formatDuration(8 * 60)).toBe('8 min');
    expect(formatDuration(72 * 60)).toBe('1 h 12 min');
  });
});
