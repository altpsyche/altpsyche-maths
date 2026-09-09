import { describe, expect, it } from 'vitest';
import {
  resolveCamera,
  resolveProjection,
  vec3,
  type Camera3Record,
  type Expression,
} from '../index.js';
import { FRAMES, TIMES, alongAt, camera as record } from '../demos/surface.js';
import { eyeAt } from './solid-forms.js';

/** Places spread through the box the saddle stands in, which is what says two
 * cameras agree about more than the middle of the frame. */
const PLACES = [
  vec3(0, 0, 0),
  vec3(1.6, -1.2, 0.7),
  vec3(-2.1, 1.9, -0.6),
  vec3(2.4, 2.4, 1.4),
  vec3(-1.1, -2.3, 1.1),
];

describe('the camera as a stored choice', () => {
  it('places every point where the solid demo camera places it, at each of the four strip times', () => {
    expect(FRAMES).toHaveLength(4);
    for (const seconds of FRAMES) {
      const along = alongAt(seconds);
      const built = eyeAt(along);
      const mine = resolveCamera(record, { tracks: { turn: along } });
      for (const place of PLACES) {
        const one = built.project(place);
        const two = mine.project(place);
        expect(two.at.x).toBeCloseTo(one.at.x, 12);
        expect(two.at.y).toBeCloseTo(one.at.y, 12);
        expect(two.depth).toBeCloseTo(one.depth, 12);
        expect(two.inFront).toBe(one.inFront);
      }
    }
  });

  it('agrees at each of the solid demo four named times as well', () => {
    for (const seconds of Object.values(TIMES)) {
      const along = alongAt(seconds);
      const one = eyeAt(along).project(PLACES[3]);
      const two = resolveCamera(record, { tracks: { turn: along } }).project(PLACES[3]);
      expect(two.at.x).toBeCloseTo(one.at.x, 12);
      expect(two.at.y).toBeCloseTo(one.at.y, 12);
    }
  });

  it('turns the eye as the track turns, which is what says the pose is not fixed', () => {
    const quarter = resolveCamera(record, { tracks: { turn: 0.25 } });
    const start = resolveCamera(record, { tracks: { turn: 0 } });
    expect(start.eye.x).toBeCloseTo(4.6, 12);
    expect(start.eye.y).toBeCloseTo(0, 12);
    expect(quarter.eye.x).toBeCloseTo(0, 12);
    expect(quarter.eye.y).toBeCloseTo(4.6, 12);
    expect(start.eye.z).toBe(2.6);
  });

  it('takes a plain place in space, since a bare number is a literal', () => {
    const fixed = resolveCamera({ eye: vec3(3, 0, 0), target: vec3(0, 0, 0) });
    expect(fixed.eye).toEqual({ x: 3, y: 0, z: 0 });
    expect(fixed.up).toEqual({ x: 0, y: 1, z: 0 });
  });

  it('builds either projection from its own parameters', () => {
    const flat = resolveProjection({ kind: 'orthographic', scale: 2 });
    expect(flat.near).toBe(-Infinity);
    expect(flat.place(vec3(1.5, -0.5, -9))).toEqual({ x: 3, y: -1 });
    const deep = resolveProjection({ kind: 'perspective', near: 0.2 });
    expect(deep.near).toBe(0.2);
  });

  it('refuses a projection the set has no entry for', () => {
    expect(() => resolveProjection({ kind: 'fisheye' } as never)).toThrow(
      'a projection has no form called fisheye'
    );
  });

  it('refuses a place in space whose member reads as a point', () => {
    expect(() =>
      resolveCamera({ eye: { x: { kind: 'point', x: 1, y: 2 }, y: 0, z: 0 }, target: vec3(0, 0, 0) })
    ).toThrow("the x of a camera's eye is a number and was given a point");
  });
});
