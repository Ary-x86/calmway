import { Announcer, RouteSimulator, RouteTracker, type NavProgress } from '@/core/nav';
import { parseValhallaResponse } from '@/services/routing/valhalla';
import fastestFixture from '../__fixtures__/valhalla-ams-utr-fastest.json';

const route = parseValhallaResponse(fastestFixture, 'fastest', 'metric')[0];

function drive(speedFactor: number, onStep?: (p: NavProgress, speed: number) => void, maxSteps = 20_000) {
  const sim = new RouteSimulator(route, speedFactor);
  const tracker = new RouteTracker(route);
  let t = 0;
  let last: NavProgress | null = null;
  for (let i = 0; i < maxSteps && !last?.arrived; i++) {
    t += 1000;
    const fix = sim.tick(1000, t);
    last = tracker.update(fix);
    onStep?.(last, fix.speed ?? 0);
  }
  return last!;
}

describe('RouteTracker with the simulator', () => {
  it('follows the whole route without going off route and arrives', () => {
    let maxOffset = 0;
    let lastNext = 0;
    let wentBack = false;
    const final = drive(4, (p) => {
      maxOffset = Math.max(maxOffset, p.offset);
      if (p.offRoute) throw new Error(`off route at ${p.along}`);
      if (p.nextIndex < lastNext) wentBack = true;
      lastNext = p.nextIndex;
    });
    expect(final.arrived).toBe(true);
    expect(maxOffset).toBeLessThan(5);
    expect(wentBack).toBe(false);
  });

  it('counts remaining time down', () => {
    const tracker = new RouteTracker(route);
    const sim = new RouteSimulator(route, 1);
    const first = tracker.update(sim.tick(1000, 1000));
    for (let i = 0; i < 300; i++) sim.tick(1000, 2000 + i * 1000);
    const later = tracker.update(sim.tick(1000, 400_000));
    expect(later.remainingDuration).toBeLessThan(first.remainingDuration);
    expect(later.remainingDistance).toBeLessThan(first.remainingDistance);
  });

  it('flags a wrong turn as off route after a few fixes', () => {
    const tracker = new RouteTracker(route);
    const sim = new RouteSimulator(route, 1);
    let t = 0;
    for (let i = 0; i < 120; i++) tracker.update(sim.tick(1000, (t += 1000)));
    sim.wrongTurn();
    let off = false;
    for (let i = 0; i < 30 && !off; i++) off = tracker.update(sim.tick(1000, (t += 1000))).offRoute;
    expect(off).toBe(true);
  });
});

describe('Announcer', () => {
  it('speaks each stage once, with an early heads-up before tricky maneuvers', () => {
    const announcer = new Announcer(route.maneuvers, { units: 'metric', driveSide: 'right', reassurance: true });
    const lines: string[] = [];
    drive(1, (p, speed) => {
      const line = announcer.update(p, speed);
      if (line) lines.push(line);
    });
    expect(lines.length).toBeGreaterThan(10);
    expect(lines.some((l) => l.startsWith('Heads up.'))).toBe(true);
    expect(lines.some((l) => /^In \d+ meters, /.test(l))).toBe(true);
    expect(lines[lines.length - 1]).toMatch(/arrived/i);
    const prepares = lines.filter((l) => l.startsWith('In '));
    expect(new Set(prepares).size).toBe(prepares.length);
  });
});
