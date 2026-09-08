/**
 * A field of vectors sampled over a graph and drawn as one arrow per sample.
 *
 * Nothing here stores a field. A field is a function from a place to a vector,
 * so what this adds is where it is read and how what it reads is drawn.
 *
 * How long an arrow is and what colour it is are both the author's, taken from
 * the vector's own magnitude. A field drawn at its true lengths is unreadable
 * the moment two samples differ by a factor of ten, and choosing the scale needs
 * numbers about the picture this package does not have.
 *
 * The count is fixed by the resolution and never by the field, so a gate can
 * hold it. The one sample that draws nothing is the one whose vector is nothing,
 * and the count is what says where that happened.
 */
import { interval, type Interval } from '../values/interval.js';
import { vec2, type Vec2 } from '../values/vec2.js';
import { pointOf, type Coords } from './scale.js';
import { stepsOf } from './grid.js';
import { group, type GroupNode } from './node.js';
import { arrow } from './annotate.js';
import type { Colour } from './mark.js';

export interface VectorFieldOptions {
  /** How long an arrow is, in figure units, from the magnitude of the vector at
   * its own sample. */
  lengthOf: (magnitude: number) => number;
  /** What colour an arrow is, from that same magnitude. */
  colourFor: (magnitude: number) => Colour;
  /** How wide a shaft is, in figure units, like any other stroke here. */
  width: number;
  /** How many samples across and up. One number is both. */
  resolution?: number | { x: number; y: number };
  /** The runs sampled, each the whole of the graph that way where it is left
   * out. */
  over?: { x?: Interval; y?: Interval };
  /** How long a head is, in figure units. Four times the shaft's width unless
   * named, which is what an arrow takes when nothing says. */
  head?: number;
  /** How wide a head is across its base, against its length. */
  spread?: number;
}

/**
 * The arrows of a field over a graph, one group per sample, named by its column
 * and row so a stagger can reach them one at a time.
 *
 * A sample sits at the middle of its cell rather than on the grid line. An
 * inclusive grid would put the arrows of the outer row and column half outside
 * the graph, where a painter has to clip them.
 *
 * An arrow points where the mapping of its own vector points, so it lies along
 * the curves drawn over the same coordinates. Taking the direction in graph
 * units instead would tilt every arrow wherever the two axes count at different
 * rates.
 *
 * Its length is in figure units, like the width of its shaft and the length of
 * its head. A length in graph units under two axes counting at different rates
 * would draw the arrows pointing one way several times shorter than the arrows
 * pointing the other, at the same magnitude.
 */
export function vectorField(
  name: string,
  coords: Coords,
  of: (at: Vec2) => Vec2,
  options: VectorFieldOptions
): GroupNode {
  const steps = stepsOf(options.resolution ?? 12, 'x', 'y');
  const over = options.over ?? {};
  const overX = interval.ordered(over.x ?? coords.x.graph);
  const overY = interval.ordered(over.y ?? coords.y.graph);
  const children = [];

  for (let column = 0; column < steps.x; column += 1) {
    for (let row = 0; row < steps.y; row += 1) {
      const x = interval.at(overX, (column + 0.5) / steps.x);
      const y = interval.at(overY, (row + 0.5) / steps.y);
      const vector = of(vec2(x, y));
      const magnitude = Math.hypot(vector.x, vector.y);
      const length = options.lengthOf(magnitude);
      if (!(magnitude > 0) || !Number.isFinite(length) || !(length > 0)) continue;

      const from = pointOf(coords, x, y);
      const along = vec2.sub(pointOf(coords, x + vector.x, y + vector.y), from);
      if (!(vec2.magnitude(along) > 0)) continue;
      const to = vec2.add(from, vec2.scale(vec2.normalize(along), length));
      children.push(
        arrow(`${column}-${row}`, from, to, {
          stroke: { colour: options.colourFor(magnitude), width: options.width },
          head: options.head,
          spread: options.spread,
        })
      );
    }
  }

  return group(name, children);
}
