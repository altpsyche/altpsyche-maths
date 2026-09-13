/**
 * The order a painter draws a list of marks in, for a painter with no depth
 * buffer.
 *
 * Where two marks carrying a depth overlap on the page, the nearer of the two at
 * a point is drawn over the further one there, whatever order the list gives. A
 * painter that paints whole marks one after another cannot meet that rule as it
 * stands, so the geometry is cut before it is painted: two depths are equal along
 * a straight line on the page, because the difference of two affine functions is
 * affine and its zero set is a line, and a mark cut by that line has one depth
 * order against everything it overlaps.
 *
 * A mark carrying no depth clears the depths before it, so the list is a run of
 * stretches and each stretch is cut and ordered on its own.
 *
 * A cell of a mesh and a curve lying on that cell are the two shapes this is
 * for. The cell and the curve are at the same depth, which is the tie no sort of
 * whole marks can break, and the builder that drew the curve moved it toward the
 * eye by the flatness of the cell so that the comparison has an answer.
 */
import { interval } from '../values/interval.js';
import { vec2, type Vec2 } from '../values/vec2.js';
import { boundsOf, grownBy, overlapOf, type Bounds } from './bounds.js';
import { depthAt } from './depth.js';
import { lengthOf } from './length.js';
import type { Depth, Mark, PathMark } from './mark.js';
import { splitCurve, type Cubic, type Path, type Subpath } from './path.js';
import { widestWidth } from './width.js';

/** How small a difference of two depths counts as none, against the larger of
 * the two being compared. Two marks at one depth are drawn in the order the list
 * gives, which is what puts a curve lying on a surface over the surface. */
const LEVEL = 1e-12;

/** How near a control value is to the line through its two ends before the
 * difference along the piece is read as straight, which is what a segment
 * written as a straight run gives. */
const STRAIGHT = 1e-12;

/** How far the halving goes before the crossing it has cornered is answered,
 * as a fraction of the piece. */
const SHARP = 1e-12;

/**
 * The ground a mark covers, as the smallest convex shape holding it.
 *
 * Two marks whose boxes meet need not meet at all, and two cells of one mesh
 * sharing an edge are the case that matters: an order between two shapes that
 * never meet is an order about nothing, and enough of them together can run in a
 * ring that no order of the whole list satisfies. The hull is bigger than the
 * mark inside it, so a pair it says miss each other really do.
 */
interface Reach {
  /** The corners of the hull, anticlockwise. */
  readonly corners: readonly Vec2[];
  /** How far the ink stands outside them, which is half a stroke's width. */
  readonly pad: number;
}

/** A piece of a mark, with the one depth it carries and the box it covers. */
interface Piece {
  readonly mark: Mark;
  readonly depth: Depth;
  /** Where on the page it is, with its stroke's width and its clip taken in, or
   * nothing where it covers nothing. */
  readonly box: Bounds | null;
  /** A place the piece covers, which is where the sign of a difference of depths
   * is read first. */
  readonly where: Vec2;
  /** The ground it covers, which says whether it meets another piece at all and
   * holds the points the sign of a difference is read over. */
  readonly reach: Reach;
  /** Where the mark it came from stood in the list, which is what decides the
   * order of two pieces at one depth. */
  readonly at: number;
}

/** The difference of two depths, which is the affine function whose zero set is
 * the line the two are equal along. */
function between(one: Depth, other: Depth): Depth {
  return { a: one.a - other.a, b: one.b - other.b, c: one.c - other.c };
}

/** Every point a path is written from. A cubic lies inside the hull of its four
 * points, so the hull of these holds the whole of the path. */
function pointsOf(path: Path, into: Vec2[]): Vec2[] {
  for (const subpath of path) {
    into.push(subpath.start);
    for (const curve of subpath.curves) {
      into.push(curve.control1, curve.control2, curve.to);
    }
  }
  return into;
}

/**
 * The ground a mark covers, by Andrew's monotone chain.
 *
 * The points are sorted and the lower and upper sides of the hull are walked in
 * turn, each turning the same way, which is the hull in one pass over the sorted
 * points. A mark written from one or two points keeps them, since a shape with no
 * area still has ink where a stroke gives it width.
 */
