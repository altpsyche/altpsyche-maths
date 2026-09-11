/**
 * A path as triangles, which is what a card draws.
 *
 * The other two painters hand a path to something that fills it and something
 * that widens it: the SVG painter to the browser, the canvas painter to its
 * context. A card has neither and takes triangles, so the work those two
 * delegate is done here, for a fill and for a stroke alike.
 *
 * The path is flattened to a tolerance and each ring is cut into triangles by
 * ear clipping, which is the published technique for a simple polygon. A ring
 * whose inside the fill rule calls empty is a hole, and a hole is joined into
 * the ring around it by the shortest bridge that crosses no edge, which is what
 * lets one ear clipping cover a shape with a hole.
 *
 * Nothing here needs a device, so how many triangles a figure is and how much
 * area they cover are held by the suite rather than by a gate.
 */
import { interval } from '../values/interval.js';
import { vec2, type Vec2 } from '../values/vec2.js';
import type { Bounds } from './bounds.js';
import { dashPath } from './dash.js';
import { flattenPath, windingAt } from './inside.js';
import { outlinePath } from './outline.js';
import type { Stroke } from './mark.js';
import type { Path } from './path.js';

export interface TriangleOptions {
  /** How far a straight run may sit from the curve it stands for, in the
   * picture's own units. */
  readonly tolerance?: number;
  /** How a shape decides what is inside, which is the rule the mark's own fill
   * carries. */
  readonly rule?: 'nonzero' | 'evenodd';
}

/** A fifth of a pixel at the hundred pixels to the unit a figure is drawn at,
 * which is under what a screen resolves and over what a curve needs to look
 * straight. */
const TOLERANCE = 0.002;

/** Below this a ring encloses nothing, and a ring enclosing nothing has no
 * triangles and no inside to test. */
const FLAT = 1e-18;

function signedArea(ring: readonly Vec2[]): number {
  let sum = 0;
  for (let at = 0; at < ring.length; at += 1) {
    const one = ring[at];
    const next = ring[(at + 1) % ring.length];
    sum += one.x * next.y - next.x * one.y;
  }
  return sum / 2;
}

/** Which side of the run from one point to another a third point falls on,
 * positive to the left of it. */
function leftOf(from: Vec2, to: Vec2, point: Vec2): number {
  return (to.x - from.x) * (point.y - from.y) - (point.x - from.x) * (to.y - from.y);
}

/**
 * How many times a ray heading in the positive x direction crosses the loops,
 * counted without their direction.
 *
 * The even-odd rule needs the count and the nonzero rule needs the winding, and
 * the two answer differently for a ring inside another wound the same way. An
 * edge is counted at its lower end and not at its upper one, which is what makes
 * a ray leaving through a corner answer what every other ray answers.
 */
function crossings(loops: readonly (readonly Vec2[])[], point: Vec2): number {
  let count = 0;
  for (const loop of loops) {
    for (let at = 1; at < loop.length; at += 1) {
      const from = loop[at - 1];
      const to = loop[at];
      if (from.y <= point.y) {
        if (to.y > point.y && leftOf(from, to, point) > 0) count += 1;
      } else if (to.y <= point.y && leftOf(from, to, point) < 0) count += 1;
    }
  }
  return count;
}

/** Whether a point is inside one ring, by the count of crossings alone, which is
 * what nesting is decided by whichever rule the fill names. */
function within(ring: readonly Vec2[], point: Vec2): boolean {
  return crossings([[...ring, ring[0]]], point) % 2 === 1;
}

function same(one: Vec2, two: Vec2): boolean {
  return one.x === two.x && one.y === two.y;
}

function inTriangle(a: Vec2, b: Vec2, c: Vec2, point: Vec2): boolean {
  return leftOf(a, b, point) >= 0 && leftOf(b, c, point) >= 0 && leftOf(c, a, point) >= 0;
}

/** Whether two segments cross at a point that is not an end of either, which is
 * the only crossing that stops a bridge. */
function crosses(a: Vec2, b: Vec2, c: Vec2, d: Vec2): boolean {
  const one = leftOf(a, b, c);
  const two = leftOf(a, b, d);
  const three = leftOf(c, d, a);
  const four = leftOf(c, d, b);
  return (
    ((one > 0 && two < 0) || (one < 0 && two > 0)) &&
    ((three > 0 && four < 0) || (three < 0 && four > 0))
  );
}

