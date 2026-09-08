import { describe, expect, it } from 'vitest';
import { circle, mat3, pathToData, pathFromData, pointCount, pointOn, vec2 } from '@altpsyche/maths';
import type { Path, Vec2 } from '@altpsyche/maths';

/**
 * The way in. `pathData` writes a path and this reads one back, so the two are
 * checked against each other as well as against the geometry each command
 * claims to describe.
 *
 * The three glyphs are a typesetter's own output, which is the reason this
 * exists: an outline nobody can build from the constructors in this package can
 * still be trimmed, aligned and walked into another shape once it can be read.
 * Between them they carry every command MathJax emits, which is `H L M Q T V Z`.
 */
const GLYPHS = {
  equals:
    'M56 347Q56 360 70 367H707Q722 359 722 347Q722 336 708 328L390 327H72Q56 332 56 347ZM56 153Q56 168 72 173H708Q722 163 722 153Q722 140 707 133H70Q56 140 56 153Z',
  minus: 'M84 237T84 250T98 270H679Q694 262 694 250T679 230H98Q84 237 84 250Z',
  radical:
    'M263 249Q264 249 315 130T417 -108T470 -228L725 302Q981 837 982 839Q989 850 1001 850Q1008 850 1013 844T1020 832V826L741 243Q645 43 540 -176Q479 -303 469 -324T453 -348Q449 -350 436 -350L424 -349L315 -96Q206 156 205 156L171 130Q138 104 137 104L111 130L263 249Z',
};

const ARITY: Record<string, number> = { M: 2, L: 2, H: 1, V: 1, C: 6, S: 4, Q: 4, T: 2, A: 7, Z: 0 };
const NUMBER = /[+-]?(?:\d*\.\d+|\d+\.?)(?:[eE][+-]?\d+)?/g;

/** Each command of a `d` string with how many numbers follow it, which is what
 * says whether a letter stands for one segment or for several. */
const runs = (d: string) =>
  [...d.matchAll(/([A-Za-z])([^A-Za-z]*)/g)].map((match) => ({
    letter: match[1] ?? '',
    numbers: (match[2] ?? '').match(NUMBER)?.length ?? 0,
  }));

const points = (path: Path): Vec2[] =>
  path.flatMap((subpath) => [
    subpath.start,
    ...subpath.curves.flatMap((curve) => [curve.control1, curve.control2, curve.to]),
  ]);

const drift = (one: Vec2[], two: Vec2[]): number =>
  Math.max(
    ...one.map((point, index) =>
      Math.max(Math.abs(point.x - (two[index]?.x ?? NaN)), Math.abs(point.y - (two[index]?.y ?? NaN)))
    )
  );

/** Every reading of the distance from a centre, taken along the whole path,
 * which is how a run of cubics is held to being an arc. */
const radii = (path: Path, centre: Vec2, steps = 200): number[] => {
  const readings: number[] = [];
  for (const subpath of path) {
    let from = subpath.start;
    for (const curve of subpath.curves) {
      for (let at = 0; at <= steps; at++) {
        const point = pointOn(from, curve, at / steps);
        readings.push(Math.hypot(point.x - centre.x, point.y - centre.y));
      }
      from = curve.to;
    }
  }
  return readings;
};

