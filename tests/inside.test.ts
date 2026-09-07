import { describe, expect, it } from 'vitest';
import { arc, circle, containsPoint, flattenPath, polygon, transformPath, mat3, vec2 } from '@altpsyche/maths';
import type { Path, Vec2 } from '@altpsyche/maths';

/**
 * The decision is a count of the edges a ray from the point crosses, taken on a
 * flattening of the path. These check the two sides of a known radius, a hole
 * wound the other way, and that a ray leaving through a corner answers what
 * every other ray answers.
 */

const around = (radius: number, angle: number): Vec2 =>
  vec2(radius * Math.cos(angle), radius * Math.sin(angle));

/** A ring: a disc with a smaller disc taken out of it, the hole wound the other
 * way so the nonzero rule leaves it empty. */
const ring = (outer: number, inner: number): Path => [
  ...circle(vec2(0, 0), outer),
  ...arc(vec2(0, 0), inner, 0, -2 * Math.PI),
];

/** A diamond whose corner sits exactly on the ray leaving the origin. */
const diamond = polygon([vec2(1, 0), vec2(0, 1), vec2(-1, 0), vec2(0, -1)]);

describe('whether a path holds a point', () => {
  it('decides both sides of a known radius', () => {
    const disc = circle(vec2(0, 0), 1);
    for (let step = 0; step < 16; step++) {
      const angle = (step / 16) * 2 * Math.PI;
      expect(containsPoint(disc, around(0.99, angle))).toBe(true);
      expect(containsPoint(disc, around(1.01, angle))).toBe(false);
    }
  });

  it('leaves the hole of a ring outside it', () => {
    const shape = ring(1, 0.5);
    for (let step = 0; step < 16; step++) {
      const angle = (step / 16) * 2 * Math.PI;
      expect(containsPoint(shape, around(0.25, angle))).toBe(false);
      expect(containsPoint(shape, around(0.75, angle))).toBe(true);
      expect(containsPoint(shape, around(1.5, angle))).toBe(false);
    }
  });

  it('answers a ray through a corner what it answers at every other angle', () => {
    for (let step = 0; step < 16; step++) {
      const turn = mat3.rotation((step / 16) * 2 * Math.PI);
      const turned = transformPath(diamond, turn);
      expect(containsPoint(turned, mat3.transformPoint(turn, vec2(0, 0)))).toBe(true);
      expect(containsPoint(turned, mat3.transformPoint(turn, vec2(-2, 0)))).toBe(false);
      expect(containsPoint(turned, mat3.transformPoint(turn, vec2(2, 0)))).toBe(false);
    }
  });

  it('flattens a curve no further from it than the tolerance asks', () => {
    const disc = circle(vec2(0, 0), 1);
    const loops = flattenPath(disc, { tolerance: 1e-4 });
    expect(loops.length).toBe(1);
    let worst = 0;
    for (const loop of loops) {
      for (let at = 1; at < loop.length; at++) {
        const middle = vec2.lerp(loop[at - 1], loop[at], 0.5);
        worst = Math.max(worst, Math.abs(Math.hypot(middle.x, middle.y) - 1));
      }
    }
    expect(worst).toBeLessThan(1e-4 + 2.8e-4);
  });

  it('stays well inside the point ceiling at the finest tolerance a figure asks for', () => {
    const points = flattenPath(circle(vec2(0, 0), 1), { tolerance: 1e-6 }).reduce(
      (sum, loop) => sum + loop.length,
      0
    );
    expect(points).toBeGreaterThan(4000);
    expect(points).toBeLessThan(4200);
    // The ceiling on a whole flattening is a million points, so this is the room
    // the ceiling leaves over the finest tolerance anything here asks for.
    expect(points * 200).toBeLessThan(1_000_000);
  });

  it('closes a subpath that was left open before it decides anything', () => {
    const halfMoon = arc(vec2(0, 0), 1, 0, Math.PI);
    expect(halfMoon[0].closed).toBe(false);
    expect(containsPoint(halfMoon, vec2(0, 0.5))).toBe(true);
    expect(containsPoint(halfMoon, vec2(0, -0.5))).toBe(false);
  });
});