/**
 * A ring with its repeated points and its spurs taken out.
 *
 * A glyph often walks out along a line and straight back, which encloses
 * nothing and leaves the ring with a corner the shape does not have. Ear
 * clipping would cut a triangle at that corner and cover area outside the fill,
 * so the tip and the point it doubles back to are dropped first.
 */
function pruned(ring: readonly Vec2[]): Vec2[] {
  const points = ring.filter((point, at) => !same(point, ring[(at + 1) % ring.length]));
  let spur = true;
  while (spur && points.length > 3) {
    spur = false;
    for (let at = 0; at < points.length; at += 1) {
      const before = (at - 1 + points.length) % points.length;
      const after = (at + 1) % points.length;
      if (!same(points[before], points[after])) continue;
      const dropped = new Set([at, after]);
      points.splice(0, points.length, ...points.filter((_, index) => !dropped.has(index)));
      spur = true;
      break;
    }
  }
  return points;
}

/**
 * A point inside a ring and just inside its edge.
 *
 * The vertex furthest to the left is convex whatever the ring's shape, so a
 * point a short way from it toward the middle of the triangle it makes with its
 * neighbours is inside the ring. It is taken close to that vertex rather than at
 * the middle because what a fill rule is asked about is the region this ring
 * bounds, and the middle of a ring with something inside it falls in whatever is
 * inside instead.
 */
function insidePoint(ring: readonly Vec2[]): Vec2 | undefined {
  let corner = 0;
  for (let at = 1; at < ring.length; at += 1) {
    if (ring[at].x < ring[corner].x || (ring[at].x === ring[corner].x && ring[at].y < ring[corner].y)) {
      corner = at;
    }
  }
  const prev = ring[(corner - 1 + ring.length) % ring.length];
  const here = ring[corner];
  const next = ring[(corner + 1) % ring.length];
  const middle = vec2((prev.x + here.x + next.x) / 3, (prev.y + here.y + next.y) / 3);
  for (const along of [1e-3, 1e-2, 0.1, 1]) {
    const point = vec2.lerp(here, middle, along);
    if (within(ring, point)) return point;
  }
  for (let at = 0; at < ring.length; at += 1) {
    if (at === corner) continue;
    const between = vec2.lerp(here, ring[at], 0.5);
    if (within(ring, between)) return between;
  }
  return undefined;
}

/**
 * One simple polygon cut into triangles, an ear at a time.
 *
 * An ear is a convex vertex whose triangle holds no other vertex, and cutting
 * one leaves a polygon one vertex smaller. A ring that crosses itself has no ear
 * to cut at some point in the walk, and what is left of it is dropped rather
 * than searched for forever.
 */
function earClip(polygon: readonly Vec2[], into: Vec2[]): void {
  const left = polygon.map((_, at) => at);
  while (left.length > 3) {
    let cut = false;
    for (let at = 0; at < left.length; at += 1) {
      const before = left[(at - 1 + left.length) % left.length];
      const middle = left[at];
      const after = left[(at + 1) % left.length];
      const a = polygon[before];
      const b = polygon[middle];
      const c = polygon[after];
      if (leftOf(a, b, c) <= 0) continue;
      let held = false;
      for (const other of left) {
        if (other === before || other === middle || other === after) continue;
        const point = polygon[other];
        // A bridge into a hole puts two vertices at the same place, and a copy of
        // a corner of the ear sits on the ear rather than in it.
        if (same(point, a) || same(point, b) || same(point, c)) continue;
        if (inTriangle(a, b, c, point)) {
          held = true;
          break;
        }
      }
      if (held) continue;
      into.push(a, b, c);
      left.splice(at, 1);
      cut = true;
      break;
    }
    if (!cut) return;
  }
  if (left.length === 3) into.push(polygon[left[0]], polygon[left[1]], polygon[left[2]]);
}

/** The shortest join from a ring to a hole inside it that crosses no edge of
 * either and none of whatever else is still to be joined. */
function bridged(
  outer: readonly Vec2[],
  hole: readonly Vec2[],
  blockers: readonly (readonly Vec2[])[]
): Vec2[] | undefined {
  const edges = [outer, hole, ...blockers];
  let shortest = Infinity;
  let join: { outer: number; hole: number } | undefined;
  for (let one = 0; one < outer.length; one += 1) {
    for (let two = 0; two < hole.length; two += 1) {
      const span = vec2.distance(outer[one], hole[two]);
      if (span >= shortest) continue;
      let blocked = false;
      for (const ring of edges) {
        for (let at = 0; at < ring.length && !blocked; at += 1) {
          blocked = crosses(outer[one], hole[two], ring[at], ring[(at + 1) % ring.length]);
        }
        if (blocked) break;
      }
      if (blocked) continue;
      shortest = span;
      join = { outer: one, hole: two };
    }
  }
  if (!join) return undefined;
  return [
    ...outer.slice(0, join.outer + 1),
    ...hole.slice(join.hole),
    ...hole.slice(0, join.hole + 1),
    ...outer.slice(join.outer),
  ];
}

