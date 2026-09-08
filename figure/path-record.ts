/**
 * A path written as data: a named form with its parameters, or its cubics.
 *
 * The rule is that every path a figure carries is one of the two, and which of
 * them is a choice per figure rather than a rule. A named form is shorter and
 * says what the shape is, so a circle stays a centre and a radius rather than
 * four cubics a reader has to recognise. Cubics written out are what carries a
 * shape no named form describes.
 *
 * A path is already plain data, since a subpath is a point, a list of cubics and
 * whether it closes, so the written-out form names the path rather than
 * re-spelling it. `data` is the same shape as an SVG `d` attribute, which is
 * what lets a figure carry geometry another tool produced.
 *
 * `straight` has no form here. It hands back one `Cubic` rather than a path, and
 * a path written out as cubics already carries its controls, so a figure that
 * would reach for it uses `line` or writes the cubic out.
 */
import type { Vec2 } from '../values/vec2.js';
import { arc, circle, line, polygon, polyline, rect, type Path } from './path.js';
import { pathFromData } from './path-data.js';

/**
 * One path, named or written out.
 *
 * The angles an arc takes are `from` and `to` in radians, anticlockwise, the way
 * the call takes them.
 */
export type PathRecord =
  | { readonly kind: 'line'; readonly from: Vec2; readonly to: Vec2 }
  | { readonly kind: 'polyline'; readonly points: readonly Vec2[] }
  | { readonly kind: 'polygon'; readonly points: readonly Vec2[] }
  | { readonly kind: 'rect'; readonly corner: Vec2; readonly width: number; readonly height: number }
  | { readonly kind: 'circle'; readonly centre: Vec2; readonly radius: number }
  | {
      readonly kind: 'arc';
      readonly centre: Vec2;
      readonly radius: number;
      readonly from: number;
      readonly to: number;
    }
  | { readonly kind: 'data'; readonly d: string }
  | { readonly kind: 'cubics'; readonly subpaths: Path };

/**
 * The record resolved into the geometry it names.
 *
 * A form outside the set is refused with a sentence naming what was asked for,
 * the way an expression refuses a function it has no entry for. A figure read
 * from a file carries whatever the file says, so the check is at run time rather
 * than in the types alone.
 */
export function resolvePath(record: PathRecord): Path {
  switch (record.kind) {
    case 'line':
      return line(record.from, record.to);
    case 'polyline':
      return polyline(record.points);
    case 'polygon':
      return polygon(record.points);
    case 'rect':
      return rect(record.corner, record.width, record.height);
    case 'circle':
      return circle(record.centre, record.radius);
    case 'arc':
      return arc(record.centre, record.radius, record.from, record.to);
    case 'data':
      return pathFromData(record.d);
    case 'cubics':
      return record.subpaths;
  }
  throw new Error(`a path has no form called ${String((record as { kind?: unknown }).kind)}`);
}
