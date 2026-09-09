import { describe, expect, it } from 'vitest';
import {
  draw,
  fadeIn,
  fadeOut,
  fadeTo,
  growFrom,
  marksAt,
  morph,
  morphEquation,
  moveAlong,
  moveBy,
  resolveAnimation,
  resolvePath,
  rotate,
  sameMarks,
  scale,
  vec2,
  type Animation,
  type AnimationRecord,
  type Mark,
  type PathRecord,
} from '../index.js';
import { PANELS, TIMES as BOOLEAN_TIMES, booleans } from '../demos/boolean.js';
import { TIMES as SOLID_TIMES, solid } from '../demos/surface.js';
import { TIMES as FLAT_TIMES, tangent } from '../demos/tangent.js';
import { CENTRE, FRAMES as TURN_FRAMES, GIVEN, TIMES as TURN_TIMES, turns } from '../demos/rotate.js';

/** Five fractions of a span, both ends of it and the three quarters between, so
 * an animation that is right at nothing and at one is not called right. */
const ALONG = [0, 0.25, 0.5, 0.75, 1];

/** The record and the call given the same marks at the same fraction, which is
 * the whole of what a resolved animation has to agree about. */
function agrees(record: AnimationRecord, called: Animation, marks: readonly Mark[]): boolean {
  const resolved = resolveAnimation(record);
  return ALONG.every((along) => sameMarks(resolved(marks, along), called(marks, along)));
}

describe('the animations that change opacity as records', () => {
  it('fades the three panels of the boolean demo where its own calls fade them', () => {
    for (const seconds of Object.values(BOOLEAN_TIMES)) {
      const marks = marksAt(booleans, seconds);
      expect(marks.length).toBeGreaterThan(0);
      for (const panel of PANELS) {
        for (const part of ['discs', 'label', 'result']) {
          const target = `booleans/${panel.name}/${part}`;
          expect(agrees({ kind: 'fadeIn', target }, fadeIn(target), marks), `${target} at ${seconds}`).toBe(true);
        }
      }
    }
  });

  it('walks the solid demo rule and title away where its own two calls walk them', () => {
    for (const seconds of Object.values(SOLID_TIMES)) {
      const marks = marksAt(solid, seconds);
      for (const target of ['solid/rule', 'solid/title']) {
        for (const opacity of [0, 1]) {
          expect(agrees({ kind: 'fadeTo', target, opacity }, fadeTo(target, opacity), marks)).toBe(true);
        }
      }
    }
  });

  it('draws the flat demo axes, its curve and its brace where its own calls draw them', () => {
    for (const seconds of Object.values(FLAT_TIMES)) {
      const marks = marksAt(tangent, seconds);
      for (const target of ['tangent/axes/x/line', 'tangent/axes/y/line', 'tangent/curve', 'tangent/rise/brace']) {
        expect(agrees({ kind: 'draw', target }, draw(target), marks), `${target} at ${seconds}`).toBe(true);
      }
    }
  });

  it('fades a target out where its own call fades it out, which no demo plays', () => {
    const marks = marksAt(tangent, FLAT_TIMES.walkTo);
    const target = 'tangent/field';
    expect(agrees({ kind: 'fadeOut', target }, fadeOut(target), marks)).toBe(true);
  });

  it('reaches a whole group by its name and nothing outside it', () => {
    const marks = marksAt(tangent, FLAT_TIMES.walkTo);
    const faded = resolveAnimation({ kind: 'fadeTo', target: 'tangent/axes', opacity: 0 })(marks, 1);
    const inside = faded.filter((mark) => mark.id.startsWith('tangent/axes/'));
    expect(inside.length).toBeGreaterThan(0);
    expect(inside.every((mark) => mark.opacity === 0)).toBe(true);
    const outside = (list: readonly Mark[]) => list.filter((mark) => !mark.id.startsWith('tangent/axes'));
    expect(sameMarks(outside(faded), outside(marks))).toBe(true);
  });

  it('refuses a kind the set has no animation for', () => {
    const record = { kind: 'fadeSideways', target: 'tangent/curve' } as unknown as AnimationRecord;
    expect(() => resolveAnimation(record)).toThrow('an animation has no kind called fadeSideways');
  });
});

