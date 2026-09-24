import { describe, expect, it } from 'vitest';
import { boundsOf, centreOf, marksAt, pointAlong, sameMarks, sampleTrack, viewAt } from '../index.js';
import { TIMES, tangent, walk, walkPath } from '../demos/tangent.js';
import { TIMES as SOLID_TIMES, orbit, solid } from '../demos/surface.js';

const ASPECT = 16 / 9;

describe('a figure read with held values', () => {
  it('draws with a value held at what its track reads the marks the track draws', () => {
    for (const seconds of Object.values(TIMES)) {
      const s = sampleTrack(walk, seconds) as number;
      const held = marksAt(tangent, seconds, ASPECT, undefined, { s });
      expect(sameMarks(held, marksAt(tangent, seconds, ASPECT), 1e-9)).toBe(true);
    }
    for (const seconds of Object.values(SOLID_TIMES)) {
      const turn = sampleTrack(orbit, seconds) as number;
      const held = marksAt(solid, seconds, ASPECT, undefined, { turn });
      expect(sameMarks(held, marksAt(solid, seconds, ASPECT), 1e-9)).toBe(true);
    }
  });

  it('puts the dot where the held fraction of the walked stretch is', () => {
    const marks = marksAt(tangent, TIMES.entrance, ASPECT, undefined, { s: 0.25 });
    const dot = marks.find((mark) => mark.id === 'tangent/point/disc');
    if (!dot || dot.kind !== 'path') throw new Error('the dot is not drawn');
    const drawn = centreOf(boundsOf(dot.path)!);
    const wanted = pointAlong(walkPath, 0.25)!;
    expect(Math.hypot(drawn.x - wanted.x, drawn.y - wanted.y)).toBeLessThan(1e-9);
  });

  it('moves a view that follows a mark by the held value', () => {
    const still = viewAt(tangent, TIMES.entrance, 1280, 720);
    const held = viewAt(tangent, TIMES.entrance, 1280, 720, { s: 1 });
    expect(held).not.toEqual(still);
    expect(viewAt(tangent, TIMES.walkTo, 1280, 720, { s: 1 })).toEqual(viewAt(tangent, TIMES.walkTo, 1280, 720));
  });

  it('refuses a held name that no track carries', () => {
    expect(() => marksAt(tangent, 0, ASPECT, undefined, { turn: 0.5 })).toThrow(
      'the held value turn names no track of this figure',
    );
  });
});