function reachOf(mark: Mark): Reach {
  const pad = mark.kind === 'path' && mark.stroke ? widestWidth(mark.stroke.width) / 2 : 0;
  const points = mark.kind === 'text' ? [mark.at] : pointsOf(mark.path, []);
  return { corners: hullOf(points), pad };
}

function hullOf(points: readonly Vec2[]): readonly Vec2[] {
  if (points.length < 3) return points;
  const sorted = [...points].sort((one, other) => (one.x !== other.x ? one.x - other.x : one.y - other.y));
  const turn = (from: Vec2, through: Vec2, to: Vec2) =>
    (through.x - from.x) * (to.y - from.y) - (through.y - from.y) * (to.x - from.x);
  const half = (walk: readonly Vec2[]): Vec2[] => {
    const side: Vec2[] = [];
    for (const point of walk) {
      while (side.length >= 2 && turn(side[side.length - 2], side[side.length - 1], point) <= 0) side.pop();
      side.push(point);
    }
    side.pop();
    return side;
  };
  const hull = [...half(sorted), ...half([...sorted].reverse())];
  return hull.length === 0 ? [sorted[0]] : hull;
}

/**
 * Whether two marks meet, by the separating axis theorem: two convex shapes miss
 * each other exactly when some line has one wholly on one side of it, and the
 * only lines worth trying are the ones an edge of either shape lies along.
 *
 * The ink of a stroke stands half a width outside the line it follows, so each
 * shape's shadow on an axis is widened by its own padding before the two are
 * compared. Touching along an edge is not meeting: two cells of a mesh share an
 * edge and cover no ground together.
 */
function meets(one: Reach, other: Reach): boolean {
  if (one.corners.length === 0 || other.corners.length === 0) return false;
  const gap = one.pad + other.pad;
  return !separated(one, other, gap) && !separated(other, one, gap);
}

/** Whether any line an edge of the first shape lies along has the two shapes
 * wholly on opposite sides of it. */
function separated(shape: Reach, against: Reach, gap: number): boolean {
  const corners = shape.corners;
  const count = corners.length;
  const sides = count < 3 ? Math.max(1, count - 1) : count;
  for (let at = 0; at < sides; at += 1) {
    const from = corners[at];
    const to = corners[(at + 1) % count];
    if (apart(from.y - to.y, to.x - from.x, corners, against.corners, gap)) return true;
    if (count < 3 && apart(to.x - from.x, to.y - from.y, corners, against.corners, gap)) return true;
  }
  return false;
}

/**
 * Whether the two sets of corners fall clear of each other along one axis.
 *
 * The axis is not made a unit vector. Every shadow on it is that much longer
 * instead, so the room the two are allowed is lengthened to match and the whole
 * comparison holds without a division per corner.
 */
function apart(axisX: number, axisY: number, here: readonly Vec2[], there: readonly Vec2[], gap: number): boolean {
  const length = Math.hypot(axisX, axisY);
  if (length === 0) return false;
  let hereLeast = Infinity;
  let hereMost = -Infinity;
  for (const corner of here) {
    const along = corner.x * axisX + corner.y * axisY;
    if (along < hereLeast) hereLeast = along;
    if (along > hereMost) hereMost = along;
  }
  let thereLeast = Infinity;
  let thereMost = -Infinity;
  for (const corner of there) {
    const along = corner.x * axisX + corner.y * axisY;
    if (along < thereLeast) thereLeast = along;
    if (along > thereMost) thereMost = along;
  }
  const room = gap * length;
  return hereLeast - room >= thereMost || thereLeast - room >= hereMost;
}

/** The middle of the points a piece is written from, which lies inside their
 * hull and so on the same side of any line the whole piece lies on one side
 * of. */
function middleOf(points: readonly Vec2[]): Vec2 {
  if (points.length === 0) return vec2(0, 0);
  let x = 0;
  let y = 0;
  for (const point of points) {
    x += point.x;
    y += point.y;
  }
  return vec2(x / points.length, y / points.length);
}

/** One piece of a mark, with the ground it covers measured once. */
function pieceOf(mark: Mark, depth: Depth, at: number): Piece {
  const reach = reachOf(mark);
  return { mark, depth, box: footprintOf(mark), where: middleOf(reach.corners), reach, at };
}

