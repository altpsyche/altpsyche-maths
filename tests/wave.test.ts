import { describe, expect, it } from 'vitest';
import { colourFrom, plot, coordsOf, scaleOf, interval, sameMarks, vec2, wave, type Mark } from '../index.js';

const coords = coordsOf(scaleOf(interval(-2, 2), interval(-2, 2)), scaleOf(interval(-1, 4), interval(-1, 2)));

const curve: Mark = {
  kind: 'path',
  id: 'demo/curve',
  path: plot(coords, (x) => x * x),
  stroke: { colour: colourFrom('#ffffff'), width: 0.04 },
};
const marks: readonly Mark[] = [curve];

/** The furthest any point of the waved shape has moved from where it started. */
function furthest(along: number, options = {}): number {
  const changed = wave('demo', options)(marks, along)[0];
  if (changed.kind !== 'path' || curve.kind !== 'path') throw new Error('the wave lost the path');
  let worst = 0;
  for (let at = 0; at < changed.path.length; at++) {
    const before = curve.path[at];
    const after = changed.path[at];
    worst = Math.max(worst, Math.hypot(after.start.x - before.start.x, after.start.y - before.start.y));
    for (let piece = 0; piece < after.curves.length; piece++) {
      const was = before.curves[piece];
      const now = after.curves[piece];
      worst = Math.max(worst, Math.hypot(now.to.x - was.to.x, now.to.y - was.to.y));
    }
  }
  return worst;
}

/** How far across the shape the crest sits, as a share of the crossing, read off
 * the point that moved furthest. */
function crestAt(along: number, covers: number): number {
  const changed = wave('demo', { covers, amplitude: 1 })(marks, along)[0];
  if (changed.kind !== 'path' || curve.kind !== 'path') throw new Error('the wave lost the path');
  let best = -1;
  let where = 0;
  const xs = curve.path.flatMap((subpath) => [subpath.start.x, ...subpath.curves.map((piece) => piece.to.x)]);
  const low = Math.min(...xs);
  const reach = Math.max(...xs) - low;
  curve.path.forEach((subpath, at) => {
    subpath.curves.forEach((piece, index) => {
      const moved = changed.path[at].curves[index].to.y - piece.to.y;
      if (moved > best) {
        best = moved;
        where = (piece.to.x - low) / reach;
      }
    });
  });
  return where;
}

describe('a hump travelling across a shape', () => {
  it('leaves the shape exactly as it found it at both ends of the span', () => {
    expect(sameMarks(wave('demo')(marks, 0), marks)).toBe(true);
    expect(sameMarks(wave('demo')(marks, 1), marks)).toBe(true);
  });

  it('pushes no point further than the amplitude it was given', () => {
    for (const along of [0.2, 0.4, 0.5, 0.6, 0.8]) {
      expect(furthest(along, { amplitude: 0.3 })).toBeLessThanOrEqual(0.3 + 1e-12);
    }
  });

  it('reaches the amplitude it was given at the middle of the span', () => {
    expect(furthest(0.5, { amplitude: 0.3, covers: 0.5 })).toBeCloseTo(0.3, 2);
  });

  it('carries its crest from one edge of the shape to the other', () => {
    const early = crestAt(0.3, 0.3);
    const middle = crestAt(0.5, 0.3);
    const late = crestAt(0.7, 0.3);
    expect(early).toBeLessThan(middle);
    expect(middle).toBeLessThan(late);
    expect(early).toBeLessThan(0.35);
    expect(late).toBeGreaterThan(0.65);
  });

  it('pushes along the direction it was given and not across it', () => {
    const changed = wave('demo', { direction: vec2(1, 0), amplitude: 0.4, covers: 0.5 })(marks, 0.5)[0];
    if (changed.kind !== 'path' || curve.kind !== 'path') throw new Error('the wave lost the path');
    for (let at = 0; at < changed.path.length; at++) {
      for (let piece = 0; piece < changed.path[at].curves.length; piece++) {
        expect(changed.path[at].curves[piece].to.y).toBeCloseTo(curve.path[at].curves[piece].to.y, 12);
      }
    }
  });

  it('changes nothing where the name reaches nothing', () => {
    expect(wave('nowhere')(marks, 0.5)).toBe(marks);
  });
});