/** A ring wound the way the clipping wants it, counter-clockwise for a ring and
 * clockwise for a hole, so a bridged polygon stays simple. */
function wound(ring: readonly Vec2[], anticlockwise: boolean): Vec2[] {
  const area = signedArea(ring);
  return area < 0 === anticlockwise ? [...ring].reverse() : [...ring];
}

/**
 * A filled path as triangles, three corners to a triangle, in the picture's own
 * units.
 *
 * The corners are the fill's own geometry with no view applied, since a painter
 * carries the view into the coordinates it writes and a recording of a figure
 * whose view moves needs the triangles at each frame's own matrix.
 */
export function trianglesOf(path: Path, options: TriangleOptions = {}): Vec2[] {
  const loops = flattenPath(path, { tolerance: options.tolerance ?? TOLERANCE });
  const rings: Vec2[][] = [];
  for (const loop of loops) {
    // A flattening closes every loop by repeating its first point, which a ring
    // counts once.
    const ring = pruned(loop.slice(0, -1));
    if (ring.length >= 3 && Math.abs(signedArea(ring)) > FLAT) rings.push(ring);
  }
  if (rings.length === 0) return [];

  const closed = rings.map((ring) => [...ring, ring[0]]);
  const evenOdd = options.rule === 'evenodd';
  const outers: Vec2[][] = [];
  const holes: Vec2[][] = [];
  for (let at = 0; at < rings.length; at += 1) {
    const ring = rings[at];
    const point = insidePoint(ring);
    if (!point) continue;
    // The rule is read off the other rings and the ring's own direction rather
    // than off every ring together. The point sits a hair inside this ring's own
    // edge, where a crossing count is undefined, and a ring's signed area gives
    // the same answer for itself exactly.
    const others = closed.filter((_, other) => other !== at);
    const own = signedArea(ring) > 0 ? 1 : -1;
    const filled = evenOdd
      ? (crossings(others, point) + 1) % 2 === 1
      : windingAt(others, point) + own !== 0;
    (filled ? outers : holes).push(ring);
  }

  // A ring inside a filled ring is covered by that ring's own triangles already,
  // and cutting it as well would draw its area twice, which a mark under full
  // opacity shows and an opaque one hides.
  const drawn = outers.filter((ring) => {
    const point = insidePoint(ring);
    if (!point) return false;
    let holder: Vec2[] | undefined;
    let smallest = Infinity;
    for (const other of [...outers, ...holes]) {
      if (other === ring) continue;
      const area = Math.abs(signedArea(other));
      if (area >= smallest || !within(other, point)) continue;
      holder = other;
      smallest = area;
    }
    return !holder || !outers.includes(holder);
  });

  // A hole belongs to the smallest ring around it, since a ring inside another
  // ring holds whatever falls in both.
  const inside = new Map<Vec2[], Vec2[][]>(drawn.map((ring) => [ring, []]));
  for (const hole of holes) {
    const point = insidePoint(hole);
    if (!point) continue;
    let holder: Vec2[] | undefined;
    let smallest = Infinity;
    for (const ring of drawn) {
      const area = Math.abs(signedArea(ring));
      if (area >= smallest || !within(ring, point)) continue;
      holder = ring;
      smallest = area;
    }
    if (holder) inside.get(holder)?.push(hole);
  }

  const triangles: Vec2[] = [];
  for (const ring of drawn) {
    const cut = inside.get(ring) ?? [];
    let polygon = wound(ring, true);
    // The rightmost hole first, which is the order the bridges are least likely
    // to have to cross one another in.
    const waiting = cut
      .map((hole) => wound(hole, false))
      .sort((one, two) => Math.max(...two.map((p) => p.x)) - Math.max(...one.map((p) => p.x)));
    while (waiting.length > 0) {
      const hole = waiting.shift() as Vec2[];
      const merged = bridged(polygon, hole, waiting);
      if (merged) polygon = merged;
    }
    earClip(polygon, triangles);
  }
  return triangles;
}