/**
 * The box a mark covers on the page, with its stroke's width added and its clip
 * taken in.
 *
 * A text mark reaches only as far as its own anchor, for the reason the box
 * round a list of marks does: how wide some text is depends on the fonts the
 * machine has, and an order that turned on that would be a different order on
 * two machines.
 */
function footprintOf(mark: Mark): Bounds | null {
  const own =
    mark.kind === 'text'
      ? { x: interval(mark.at.x, mark.at.x), y: interval(mark.at.y, mark.at.y) }
      : boxOfPath(mark);
  if (!own) return null;
  return mark.clip ? overlapOf(own, mark.clip) : own;
}

function boxOfPath(mark: PathMark): Bounds | null {
  const box = boundsOf(mark.path);
  if (!box) return null;
  return mark.stroke ? grownBy(box, widestWidth(mark.stroke.width) / 2) : box;
}

/** The four corners of a box, which is where an affine function of the page
 * reaches its least and its most over it. */
function cornersOf(box: Bounds): Vec2[] {
  const x = interval.ordered(box.x);
  const y = interval.ordered(box.y);
  return [vec2(x.from, y.from), vec2(x.to, y.from), vec2(x.to, y.to), vec2(x.from, y.to)];
}

/**
 * Whether the difference takes both signs over these points, which is what says
 * the two marks it came from have no one order over the ground they cover.
 *
 * A difference that is nothing everywhere is two marks at one depth, which the
 * order of the list decides and no cut would help.
 */
function crosses(difference: Depth, points: readonly Vec2[]): boolean {
  let least = Infinity;
  let most = -Infinity;
  for (const point of points) {
    const value = depthAt(difference, point);
    if (value < least) least = value;
    if (value > most) most = value;
  }
  const scale = Math.max(Math.abs(least), Math.abs(most));
  return least < -LEVEL * scale && most > LEVEL * scale;
}

/** Whether the line runs through a mark rather than past it, read against the
 * hull of the points the mark is written from. A text mark is never cut, since
 * its shapes are the machine's rather than the figure's. */
function crossesMark(difference: Depth, mark: Mark, reach: Reach): boolean {
  return mark.kind !== 'text' && crosses(difference, reach.corners);
}

/**
 * Where a piece crosses the line, as fractions along itself.
 *
 * An affine function of a cubic is a cubic in one dimension with the function's
 * value at the four control points as its own control values, so the control
 * polygon holds the curve: four values of one sign are a piece the line misses.
 * A piece whose control values sit evenly is straight in that value and its one
 * crossing is read off directly, which is what a segment written as a straight
 * run gives. Anything else is halved by de Casteljau's construction until the
 * crossing is cornered.
 */
function crossingsOn(from: Vec2, curve: Cubic, difference: Depth): number[] {
  const d0 = depthAt(difference, from);
  const d1 = depthAt(difference, curve.control1);
  const d2 = depthAt(difference, curve.control2);
  const d3 = depthAt(difference, curve.to);
  const scale = Math.max(Math.abs(d0), Math.abs(d1), Math.abs(d2), Math.abs(d3));
  if (scale === 0) return [];
  const flat = STRAIGHT * scale;
  if (Math.abs(d1 - (2 * d0 + d3) / 3) <= flat && Math.abs(d2 - (d0 + 2 * d3) / 3) <= flat) {
    if (d0 === d3) return [];
    const along = d0 / (d0 - d3);
    return along > 0 && along < 1 ? [along] : [];
  }
  const found: number[] = [];
  halve(d0, d1, d2, d3, 0, 1, scale, found);
  return found;
}

/** One interval of a piece halved until the crossings inside it are cornered,
 * with the values at the four control points carried down rather than read off
 * the curve again. A stretch whose four values are level is a stretch running
 * along the line, which crosses it nowhere and would otherwise be halved forever
 * for holding a zero at every depth. */
function halve(d0: number, d1: number, d2: number, d3: number, from: number, to: number, scale: number, into: number[]): void {
  const least = Math.min(d0, d1, d2, d3);
  const most = Math.max(d0, d1, d2, d3);
  if (least > LEVEL * scale || most < -LEVEL * scale) return;
  if (most - least <= LEVEL * scale) return;
  if (to - from <= SHARP) {
    const at = (from + to) / 2;
    if (at > 0 && at < 1) into.push(at);
    return;
  }
  const a = (d0 + d1) / 2;
  const b = (d1 + d2) / 2;
  const c = (d2 + d3) / 2;
  const d = (a + b) / 2;
  const e = (b + c) / 2;
  const middle = (d + e) / 2;
  const half = (from + to) / 2;
  halve(d0, a, d, middle, from, half, scale, into);
  halve(middle, e, c, d3, half, to, scale, into);
}

