import { describe, expect, it } from 'vitest';
import { camera3, orthographic, perspective, vec3 } from '@altpsyche/maths';

/**
 * A figure's camera, checked at poses whose answers can be read by hand: an eye
 * on the z axis looking back at the origin, and an eye on the x axis, where the
 * corners of a unit cube land on numbers a reader can work out without running
 * anything.
 */

const CORNERS = [-0.5, 0.5].flatMap((x) => [-0.5, 0.5].flatMap((y) => [-0.5, 0.5].map((z) => vec3(x, y, z))));

describe('camera3', () => {
  it('places a unit cube by its own x and y from an eye down the z axis', () => {
    const camera = camera3({ eye: vec3(0, 0, 5), target: vec3(0, 0, 0), projection: orthographic() });
    expect(CORNERS).toHaveLength(8);
    for (const corner of CORNERS) {
      const seen = camera.project(corner);
      expect(Math.abs(seen.at.x - corner.x)).toBeLessThan(1e-12);
      expect(Math.abs(seen.at.y - corner.y)).toBeLessThan(1e-12);
      expect(Math.abs(seen.depth - (5 - corner.z))).toBeLessThan(1e-12);
      expect(seen.inFront).toBe(true);
    }
  });

  it('places a unit cube across and up from an eye down the x axis', () => {
    const camera = camera3({ eye: vec3(5, 0, 0), target: vec3(0, 0, 0), projection: orthographic() });
    for (const corner of CORNERS) {
      const seen = camera.project(corner);
      expect(Math.abs(seen.at.x - -corner.z)).toBeLessThan(1e-12);
      expect(Math.abs(seen.at.y - corner.y)).toBeLessThan(1e-12);
      expect(Math.abs(seen.depth - (5 - corner.x))).toBeLessThan(1e-12);
    }
  });

  it('grows what an orthographic eye sees by its scale alone', () => {
    const camera = camera3({ eye: vec3(0, 0, 5), target: vec3(0, 0, 0), projection: orthographic({ scale: 3 }) });
    const near = camera.project(vec3(2, 1, 0));
    const far = camera.project(vec3(2, 1, -100));
    expect(Math.abs(near.at.x - 6)).toBeLessThan(1e-12);
    expect(Math.abs(near.at.y - 3)).toBeLessThan(1e-12);
    expect(Math.abs(far.at.x - near.at.x)).toBeLessThan(1e-12);
    expect(Math.abs(far.at.y - near.at.y)).toBeLessThan(1e-12);
  });

  it('sees nothing behind an orthographic eye, because nothing is behind one', () => {
    const camera = camera3({ eye: vec3(0, 0, 5), target: vec3(0, 0, 0), projection: orthographic() });
    const behind = camera.project(vec3(1, 1, 9));
    expect(behind.inFront).toBe(true);
    expect(behind.depth).toBeLessThan(0);
    expect(Math.abs(behind.at.x - 1)).toBeLessThan(1e-12);
  });

  it('fills the frame it is given the height of', () => {
    const camera = camera3({
      eye: vec3(0, 0, 5),
      target: vec3(0, 0, 0),
      projection: perspective({ fov: Math.PI / 2, height: 10 }),
    });
    const seen = camera.project(vec3(1, 1, 0));
    expect(Math.abs(seen.at.x - 1)).toBeLessThan(1e-12);
    expect(Math.abs(seen.at.y - 1)).toBeLessThan(1e-12);
    expect(Math.abs(seen.depth - 5)).toBeLessThan(1e-12);
  });

  it('halves what a perspective eye sees at twice the distance', () => {
    const camera = camera3({
      eye: vec3(0, 0, 5),
      target: vec3(0, 0, 0),
      projection: perspective({ fov: Math.PI / 2, height: 10 }),
    });
    const near = camera.project(vec3(1, 1, 0));
    const far = camera.project(vec3(1, 1, -5));
    expect(Math.abs(far.depth - 2 * near.depth)).toBeLessThan(1e-12);
    expect(Math.abs(far.at.x - near.at.x / 2)).toBeLessThan(1e-12);
    expect(Math.abs(far.at.y - near.at.y / 2)).toBeLessThan(1e-12);
  });

  it('says a point behind a perspective eye is behind it', () => {
    const camera = camera3({
      eye: vec3(0, 0, 5),
      target: vec3(0, 0, 0),
      projection: perspective({ fov: Math.PI / 2, height: 10 }),
    });
    const front = camera.project(vec3(1, 1, 4));
    const behind = camera.project(vec3(1, 1, 6));
    expect(front.inFront).toBe(true);
    expect(behind.inFront).toBe(false);
    expect(Math.sign(behind.at.x)).toBe(-Math.sign(front.at.x));
    expect(Math.sign(behind.at.y)).toBe(-Math.sign(front.at.y));
  });

  it('keeps the matrix it lined the world up with', () => {
    const camera = camera3({ eye: vec3(3, 4, 5), target: vec3(0, 1, -1), projection: orthographic() });
    expect(camera.view).toHaveLength(16);
    expect(camera.eye).toEqual(vec3(3, 4, 5));
    expect(camera.up).toEqual(vec3(0, 1, 0));
    const seen = camera.project(camera.target);
    expect(Math.abs(seen.at.x)).toBeLessThan(1e-12);
    expect(Math.abs(seen.at.y)).toBeLessThan(1e-12);
    expect(Math.abs(seen.depth - Math.sqrt(54))).toBeLessThan(1e-12);
  });
});