describe('pathFromData', () => {
  it('reads a glyph as the subpaths and cubics its own string writes', () => {
    for (const [name, d] of Object.entries(GLYPHS)) {
      const written = runs(d);
      // Every letter carries exactly its own numbers here, so one letter is one
      // segment and counting letters is counting curves.
      for (const run of written) expect(run.numbers, `${name} ${run.letter}`).toBe(ARITY[run.letter]);

      const path = pathFromData(d);
      expect(path.length, `${name} subpaths`).toBe(written.filter((run) => run.letter === 'M').length);
      expect(
        path.reduce((total, subpath) => total + subpath.curves.length, 0),
        `${name} cubics`
      ).toBe(written.filter((run) => 'LHVCSQTA'.includes(run.letter)).length);
      expect(path.every((subpath) => subpath.closed)).toBe(true);
    }
  });

  it('round trips a glyph through the painter to a thousandth', () => {
    for (const [name, d] of Object.entries(GLYPHS)) {
      const path = pathFromData(d);
      const again = pathFromData(pathToData(path, mat3.IDENTITY));
      expect(again.length, `${name} subpaths`).toBe(path.length);
      // The painter rounds a coordinate to three places, and a third of an
      // integer distance is what costs the most on the way back.
      expect(drift(points(path), points(again)), `${name} drift`).toBeLessThanOrEqual(1e-3);
    }
  });

  it('elevates a quadratic to the same curve rather than a fit to it', () => {
    const [subpath] = pathFromData('M0 0Q6 12 12 0');
    expect(subpath?.curves[0]?.control1).toEqual({ x: 4, y: 8 });
    expect(subpath?.curves[0]?.control2).toEqual({ x: 8, y: 8 });
    expect(subpath?.curves[0]?.to).toEqual({ x: 12, y: 0 });
  });

  it('puts a smooth segment with nothing before it on the point it starts from', () => {
    const [quadratic] = pathFromData('M84 237T84 250');
    expect(quadratic?.curves[0]?.control1).toEqual({ x: 84, y: 237 });
    const [cubic] = pathFromData('M0 0S6 12 12 0');
    expect(cubic?.curves[0]?.control1).toEqual({ x: 0, y: 0 });
  });

  it('reads a relative run as the absolute one it describes', () => {
    const absolute = pathFromData('M10 10L20 10H30V20C35 20 40 25 40 30S45 40 50 40Q55 45 60 50T70 60Z');
    const relative = pathFromData('m10 10l10 0h10v10c5 0 10 5 10 10s5 10 10 10q5 5 10 10t10 10z');
    expect(pathToData(relative, mat3.IDENTITY)).toBe(pathToData(absolute, mat3.IDENTITY));
  });

  it('takes a second pair under one moveto as a line', () => {
    const [subpath] = pathFromData('M0 0 10 0 10 10');
    expect(subpath?.curves).toHaveLength(2);
    expect(subpath?.curves[1]?.to).toEqual({ x: 10, y: 10 });
  });

  it('begins again where a closed subpath began', () => {
    const path = pathFromData('M0 0H10V10ZH20');
    expect(path).toHaveLength(2);
    expect(path[0]?.closed).toBe(true);
    expect(path[1]?.start).toEqual({ x: 0, y: 0 });
    expect(path[1]?.closed).toBe(false);
  });
});