describe('the animations that move marks as records', () => {
  const at = (seconds: number) => marksAt(turns, seconds);

  it('turns both riders of the rotation demo where its own calls turn them', () => {
    const times = [...Object.values(TURN_TIMES), ...TURN_FRAMES];
    expect(TURN_FRAMES).toHaveLength(4);
    expect(Object.values(TURN_TIMES)).toHaveLength(5);
    for (const seconds of times) {
      const marks = at(seconds);
      expect(marks.length).toBeGreaterThan(0);
      const whole = 2 * Math.PI;
      expect(
        agrees({ kind: 'rotate', target: 'turns/own/rider', angle: whole }, rotate('turns/own/rider', whole), marks),
        `the rider about its own middle at ${seconds}`
      ).toBe(true);
      expect(
        agrees(
          { kind: 'rotate', target: 'turns/given/rider', angle: whole, options: { pivot: GIVEN } },
          rotate('turns/given/rider', whole, { pivot: GIVEN }),
          marks
        ),
        `the rider about the named pivot at ${seconds}`
      ).toBe(true);
    }
  });

  it('carries the whole figure into a slot where the strip carries it', () => {
    const offset = vec2(7 - CENTRE.x, -CENTRE.y);
    for (const seconds of TURN_FRAMES) {
      expect(agrees({ kind: 'moveBy', target: 'turns', offset }, moveBy('turns', offset), at(seconds))).toBe(true);
    }
  });

  it('reads the pivot off the marks where the record names none, so a whole turn ends where it began', () => {
    const marks = at(TURN_TIMES.start);
    const turned = resolveAnimation({ kind: 'rotate', target: 'turns/own/rider', angle: 2 * Math.PI })(marks, 1);
    expect(sameMarks(turned, marks)).toBe(true);
  });
});

describe('the moving animations no demo plays', () => {
  const marks = marksAt(tangent, FLAT_TIMES.walkTo);
  const walk: PathRecord = { kind: 'line', from: vec2(0, 0), to: { kind: 'point', x: { kind: 'track', name: 'reach' }, y: 1 } };

  it('carries marks along a path where its own call carries them', () => {
    const path = resolvePath(walk, { tracks: { reach: 3 } });
    const record: AnimationRecord = { kind: 'moveAlong', target: 'tangent/point', path: walk };
    const resolved = resolveAnimation(record, { tracks: { reach: 3 } });
    expect(ALONG.every((along) => sameMarks(resolved(marks, along), moveAlong('tangent/point', path)(marks, along)))).toBe(true);
  });

  it('reads the path at the time the figure is built, so a path that follows a track carries further', () => {
    const near = resolveAnimation({ kind: 'moveAlong', target: 'tangent/point', path: walk }, { tracks: { reach: 1 } });
    const far = resolveAnimation({ kind: 'moveAlong', target: 'tangent/point', path: walk }, { tracks: { reach: 3 } });
    expect(sameMarks(near(marks, 1), far(marks, 1))).toBe(false);
  });

  it('grows and shrinks about a point where its own call does', () => {
    const options = { from: 0.5, pivot: vec2(1, 1) };
    expect(agrees({ kind: 'scale', target: 'tangent/curve', to: 2, options }, scale('tangent/curve', 2, options), marks)).toBe(
      true
    );
    expect(
      agrees({ kind: 'growFrom', target: 'tangent/curve', from: vec2(1, 1) }, growFrom('tangent/curve', vec2(1, 1)), marks)
    ).toBe(true);
  });
});

describe('the animations that put one shape in place of another', () => {
  const from = 'tangent/equation/at-rest';
  const to = 'tangent/equation/moving';

  it('walks the flat demo rule into the one it becomes, glyph for glyph at each of its named times', () => {
    const resolved = resolveAnimation({ kind: 'morphEquation', from, to });
    for (const seconds of Object.values(FLAT_TIMES)) {
      const marks = marksAt(tangent, seconds);
      const glyphs = marks.filter((mark) => mark.id.startsWith(`${from}/`) || mark.id.startsWith(`${to}/`));
      expect(glyphs.length, `the rule at ${seconds}`).toBeGreaterThan(0);
      for (const along of ALONG) {
        expect(sameMarks(resolved(marks, along), morphEquation(from, to)(marks, along)), `${seconds} at ${along}`).toBe(
          true
        );
      }
    }
  });

  it('leaves the shared glyphs where they stand and moves only the difference', () => {
    const marks = marksAt(tangent, FLAT_TIMES.morphTo);
    const still = resolveAnimation({ kind: 'morphEquation', from, to })(marks, 0);
    const leaving = (list: readonly Mark[]) => list.filter((mark) => mark.id.startsWith(`${from}/`));
    expect(sameMarks(leaving(still), leaving(marks))).toBe(true);
  });

  it('walks one shape into another where its own call walks it, which no demo plays', () => {
    const marks = marksAt(tangent, FLAT_TIMES.walkTo);
    const into: PathRecord = { kind: 'circle', centre: vec2(0, 0), radius: { kind: 'track', name: 'wide' } };
    const bindings = { tracks: { wide: 2 } };
    const resolved = resolveAnimation({ kind: 'morph', target: 'tangent/point', into }, bindings);
    const called = morph('tangent/point', resolvePath(into, bindings));
    expect(ALONG.every((along) => sameMarks(resolved(marks, along), called(marks, along)))).toBe(true);
  });
});