/** One subpath with how far along the path its own start stands, which is what a
 * dash pattern is read from. */
interface Run {
  readonly subpath: Subpath;
  readonly offset: number;
}

/** One subpath as its pieces cut at every crossing, each with the side of the
 * line it fell on. */
interface Cut {
  readonly from: Vec2;
  readonly curve: Cubic;
  readonly side: number;
}

function cutSubpath(subpath: Subpath, difference: Depth): Cut[] {
  const cuts: Cut[] = [];
  let from = subpath.start;
  for (const curve of subpath.curves) {
    const crossings = crossingsOn(from, curve, difference);
    let rest = curve;
    let restFrom = from;
    let taken = 0;
    for (const crossing of crossings) {
      const [head, tail] = splitCurve(restFrom, rest, (crossing - taken) / (1 - taken));
      cuts.push({ from: restFrom, curve: head, side: sideOf(restFrom, head, difference) });
      restFrom = head.to;
      rest = tail;
      taken = crossing;
    }
    cuts.push({ from: restFrom, curve: rest, side: sideOf(restFrom, rest, difference) });
    from = curve.to;
  }
  return cuts;
}

/** Which side of the line a piece lies on, read at the middle of the points it
 * is written from, since a piece cut at every crossing lies wholly on one side.
 * A piece lying along the line itself answers nothing and is kept by both. */
function sideOf(from: Vec2, curve: Cubic, difference: Depth): number {
  const d0 = depthAt(difference, from);
  const d1 = depthAt(difference, curve.control1);
  const d2 = depthAt(difference, curve.control2);
  const d3 = depthAt(difference, curve.to);
  const scale = Math.max(Math.abs(d0), Math.abs(d1), Math.abs(d2), Math.abs(d3));
  const total = (d0 + d1 + d2 + d3) / 4;
  if (scale === 0 || Math.abs(total) <= LEVEL * scale) return 0;
  return total > 0 ? 1 : -1;
}

/**
 * A path with everything on one side of the line taken out.
 *
 * A closed loop keeps its ends together: where the walk leaves the side being
 * kept and comes back to it, the two places are joined by the straight run
 * between them, which is the clipped boundary running along the line. This is
 * Sutherland and Hodgman's clip, with the pieces cut at their crossings first so
 * that a curve is kept as the curve it was.
 *
 * An open run is not joined up, since a stroke follows the line it is given and
 * a run cut in two is two runs.
 */
function keptSide(runs: readonly Run[], difference: Depth, side: number, measure: boolean): Run[] {
  const kept: Run[] = [];
  for (const run of runs) {
    if (run.subpath.curves.length === 0) continue;
    const cuts = cutSubpath(run.subpath, difference);
    const wanted = cuts.filter((cut) => cut.side === side || cut.side === 0);
    if (wanted.length === 0) continue;
    if (wanted.length === cuts.length) {
      kept.push(run);
      continue;
    }
    if (run.subpath.closed) {
      kept.push({ subpath: closedRun(wanted), offset: run.offset });
      continue;
    }
    kept.push(...openRuns(cuts, side, run.offset, measure));
  }
  return kept;
}

/** The kept pieces of a closed loop as one loop, each gap the clip left bridged
 * by the straight run across it. */
function closedRun(wanted: readonly Cut[]): Subpath {
  const curves: Cubic[] = [];
  let at = wanted[0].from;
  for (const cut of wanted) {
    if (cut.from.x !== at.x || cut.from.y !== at.y) curves.push(straightTo(at, cut.from));
    curves.push(cut.curve);
    at = cut.curve.to;
  }
  const start = wanted[0].from;
  if (at.x !== start.x || at.y !== start.y) curves.push(straightTo(at, start));
  return { start, curves, closed: true };
}