describe('an arc read out of path data', () => {
  it('is as round as the circle this package builds, to the same part in ten thousand', () => {
    const path = pathFromData('M10 0A10 10 0 0 1 -10 0A10 10 0 0 1 10 0');
    const worst = Math.max(...radii(path, vec2(0, 0)).map((reading) => Math.abs(reading / 10 - 1)));
    // The same bound `circle` is held to, because a cubic cannot be a quarter
    // arc exactly and both are built from the same control distance.
    expect(worst).toBeLessThan(2.8e-4);
    expect(worst).toBeGreaterThan(2.6e-4);
    // Four quarters, the way the circle is, since each half of the sweep is
    // cut into pieces of at most a quarter turn.
    expect(pointCount(path)).toBe(pointCount(circle(vec2(0, 0), 10)));
  });

  it('holds both radii of an ellipse, which no circle builder here can make', () => {
    const path = pathFromData('M20 0A20 8 0 1 1 -20 0');
    let worst = 0;
    for (const subpath of path) {
      let from = subpath.start;
      for (const curve of subpath.curves) {
        for (let at = 0; at <= 200; at++) {
          const point = pointOn(from, curve, at / 200);
          // On the ellipse, so the two axes together read one.
          worst = Math.max(worst, Math.abs((point.x / 20) ** 2 + (point.y / 8) ** 2 - 1));
        }
        from = curve.to;
      }
    }
    expect(worst).toBeLessThan(2e-3);
  });

  it('picks a different one of the four arcs per pair of flags', () => {
    const ends = ['M0 0A10 10 0 0 0 10 10', 'M0 0A10 10 0 0 1 10 10', 'M0 0A10 10 0 1 0 10 10', 'M0 0A10 10 0 1 1 10 10'];
    const middles = ends.map((d) => {
      const path = pathFromData(d);
      const subpath = path[0];
      const curves = subpath?.curves ?? [];
      const half = curves[Math.floor(curves.length / 2)];
      let from = subpath?.start ?? vec2(0, 0);
      for (let index = 0; index < Math.floor(curves.length / 2); index++) from = curves[index]?.to ?? from;
      return half ? pointOn(from, half, 0.5) : vec2(0, 0);
    });

    // All four end where they said, and no two of them go the same way there.
    for (const d of ends) {
      const path = pathFromData(d);
      const last = path[0]?.curves.at(-1);
      expect(last?.to.x).toBeCloseTo(10, 6);
      expect(last?.to.y).toBeCloseTo(10, 6);
    }
    const written = new Set(middles.map((point) => `${point.x.toFixed(3)},${point.y.toFixed(3)}`));
    expect(written.size).toBe(4);
  });

  it('turns an ellipse by the angle the string gives, which moves where it bulges', () => {
    const upright = pathFromData('M20 0A20 8 0 0 1 -20 0');
    const turned = pathFromData('M20 0A20 8 90 0 1 -20 0');
    expect(pathToData(turned, mat3.IDENTITY)).not.toBe(pathToData(upright, mat3.IDENTITY));
    // The rotation is applied about the arc's own centre, so both still end
    // where the string said.
    expect(turned[0]?.curves.at(-1)?.to.x).toBeCloseTo(-20, 6);
  });

  it('grows radii too small to reach the far end until they just do', () => {
    // Half the distance the endpoints are apart, so the specification scales
    // both radii up and the arc becomes a half circle of radius 10.
    const path = pathFromData('M-10 0A5 5 0 0 1 10 0');
    const worst = Math.max(...radii(path, vec2(0, 0)).map((reading) => Math.abs(reading / 10 - 1)));
    expect(worst).toBeLessThan(2.8e-4);
    expect(path[0]?.curves.at(-1)?.to.x).toBeCloseTo(10, 6);
  });

  it('draws a straight line for a zero radius and nothing at all for a closed arc', () => {
    const flat = pathFromData('M0 0A0 10 0 0 1 10 0');
    expect(flat[0]?.curves).toHaveLength(1);
    expect(flat[0]?.curves[0]).toEqual(straightTo(vec2(0, 0), vec2(10, 0)));

    // Ends where it starts, which the specification drops rather than drawing.
    const nothing = pathFromData('M5 5A10 10 0 0 1 5 5');
    expect(nothing[0]?.curves).toHaveLength(0);
  });
});

/** The same straight cubic this package builds, written here so the expectation
 * says which shape it is asking for rather than three coordinates. */
function straightTo(from: Vec2, to: Vec2) {
  return { control1: vec2.lerp(from, to, 1 / 3), control2: vec2.lerp(from, to, 2 / 3), to };
}

describe('path data this cannot read', () => {
  it('refuses a letter that is not a command', () => {
    expect(() => pathFromData('M0 0k5 5')).toThrow(/command "k", which is not one of/);
  });

  it('refuses a character that is neither a command nor a number', () => {
    expect(() => pathFromData('M0 0L5 #')).toThrow(/holds "#", which is neither/);
  });

  it('refuses a run that ends short of the numbers its command wants', () => {
    expect(() => pathFromData('M0 0L5')).toThrow(/"L" wants 2 numbers and the run ends short/);
    expect(() => pathFromData('M0 0A10 10 0 0 1')).toThrow(/"A" wants 7 numbers/);
  });

  it('refuses a string that opens on a number and one that draws before it moves', () => {
    expect(() => pathFromData('10 10L5 5')).toThrow(/opens on a number rather than a command/);
    expect(() => pathFromData('L5 5')).toThrow(/draws before it moves to a starting point/);
    expect(() => pathFromData('M0 0Z5 5')).toThrow(/opens on a number rather than a command/);
  });
});
