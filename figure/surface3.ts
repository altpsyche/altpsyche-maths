/**
 * A surface given by a function of two parameters, drawn as a grid of cells.
 *
 * Cells rather than one shape is what makes the depth sort work at all: a
 * surface that folds over itself has no one place in a painting order, and
 * pieces small enough to be flat do.
 */
import { interval, type Interval } from '../values/interval.js';
import { vec3, type Vec3 } from '../values/vec3.js';
import type { Fill, Stroke } from './mark.js';
import type { Camera3 } from './camera.js';
import { cornersOf, stepsOf } from './grid.js';
import { polyline3, scene3, type SpaceItem } from './space.js';
import type { GroupNode } from './node.js';

export type Surface3Options = {
  /** The runs of the two parameters, nothing to one each unless named. */
  over?: { u?: Interval; v?: Interval };
  /** How many cells each way. */
  resolution?: number | { u: number; v: number };
  /**
   * The colour a cell is filled with, given how squarely it faces the light: one
   * where it faces the light head on, a half where it is edge on, and nothing
   * where it faces straight away.
   *
   * The author supplies this rather than naming two colours to mix, because
   * mixing two colours means reading them, and a colour here is any CSS colour
   * written as text with nothing that parses one.
   */
  shade: (amount: number) => Fill;
  /** Which way the light comes from, over the shoulder of an eye on the positive
   * z axis unless named. */
  light?: Vec3;
  /** Whether a cell facing away from the eye is left out. Off by default, because
   * a count that changes as the camera turns is a count no gate can hold. */
  cull?: boolean;
  stroke?: Stroke;
};

/**
 * The cells a surface is made of, before they are put in an order.
 *
 * Cells rather than one shape is what makes the depth sort work at all: a surface
 * that folds over itself has no one place in a painting order, and pieces small
 * enough to be flat do.
 *
 * A scene holding a surface and a plane that cuts through it has to sort all of
 * their cells together, since two surfaces sorted apart are two groups and the
 * second is painted over the first whichever way round they stand. Each cell
 * carries the name it was given ahead of its own place in the grid, so an
 * animation can still name a whole surface once its cells are mixed with
 * another's.
 */
export function surfaceCells(name: string, of: (u: number, v: number) => Vec3, camera: Camera3, options: Surface3Options): SpaceItem[] {
  const { over = {}, resolution = 24, shade, light = vec3(0, 0, 1), cull = false, stroke } = options;
  const u = over.u ?? interval(0, 1);
  const v = over.v ?? interval(0, 1);
  const steps = stepsOf(resolution, 'u', 'v');
  const grid = cornersOf(of, u, v, steps);
  const toLight = vec3.normalize(light);
  const items: SpaceItem[] = [];

  for (let i = 0; i < steps.u; i += 1) {
    for (let j = 0; j < steps.v; j += 1) {
      const corners = [grid[i][j], grid[i + 1][j], grid[i + 1][j + 1], grid[i][j + 1]];
      const normal = vec3.normalize(
        vec3.cross(vec3.sub(corners[1], corners[0]), vec3.sub(corners[3], corners[0])),
      );
      if (cull) {
        const middle = corners.reduce((sum, corner) => vec3.add(sum, vec3.scale(corner, 1 / 4)), vec3.ZERO);
        if (vec3.dot(normal, vec3.sub(camera.eye, middle)) <= 0) continue;
      }
      const fill = shade((vec3.dot(normal, toLight) + 1) / 2);
      items.push({
        points: corners,
        node: polyline3(`${name}/${i}-${j}`, corners, camera, { close: true, fill, stroke }),
      });
    }
  }

  return items;
}

/**
 * A surface given by a function of two parameters, drawn as a grid of
 * four-cornered cells ordered back to front.
 */
export function surface3(name: string, of: (u: number, v: number) => Vec3, camera: Camera3, options: Surface3Options): GroupNode {
  return scene3(name, surfaceCells('cell', of, camera, options), camera);
}