/**
 * The kept pieces of an open run as the runs they fall into, each one the stretch
 * between two crossings.
 *
 * Each run carries how far along the path it began, since a dash pattern starts
 * again at every subpath and a run that took its dashes from the pattern's own
 * start would hold dashes the path never had. The length is measured only where
 * there is a dash to keep.
 */
function openRuns(cuts: readonly Cut[], side: number, offset: number, measure: boolean): Run[] {
  const runs: Run[] = [];
  let current: Cubic[] = [];
  let start = cuts[0].from;
  let along = offset;
  let began = offset;
  for (const cut of cuts) {
    const length = measure ? lengthOf([{ start: cut.from, curves: [cut.curve], closed: false }]) : 0;
    if (cut.side === side || cut.side === 0) {
      if (current.length === 0) {
        start = cut.from;
        began = along;
      }
      current.push(cut.curve);
    } else {
      if (current.length > 0) runs.push({ subpath: { start, curves: current, closed: false }, offset: began });
      current = [];
    }
    along += length;
  }
  if (current.length > 0) runs.push({ subpath: { start, curves: current, closed: false }, offset: began });
  return runs;
}

/** A straight run between two places, written as the cubic whose controls sit
 * evenly along it. */
function straightTo(from: Vec2, to: Vec2): Cubic {
  return {
    control1: vec2.lerp(from, to, 1 / 3),
    control2: vec2.lerp(from, to, 2 / 3),
    to,
  };
}

/**
 * One mark as the pieces the lines cut it into.
 *
 * A dashed stroke leaves one mark per run rather than one mark per side, because
 * the dash pattern starts again at every subpath, so a run cut out of the middle
 * of a path carries the length before it as its own offset and keeps the dashes
 * where they were.
 */
function cutMark(mark: Mark, lines: readonly Depth[], at: number): Piece[] {
  const depth = mark.depth as Depth;
  if (lines.length === 0 || mark.kind === 'text') return [pieceOf(mark, depth, at)];
  const dash = mark.stroke?.dash;
  const measure = dash !== undefined && dash.length > 0;
  let parts: Run[][] = [mark.path.map((subpath) => ({ subpath, offset: 0 }))];
  for (const line of lines) {
    const next: Run[][] = [];
    for (const part of parts) {
      for (const side of [1, -1]) {
        const kept = keptSide(part, line, side, measure);
        if (kept.length > 0) next.push(kept);
      }
    }
    parts = next;
  }
  // A mark every line missed comes back whole, under the id it arrived with,
  // since a piece numbered off a mark that was never cut is a new id for nothing.
  if (parts.length === 1 && parts[0].length === mark.path.length && parts[0].every((run, step) => run.subpath === mark.path[step])) {
    return [pieceOf(mark, depth, at)];
  }
  const pieces: Piece[] = [];
  let index = 0;
  for (const part of parts) {
    for (const drawn of markPieces(mark, part, index, measure)) {
      index += 1;
      pieces.push(pieceOf(drawn, depth, at));
    }
  }
  return pieces;
}

/** The marks one cut path is drawn as: one, or one per run where a dash has to
 * keep its place along the path it was written for. */
function markPieces(mark: PathMark, part: readonly Run[], from: number, dashed: boolean): Mark[] {
  if (!dashed) {
    return [{ ...mark, id: `${mark.id}/${from}`, path: part.map((run) => run.subpath) }];
  }
  const stroke = mark.stroke as NonNullable<PathMark['stroke']>;
  return part.map((run, step) => ({
    ...mark,
    id: `${mark.id}/${from + step}`,
    path: [run.subpath],
    stroke: { ...stroke, dashOffset: (stroke.dashOffset ?? 0) + run.offset },
  }));
}

/**
 * The marks of one stretch, cut where their depths cross and ordered furthest
 * first.
 *
 * Only the pairs whose boxes meet are looked at, which is what keeps a grid of
 * cells from being cut by every other cell of it, and a pair whose difference
 * holds its sign over the box they share already has its order. Where a pair
 * needs a cut, one of the two is cut and the other is left whole: a piece lying
 * wholly on one side of the line has one order against the whole of the other
 * mark, which is all the order needs.
 */
