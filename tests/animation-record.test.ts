import { describe, expect, it } from 'vitest';
import {
  draw,
  fadeIn,
  fadeOut,
  fadeTo,
  marksAt,
  resolveAnimation,
  sameMarks,
  type Animation,
  type AnimationRecord,
  type Mark,
} from '../index.js';
import { PANELS, TIMES as BOOLEAN_TIMES, booleans } from '../demos/boolean.js';
import { TIMES as SOLID_TIMES, solid } from '../demos/surface.js';
import { TIMES as FLAT_TIMES, tangent } from '../demos/tangent.js';

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
