/**
 * Marks placed at points in space, which a camera turns into the flat nodes the
 * rest of this package already draws.
 *
 * Every builder here hands back a group, because a shape in space is not always
 * one shape on the page: a line running past the eye comes back as the pieces of
 * it the eye can see, and a shape wholly behind the eye comes back as a group
 * with no children, which flattens to no marks rather than to a mark of nothing.
 */
import { vec3, type Vec3 } from '../values/vec3.js';
import type { Vec2 } from '../values/vec2.js';
import { circle, polygon, polyline } from './path.js';
import { group, shape, text, type GroupNode, type Node, type Style, type TextOptions } from './node.js';
import type { Fill } from './mark.js';
import type { Camera3 } from './camera.js';

/** A run the eye can see, and whether it is all of what the author gave. */
type Run = { points: Vec2[]; whole: boolean };

/**
 * Where along a segment the near plane is crossed.
 *
 * Depth changes evenly along a segment, because lining the world up with the eye
 * moves and turns a point and never divides it, so the crossing is one division
 * rather than a search.
 */
function crossingAt(from: number, to: number, near: number): number {
  return (near - from) / (to - from);
}

/**
 * The pieces of a run of points in space that the eye can see, cut where they
 * cross the near plane.
 *
 * A point nearer the eye than the near plane has no place on the page: under a
 * perspective the divide flips its sign and puts it on the wrong side of the
 * frame, so the segment is cut rather than drawn to it.
 */
function visibleRuns(points: readonly Vec3[], camera: Camera3): Run[] {
  const near = camera.projection.near;
  const seen = points.map((point) => camera.project(point));
  const uncut = seen.every((point) => point.inFront);
  const runs: Run[] = [];
  let current: Vec2[] = [];

  for (let i = 0; i < points.length; i += 1) {
    const here = seen[i];
    if (here.inFront) {
      if (i > 0 && !seen[i - 1].inFront) {
        const along = crossingAt(seen[i - 1].depth, here.depth, near);
        current.push(camera.project(vec3.lerp(points[i - 1], points[i], along)).at);
      }
      current.push(here.at);
      continue;
    }
    if (i > 0 && seen[i - 1].inFront) {
      const along = crossingAt(seen[i - 1].depth, here.depth, near);
      current.push(camera.project(vec3.lerp(points[i - 1], points[i], along)).at);
    }
    if (current.length > 1) runs.push({ points: current, whole: false });
    current = [];
  }
  if (current.length > 1) runs.push({ points: current, whole: uncut });
  return runs;
}

export type Polyline3Options = Style & {
  /** Whether the last point joins back to the first. A run that the near plane
   * cut comes back open however this is set, since closing it would draw an edge
   * that is nowhere in the world. */
  close?: boolean;
};

/** A run of straight segments through points in space. */
export function polyline3(name: string, points: readonly Vec3[], camera: Camera3, options: Polyline3Options = {}): GroupNode {
  const { close = false, ...style } = options;
  const runs = visibleRuns(points, camera);
  return group(
    name,
    runs.map((run) =>
      shape('run', close && run.whole ? polygon(run.points) : polyline(run.points), style),
    ),
  );
}

/** A disc marking a point in space. Its radius is in figure units and does not
 * shrink with distance, because a dot marks where something is rather than how
 * big it is. */
export function dot3(name: string, at: Vec3, radius: number, fill: Fill, camera: Camera3): GroupNode {
  const seen = camera.project(at);
  return group(name, seen.inFront ? [shape('disc', circle(seen.at, radius), { fill })] : []);
}

/** A label at a point in space. The letters stay upright and stay the size they
 * are given, since a label is read rather than seen in perspective. */
export function text3(
  name: string,
  at: Vec3,
  content: string,
  size: number,
  camera: Camera3,
  options: TextOptions = {},
): GroupNode {
  const seen = camera.project(at);
  return group(name, seen.inFront ? [text('label', seen.at, content, size, options)] : []);
}

/** A drawn piece and the points in space it was drawn from, which are what say
 * how far off it is. */
export type SpaceItem = {
  points: readonly Vec3[];
  node: Node;
};

/**
 * The mean of a piece's own depths, so a piece is ordered by where its middle is
 * rather than by whichever corner happens to be nearest.
 */
function middleDepth(points: readonly Vec3[], camera: Camera3): number {
  if (points.length === 0) return 0;
  let total = 0;
  for (const point of points) total += camera.project(point).depth;
  return total / points.length;
}

/**
 * A group whose children are ordered back to front, so the near piece is painted
 * over the far one.
 *
 * This is the painter's algorithm, and what it cannot do is worth knowing before
 * it is used: two pieces that pass through each other, and three that overlap in
 * a ring, have no one order at all, and no comparison of depths can find one. The
 * answer for those is smaller pieces, which is why a surface is cut into cells.
 *
 * Two pieces at the same depth keep the order the author gave them, since the
 * sort is stable, and a picture that changed which of two touching faces was on
 * top between frames would flicker.
 */
export function space(name: string, items: readonly SpaceItem[], camera: Camera3): GroupNode {
  const measured = items.map((item) => ({ node: item.node, depth: middleDepth(item.points, camera) }));
  measured.sort((a, b) => b.depth - a.depth);
  return group(name, measured.map((item) => item.node));
}