function orderStretch(marks: readonly Mark[]): readonly Mark[] {
  if (marks.length < 2) return marks;
  const boxes = marks.map(footprintOf);
  const reaches = marks.map(reachOf);
  const wanted: { one: number; other: number; difference: Depth; cutsOne: boolean; cutsOther: boolean }[] = [];
  const forced = new Int32Array(marks.length);
  meetingPairs(boxes, (one, other) => {
    const shared = overlapOf(boxes[one] as Bounds, boxes[other] as Bounds);
    if (!shared) return;
    const difference = between(marks[one].depth as Depth, marks[other].depth as Depth);
    if (!crosses(difference, cornersOf(shared))) return;
    if (!meets(reaches[one], reaches[other])) return;
    const cutsOne = crossesMark(difference, marks[one], reaches[one]);
    const cutsOther = crossesMark(difference, marks[other], reaches[other]);
    if (!cutsOne && !cutsOther) return;
    if (cutsOne !== cutsOther) forced[cutsOne ? one : other] += 1;
    wanted.push({ one, other, difference, cutsOne, cutsOther });
  });

  // A pair either of the two could take goes to whichever of them is carrying
  // fewer lines already. A mark cut by several lines is cut into the pieces of
  // their arrangement, so the count matters more than which of the two is the
  // simpler shape: one big cell cut by every small one it covers leaves far more
  // pieces than each small one cut by the big one.
  const lines: Depth[][] = marks.map(() => []);
  const taken = Int32Array.from(forced);
  for (const pair of wanted) {
    const side =
      pair.cutsOne && pair.cutsOther
        ? taken[pair.one] <= taken[pair.other]
          ? pair.one
          : pair.other
        : pair.cutsOne
          ? pair.one
          : pair.other;
    if (!(pair.cutsOne && pair.cutsOther)) {
      lines[side].push(pair.difference);
      continue;
    }
    taken[side] += 1;
    lines[side].push(pair.difference);
  }

  const pieces: Piece[] = [];
  marks.forEach((mark, at) => pieces.push(...cutMark(mark, lines[at], at)));
  return furthestFirst(pieces);
}

/**
 * Every pair of boxes that meet, handed to the caller one pair at a time.
 *
 * The boxes are swept across the page in the order their left edges stand, so a
 * pair is looked at only while one box's left edge is still inside the other's
 * span and two marks far apart are never compared at all. The boxes that meet
 * across the sweep are then checked up and down.
 */
function meetingPairs(boxes: readonly (Bounds | null)[], met: (one: number, other: number) => void): void {
  const order: number[] = [];
  const from: number[] = [];
  const to: number[] = [];
  const low: number[] = [];
  const high: number[] = [];
  for (let at = 0; at < boxes.length; at += 1) {
    const box = boxes[at];
    if (!box) continue;
    const across = interval.ordered(box.x);
    const up = interval.ordered(box.y);
    order.push(at);
    from.push(across.from);
    to.push(across.to);
    low.push(up.from);
    high.push(up.to);
  }
  const sorted = order.map((_, at) => at).sort((one, other) => from[one] - from[other]);
  for (let i = 0; i < sorted.length; i += 1) {
    const one = sorted[i];
    for (let j = i + 1; j < sorted.length; j += 1) {
      const other = sorted[j];
      if (from[other] > to[one]) break;
      if (low[other] > high[one] || low[one] > high[other]) continue;
      const first = order[one];
      const second = order[other];
      met(Math.min(first, second), Math.max(first, second));
    }
  }
}

/**
 * The pieces in the order they are painted, the further of two overlapping
 * pieces first.
 *
 * Being nearer is an order over pairs rather than a number each piece has, since
 * a piece is nearer than another only where the two meet, so the pieces are
 * sorted by that order rather than by a depth read at one place. The pieces that
 * nothing is waiting on are taken in the order their marks stood in the list,
 * which is what decides two pieces at one depth.
 */
