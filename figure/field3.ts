/**
 * A field of vectors in space, drawn as an arrow at every sample.
 *
 * An arrow is measured in the world's own units rather than the figure's, unlike
 * the arrows of a flat field, because a length in space is what perspective is
 * for. Its head stays in figure units, since the head is drawn on the page.
 */
import { interval, type Interval } from '../values/interval.js';
import { vec3, type Vec3 } from '../values/vec3.js';
import type { Colour } from './mark.js';
import type { ArrowOptions } from './annotate.js';
import type { Camera3 } from './camera.js';
import { stepsOf } from './grid.js';
import { arrow3, scene3, type SpaceItem } from './space.js';
import type { GroupNode } from './node.js';

export type VectorField3Options = ArrowOptions & {
  /** The box the samples are taken in, nothing to one each way unless named. */
  over?: { x?: Interval; y?: Interval; z?: Interval };
  /** How many samples each way. One number is all three. */
  resolution?: number | { x: number; y: number; z: number };
  /** How long an arrow is, in the world's own units, from the magnitude of the
   * vector at its own sample. */
  lengthOf: (magnitude: number) => number;
  /** What colour an arrow is, from that same magnitude. */
  colourFor: (magnitude: number) => Colour;
};

/**
 * The arrows of a field sampled over a box in space, and the points each was
 * drawn from, for a figure that sorts them among pieces of its own.
 *
 * An arrow is measured in the world's own units rather than the figure's, unlike
 * the arrows of a flat field, because a length in space is what perspective is
 * for: a far arrow drawing shorter than a near one of the same magnitude is what
 * says which is far. Its head is still in figure units, since the head is drawn
 * on the page.
 *
 * A sample sits at the middle of its cell and the count is fixed by the
 * resolution, so a gate can hold it as the eye moves. A sample whose vector is
 * nothing draws no arrow there.
 */
export function fieldArrows3(
  name: string,
  of: (at: Vec3) => Vec3,
  camera: Camera3,
  options: VectorField3Options,
): SpaceItem[] {
  const { over = {}, resolution = 6, lengthOf, colourFor, ...rest } = options;
  const box = {
    x: interval.ordered(over.x ?? interval(0, 1)),
    y: interval.ordered(over.y ?? interval(0, 1)),
    z: interval.ordered(over.z ?? interval(0, 1)),
  };
  const steps = stepsOf(resolution, 'x', 'y', 'z');
  const items: SpaceItem[] = [];

  for (let i = 0; i < steps.x; i += 1) {
    for (let j = 0; j < steps.y; j += 1) {
      for (let k = 0; k < steps.z; k += 1) {
        const from = vec3(
          interval.at(box.x, (i + 0.5) / steps.x),
          interval.at(box.y, (j + 0.5) / steps.y),
          interval.at(box.z, (k + 0.5) / steps.z),
        );
        const vector = of(from);
        const magnitude = vec3.magnitude(vector);
        const length = lengthOf(magnitude);
        if (!(magnitude > 0) || !Number.isFinite(length) || !(length > 0)) continue;

        const to = vec3.add(from, vec3.scale(vector, length / magnitude));
        items.push({
          points: [from, to],
          node: arrow3(`${name}/${i}-${j}-${k}`, from, to, camera, {
            ...rest,
            stroke: { ...rest.stroke, colour: colourFor(magnitude) },
          }),
        });
      }
    }
  }

  return items;
}

/** A field of vectors in space, drawn as arrows ordered back to front. */
export function vectorField3(
  name: string,
  of: (at: Vec3) => Vec3,
  camera: Camera3,
  options: VectorField3Options,
): GroupNode {
  return scene3(name, fieldArrows3('arrow', of, camera, options), camera);
}
