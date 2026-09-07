/**
 * Union, intersection and difference on paths.
 *
 * Both paths are cut at every place they cross, so that after the cutting every
 * piece is wholly inside the other path or wholly outside it. Each piece is
 * then decided one way or the other, the operation says which pieces it wants,
 * and what is kept is stitched back into loops by joining ends that meet.
 *
 * The difference takes the second path's kept pieces the other way round, which
 * is what turns a disc taken out of the middle of another disc into a ring: the
 * inner loop is wound against the outer one and the nonzero rule the mark
 * carries leaves it empty.
 */
import { vec2, type Vec2 } from '../values/vec2.js';
import { pointOn, type Cubic, type Path, type Subpath } from './path.js';
import { cutPath, type Cut } from './cut.js';
import { curveCrossings } from './intersect.js';
import { flattenPath, windingAt } from './inside.js';

export interface BooleanOptions {
  /** How close two things come before they count as the same place, in the
   * picture's own units. It decides where two paths are read as crossing and
   * which ends are read as meeting. */
  readonly tolerance?: number;
}

const TOLERANCE = 1e-6;

/** One piece with the point it starts from, since a piece carries where it ends
 * and not where it began. */
interface Piece {
  readonly from: Vec2;
  readonly curve: Cubic;
}

/** A subpath left open closed by the straight run back to where it started,
 * since a path with an open loop has no inside for any of this to ask about. */
function closedLoops(path: Path): Path {
  return path.map((subpath): Subpath => {
    if (subpath.curves.length === 0) return subpath;
    const end = subpath.curves[subpath.curves.length - 1].to;
    if (subpath.closed && end.x === subpath.start.x && end.y === subpath.start.y) {
      return subpath;
    }
    const curves =
      end.x === subpath.start.x && end.y === subpath.start.y
        ? subpath.curves
        : [
            ...subpath.curves,
            {
              control1: vec2.lerp(end, subpath.start, 1 / 3),
              control2: vec2.lerp(end, subpath.start, 2 / 3),
              to: subpath.start,
            },
          ];
    return { start: subpath.start, curves, closed: true };
  });
}

function piecesOf(path: Path): Piece[] {
  const pieces: Piece[] = [];
  for (const subpath of path) {
    let from = subpath.start;
    for (const curve of subpath.curves) {
      pieces.push({ from, curve });
      from = curve.to;
    }
  }
  return pieces;
}

/** A piece walked the other way, which is what puts a hole the opposite way
 * round from the loop it sits in. */
function reversed(piece: Piece): Piece {
  return {
    from: piece.curve.to,
    curve: { control1: piece.curve.control2, control2: piece.curve.control1, to: piece.from },
  };
}

/** Where the two paths cross, as the cuts each of them needs. */
function cutsBetween(first: Path, second: Path, tolerance: number): [Cut[], Cut[]] {
  const forFirst: Cut[] = [];
  const forSecond: Cut[] = [];
  for (let left = 0; left < first.length; left++) {
    let leftFrom = first[left].start;
    for (let leftPiece = 0; leftPiece < first[left].curves.length; leftPiece++) {
      const leftCurve = first[left].curves[leftPiece];
      for (let right = 0; right < second.length; right++) {
        let rightFrom = second[right].start;
        for (let rightPiece = 0; rightPiece < second[right].curves.length; rightPiece++) {
          const rightCurve = second[right].curves[rightPiece];
          for (const crossing of curveCrossings(leftFrom, leftCurve, rightFrom, rightCurve, { tolerance })) {
            forFirst.push({ subpath: left, curve: leftPiece, along: crossing.alongFirst });
            forSecond.push({ subpath: right, curve: rightPiece, along: crossing.alongSecond });
          }
          rightFrom = rightCurve.to;
        }
      }
      leftFrom = leftCurve.to;
    }
  }
  return [forFirst, forSecond];
}

/**
 * The kept pieces joined into loops, by taking each end to the piece that
 * starts where it finishes.
 *
 * A piece carries its two controls and where it ends, so the loop takes where
 * each piece begins from where the piece before it ended. The two paths put
 * their cut at a place they each worked out on their own, so the two ends of a
 * join differ by whatever the crossing was out by, and that difference is
 * absorbed here rather than left as a gap.
 */
function stitch(pieces: readonly Piece[], tolerance: number): Path {
  const used = pieces.map(() => false);
  const loops: Subpath[] = [];
  for (let seed = 0; seed < pieces.length; seed++) {
    if (used[seed]) continue;
    used[seed] = true;
    const start = pieces[seed].from;
    const curves: Cubic[] = [pieces[seed].curve];
    let end = pieces[seed].curve.to;
    while (vec2.distance(end, start) > tolerance) {
      let next = -1;
      let nearest = tolerance;
      for (let at = 0; at < pieces.length; at++) {
        if (used[at]) continue;
        const gap = vec2.distance(pieces[at].from, end);
        if (gap <= nearest) {
          nearest = gap;
          next = at;
        }
      }
      if (next < 0) break;
      used[next] = true;
      curves.push(pieces[next].curve);
      end = pieces[next].curve.to;
    }
    loops.push({ start, curves, closed: true });
  }
  return loops;
}

/** Which side of the other path each piece falls on, taken at its middle, which
 * after the cutting stands for the whole piece. */
function insideOther(pieces: readonly Piece[], other: readonly (readonly Vec2[])[]): boolean[] {
  return pieces.map((piece) => windingAt(other, pointOn(piece.from, piece.curve, 0.5)) !== 0);
}

type Keep = 'union' | 'intersection' | 'difference';

function combine(first: Path, second: Path, keep: Keep, options: BooleanOptions): Path {
  const tolerance = options.tolerance ?? TOLERANCE;
  const left = closedLoops(first);
  const right = closedLoops(second);
  if (left.length === 0) return keep === 'union' ? right : [];
  if (right.length === 0) return keep === 'intersection' ? [] : left;

  const [leftCuts, rightCuts] = cutsBetween(left, right, tolerance);
  const leftPieces = piecesOf(cutPath(left, leftCuts, { tolerance }));
  const rightPieces = piecesOf(cutPath(right, rightCuts, { tolerance }));
  const leftInside = insideOther(leftPieces, flattenPath(right, { tolerance }));
  const rightInside = insideOther(rightPieces, flattenPath(left, { tolerance }));

  const kept: Piece[] = [];
  for (let at = 0; at < leftPieces.length; at++) {
    if (leftInside[at] === (keep === 'intersection')) kept.push(leftPieces[at]);
  }
  for (let at = 0; at < rightPieces.length; at++) {
    if (keep === 'difference') {
      if (rightInside[at]) kept.push(reversed(rightPieces[at]));
      continue;
    }
    if (rightInside[at] === (keep === 'intersection')) kept.push(rightPieces[at]);
  }
  return stitch(kept, tolerance);
}

/** Everything either path covers. */
export function unionOf(first: Path, second: Path, options: BooleanOptions = {}): Path {
  return combine(first, second, 'union', options);
}

/** Only what both paths cover. */
export function intersectionOf(first: Path, second: Path, options: BooleanOptions = {}): Path {
  return combine(first, second, 'intersection', options);
}

/** The first path with the second taken out of it. */
export function differenceOf(first: Path, second: Path, options: BooleanOptions = {}): Path {
  return combine(first, second, 'difference', options);
}