function furthestFirst(pieces: readonly Piece[]): readonly Mark[] {
  const count = pieces.length;
  const after: number[][] = pieces.map(() => []);
  const before: number[][] = pieces.map(() => []);
  const waiting = new Int32Array(count);
  const boxes = pieces.map((piece) => piece.box);
  meetingPairs(boxes, (one, other) => {
    if (pieces[one].at === pieces[other].at) return;
    if (!meets(pieces[one].reach, pieces[other].reach)) return;
    const order = nearer(pieces[one], pieces[other]);
    if (order === 0) return;
    const first = order < 0 ? other : one;
    const second = order < 0 ? one : other;
    after[first].push(second);
    before[second].push(first);
    waiting[second] += 1;
  });

  const ready = new Ready(pieces);
  for (let at = 0; at < count; at += 1) if (waiting[at] === 0) ready.add(at);
  const drawn: Mark[] = [];
  const done = new Uint8Array(count);
  let last: Piece | undefined;
  let next = 0;
  while (drawn.length < count) {
    if (ready.empty) {
      while (next < count && done[next] === 1) next += 1;
      if (next >= count) break;
      const freed = breakRing(next, pieces, after, before, waiting, done);
      if (freed < 0) break;
      ready.add(freed);
    }
    const taken = ready.take();
    if (done[taken] === 1) continue;
    done[taken] = 1;
    join(drawn, pieces[taken], last);
    last = pieces[taken];
    for (const one of after[taken]) {
      waiting[one] -= 1;
      if (waiting[one] === 0 && done[one] === 0) ready.add(one);
    }
  }
  return drawn;
}

/**
 * One piece added to what is drawn, folded into the piece before it where the
 * two came from one mark and nothing was drawn between them.
 *
 * Two pieces of one mark painted one after the other draw what one mark holding
 * both would, and a cut leaves many of them next to each other, so folding them
 * back together costs nothing and is what keeps a cut picture near the size of
 * the picture it was cut from. A dashed stroke is left alone, since each of its
 * runs carries where along the path it began.
 */
function join(drawn: Mark[], piece: Piece, last: Piece | undefined): void {
  const mark = piece.mark;
  const before = drawn[drawn.length - 1];
  const dashed = mark.kind === 'path' && mark.stroke?.dash !== undefined && mark.stroke.dash.length > 0;
  if (!last || last.at !== piece.at || mark.kind !== 'path' || before?.kind !== 'path' || dashed) {
    drawn.push(mark);
    return;
  }
  drawn[drawn.length - 1] = { ...before, path: [...before.path, ...mark.path] };
}

/**
 * One piece freed from a ring of pieces each waiting on the next.
 *
 * Three pieces can each be over the next and under the one after, which no order
 * of whole pieces answers, so one of the orders in the ring has to go. The ring
 * is found by walking backwards from a piece that is stuck until a piece turns up
 * twice, and the order dropped is the one resting on the smallest difference of
 * depths, which is the one the ring has the least reason for. Everything else the
 * ring said is kept.
 */
function breakRing(
  from: number,
  pieces: readonly Piece[],
  after: readonly number[][],
  before: readonly number[][],
  waiting: Int32Array,
  done: Uint8Array,
): number {
  const walk: number[] = [];
  const seen = new Map<number, number>();
  let at = from;
  for (;;) {
    if (seen.has(at)) break;
    seen.set(at, walk.length);
    walk.push(at);
    let up = -1;
    for (const one of before[at]) {
      if (done[one] === 0) {
        up = one;
        break;
      }
    }
    if (up < 0) return -1;
    at = up;
  }

  const ring = walk.slice(seen.get(at) as number);
  let weakest = 0;
  let least = Infinity;
  for (let step = 0; step < ring.length; step += 1) {
    const held = ring[step];
    const holder = ring[(step + 1) % ring.length];
    const evidence = Math.abs(depthAt(between(pieces[holder].depth, pieces[held].depth), pieces[held].where));
    if (evidence < least) {
      least = evidence;
      weakest = step;
    }
  }
  const held = ring[weakest];
  const holder = ring[(weakest + 1) % ring.length];
  const edge = after[holder].indexOf(held);
  if (edge >= 0) after[holder].splice(edge, 1);
  waiting[held] -= 1;
  return waiting[held] === 0 ? held : breakRing(held, pieces, after, before, waiting, done);
}

/**
 * The pieces nothing is waiting on, handed back in the order their marks stood
 * in the list.
 *
 * It is a heap rather than a list scanned for its smallest, since every piece
 * goes in and comes out once and a scan would make that the square of the number
 * of pieces.
 */
class Ready {
  private readonly heap: number[] = [];

  constructor(private readonly pieces: readonly Piece[]) {}

  get empty(): boolean {
    return this.heap.length === 0;
  }

  private before(one: number, other: number): boolean {
    const first = this.pieces[one];
    const second = this.pieces[other];
    return first.at !== second.at ? first.at < second.at : one < other;
  }

