import { describe, expect, it } from 'vitest';
import { coordsOf, implicit, interval, pointOn, scaleOf, type Coords, type Path } from '../index.js';

// A square graph counting from -2 to 2 both ways, so a unit circle sits well
// inside it and one cell is as wide as it is tall.
const square = coordsOf(scaleOf(interval(-2, 2), interval(-2, 2)), scaleOf(interval(-2, 2), interval(-2, 2)));

const disc = (x: number, y: number) => x * x + y * y - 1;

/** The furthest the drawn curve strays from the unit circle, as a fraction of
 * the radius, sampled inside every piece rather than at its ends alone. */
function worstRadius(path: Path, coords: Coords, steps = 64): number {
  let worst = 0;
  for (const subpath of path) {
    let from = subpath.start;
    for (const piece of subpath.curves) {
      for (let at = 0; at <= steps; at++) {
        const drawn = pointOn(from, piece, at / steps);
        const x = interval.remap(drawn.x, coords.x.units, coords.x.graph);
        const y = interval.remap(drawn.y, coords.y.units, coords.y.graph);
        worst = Math.max(worst, Math.abs(Math.hypot(x, y) - 1));
      }
      from = piece.to;
    }
  }
  return worst;
}

describe('an implicit curve', () => {
  it('draws a circle no function of x could close', () => {
    const path = implicit(square, disc, { resolution: 64 });
    expect(path).toHaveLength(1);
    expect(path[0].closed).toBe(true);
    expect(worstRadius(path, square)).toBeLessThan(5e-7);
  });

  it('holds a circle closer as the cells halve', () => {
    const readings = [16, 32, 64].map((resolution) => worstRadius(implicit(square, disc, { resolution }), square));
    expect(readings[0]).toBeLessThan(5e-5);
    // Every crossing is a place on the true curve and every piece leaves both of
    // its own along the true direction there, so the error falls with the fourth
    // power of the count rather than the second.
    expect(readings[0] / readings[1]).toBeGreaterThan(8);
    expect(readings[1] / readings[2]).toBeGreaterThan(8);
  });

  it('draws the two branches of a hyperbola as two open runs', () => {
    const path = implicit(square, (x, y) => x * x - y * y - 1, { resolution: 64 });
    expect(path).toHaveLength(2);
    for (const branch of path) expect(branch.closed).toBe(false);
  });

  it('draws two levels of one function as two closed runs', () => {
    const rings = implicit(square, (x, y) => (x * x + y * y - 0.25) * (x * x + y * y - 2.25), { resolution: 64 });
    expect(rings).toHaveLength(2);
    for (const ring of rings) expect(ring.closed).toBe(true);
  });

  it('keeps two branches apart where both pass through one cell', () => {
    // Nine cells over -2 to 2 put the place both axes read as nothing at the
    // middle of a cell, whose four corners are the pattern with two answers.
    const cross = implicit(square, (x, y) => x * y, { resolution: 9 });
    expect(cross).toHaveLength(2);
    const walk = (subpath: (typeof cross)[number]) => {
      const out = [subpath.start];
      let from = subpath.start;
      for (const piece of subpath.curves) {
        for (let at = 1; at <= 8; at++) out.push(pointOn(from, piece, at / 8));
        from = piece.to;
      }
      return out;
    };
    let nearest = Infinity;
    for (const a of walk(cross[0])) {
      for (const b of walk(cross[1])) nearest = Math.min(nearest, Math.hypot(a.x - b.x, a.y - b.y));
    }
    // A cell is 0.2222 wide here, so two runs joined through the middle would
    // meet rather than pass within most of one cell of each other.
    expect(nearest).toBeGreaterThan(0.2);
  });

  it('reads the level a figure names rather than nothing', () => {
    const path = implicit(square, (x, y) => x * x + y * y, { level: 1, resolution: 64 });
    expect(path).toHaveLength(1);
    expect(worstRadius(path, square)).toBeLessThan(5e-7);
  });

  it('is nothing where the level is outside what the function reaches', () => {
    expect(implicit(square, disc, { level: 99, resolution: 16 })).toEqual([]);
    expect(implicit(square, disc, { level: -99, resolution: 16 })).toEqual([]);
  });

  it('is nothing where a run of the sampled region has no width', () => {
    expect(implicit(square, disc, { over: { x: interval(1, 1) }, resolution: 16 })).toEqual([]);
  });

  it('takes a count of cells for each way separately', () => {
    const path = implicit(square, disc, { resolution: { x: 64, y: 16 } });
    expect(path).toHaveLength(1);
    expect(path[0].closed).toBe(true);
  });

  it('samples only the region a figure names', () => {
    // The upper half of the circle alone, which is an open run ending on the run
    // of y rather than a closed one.
    const half = implicit(square, disc, { over: { y: interval(0, 2) }, resolution: 64 });
    expect(half).toHaveLength(1);
    expect(half[0].closed).toBe(false);
  });
});