/**
 * A stroked path as triangles, three corners to a triangle, in the picture's own
 * units.
 *
 * The stroke is widened into the outline it covers and that outline is cut like
 * any other fill. Its rule is the nonzero one whatever rule the mark's own fill
 * carries: a closed subpath leaves two loops wound against each other, and the
 * nonzero rule is what reads those as a ring rather than as a disc.
 *
 * A dash is cut into the path before it is widened, so each run carries the
 * stroke's own cap at both of its ends the way a run the platform cuts does.
 *
 * A tapered width is a fraction of the whole path's length, so cutting the path
 * into runs first would restart the taper at each one. A tapered stroke is
 * widened solid and its dash is left out, which is what the other painters draw
 * too: `outlinedMarks` turns a taper into a fill and the dash goes with the
 * stroke it named.
 *
 * A zero-length subpath under a butt cap has no outline and no triangles, which
 * is the SVG specification's rule and what both other painters draw there.
 */
export function strokeTrianglesOf(path: Path, stroke: Stroke, options: TriangleOptions = {}): Vec2[] {
  const runs =
    stroke.dash && typeof stroke.width === 'number'
      ? dashPath(path, stroke.dash, stroke.dashOffset)
      : path;
  const outline = outlinePath(runs, stroke.width, {
    cap: stroke.cap,
    join: stroke.join,
    tolerance: options.tolerance,
  });
  return trianglesOf(outline, { tolerance: options.tolerance, rule: 'nonzero' });
}

/**
 * One convex polygon cut back to the inside of one half plane, which is one pass
 * of Sutherland and Hodgman's algorithm.
 *
 * How far inside a corner sits is the number `inside` hands back, positive
 * within the half plane, so the crossing along an edge leaving the half plane is
 * the fraction that number falls to nothing at. A corner on the boundary is
 * kept and starts no crossing, which is what keeps a polygon lying along the
 * boundary from gaining a corner per pass.
 */
function halfPlane(polygon: readonly Vec2[], inside: (point: Vec2) => number): Vec2[] {
  const kept: Vec2[] = [];
  for (let at = 0; at < polygon.length; at += 1) {
    const here = polygon[at];
    const next = polygon[(at + 1) % polygon.length];
    const depth = inside(here);
    const beyond = inside(next);
    if (depth >= 0) kept.push(here);
    if ((depth > 0 && beyond < 0) || (depth < 0 && beyond > 0)) {
      kept.push(vec2.lerp(here, next, depth / (depth - beyond)));
    }
  }
  return kept;
}

/**
 * A list of triangles cut back to a rectangle, three corners to a triangle.
 *
 * A clip is a rectangle and the engine names no scissor test, so the rectangle
 * is cut into the geometry before it is handed over. Sutherland and Hodgman's
 * algorithm clips a convex polygon against a convex boundary, and a rectangle is
 * four half planes taken in turn. A triangle cut against them leaves a convex
 * polygon of up to seven corners, which is a fan of triangles from any one of
 * them.
 *
 * A rectangle given either way round on either axis names the same box, which is
 * what an axis counting down the screen leaves.
 */
export function clipTriangles(corners: readonly Vec2[], box: Bounds): Vec2[] {
  const across = interval.ordered(box.x);
  const up = interval.ordered(box.y);
  const sides: ((point: Vec2) => number)[] = [
    (point) => point.x - across.from,
    (point) => across.to - point.x,
    (point) => point.y - up.from,
    (point) => up.to - point.y,
  ];

  const clipped: Vec2[] = [];
  for (let at = 0; at + 2 < corners.length; at += 3) {
    let polygon: Vec2[] = [corners[at], corners[at + 1], corners[at + 2]];
    for (const inside of sides) {
      polygon = halfPlane(polygon, inside);
      if (polygon.length < 3) break;
    }
    for (let corner = 1; corner + 1 < polygon.length; corner += 1) {
      clipped.push(polygon[0], polygon[corner], polygon[corner + 1]);
    }
  }
  return clipped;
}

/** How much area a list of triangles covers, which is what a triangulation is
 * held to. */
export function triangleArea(corners: readonly Vec2[]): number {
  let sum = 0;
  for (let at = 0; at + 2 < corners.length; at += 3) {
    sum += Math.abs(leftOf(corners[at], corners[at + 1], corners[at + 2])) / 2;
  }
  return sum;
}