  add(piece: number): void {
    const heap = this.heap;
    heap.push(piece);
    let at = heap.length - 1;
    while (at > 0) {
      const up = (at - 1) >> 1;
      if (!this.before(heap[at], heap[up])) break;
      [heap[at], heap[up]] = [heap[up], heap[at]];
      at = up;
    }
  }

  take(): number {
    const heap = this.heap;
    const top = heap[0];
    const last = heap.pop() as number;
    if (heap.length > 0) {
      heap[0] = last;
      let at = 0;
      for (;;) {
        const left = at * 2 + 1;
        const right = left + 1;
        let small = at;
        if (left < heap.length && this.before(heap[left], heap[small])) small = left;
        if (right < heap.length && this.before(heap[right], heap[small])) small = right;
        if (small === at) break;
        [heap[at], heap[small]] = [heap[small], heap[at]];
        at = small;
      }
    }
    return top;
  }
}

/**
 * Which of two pieces is nearer where they meet: a negative number where the
 * first is, a positive number where the second is, and nothing where the two are
 * at one depth.
 *
 * The difference of the two depths is read at the middle of each piece first,
 * which settles it whenever the two agree. Where they disagree, one of the two
 * pieces straddles the line the depths are equal along and the other does not,
 * and the one that does not is the one to read: the ground the two share lies
 * inside it, so the sign over the whole of that piece is the sign over the
 * ground they share. A pair straddling the line both ways shares no ground the
 * sign is constant over and is left to the order of the list.
 */
function nearer(one: Piece, other: Piece): number {
  const difference = between(one.depth, other.depth);
  const here = sideAt(difference, depthAt(difference, one.where), depthAt(difference, other.where));
  if (here !== undefined) return here;
  const across = spanSign(difference, one.reach.corners);
  if (across !== 0) return across;
  const back = spanSign(difference, other.reach.corners);
  if (back !== 0) return back;
  // Neither piece was cut by this line, which is what a pair whose difference
  // holds its sign over the box they share gives: the sign is there to be read
  // even though each piece on its own straddles the line somewhere outside it.
  const shared = one.box && other.box ? overlapOf(one.box, other.box) : null;
  return shared ? spanSign(difference, cornersOf(shared)) : 0;
}

/** The side both places agree on, or nothing where they disagree. */
function sideAt(difference: Depth, here: number, there: number): number | undefined {
  const scale = Math.max(Math.abs(here), Math.abs(there));
  if (scale === 0) return 0;
  const near = Math.abs(here) <= LEVEL * scale ? 0 : Math.sign(here);
  const far = Math.abs(there) <= LEVEL * scale ? 0 : Math.sign(there);
  if (near === 0) return far === 0 ? 0 : far;
  if (far === 0 || far === near) return near;
  return undefined;
}

/** The one sign the difference holds over every point of a piece, or nothing
 * where it holds none. */
function spanSign(difference: Depth, hull: readonly Vec2[]): number {
  let least = Infinity;
  let most = -Infinity;
  for (const point of hull) {
    const value = depthAt(difference, point);
    least = Math.min(least, value);
    most = Math.max(most, value);
  }
  const scale = Math.max(Math.abs(least), Math.abs(most));
  if (scale === 0) return 0;
  if (least > LEVEL * scale) return 1;
  if (most < -LEVEL * scale) return -1;
  return 0;
}

/**
 * The list a painter with no depth buffer draws, in the order it draws it.
 *
 * A list holding no depth at all is handed back as it stands, so every flat
 * figure pays nothing for this and a painter can call it on whatever it is
 * given.
 */
export function depthOrder(marks: readonly Mark[]): readonly Mark[] {
  let carried = false;
  for (const mark of marks) {
    if (mark.depth) {
      carried = true;
      break;
    }
  }
  if (!carried) return marks;

  const drawn: Mark[] = [];
  let stretch: Mark[] = [];
  for (const mark of marks) {
    if (mark.depth) {
      stretch.push(mark);
      continue;
    }
    if (stretch.length > 0) drawn.push(...orderStretch(stretch));
    stretch = [];
    drawn.push(mark);
  }
  if (stretch.length > 0) drawn.push(...orderStretch(stretch));
  return drawn;
}
